#!/usr/bin/env bash
# ============================================================================
# AetherVault - Script de Instalación Local de PostgreSQL 17 para Pruebas
# ============================================================================
# Uso en servidor local Debian 13 / Ubuntu:
#   chmod +x deploy/postgres-local/setup-local-postgres.sh
#   sudo bash deploy/postgres-local/setup-local-postgres.sh
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DB_NAME="${PG_DB_NAME:-aethervault_local}"
DB_USER="${PG_APP_USER:-aethervault_app}"
UNIFIED_VM_KEY="Tripitaka@8069@9982@Profesor"
DB_PASS="${PG_APP_PASSWORD:-$UNIFIED_VM_KEY}"
ENV_OUT="${PROJECT_ROOT}/.env.postgres.local"

if [[ "$EUID" -ne 0 ]]; then
  echo "[ERROR] Ejecuta este script como root: sudo bash $0"
  exit 1
fi

echo "[1/5] Verificando e instalando PostgreSQL + contrib..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y --no-install-recommends postgresql postgresql-contrib postgresql-client openssl

systemctl enable postgresql
systemctl start postgresql

echo "[2/5] Endureciendo configuración local de PostgreSQL (localhost + SCRAM-SHA-256)..."
PG_CONF_DIR="$(find /etc/postgresql -maxdepth 2 -name main -type d | head -n 1 || true)"
if [[ -n "$PG_CONF_DIR" && -f "$PG_CONF_DIR/postgresql.conf" ]]; then
  sed -i "s/^#*listen_addresses.*/listen_addresses = 'localhost'/" "$PG_CONF_DIR/postgresql.conf"
  sed -i "s/^#*password_encryption.*/password_encryption = scram-sha-256/" "$PG_CONF_DIR/postgresql.conf"
fi
if [[ -n "$PG_CONF_DIR" && -f "$PG_CONF_DIR/pg_hba.conf" ]]; then
  sed -i -E 's/^(host\s+all\s+all\s+127\.0\.0\.1\/32\s+).*/\1scram-sha-256/' "$PG_CONF_DIR/pg_hba.conf"
  sed -i -E 's/^(host\s+all\s+all\s+::1\/128\s+).*/\1scram-sha-256/' "$PG_CONF_DIR/pg_hba.conf"
fi
systemctl restart postgresql

echo "[3/5] Creando rol '${DB_USER}' y base de datos '${DB_NAME}'..."
sudo -u postgres psql -v ON_ERROR_STOP=1 <<EOF
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASS}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  ELSE
    ALTER ROLE ${DB_USER} WITH PASSWORD '${DB_PASS}';
  END IF;
END
\$\$;
EOF

if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  sudo -u postgres createdb -O postgres "$DB_NAME"
fi

echo "[4/5] Aplicando estructura completa (01_schema_complete.sql) y datos semilla (02_seed_local_tests.sql)..."
sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$DB_NAME" -f "$SCRIPT_DIR/01_schema_complete.sql"
sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$DB_NAME" -f "$SCRIPT_DIR/02_seed_local_tests.sql"

echo "[5/5] Generando archivo de variables locales ${ENV_OUT}..."
cat > "$ENV_OUT" <<EOF
# Variables locales PostgreSQL para AetherVault (NO subir a Git)
# Clave unificada temporal para entorno local/VM (rotar antes de pasar a VPS público)
SQL_HOST=127.0.0.1
SQL_PORT=5432
SQL_DB_NAME=${DB_NAME}
SQL_USER=${DB_USER}
SQL_PASSWORD=${DB_PASS}
DB_ENCRYPTION_KEY=${UNIFIED_VM_KEY}
SESSION_SECRET=${UNIFIED_VM_KEY}
OWNER_MASTER_KEY=${UNIFIED_VM_KEY}
BTCPAY_WEBHOOK_SECRET=${UNIFIED_VM_KEY}
NOWPAYMENTS_IPN_SECRET=${UNIFIED_VM_KEY}
VM_TEST_MODE=true
MAX_VM_TESTERS=10
EOF
chmod 600 "$ENV_OUT"

echo "========================================================================"
echo " POSTGRESQL LOCAL CONFIGURADO CON ÉXITO"
echo "========================================================================"
echo " Base de datos : ${DB_NAME}"
echo " Rol App       : ${DB_USER} (privilegios mínimos + RLS activo)"
echo " Credenciales  : ${ENV_OUT}"
echo ""
echo " Siguiente paso: ejecutar la suite de pruebas automáticas:"
echo "   sudo bash deploy/postgres-local/test-postgres-suite.sh"
echo "========================================================================"
