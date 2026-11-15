#!/usr/bin/env bash
# ============================================================================
# AetherVault - Script Automatizado de Instalación y Hardening para Debian 13 (Trixie)
# ============================================================================
# Uso:
#   chmod +x deploy/debian13/install-debian13.sh
#   sudo bash deploy/debian13/install-debian13.sh
# ============================================================================

set -euo pipefail

APP_USER="aethervault"
APP_DIR="/opt/aethervault"
SRC_DIR="$(pwd)"
DB_NAME="aethervault_prod"
DB_USER="aethervault_app"

if [[ "$EUID" -ne 0 ]]; then
  echo "[ERROR] Este script debe ejecutarse como root (usa: sudo bash $0)."
  exit 1
fi

echo "========================================================================"
echo " [1/8] Actualizando Debian 13 e instalando paquetes base y firewall..."
echo "========================================================================"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y --no-install-recommends \
  curl ca-certificates gnupg lsb-release openssl \
  ufw fail2ban nginx certbot python3-certbot-nginx \
  postgresql postgresql-contrib unattended-upgrades

echo "========================================================================"
echo " [2/8] Instalando Node.js 22 LTS..."
echo "========================================================================"
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 22 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node -v
npm -v

echo "========================================================================"
echo " [3/8] Creando usuario aislado sin shell de login ($APP_USER)..."
echo "========================================================================"
if ! id "$APP_USER" >/dev/null 2>&1; then
  useradd --system --create-home --home-dir "/home/$APP_USER" --shell /usr/sbin/nologin "$APP_USER"
fi

echo "========================================================================"
echo " [4/8] Endureciendo PostgreSQL 17 (SCRAM-SHA-256, localhost, RLS)..."
echo "========================================================================"
PG_DB_PASS="$(openssl rand -hex 24)"
PG_CONF_DIR="$(find /etc/postgresql -maxdepth 2 -name main -type d | head -n 1)"

if [[ -n "$PG_CONF_DIR" && -f "$PG_CONF_DIR/postgresql.conf" ]]; then
  sed -i "s/^#*listen_addresses.*/listen_addresses = 'localhost'/" "$PG_CONF_DIR/postgresql.conf"
  sed -i "s/^#*password_encryption.*/password_encryption = scram-sha-256/" "$PG_CONF_DIR/postgresql.conf"
  sed -i "s/^#*ssl =.*/ssl = on/" "$PG_CONF_DIR/postgresql.conf"
fi

if [[ -n "$PG_CONF_DIR" && -f "$PG_CONF_DIR/pg_hba.conf" ]]; then
  # Forzar scram-sha-256 en conexiones IPv4/IPv6 locales
  sed -i -E 's/^(host\s+all\s+all\s+127\.0\.0\.1\/32\s+).*/\1scram-sha-256/' "$PG_CONF_DIR/pg_hba.conf"
  sed -i -E 's/^(host\s+all\s+all\s+::1\/128\s+).*/\1scram-sha-256/' "$PG_CONF_DIR/pg_hba.conf"
fi

systemctl restart postgresql

sudo -u postgres psql -v ON_ERROR_STOP=1 <<EOF
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${PG_DB_PASS}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  ELSE
    ALTER ROLE ${DB_USER} WITH PASSWORD '${PG_DB_PASS}';
  END IF;
END
\$\$;
EOF

if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  sudo -u postgres createdb -O postgres "$DB_NAME"
fi

if [[ -f "$SRC_DIR/deploy/debian13/postgres-hardening.sql" ]]; then
  sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$DB_NAME" -f "$SRC_DIR/deploy/debian13/postgres-hardening.sql"
fi

echo "========================================================================"
echo " [5/8] Desplegando código en $APP_DIR y generando llaves criptográficas..."
echo "========================================================================"
mkdir -p "$APP_DIR/data"
cp -a "$SRC_DIR/." "$APP_DIR/"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
chmod 700 "$APP_DIR/data"

DB_ENC_KEY="$(openssl rand -hex 32)"
SESS_SECRET="$(openssl rand -hex 32)"

if [[ ! -f "$APP_DIR/.env" ]]; then
  cat > "$APP_DIR/.env" <<EOF
NODE_ENV=production
PORT=3000
DB_ENCRYPTION_KEY=${DB_ENC_KEY}
SESSION_SECRET=${SESS_SECRET}
OWNER_MASTER_KEY=GokuCheckersMasterKey2024Secure
DATABASE_URL=postgresql://${DB_USER}:${PG_DB_PASS}@127.0.0.1:5432/${DB_NAME}?sslmode=require
EOF
  chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
  chmod 600 "$APP_DIR/.env"
fi

sudo -u "$APP_USER" bash -c "cd '$APP_DIR' && npm ci && npm run build"

echo "========================================================================"
echo " [6/8] Configurando servicio systemd aislado (Sandbox Strict)..."
echo "========================================================================"
cat > /etc/systemd/system/aethervault.service <<EOF
[Unit]
Description=AetherVault Hardened Full-Stack Server
After=network-online.target postgresql.service
Wants=network-online.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=/usr/bin/node server.ts
Restart=always
RestartSec=3

# Hardening de Kernel & Systemd
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=${APP_DIR}/data
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectControlGroups=yes
RestrictSUIDSGID=yes
LockPersonality=yes
MemoryMax=1536M

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable aethervault
systemctl restart aethervault

echo "========================================================================"
echo " [7/8] Configurando Nginx Reverse Proxy..."
echo "========================================================================"
if [[ -f "$APP_DIR/deploy/debian13/nginx-aethervault.conf" ]]; then
  cp "$APP_DIR/deploy/debian13/nginx-aethervault.conf" /etc/nginx/sites-available/aethervault.conf
  ln -sf /etc/nginx/sites-available/aethervault.conf /etc/nginx/sites-enabled/aethervault.conf
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
  systemctl reload nginx
fi

echo "========================================================================"
echo " [8/8] Configurando Firewall UFW, Fail2Ban y Parches Automáticos..."
echo "========================================================================"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

cat > /etc/fail2ban/jail.d/aethervault.local <<EOF
[sshd]
enabled = true
port = ssh
maxretry = 5
bantime = 1h

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 8
bantime = 30m
EOF

systemctl enable fail2ban
systemctl restart fail2ban
dpkg-reconfigure -f noninteractive unattended-upgrades || true

echo "========================================================================"
echo " INSTALACIÓN Y HARDENING EN DEBIAN 13 COMPLETADOS CON ÉXITO"
echo "========================================================================"
echo " - Estado App:        systemctl status aethervault"
echo " - Estado PostgreSQL: systemctl status postgresql"
echo " - Estado Firewall:   ufw status verbose"
echo " - Archivo .env:      ${APP_DIR}/.env (permisos 600, secretos generados)"
echo " - Paso final HTTPS:  certbot --nginx -d tu-dominio.com"
echo "========================================================================"
