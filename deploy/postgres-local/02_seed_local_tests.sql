-- ============================================================================
-- AetherVault - Datos Semilla & Entorno Local de Pruebas (PostgreSQL 17)
-- ============================================================================
-- Ejecutar después de 01_schema_complete.sql:
--   sudo -u postgres psql -d aethervault_local -f 02_seed_local_tests.sql
-- ============================================================================

DO $$
DECLARE
  v_now BIGINT := (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
  v_pad TEXT;
  v_i INTEGER;
BEGIN
  -- 1. Propietario / Administrador Único (trabajofino52@gmail.com)
  INSERT INTO users (
    id, email, display_name, role, password_hash,
    is_active, is_demo_isolated, coins_balance, created_at, updated_at
  )
  VALUES (
    'usr_owner_01',
    'trabajofino52@gmail.com',
    'Administrador Principal',
    'OWNER',
    crypt('Tripitaka@8069@9982@Profesor', gen_salt('bf', 12)),
    TRUE,
    FALSE,
    25000,
    v_now,
    v_now
  )
  ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    is_active = TRUE,
    failed_attempts = 0,
    locked_until = 0,
    updated_at = EXCLUDED.updated_at;

  -- 2. Cuenta Demo Aislada ($5,000 USD virtuales = 6,250 monedas)
  INSERT INTO users (
    id, email, display_name, role, password_hash,
    is_active, is_demo_isolated, coins_balance, created_at, updated_at
  )
  VALUES (
    'usr_demo_01',
    'gokudemo',
    'Goku Demo ($5,000 USD)',
    'DEMO',
    crypt('goku30309982', gen_salt('bf', 10)),
    TRUE,
    TRUE,
    6250,
    v_now,
    v_now
  )
  ON CONFLICT (email) DO NOTHING;

  -- 3. 10 Usuarios de Prueba Local / VM (tester01..tester10, clave: vmtest2026)
  FOR v_i IN 1..10 LOOP
    v_pad := LPAD(v_i::TEXT, 2, '0');
    INSERT INTO users (
      id, email, display_name, role, password_hash,
      is_active, is_demo_isolated, coins_balance, created_at, updated_at
    )
    VALUES (
      'usr_vm_tester_' || v_pad,
      'tester' || v_pad || '@vm.aethervault.local',
      'Tester VM #' || v_pad || ' ($5,000 Prueba)',
      'PLAYER',
      crypt('vmtest2026', gen_salt('bf', 10)),
      TRUE,
      FALSE,
      6250,
      v_now,
      v_now
    )
    ON CONFLICT (email) DO NOTHING;
  END LOOP;

  -- 4. Parámetros de Economía de Bóveda (70% Casa / 30% Premios / 20% Comisión / 30% Tope Retiro)
  INSERT INTO vault_economics_state (
    id, house_retention_rate, player_prize_rate, redemption_fee_rate,
    max_client_withdrawal_pct, total_wagered_coins, house_vault_coins,
    prize_reserve_coins, withdrawal_fees_usd, updated_at
  )
  VALUES (
    'econ_main_01',
    70.00,
    30.00,
    20.00,
    30.00,
    0,
    0,
    0,
    0.00,
    v_now
  )
  ON CONFLICT (id) DO NOTHING;

  -- 5. Campaña Inicial Hora Loca
  INSERT INTO happy_hour_campaigns (
    id, title, multiplier, game_section, target_group,
    is_active, start_time, duration_minutes, expires_at, updated_at
  )
  VALUES (
    'hh_default_01',
    'Hora Loca Dorada x2.0',
    2.00,
    'ALL_GAMES',
    'ALL_PLAYERS',
    FALSE,
    v_now,
    60,
    v_now + 3600000,
    v_now
  )
  ON CONFLICT (id) DO NOTHING;

  -- 6. Registro Génesis de Auditoría Inmutable SHA-256
  IF NOT EXISTS (SELECT 1 FROM security_audit_logs) THEN
    INSERT INTO security_audit_logs (
      id, timestamp, actor_email, ip_address, action, severity, details, prev_hash, row_hash
    )
    VALUES (
      'aud_genesis_pg_01',
      v_now,
      'SYSTEM',
      '127.0.0.1',
      'PG_LOCAL_SEED_INITIALIZED',
      'INFO',
      'Base de datos PostgreSQL local inicializada con RLS, límite 30% de retiros y autorización exclusiva del propietario.',
      REPEAT('0', 64),
      ENCODE(DIGEST('aud_genesis_pg_01|PG_LOCAL_SEED_INITIALIZED|' || v_now::TEXT, 'sha256'), 'hex')
    );
  END IF;
END
$$;
