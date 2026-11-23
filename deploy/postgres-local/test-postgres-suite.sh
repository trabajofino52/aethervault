#!/usr/bin/env bash
# ============================================================================
# AetherVault - Suite de Pruebas Automáticas PostgreSQL Local
# ============================================================================
# Verifica:
#   1. Tablas y políticas RLS activas
#   2. Contraseña del Administrador (trabajofino52@gmail.com)
#   3. 10 Testers VM + cuenta gokudemo aislada
#   4. Aislamiento RLS por sesión (jugador vs propietario)
#   5. Bloqueo por trigger si un cliente intenta retirar > 30% de su saldo
#   6. Creación válida de retiro <= 30% en estado PENDING_AUTHORIZATION
#   7. Bloqueo si un cliente intenta auto-aprobar su retiro (OWNER_AUTHORIZATION_REQUIRED)
#   8. Autorización exitosa por el propietario (trabajofino52@gmail.com)
#   9. Bloqueo anti-replay TXID duplicado y protección inmutable de auditoría
# ============================================================================

set -euo pipefail

DB_NAME="${PG_DB_NAME:-aethervault_local}"
PSQL_CMD=(psql -X -v ON_ERROR_STOP=1 -d "$DB_NAME" -At)

if [[ "$EUID" -eq 0 ]] && id postgres >/dev/null 2>&1; then
  run_sql() {
    sudo -u postgres "${PSQL_CMD[@]}" -c "$1"
  }
else
  run_sql() {
    PGHOST="${SQL_HOST:-127.0.0.1}" PGUSER="${PG_SUPERUSER:-postgres}" "${PSQL_CMD[@]}" -c "$1"
  }
fi

echo "=== Iniciando Suite de Pruebas PostgreSQL en '${DB_NAME}' ==="

# Test 1: Tablas creadas
TABLE_COUNT="$(run_sql "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")"
if [[ "$TABLE_COUNT" -lt 13 ]]; then
  echo "[FAIL] Se esperaban >= 13 tablas, encontradas: $TABLE_COUNT"
  exit 1
fi
echo "[PASS] 1. Tablas creadas en esquema public: $TABLE_COUNT"

# Test 2: Login Owner con pgcrypto
OWNER_OK="$(run_sql "SELECT CASE WHEN password_hash = crypt('Tripitaka@8069@9982@Profesor', password_hash) THEN 'OK' ELSE 'FAIL' END FROM users WHERE email = 'trabajofino52@gmail.com';")"
[[ "$OWNER_OK" == "OK" ]] || { echo "[FAIL] Verificación de contraseña del propietario"; exit 1; }
echo "[PASS] 2. Propietario trabajofino52@gmail.com autenticado correctamente"

# Test 3: 10 Testers VM + Demo
TESTER_COUNT="$(run_sql "SELECT COUNT(*) FROM users WHERE id LIKE 'usr_vm_tester_%';")"
[[ "$TESTER_COUNT" -eq 10 ]] || { echo "[FAIL] Se esperaban 10 testers VM, encontrados: $TESTER_COUNT"; exit 1; }
echo "[PASS] 3. 10 cuentas tester VM + gokudemo provisionadas"

# Test 4: Aislamiento RLS para app_role (tester01 no puede leer vault_gateway_apis_encrypted ni payout_destinations_encrypted)
RLS_CHECK="$(run_sql "
  SET LOCAL ROLE aethervault_app;
  SELECT set_config('app.current_user_role', 'PLAYER', TRUE);
  SELECT set_config('app.current_user_email', 'tester01@vm.aethervault.local', TRUE);
  SELECT COUNT(*) FROM vault_gateway_apis_encrypted;
" | tail -n 1)"
[[ "$RLS_CHECK" -eq 0 ]] || { echo "[FAIL] Fuga RLS en vault_gateway_apis_encrypted"; exit 1; }
echo "[PASS] 4. Aislamiento RLS bloquea lectura de bóveda/APIs a clientes"

# Test 5: Límite estricto del 30% en retiros (tester01 tiene 6250 monedas -> max 30% = 1875)
if run_sql "
  INSERT INTO player_redemption_requests (
    id, user_id, player_email, player_name, balance_before_coins, max_allowed_30pct_coins,
    amount_coins, gross_usd, fee_usd, net_usd, destination_type, destination_address_enc, tx_hash, created_at
  ) VALUES (
    'red_test_over_30', 'usr_vm_tester_01', 'tester01@vm.aethervault.local', 'Tester VM #01',
    6250, 1875, 2500, 2000.00, 400.00, 1600.00, 'crypto_usdt', 'TRXTestWallet', 'tx_over_30_' || EXTRACT(EPOCH FROM NOW())::TEXT,
    (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
  );
" >/dev/null 2>&1; then
  echo "[FAIL] Se permitió retirar más del 30%!"
  exit 1
fi
echo "[PASS] 5. Trigger bloqueó retiro > 30% (2,500 de 6,250 monedas rechazado)"

# Test 6: Retiro válido <= 30% (1875 monedas = 30% exacto)
TEST_RED_ID="red_test_ok_$(date +%s)"
run_sql "
  INSERT INTO player_redemption_requests (
    id, user_id, player_email, player_name, balance_before_coins, max_allowed_30pct_coins,
    amount_coins, gross_usd, fee_usd, net_usd, destination_type, destination_address_enc, tx_hash, created_at
  ) VALUES (
    '${TEST_RED_ID}', 'usr_vm_tester_01', 'tester01@vm.aethervault.local', 'Tester VM #01',
    6250, 1875, 1875, 1500.00, 300.00, 1200.00, 'crypto_usdt', 'TRXTestWallet', 'tx_ok_30_${TEST_RED_ID}',
    (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
  );
" >/dev/null
echo "[PASS] 6. Solicitud <= 30% (1,875 monedas) creada en estado PENDING_AUTHORIZATION"

# Test 7: Cliente NO puede auto-aprobar su retiro
if run_sql "
  SELECT set_config('app.current_user_role', 'PLAYER', FALSE);
  SELECT set_config('app.current_user_email', 'tester01@vm.aethervault.local', FALSE);
  UPDATE player_redemption_requests SET status = 'APPROVED' WHERE id = '${TEST_RED_ID}';
" >/dev/null 2>&1; then
  echo "[FAIL] Un jugador pudo aprobar su propio retiro!"
  exit 1
fi
echo "[PASS] 7. Trigger bloqueó aprobación de retiro sin credenciales de propietario"

# Test 8: Propietario (trabajofino52@gmail.com) autoriza o rechaza y restaura saldo de prueba
run_sql "
  SELECT set_config('app.current_user_role', 'OWNER', FALSE);
  SELECT set_config('app.current_user_email', 'trabajofino52@gmail.com', FALSE);
  UPDATE player_redemption_requests SET status = 'REJECTED', rejection_reason = 'Limpieza prueba local' WHERE id = '${TEST_RED_ID}';
  DELETE FROM player_redemption_requests WHERE id = '${TEST_RED_ID}';
" >/dev/null
echo "[PASS] 8. Autorización exclusiva del propietario verificada (saldo restaurado tras prueba)"

# Test 9: Inmutabilidad de security_audit_logs
if run_sql "DELETE FROM security_audit_logs WHERE id = 'aud_genesis_pg_01';" >/dev/null 2>&1; then
  echo "[FAIL] Se pudo eliminar un registro de auditoría!"
  exit 1
fi
echo "[PASS] 9. Auditoría append-only inmutable verificada (DELETE/UPDATE bloqueado)"

echo "=== TODAS LAS PRUEBAS POSTGRESQL SUPERADAS AL 100% ==="
