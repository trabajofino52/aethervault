-- ============================================================================
-- AetherVault - Hardened PostgreSQL 17 Schema & Security Policies (Debian 13)
-- ============================================================================
-- Ejecutar como usuario postgres tras crear el rol aethervault_app:
--   sudo -u postgres psql -d aethervault_prod -f postgres-hardening.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Endurecer privilegios del esquema public
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO aethervault_app;

-- 2. Tabla de Usuarios con Lockout Anti-Brute-Force
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

-- 3. Bóvedas de Cobro y APIs de Pasarelas Cifradas en Reposo (AES-256-GCM desde App + TLS en tránsito)
CREATE TABLE IF NOT EXISTS payout_destinations_encrypted (
  id TEXT PRIMARY KEY,
  owner_email TEXT NOT NULL UNIQUE,
  encrypted_payload TEXT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS vault_gateway_apis_encrypted (
  id TEXT PRIMARY KEY,
  owner_email TEXT NOT NULL UNIQUE,
  encrypted_payload TEXT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- 4. Tickets de Soporte con Hashes TX Cifrados
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

-- 5. Registro de Auditoría Criptográfica Inmutable (Append-Only + Cadena SHA-256)
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

CREATE TABLE IF NOT EXISTS coin_purchase_orders (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  tier_level INTEGER NOT NULL,
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

-- 5b. Retiros de Clientes con Límite Estricto 30% + Campo Espera de Autorización del Propietario
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

CREATE INDEX IF NOT EXISTS idx_pg_tickets_email ON support_tickets (LOWER(user_email));
CREATE INDEX IF NOT EXISTS idx_pg_tickets_status ON support_tickets (status);
CREATE INDEX IF NOT EXISTS idx_pg_audit_ts ON security_audit_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_pg_orders_email ON coin_purchase_orders (LOWER(user_email));
CREATE INDEX IF NOT EXISTS idx_pg_orders_status ON coin_purchase_orders (status);
CREATE INDEX IF NOT EXISTS idx_pg_redemptions_email ON player_redemption_requests (LOWER(player_email));
CREATE INDEX IF NOT EXISTS idx_pg_redemptions_status ON player_redemption_requests (status, awaiting_authorization, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pg_vm_exp_ts ON vm_experience_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_pg_vm_exp_sev ON vm_experience_logs (severity);
CREATE INDEX IF NOT EXISTS idx_pg_btcpay_wh_created ON btcpay_webhook_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pg_btcpay_wh_invoice ON btcpay_webhook_events (invoice_id);

-- 6. Protección Inmutable Append-Only + Triggers 30% y Autorización del Dueño
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
    RAISE EXCEPTION 'ACCOUNT_INACTIVE: La cuenta debe confirmar un depósito real antes de retirar.';
  END IF;

  v_max_30 := FLOOR(v_user.coins_balance * 0.30)::BIGINT;
  IF v_max_30 <= 0 THEN
    RAISE EXCEPTION 'WITHDRAWAL_LIMIT_EXCEEDED_30PCT: Saldo insuficiente para alcanzar el cupo retirable del 30%%.';
  END IF;

  v_requested := GREATEST(COALESCE(NEW.requested_original_coins, NEW.amount_coins), 1);

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

  NEW.balance_before_coins := v_user.coins_balance;
  NEW.max_allowed_30pct_coins := v_max_30;
  NEW.status := 'PENDING_AUTHORIZATION';
  NEW.awaiting_authorization := TRUE;
  NEW.authorized_by_email := NULL;
  NEW.reviewed_at := NULL;

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

CREATE OR REPLACE FUNCTION enforce_owner_withdrawal_authorization()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status <> 'PENDING_AUTHORIZATION' OR OLD.awaiting_authorization IS FALSE THEN
    RAISE EXCEPTION 'TERMINAL_STATE_LOCKED: Solicitud ya salió de espera de autorización.';
  END IF;
  IF NEW.status IN ('APPROVED', 'REJECTED') THEN
    IF COALESCE(current_setting('app.current_user_role', TRUE), '') <> 'OWNER'
       OR LOWER(COALESCE(current_setting('app.current_user_email', TRUE), '')) <> 'trabajofino52@gmail.com' THEN
      RAISE EXCEPTION 'OWNER_AUTHORIZATION_REQUIRED: Solo trabajofino52@gmail.com puede autorizar retiros.';
    END IF;
    NEW.awaiting_authorization := FALSE;
    NEW.authorized_by_email := 'trabajofino52@gmail.com';
    NEW.reviewed_at := COALESCE(NEW.reviewed_at, (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT);
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

-- 7. Row-Level Security (RLS) para Aislamiento Estricto por Sesión
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_destinations_encrypted ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_gateway_apis_encrypted ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE btcpay_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_redemption_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE vm_experience_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_isolation_policy ON users;
CREATE POLICY users_isolation_policy ON users
  USING (
    current_setting('app.current_user_role', TRUE) = 'OWNER'
    OR LOWER(email) = LOWER(COALESCE(current_setting('app.current_user_email', TRUE), ''))
  );

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

-- 8. Permisos mínimos necesarios al rol de aplicación (Sin DROP/TRUNCATE/ALTER)
GRANT SELECT, INSERT, UPDATE ON users, support_tickets, support_ticket_messages, payout_destinations_encrypted, vault_gateway_apis_encrypted, coin_purchase_orders, btcpay_webhook_events, player_redemption_requests TO aethervault_app;
GRANT SELECT, INSERT, DELETE ON vm_experience_logs TO aethervault_app;
GRANT SELECT, INSERT ON security_audit_logs TO aethervault_app;
GRANT USAGE, SELECT ON SEQUENCE security_audit_logs_seq_seq, vm_experience_logs_seq_seq TO aethervault_app;

-- 9. Semilla / Actualización segura del Propietario con hash criptográfico pgcrypto
INSERT INTO users (id, email, display_name, role, password_hash, is_active, is_demo_isolated, coins_balance, created_at, updated_at)
VALUES (
  'usr_owner_01',
  'trabajofino52@gmail.com',
  'Administrador Principal',
  'OWNER',
  crypt('Tripitaka@8069@9982@Profesor', gen_salt('bf', 12)),
  TRUE,
  FALSE,
  25000,
  (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  failed_attempts = 0,
  locked_until = 0,
  updated_at = EXCLUDED.updated_at;
