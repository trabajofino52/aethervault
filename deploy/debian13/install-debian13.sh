#!/usr/bin/env bash
# ============================================================================
# AetherVault - Instalador & Hardening VM -> VPS para Debian 13 (Trixie)
# ============================================================================
# Uso en Máquina Virtual (con TLS local autofirmado para probar hoy mismo):
#   sudo bash deploy/debian13/install-debian13.sh --vm-test
#
# Uso en Servidor VPS en Producción (con dominio real + Certbot HTTPS):
#   sudo bash deploy/debian13/install-debian13.sh --vps-prod tu-dominio.com
# ============================================================================

set -euo pipefail

MODE="${1:---vm-test}"
DOMAIN_NAME="${2:-}"
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
echo " [1/9] Actualizando Debian 13 e instalando paquetes base y firewall..."
echo "========================================================================"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y --no-install-recommends \
  curl ca-certificates gnupg lsb-release openssl sqlite3 \
  ufw fail2ban nginx certbot python3-certbot-nginx \
  postgresql postgresql-contrib unattended-upgrades

echo "========================================================================"
echo " [2/9] Instalando Node.js 22 LTS..."
echo "========================================================================"
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 22 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node -v
npm -v

echo "========================================================================"
echo " [3/9] Creando usuario aislado sin shell de login ($APP_USER)..."
echo "========================================================================"
if ! id "$APP_USER" >/dev/null 2>&1; then
  useradd --system --create-home --home-dir "/home/$APP_USER" --shell /usr/sbin/nologin "$APP_USER"
fi

echo "========================================================================"
echo " [4/9] Endureciendo PostgreSQL 17 (SCRAM-SHA-256, localhost, RLS)..."
echo "========================================================================"
VM_CUSTOM_KEY="Tripitaka@8069@9982@Profesor"
if [[ "$MODE" == "--vps-prod" ]]; then
  PG_DB_PASS="$(openssl rand -hex 24)"
else
  PG_DB_PASS="${VM_CUSTOM_KEY}"
fi
PG_CONF_DIR="$(find /etc/postgresql -maxdepth 2 -name main -type d | head -n 1)"

if [[ -n "$PG_CONF_DIR" && -f "$PG_CONF_DIR/postgresql.conf" ]]; then
  sed -i "s/^#*listen_addresses.*/listen_addresses = 'localhost'/" "$PG_CONF_DIR/postgresql.conf"
  sed -i "s/^#*password_encryption.*/password_encryption = scram-sha-256/" "$PG_CONF_DIR/postgresql.conf"
  sed -i "s/^#*ssl =.*/ssl = on/" "$PG_CONF_DIR/postgresql.conf"
fi

if [[ -n "$PG_CONF_DIR" && -f "$PG_CONF_DIR/pg_hba.conf" ]]; then
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
echo " [5/9] Desplegando código en $APP_DIR y generando llaves criptográficas..."
echo "========================================================================"
mkdir -p "$APP_DIR/data" /var/backups/aethervault
chmod 700 /var/backups/aethervault
cp -a "$SRC_DIR/." "$APP_DIR/"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
chmod 700 "$APP_DIR/data"

if [[ "$MODE" == "--vps-prod" ]]; then
  DB_ENC_KEY="$(openssl rand -hex 32)"
  SESS_SECRET="$(openssl rand -hex 32)"
  BTCPAY_WH_SECRET="$(openssl rand -hex 32)"
  NOWPAY_IPN_SEC="$(openssl rand -hex 32)"
  ENV_NODE="production"
  VM_MODE_FLAG="false"
else
  DB_ENC_KEY="${VM_CUSTOM_KEY}"
  SESS_SECRET="${VM_CUSTOM_KEY}"
  BTCPAY_WH_SECRET="${VM_CUSTOM_KEY}"
  NOWPAY_IPN_SEC="${VM_CUSTOM_KEY}"
  ENV_NODE="production"
  VM_MODE_FLAG="true"
fi

if [[ ! -f "$APP_DIR/.env" ]]; then
  cat > "$APP_DIR/.env" <<EOF
NODE_ENV=${ENV_NODE}
PORT=3000
DB_ENCRYPTION_KEY=${DB_ENC_KEY}
SESSION_SECRET=${SESS_SECRET}
OWNER_MASTER_KEY=${VM_CUSTOM_KEY}
BTCPAY_WEBHOOK_SECRET=${BTCPAY_WH_SECRET}
NOWPAYMENTS_IPN_SECRET=${NOWPAY_IPN_SEC}
VM_TEST_MODE=${VM_MODE_FLAG}
MAX_VM_TESTERS=10
ALLOWED_ORIGINS=${DOMAIN_NAME:+https://$DOMAIN_NAME}
DATABASE_URL=postgresql://${DB_USER}:${PG_DB_PASS}@127.0.0.1:5432/${DB_NAME}?sslmode=require
EOF
  chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
  chmod 600 "$APP_DIR/.env"
fi

sudo -u "$APP_USER" bash -c "cd '$APP_DIR' && npm ci && npm run build"

echo "========================================================================"
echo " [6/9] Configurando servicio systemd aislado (Sandbox Strict)..."
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
echo " [7/9] Configurando Nginx Reverse Proxy + TLS..."
echo "========================================================================"
if [[ -f "$APP_DIR/deploy/debian13/nginx-aethervault.conf" ]]; then
  cp "$APP_DIR/deploy/debian13/nginx-aethervault.conf" /etc/nginx/sites-available/aethervault.conf

  if [[ "$MODE" == "--vm-test" ]]; then
    mkdir -p /etc/ssl/aethervault-vm
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout /etc/ssl/aethervault-vm/vm.key \
      -out /etc/ssl/aethervault-vm/vm.crt \
      -subj "/C=ES/ST=Lab/L=VM/O=AetherVault/CN=localhost" >/dev/null 2>&1
    chmod 600 /etc/ssl/aethervault-vm/vm.key

    cat > /etc/nginx/snippets/aethervault-vm-ssl.conf <<EOF
listen 443 ssl http2;
listen [::]:443 ssl http2;
ssl_certificate /etc/ssl/aethervault-vm/vm.crt;
ssl_certificate_key /etc/ssl/aethervault-vm/vm.key;
ssl_protocols TLSv1.2 TLSv1.3;
EOF
    sed -i '/server_name /a \    include /etc/nginx/snippets/aethervault-vm-ssl.conf;' /etc/nginx/sites-available/aethervault.conf
  elif [[ -n "$DOMAIN_NAME" ]]; then
    sed -i "s/server_name .*/server_name ${DOMAIN_NAME} www.${DOMAIN_NAME};/" /etc/nginx/sites-available/aethervault.conf
  fi

  ln -sf /etc/nginx/sites-available/aethervault.conf /etc/nginx/sites-enabled/aethervault.conf
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
  systemctl reload nginx

  if [[ "$MODE" == "--vps-prod" && -n "$DOMAIN_NAME" ]]; then
    echo "Ejecutando Certbot para HTTPS en $DOMAIN_NAME..."
    certbot --nginx -d "$DOMAIN_NAME" --non-interactive --agree-tos -m trabajofino52@gmail.com || true
  fi
fi

echo "========================================================================"
echo " [8/9] Hardening de Kernel (sysctl), SSH y Backups Cifrados..."
echo "========================================================================"
cat > /etc/sysctl.d/99-aethervault-security.conf <<EOF
net.ipv4.tcp_syncookies = 1
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.icmp_echo_ignore_broadcasts = 1
kernel.kptr_restrict = 2
kernel.dmesg_restrict = 1
EOF
sysctl --system >/dev/null || true

mkdir -p /etc/ssh/sshd_config.d
cat > /etc/ssh/sshd_config.d/99-aethervault-hardening.conf <<EOF
PermitRootLogin prohibit-password
MaxAuthTries 3
X11Forwarding no
AllowAgentForwarding no
ClientAliveInterval 300
ClientAliveCountMax 2
EOF
systemctl reload ssh || systemctl reload sshd || true

cat > /usr/local/bin/aethervault-backup.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
STAMP="$(date +%Y%m%d_%H%M%S)"
OUT_DIR="/var/backups/aethervault"
DB_FILE="/opt/aethervault/data/aethervault.db"
KEY_FILE="/opt/aethervault/.env"
if [[ -f "$DB_FILE" ]]; then
  sqlite3 "$DB_FILE" ".backup '${OUT_DIR}/tmp_${STAMP}.db'"
  PASSPHRASE="$(grep '^DB_ENCRYPTION_KEY=' "$KEY_FILE" | cut -d= -f2-)"
  openssl enc -aes-256-cbc -pbkdf2 -salt -in "${OUT_DIR}/tmp_${STAMP}.db" -out "${OUT_DIR}/aethervault_${STAMP}.db.enc" -pass "pass:${PASSPHRASE}"
  rm -f "${OUT_DIR}/tmp_${STAMP}.db"
  chmod 600 "${OUT_DIR}/aethervault_${STAMP}.db.enc"
  find "$OUT_DIR" -name "*.db.enc" -mtime +7 -delete
fi
EOF
chmod 700 /usr/local/bin/aethervault-backup.sh
echo "0 3 * * * root /usr/local/bin/aethervault-backup.sh" > /etc/cron.d/aethervault-backup

echo "========================================================================"
echo " [9/9] Configurando Firewall UFW, Fail2Ban y Parches Automáticos..."
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

LOCAL_IP="$(hostname -I | awk '{print $1}')"
echo "========================================================================"
echo " INSTALACIÓN Y HARDENING COMPLETADOS CON ÉXITO (${MODE})"
echo "========================================================================"
if [[ "$MODE" == "--vm-test" ]]; then
  echo " [MODO VIRTUAL] Abre en tu navegador: https://${LOCAL_IP} (o http://${LOCAL_IP})"
  echo " [CLAVE UNIFICADA] Todas las llaves VM usan la clave maestra configurada en ${APP_DIR}/.env"
  echo " [IMPORTANTE]   Al migrar al VPS público, ejecuta con --vps-prod y cambia OWNER_MASTER_KEY."
else
  echo " [MODO VPS]     Dominio activo: https://${DOMAIN_NAME}"
  echo " [IMPORTANTE]   Rota OWNER_MASTER_KEY en ${APP_DIR}/.env y ejecuta: systemctl restart aethervault"
fi
echo " - Estado App:        systemctl status aethervault"
echo " - Estado Firewall:   ufw status verbose"
echo " - Backups Cifrados:  /var/backups/aethervault (diario 03:00 AM)"
echo "========================================================================"
