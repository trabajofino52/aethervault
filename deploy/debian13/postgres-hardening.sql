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

-- 3. Bóvedas de Cobro Cifradas en Reposo (AES-256-GCM desde App + TLS en tránsito)
CREATE TABLE IF NOT EXISTS payout_destinations_encrypted (
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

CREATE INDEX IF NOT EXISTS idx_pg_tickets_email ON support_tickets (LOWER(user_email));
CREATE INDEX IF NOT EXISTS idx_pg_tickets_status ON support_tickets (status);
CREATE INDEX IF NOT EXISTS idx_pg_audit_ts ON security_audit_logs (timestamp DESC);

-- 6. Protección Inmutable Append-Only para Auditoría (Impide UPDATE o DELETE incluso al rol app)
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

-- 7. Row-Level Security (RLS) para Aislamiento Estricto por Sesión
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_destinations_encrypted ENABLE ROW LEVEL SECURITY;

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

-- 8. Permisos mínimos necesarios al rol de aplicación (Sin DROP/TRUNCATE/ALTER)
GRANT SELECT, INSERT, UPDATE ON users, support_tickets, support_ticket_messages, payout_destinations_encrypted TO aethervault_app;
GRANT SELECT, INSERT ON security_audit_logs TO aethervault_app;
GRANT USAGE, SELECT ON SEQUENCE security_audit_logs_seq_seq TO aethervault_app;
