-- ============================================================================
-- AetherVault - Estructura Completa de Base de Datos PostgreSQL 17
-- ============================================================================
-- Incluye:
--   1. Usuarios (Propietario, Demo aislado, Testers VM y Jugadores) + Lockout
--   2. Sesiones activas HMAC / revocación
--   3. Bóvedas de Retiro Cifradas (USDT / BTC / PayPal / IBAN)
--   4. APIs Cifradas de Pasarelas (BTCPay Server, NOWPayments, CoinGate, On-Ramps, Tarjetas Virtuales)
--   5. Órdenes de Compra de Monedas con bloqueo Anti-Replay (TXID único SHA-256)
--   6. Solicitudes de Retiro de Clientes con:
--        * LÍMITE ESTRICTO DEL 30% DEL SALDO (Trigger PostgreSQL)
--        * AUTORIZACIÓN EXCLUSIVA DEL PROPIETARIO (trabajofino52@gmail.com)
--   7. Retiros Administrativos del Propietario y Snapshots Económicos (70/30/20%)
--   8. Regalos / Airdrops, Horas Locas, Rondas Provably Fair
--   9. Tickets de Soporte y Mensajes
--  10. Auditoría Inmutable (Append-Only SHA-256) y Logs QA de Máquina Virtual
--  11. Políticas Row-Level Security (RLS) y privilegios mínimos para app
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 0. Rol de aplicación (solo si no existe) y endurecimiento del esquema public
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'aethervault_app') THEN
    CREATE ROLE aethervault_app WITH LOGIN PASSWORD 'Tripitaka@8069@9982@Profesor' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  ELSE
    ALTER ROLE aethervault_app WITH PASSWORD 'Tripitaka@8069@9982@Profesor';
  END IF;
END
$$;

REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO aethervault_app;

-- ----------------------------------------------------------------------------
-- 1. Usuarios & Control de Acceso
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('OWNER', 'DEMO', 'PLAYER')),
  password_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  is_demo_isolated BOOLEAN NOT NULL DEFAULT FALSE,
  coins_balance BIGINT NOT NULL DEFAULT 0 CHECK (coins_balance >= 0),
  failed_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  locked_until BIGINT NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pg_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_pg_users_email_lower ON users (LOWER(email));

-- ----------------------------------------------------------------------------
-- 2. Sesiones Firmadas & Revocación
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  token_digest TEXT NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  expires_at BIGINT NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pg_sessions_user ON user_sessions (user_id, expires_at DESC);

-- ----------------------------------------------------------------------------
-- 3. Cuentas de Retiro / Bóveda del Propietario (Cifradas AES-256-GCM / pgcrypto)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payout_destinations_encrypted (
  id TEXT PRIMARY KEY,
  owner_email TEXT NOT NULL UNIQUE,
  encrypted_payload TEXT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- ----------------------------------------------------------------------------
-- 4. APIs de Pasarelas Crypto, On-Ramps y Tarjetas Virtuales (Cifradas AES-256-GCM)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vault_gateway_apis_encrypted (
  id TEXT PRIMARY KEY,
  owner_email TEXT NOT NULL UNIQUE,
  encrypted_payload TEXT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- ----------------------------------------------------------------------------
-- 5. Órdenes de Compra de Monedas & Flujo USDT/BTCPay/NOWPayments/On-Ramps
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS coin_purchase_orders (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  tier_level INTEGER NOT NULL CHECK (tier_level BETWEEN 1 AND 10),
  tier_name TEXT NOT NULL,
  coins_amount BIGINT NOT NULL CHECK (coins_amount > 0),
  price_usd NUMERIC(12, 2) NOT NULL CHECK (price_usd > 0),
  payment_method TEXT NOT NULL,
  usdt_network TEXT NOT NULL CHECK (usdt_network IN ('TRC20', 'ERC20', 'BEP20')),
  destination_usdt_wallet TEXT NOT NULL,
  gateway_provider TEXT DEFAULT 'DIRECT_USDT',
  gateway_invoice_id TEXT,
  checkout_url TEXT,
  is_live_api BOOLEAN NOT NULL DEFAULT FALSE,
  tx_hash_enc TEXT,
  tx_hash_digest TEXT UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('PENDING_TX', 'VERIFIED_SETTLED', 'REJECTED')),
  auto_settled_to_usdt BOOLEAN NOT NULL DEFAULT TRUE,
  created_at BIGINT NOT NULL,
  settled_at BIGINT
);

CREATE INDEX IF NOT EXISTS idx_pg_orders_email ON coin_purchase_orders (LOWER(user_email));
CREATE INDEX IF NOT EXISTS idx_pg_orders_status ON coin_purchase_orders (status);
CREATE INDEX IF NOT EXISTS idx_pg_orders_created ON coin_purchase_orders (created_at DESC);

CREATE TABLE IF NOT EXISTS btcpay_webhook_events (
  id TEXT PRIMARY KEY,
  delivery_id TEXT NOT NULL UNIQUE,
  invoice_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('InvoiceSettled', 'InvoicePaymentSettled', 'InvoiceProcessing', 'InvoiceExpired', 'InvoiceInvalid', 'ManualTest')),
  user_email TEXT NOT NULL,
  coins_credited BIGINT NOT NULL DEFAULT 0 CHECK (coins_credited >= 0),
  amount_usd NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (amount_usd >= 0),
  blockchain_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  signature_verified BOOLEAN NOT NULL DEFAULT FALSE,
  firestore_synced BOOLEAN NOT NULL DEFAULT FALSE,
  firestore_synced_at BIGINT,
  raw_summary TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pg_btcpay_wh_created ON btcpay_webhook_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pg_btcpay_wh_invoice ON btcpay_webhook_events (invoice_id);

-- ----------------------------------------------------------------------------
-- 6. Retiros de Clientes: Límite 30% + Autorización Obligatoria del Propietario
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS player_redemption_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  player_email TEXT NOT NULL,
  player_name TEXT NOT NULL,
  balance_before_coins BIGINT NOT NULL CHECK (balance_before_coins > 0),
  max_allowed_30pct_coins BIGINT NOT NULL CHECK (max_allowed_30pct_coins >= 0),
  requested_original_coins BIGINT,
  capped_automatically BOOLEAN NOT NULL DEFAULT FALSE,
  amount_coins BIGINT NOT NULL CHECK (amount_coins > 0 AND amount_coins <= max_allowed_30pct_coins),
  gross_usd NUMERIC(12, 2) NOT NULL CHECK (gross_usd > 0),
  fee_usd NUMERIC(12, 2) NOT NULL CHECK (fee_usd >= 0),
  net_usd NUMERIC(12, 2) NOT NULL CHECK (net_usd > 0),
  destination_type TEXT NOT NULL CHECK (destination_type IN ('crypto_usdt', 'crypto_monero', 'crypto_btc', 'paypal', 'bank_wire')),
  destination_address_enc TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING_AUTHORIZATION' CHECK (status IN ('PENDING_AUTHORIZATION', 'APPROVED', 'REJECTED')),
  awaiting_authorization BOOLEAN NOT NULL DEFAULT TRUE,
  authorized_by_email TEXT,
  rejection_reason TEXT,
  tx_hash TEXT NOT NULL UNIQUE,
  created_at BIGINT NOT NULL,
  reviewed_at BIGINT
);

ALTER TABLE player_redemption_requests ADD COLUMN IF NOT EXISTS requested_original_coins BIGINT;
ALTER TABLE player_redemption_requests ADD COLUMN IF NOT EXISTS capped_automatically BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE player_redemption_requests ADD COLUMN IF NOT EXISTS awaiting_authorization BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_pg_redemptions_email ON player_redemption_requests (LOWER(player_email));
CREATE INDEX IF NOT EXISTS idx_pg_redemptions_status ON player_redemption_requests (status, awaiting_authorization, created_at DESC);

-- Trigger 1: Limitar automáticamente al 30% del balance total y activar campo "espera de autorización"
CREATE OR REPLACE FUNCTION enforce_client_30pct_withdrawal_cap()
RETURNS TRIGGER AS $$
DECLARE
  v_user RECORD;
  v_max_30 BIGINT;
  v_requested BIGINT;
BEGIN
  SELECT id, role, is_active, is_demo_isolated, coins_balance
  INTO v_user
  FROM users
  WHERE id = NEW.user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'USER_NOT_FOUND: El usuario solicitante no existe.';
  END IF;

  IF v_user.role = 'DEMO' OR v_user.is_demo_isolated THEN
    RAISE EXCEPTION 'DEMO_ISOLATED: Las cuentas demo tienen prohibido retirar fondos reales.';
  END IF;

  IF NOT v_user.is_active THEN
    RAISE EXCEPTION 'ACCOUNT_INACTIVE: La cuenta debe confirmar al menos un depósito real antes de retirar.';
  END IF;

  v_max_30 := FLOOR(v_user.coins_balance * 0.30)::BIGINT;

  IF v_max_30 <= 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_ELIGIBLE_BALANCE: Saldo insuficiente para alcanzar el cupo mínimo retirable del 30%%.';
  END IF;

  v_requested := GREATEST(COALESCE(NEW.requested_original_coins, NEW.amount_coins), 1);

  -- Limitar automáticamente al 30% si la solicitud excede el tope permitido
  IF NEW.amount_coins > v_max_30 THEN
    NEW.requested_original_coins := v_requested;
    NEW.amount_coins := v_max_30;
    NEW.capped_automatically := TRUE;
    NEW.gross_usd := ROUND((v_max_30 * 0.80)::NUMERIC, 2);
    NEW.fee_usd := ROUND((NEW.gross_usd * 0.20)::NUMERIC, 2);
    NEW.net_usd := ROUND((NEW.gross_usd - NEW.fee_usd)::NUMERIC, 2);
  ELSE
    NEW.requested_original_coins := v_requested;
    NEW.capped_automatically := COALESCE(NEW.capped_automatically, FALSE);
  END IF;

  -- Forzar valores autoritativos desde la base de datos y activar espera de autorización manual
  NEW.balance_before_coins := v_user.coins_balance;
  NEW.max_allowed_30pct_coins := v_max_30;
  NEW.status := 'PENDING_AUTHORIZATION';
  NEW.awaiting_authorization := TRUE;
  NEW.authorized_by_email := NULL;
  NEW.reviewed_at := NULL;

  -- Reservar/descontar monedas mientras permanece en espera de autorización del dueño
  UPDATE users
  SET coins_balance = coins_balance - NEW.amount_coins,
      updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
  WHERE id = v_user.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_30pct_withdrawal ON player_redemption_requests;
CREATE TRIGGER trg_enforce_30pct_withdrawal
  BEFORE INSERT ON player_redemption_requests
  FOR EACH ROW
  EXECUTE FUNCTION enforce_client_30pct_withdrawal_cap();

-- Trigger 2: Solo el Propietario (trabajofino52@gmail.com) puede resolver "espera de autorización"
CREATE OR REPLACE FUNCTION enforce_owner_withdrawal_authorization()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_role TEXT;
  v_actor_email TEXT;
BEGIN
  IF OLD.status <> 'PENDING_AUTHORIZATION' OR OLD.awaiting_authorization IS FALSE THEN
    RAISE EXCEPTION 'TERMINAL_STATE_LOCKED: La solicitud % ya salió de espera de autorización (%).', OLD.id, OLD.status;
  END IF;

  IF NEW.status IN ('APPROVED', 'REJECTED') THEN
    v_actor_role := COALESCE(current_setting('app.current_user_role', TRUE), '');
    v_actor_email := LOWER(COALESCE(current_setting('app.current_user_email', TRUE), ''));

    IF v_actor_role <> 'OWNER' OR v_actor_email <> 'trabajofino52@gmail.com' THEN
      RAISE EXCEPTION 'OWNER_AUTHORIZATION_REQUIRED: Únicamente el propietario (trabajofino52@gmail.com) puede autorizar o rechazar retiros.';
    END IF;

    NEW.awaiting_authorization := FALSE;
    NEW.authorized_by_email := 'trabajofino52@gmail.com';
    NEW.reviewed_at := COALESCE(NEW.reviewed_at, (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT);

    -- Si el administrador rechaza el retiro, se devuelven las monedas al saldo del cliente
    IF NEW.status = 'REJECTED' THEN
      UPDATE users
      SET coins_balance = coins_balance + OLD.amount_coins,
          updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
      WHERE id = OLD.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_owner_auth_withdrawal ON player_redemption_requests;
CREATE TRIGGER trg_enforce_owner_auth_withdrawal
  BEFORE UPDATE ON player_redemption_requests
  FOR EACH ROW
  EXECUTE FUNCTION enforce_owner_withdrawal_authorization();

-- ----------------------------------------------------------------------------
-- 7. Retiros del Administrador & Economía 70% Bóveda / 30% Premios / 20% Fee
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_withdrawals (
  id TEXT PRIMARY KEY,
  owner_email TEXT NOT NULL,
  amount_usd NUMERIC(12, 2) NOT NULL CHECK (amount_usd > 0),
  destination_type TEXT NOT NULL CHECK (destination_type IN ('crypto_usdt', 'crypto_monero', 'crypto_btc', 'bank_wire', 'paypal')),
  destination_address_enc TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PROCESSED', 'PENDING')),
  tx_hash TEXT NOT NULL UNIQUE,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS vault_economics_state (
  id TEXT PRIMARY KEY,
  house_retention_rate NUMERIC(5, 2) NOT NULL DEFAULT 70.00 CHECK (house_retention_rate BETWEEN 50 AND 95),
  player_prize_rate NUMERIC(5, 2) NOT NULL DEFAULT 30.00 CHECK (player_prize_rate BETWEEN 5 AND 50),
  redemption_fee_rate NUMERIC(5, 2) NOT NULL DEFAULT 20.00 CHECK (redemption_fee_rate BETWEEN 0 AND 40),
  max_client_withdrawal_pct NUMERIC(5, 2) NOT NULL DEFAULT 30.00 CHECK (max_client_withdrawal_pct BETWEEN 5 AND 100),
  total_wagered_coins BIGINT NOT NULL DEFAULT 0,
  house_vault_coins BIGINT NOT NULL DEFAULT 0,
  prize_reserve_coins BIGINT NOT NULL DEFAULT 0,
  withdrawal_fees_usd NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  updated_at BIGINT NOT NULL
);

-- ----------------------------------------------------------------------------
-- 8. Airdrops / Regalos, Horas Locas & Rondas Provably Fair
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS coin_gifts (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_label TEXT NOT NULL,
  amount_coins BIGINT NOT NULL CHECK (amount_coins > 0),
  reason TEXT NOT NULL,
  recipients_count INTEGER NOT NULL CHECK (recipients_count >= 0),
  total_coins_distributed BIGINT NOT NULL CHECK (total_coins_distributed >= 0),
  tx_hash TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS happy_hour_campaigns (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  multiplier NUMERIC(4, 2) NOT NULL CHECK (multiplier >= 1.0),
  game_section TEXT NOT NULL,
  target_group TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  start_time BIGINT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  expires_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS provably_fair_rounds (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  game TEXT NOT NULL,
  server_seed_hash TEXT NOT NULL,
  client_seed TEXT NOT NULL,
  nonce BIGINT NOT NULL,
  wager_coins BIGINT NOT NULL DEFAULT 0,
  payout_coins BIGINT NOT NULL DEFAULT 0,
  outcome TEXT NOT NULL,
  revealed_server_seed TEXT,
  verified BOOLEAN NOT NULL DEFAULT TRUE,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pg_pf_user ON provably_fair_rounds (LOWER(user_email), created_at DESC);

-- ----------------------------------------------------------------------------
-- 9. Tickets de Soporte y Mensajes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ABIERTO', 'EN_REVISION', 'RESPONDIDO', 'RESUELTO', 'REEMBOLSO_PROCESADO')),
  payment_tx_hash_enc TEXT,
  payment_amount_coins BIGINT,
  payment_gateway TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_email TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  message TEXT NOT NULL,
  timestamp BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pg_tickets_email ON support_tickets (LOWER(user_email));
CREATE INDEX IF NOT EXISTS idx_pg_tickets_status ON support_tickets (status);

-- ----------------------------------------------------------------------------
-- 10. Auditoría Inmutable SHA-256 (Append-Only) & Logs QA VM
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS security_audit_logs (
  seq BIGSERIAL PRIMARY KEY,
  id TEXT NOT NULL UNIQUE,
  timestamp BIGINT NOT NULL,
  actor_email TEXT NOT NULL,
  ip_address INET NOT NULL,
  action TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('INFO', 'WARN', 'CRITICAL')),
  details TEXT NOT NULL,
  prev_hash TEXT NOT NULL,
  row_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pg_audit_ts ON security_audit_logs (timestamp DESC);

CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'SECURITY_VIOLATION: security_audit_logs es inmutable (solo INSERT permitido).';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_no_update_delete ON security_audit_logs;
CREATE TRIGGER trg_audit_no_update_delete
  BEFORE UPDATE OR DELETE ON security_audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_mutation();

CREATE TABLE IF NOT EXISTS vm_experience_logs (
  seq BIGSERIAL PRIMARY KEY,
  id TEXT NOT NULL UNIQUE,
  timestamp BIGINT NOT NULL,
  user_email TEXT NOT NULL,
  session_id TEXT NOT NULL,
  category TEXT NOT NULL,
  game_name TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('INFO', 'WARN', 'ERROR', 'BUG_REPORT')),
  summary TEXT NOT NULL,
  details_json TEXT NOT NULL,
  ip_address TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pg_vm_exp_ts ON vm_experience_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_pg_vm_exp_sev ON vm_experience_logs (severity);

-- ----------------------------------------------------------------------------
-- 11. Row-Level Security (RLS) Estricto por Sesión
-- ----------------------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_destinations_encrypted ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_gateway_apis_encrypted ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE btcpay_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_redemption_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE vm_experience_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_isolation_policy ON users;
CREATE POLICY users_isolation_policy ON users
  USING (
    current_setting('app.current_user_role', TRUE) = 'OWNER'
    OR LOWER(email) = LOWER(COALESCE(current_setting('app.current_user_email', TRUE), ''))
  );

DROP POLICY IF EXISTS sessions_isolation_policy ON user_sessions;
CREATE POLICY sessions_isolation_policy ON user_sessions
  USING (
    current_setting('app.current_user_role', TRUE) = 'OWNER'
    OR LOWER(user_email) = LOWER(COALESCE(current_setting('app.current_user_email', TRUE), ''))
  );

DROP POLICY IF EXISTS payouts_owner_only_policy ON payout_destinations_encrypted;
CREATE POLICY payouts_owner_only_policy ON payout_destinations_encrypted
  USING (current_setting('app.current_user_role', TRUE) = 'OWNER')
  WITH CHECK (current_setting('app.current_user_role', TRUE) = 'OWNER');

DROP POLICY IF EXISTS vault_apis_owner_only_policy ON vault_gateway_apis_encrypted;
CREATE POLICY vault_apis_owner_only_policy ON vault_gateway_apis_encrypted
  USING (current_setting('app.current_user_role', TRUE) = 'OWNER')
  WITH CHECK (current_setting('app.current_user_role', TRUE) = 'OWNER');

DROP POLICY IF EXISTS orders_isolation_policy ON coin_purchase_orders;
CREATE POLICY orders_isolation_policy ON coin_purchase_orders
  USING (
    current_setting('app.current_user_role', TRUE) = 'OWNER'
    OR LOWER(user_email) = LOWER(COALESCE(current_setting('app.current_user_email', TRUE), ''))
  )
  WITH CHECK (
    current_setting('app.current_user_role', TRUE) = 'OWNER'
    OR LOWER(user_email) = LOWER(COALESCE(current_setting('app.current_user_email', TRUE), ''))
  );

DROP POLICY IF EXISTS redemptions_isolation_policy ON player_redemption_requests;
CREATE POLICY redemptions_isolation_policy ON player_redemption_requests
  USING (
    current_setting('app.current_user_role', TRUE) = 'OWNER'
    OR LOWER(player_email) = LOWER(COALESCE(current_setting('app.current_user_email', TRUE), ''))
  )
  WITH CHECK (
    current_setting('app.current_user_role', TRUE) = 'OWNER'
    OR LOWER(player_email) = LOWER(COALESCE(current_setting('app.current_user_email', TRUE), ''))
  );

DROP POLICY IF EXISTS admin_wd_owner_only_policy ON admin_withdrawals;
CREATE POLICY admin_wd_owner_only_policy ON admin_withdrawals
  USING (current_setting('app.current_user_role', TRUE) = 'OWNER')
  WITH CHECK (current_setting('app.current_user_role', TRUE) = 'OWNER');

DROP POLICY IF EXISTS tickets_isolation_policy ON support_tickets;
CREATE POLICY tickets_isolation_policy ON support_tickets
  USING (
    current_setting('app.current_user_role', TRUE) = 'OWNER'
    OR LOWER(user_email) = LOWER(COALESCE(current_setting('app.current_user_email', TRUE), ''))
  )
  WITH CHECK (
    current_setting('app.current_user_role', TRUE) = 'OWNER'
    OR LOWER(user_email) = LOWER(COALESCE(current_setting('app.current_user_email', TRUE), ''))
  );

DROP POLICY IF EXISTS ticket_msgs_isolation_policy ON support_ticket_messages;
CREATE POLICY ticket_msgs_isolation_policy ON support_ticket_messages
  USING (
    current_setting('app.current_user_role', TRUE) = 'OWNER'
    OR EXISTS (
      SELECT 1 FROM support_tickets t
      WHERE t.id = ticket_id
        AND LOWER(t.user_email) = LOWER(COALESCE(current_setting('app.current_user_email', TRUE), ''))
    )
  );

DROP POLICY IF EXISTS vm_logs_policy ON vm_experience_logs;
CREATE POLICY vm_logs_policy ON vm_experience_logs
  USING (
    current_setting('app.current_user_role', TRUE) = 'OWNER'
    OR LOWER(user_email) = LOWER(COALESCE(current_setting('app.current_user_email', TRUE), ''))
  )
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS btcpay_webhooks_owner_policy ON btcpay_webhook_events;
CREATE POLICY btcpay_webhooks_owner_policy ON btcpay_webhook_events
  USING (current_setting('app.current_user_role', TRUE) = 'OWNER')
  WITH CHECK (current_setting('app.current_user_role', TRUE) = 'OWNER');

-- Permisos mínimos necesarios al rol de aplicación (Sin DROP/TRUNCATE/ALTER)
GRANT SELECT, INSERT, UPDATE ON
  users,
  user_sessions,
  payout_destinations_encrypted,
  vault_gateway_apis_encrypted,
  coin_purchase_orders,
  btcpay_webhook_events,
  player_redemption_requests,
  admin_withdrawals,
  vault_economics_state,
  coin_gifts,
  happy_hour_campaigns,
  provably_fair_rounds,
  support_tickets,
  support_ticket_messages
TO aethervault_app;

GRANT SELECT, INSERT, DELETE ON vm_experience_logs TO aethervault_app;
GRANT SELECT, INSERT ON security_audit_logs TO aethervault_app;
GRANT USAGE, SELECT ON SEQUENCE security_audit_logs_seq_seq, vm_experience_logs_seq_seq TO aethervault_app;
