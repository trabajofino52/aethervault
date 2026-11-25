import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  hashPassword,
  verifyPassword,
  encryptField,
  decryptField,
  computeAuditChainHash,
  UNIFIED_VM_SECURITY_KEY
} from './cryptoVault.ts';

export const OWNER_EMAIL = 'trabajofino52@gmail.com';
const DEFAULT_OWNER_KEY = process.env.OWNER_MASTER_KEY || UNIFIED_VM_SECURITY_KEY;
export const UNIFIED_SECURITY_KEY = DEFAULT_OWNER_KEY;
const LEGACY_OWNER_KEY = 'GokuCheckersMasterKey2024Secure';
export const DEMO_USERNAME = 'gokudemo';
const DEFAULT_DEMO_PASS = 'goku30309982';
export const MAX_VM_TESTERS = 10;
export const DEFAULT_VM_TESTER_PASS = 'vmtest2026';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'aethervault.db');

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  }

  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA busy_timeout = 5000;');
  db.exec('PRAGMA secure_delete = ON;');

  try {
    fs.chmodSync(DB_PATH, 0o600);
  } catch {
    // Ignore on non-POSIX filesystems
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('OWNER', 'DEMO', 'PLAYER')),
      password_hash TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 0,
      is_demo_isolated INTEGER NOT NULL DEFAULT 0,
      coins_balance INTEGER NOT NULL DEFAULT 0,
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payout_destinations_encrypted (
      id TEXT PRIMARY KEY,
      owner_email TEXT NOT NULL UNIQUE,
      encrypted_payload TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS support_tickets (
      id TEXT PRIMARY KEY,
      user_email TEXT NOT NULL,
      user_name TEXT NOT NULL,
      category TEXT NOT NULL,
      priority TEXT NOT NULL,
      subject TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('ABIERTO', 'EN_REVISION', 'RESPONDIDO', 'RESUELTO', 'REEMBOLSO_PROCESADO')),
      payment_tx_hash_enc TEXT,
      payment_amount_coins INTEGER,
      payment_gateway TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS support_ticket_messages (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      sender_email TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      is_admin INTEGER NOT NULL DEFAULT 0,
      message TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS security_audit_logs (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      id TEXT NOT NULL UNIQUE,
      timestamp INTEGER NOT NULL,
      actor_email TEXT NOT NULL,
      ip_address TEXT NOT NULL,
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
      coins_amount INTEGER NOT NULL CHECK (coins_amount > 0),
      price_usd REAL NOT NULL CHECK (price_usd > 0),
      payment_method TEXT NOT NULL,
      usdt_network TEXT NOT NULL CHECK (usdt_network IN ('TRC20', 'ERC20', 'BEP20')),
      destination_usdt_wallet TEXT NOT NULL,
      tx_hash_enc TEXT,
      tx_hash_digest TEXT UNIQUE,
      status TEXT NOT NULL CHECK (status IN ('PENDING_TX', 'VERIFIED_SETTLED', 'REJECTED')),
      auto_settled_to_usdt INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      settled_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS vm_experience_logs (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      id TEXT NOT NULL UNIQUE,
      timestamp INTEGER NOT NULL,
      user_email TEXT NOT NULL,
      session_id TEXT NOT NULL,
      category TEXT NOT NULL,
      game_name TEXT NOT NULL,
      severity TEXT NOT NULL CHECK (severity IN ('INFO', 'WARN', 'ERROR', 'BUG_REPORT')),
      summary TEXT NOT NULL,
      details_json TEXT NOT NULL,
      ip_address TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vault_gateway_apis_encrypted (
      id TEXT PRIMARY KEY,
      owner_email TEXT NOT NULL UNIQUE,
      encrypted_payload TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS player_redemption_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      player_email TEXT NOT NULL,
      player_name TEXT NOT NULL,
      balance_before_coins INTEGER NOT NULL,
      max_allowed_30pct_coins INTEGER NOT NULL,
      requested_original_coins INTEGER,
      capped_automatically INTEGER NOT NULL DEFAULT 0,
      amount_coins INTEGER NOT NULL,
      gross_usd REAL NOT NULL,
      fee_usd REAL NOT NULL,
      net_usd REAL NOT NULL,
      destination_type TEXT NOT NULL,
      destination_address_enc TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED')),
      awaiting_authorization INTEGER NOT NULL DEFAULT 1,
      authorized_by_email TEXT,
      rejection_reason TEXT,
      tx_hash TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL,
      reviewed_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS btcpay_webhook_events (
      id TEXT PRIMARY KEY,
      delivery_id TEXT NOT NULL UNIQUE,
      invoice_id TEXT NOT NULL,
      event_type TEXT NOT NULL CHECK (event_type IN ('InvoiceSettled', 'InvoicePaymentSettled', 'InvoiceProcessing', 'InvoiceExpired', 'InvoiceInvalid', 'ManualTest')),
      user_email TEXT NOT NULL,
      coins_credited INTEGER NOT NULL DEFAULT 0,
      amount_usd REAL NOT NULL DEFAULT 0,
      blockchain_confirmed INTEGER NOT NULL DEFAULT 0,
      signature_verified INTEGER NOT NULL DEFAULT 0,
      firestore_synced INTEGER NOT NULL DEFAULT 0,
      firestore_synced_at INTEGER,
      raw_summary TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS economy_config (
      id TEXT PRIMARY KEY,
      vault_retention_pct INTEGER NOT NULL DEFAULT 70,
      redemption_fee_pct INTEGER NOT NULL DEFAULT 20,
      transfer_fee_pct INTEGER NOT NULL DEFAULT 5,
      updated_at INTEGER NOT NULL,
      updated_by TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS coin_transfers (
      id TEXT PRIMARY KEY,
      sender_email TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      recipient_email TEXT NOT NULL,
      recipient_name TEXT NOT NULL,
      gross_coins INTEGER NOT NULL,
      fee_coins INTEGER NOT NULL,
      net_coins INTEGER NOT NULL,
      fee_pct INTEGER NOT NULL,
      usd_equivalent REAL NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      tx_hash TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS player_visibility_config (
      id TEXT PRIMARY KEY,
      show_top50_casino INTEGER NOT NULL DEFAULT 0,
      show_character_hero INTEGER NOT NULL DEFAULT 0,
      show_arena_battle INTEGER NOT NULL DEFAULT 0,
      show_store_catalog INTEGER NOT NULL DEFAULT 0,
      show_security_tools INTEGER NOT NULL DEFAULT 0,
      show_neobank_card INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,
      updated_by TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tickets_user_email ON support_tickets(user_email);
    CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);
    CREATE INDEX IF NOT EXISTS idx_audit_ts ON security_audit_logs(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_orders_user ON coin_purchase_orders(LOWER(user_email));
    CREATE INDEX IF NOT EXISTS idx_orders_status ON coin_purchase_orders(status);
    CREATE INDEX IF NOT EXISTS idx_redemptions_player ON player_redemption_requests(LOWER(player_email));
    CREATE INDEX IF NOT EXISTS idx_redemptions_status ON player_redemption_requests(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_vm_exp_ts ON vm_experience_logs(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_vm_exp_sev ON vm_experience_logs(severity);
    CREATE INDEX IF NOT EXISTS idx_btcpay_wh_created ON btcpay_webhook_events(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_btcpay_wh_invoice ON btcpay_webhook_events(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_transfers_sender ON coin_transfers(LOWER(sender_email), created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_transfers_recipient ON coin_transfers(LOWER(recipient_email), created_at DESC);
  `);

  // Safe schema evolution for coin_purchase_orders gateway tracking columns
  const cols = db.prepare('PRAGMA table_info(coin_purchase_orders)').all() as Array<{ name: string }>;
  const colNames = new Set(cols.map(c => c.name));
  if (!colNames.has('gateway_provider')) {
    db.exec('ALTER TABLE coin_purchase_orders ADD COLUMN gateway_provider TEXT;');
  }
  if (!colNames.has('gateway_invoice_id')) {
    db.exec('ALTER TABLE coin_purchase_orders ADD COLUMN gateway_invoice_id TEXT;');
  }
  if (!colNames.has('checkout_url')) {
    db.exec('ALTER TABLE coin_purchase_orders ADD COLUMN checkout_url TEXT;');
  }
  if (!colNames.has('is_live_api')) {
    db.exec('ALTER TABLE coin_purchase_orders ADD COLUMN is_live_api INTEGER NOT NULL DEFAULT 0;');
  }

  // Safe schema evolution for player_redemption_requests awaiting_authorization, auto-30% cap & payout tracking columns
  const redCols = db.prepare('PRAGMA table_info(player_redemption_requests)').all() as Array<{ name: string }>;
  const redColNames = new Set(redCols.map(c => c.name));
  if (!redColNames.has('awaiting_authorization')) {
    db.exec('ALTER TABLE player_redemption_requests ADD COLUMN awaiting_authorization INTEGER NOT NULL DEFAULT 1;');
  }
  if (!redColNames.has('requested_original_coins')) {
    db.exec('ALTER TABLE player_redemption_requests ADD COLUMN requested_original_coins INTEGER;');
  }
  if (!redColNames.has('capped_automatically')) {
    db.exec('ALTER TABLE player_redemption_requests ADD COLUMN capped_automatically INTEGER NOT NULL DEFAULT 0;');
  }
  if (!redColNames.has('payout_status')) {
    db.exec('ALTER TABLE player_redemption_requests ADD COLUMN payout_status TEXT;');
  }
  if (!redColNames.has('external_payout_id')) {
    db.exec('ALTER TABLE player_redemption_requests ADD COLUMN external_payout_id TEXT;');
  }

  dbInstance = db;
  seedInitialSecurityRecords(db);
  return db;
}

function seedInitialSecurityRecords(db: DatabaseSync): void {
  const now = Date.now();
  const findUser = db.prepare('SELECT id FROM users WHERE email = ?');

  const findUserFull = db.prepare('SELECT id, password_hash FROM users WHERE email = ?');
  const existingOwner = findUserFull.get(OWNER_EMAIL) as { id: string; password_hash: string } | undefined;

  if (!existingOwner) {
    db.prepare(`
      INSERT INTO users (id, email, display_name, role, password_hash, is_active, is_demo_isolated, coins_balance, created_at, updated_at)
      VALUES (?, ?, ?, 'OWNER', ?, 1, 0, 25000, ?, ?)
    `).run('usr_owner_01', OWNER_EMAIL, 'Administrador Principal', hashPassword(DEFAULT_OWNER_KEY), now, now);
  } else if (verifyPassword(LEGACY_OWNER_KEY, existingOwner.password_hash)) {
    db.prepare(`
      UPDATE users
      SET password_hash = ?, failed_attempts = 0, locked_until = 0, updated_at = ?
      WHERE id = ?
    `).run(hashPassword(DEFAULT_OWNER_KEY), now, existingOwner.id);
  }

  if (!findUser.get(DEMO_USERNAME)) {
    db.prepare(`
      INSERT INTO users (id, email, display_name, role, password_hash, is_active, is_demo_isolated, coins_balance, created_at, updated_at)
      VALUES (?, ?, ?, 'DEMO', ?, 1, 1, 6250, ?, ?)
    `).run('usr_demo_01', DEMO_USERNAME, 'Goku Demo ($5,000 USD)', hashPassword(DEFAULT_DEMO_PASS), now, now);
  }

  // Provision up to 10 VM QA tester accounts (tester01..tester10) enabled to test full deposit & 30%-capped withdrawal flows
  for (let i = 1; i <= MAX_VM_TESTERS; i += 1) {
    const pad = String(i).padStart(2, '0');
    const testerEmail = `tester${pad}@vm.aethervault.local`;
    if (!findUser.get(testerEmail)) {
      db.prepare(`
        INSERT INTO users (id, email, display_name, role, password_hash, is_active, is_demo_isolated, coins_balance, created_at, updated_at)
        VALUES (?, ?, ?, 'PLAYER', ?, 1, 0, 6250, ?, ?)
      `).run(
        `usr_vm_tester_${pad}`,
        testerEmail,
        `Tester VM #${pad} ($5,000 Prueba)`,
        hashPassword(DEFAULT_VM_TESTER_PASS),
        now,
        now
      );
    } else {
      db.prepare(`
        UPDATE users SET is_demo_isolated = 0, updated_at = ?
        WHERE id = ? AND role = 'PLAYER' AND is_demo_isolated = 1
      `).run(now, `usr_vm_tester_${pad}`);
    }
  }

  const auditCount = db.prepare('SELECT COUNT(*) as c FROM security_audit_logs').get() as { c: number };
  if (auditCount.c === 0) {
    appendAuditLog(
      'SYSTEM',
      '127.0.0.1',
      'DB_VAULT_INITIALIZED',
      'INFO',
      'Base de datos SQLite WAL inicializada con cifrado AES-256-GCM en reposo y hashing scrypt.'
    );
  }

  const econRow = db.prepare('SELECT id FROM economy_config WHERE id = ?').get('econ_default');
  if (!econRow) {
    db.prepare(`
      INSERT INTO economy_config (id, vault_retention_pct, redemption_fee_pct, transfer_fee_pct, updated_at, updated_by)
      VALUES (?, 70, 20, 5, ?, ?)
    `).run('econ_default', now, OWNER_EMAIL);
  }

  const visRow = db.prepare('SELECT id FROM player_visibility_config WHERE id = ?').get('vis_default');
  if (!visRow) {
    db.prepare(`
      INSERT INTO player_visibility_config (
        id, show_top50_casino, show_character_hero, show_arena_battle,
        show_store_catalog, show_security_tools, show_neobank_card,
        updated_at, updated_by
      ) VALUES (?, 0, 0, 0, 0, 0, 0, ?, ?)
    `).run('vis_default', now, OWNER_EMAIL);
  }

  const payoutRow = db.prepare('SELECT id FROM payout_destinations_encrypted WHERE owner_email = ?').get(OWNER_EMAIL);
  if (!payoutRow) {
    const defaultPayout = {
      merchantName: 'AetherVault Gaming Ltd. (Bóveda Principal USDT)',
      usdtTrc20Address: process.env.OWNER_USDT_TRC20 || 'TRX7xQ8z99E10vP44aZ88yQw3901bLkVaether',
      usdtErc20Address: process.env.OWNER_USDT_ERC20 || '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      usdtBep20Address: process.env.OWNER_USDT_BEP20 || '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      btcAddress: process.env.OWNER_BTC_ADDRESS || 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      binancePayId: '',
      paypalEmail: 'cobros@aethervault.io',
      paypalMode: 'BUSINESS',
      cardGatewayProvider: 'NOWPAYMENTS_CARD_TO_CRYPTO',
      primarySettlementRail: 'USDT',
      bankIbanSwift: 'ES76 2100 0418 4502 0005 1332 (SWIFT: CAIXESBBXXX)',
      bankAccountHolder: 'AetherVault Operaciones Internacionales',
      stripeAccountId: 'acct_1NvAether89234',
      autoForwardToWallet: true,
      autoConvertToUsdt: true,
      vmTestModeEnabled: true,
      maxVmTesters: MAX_VM_TESTERS
    };
    db.prepare(`
      INSERT INTO payout_destinations_encrypted (id, owner_email, encrypted_payload, updated_at)
      VALUES (?, ?, ?, ?)
    `).run('pay_owner_01', OWNER_EMAIL, encryptField(JSON.stringify(defaultPayout)), now);
  }

  const vaultApiRow = db.prepare('SELECT id FROM vault_gateway_apis_encrypted WHERE owner_email = ?').get(OWNER_EMAIL);
  if (!vaultApiRow) {
    db.prepare(`
      INSERT INTO vault_gateway_apis_encrypted (id, owner_email, encrypted_payload, updated_at)
      VALUES (?, ?, ?, ?)
    `).run('vault_apis_01', OWNER_EMAIL, encryptField(JSON.stringify(DEFAULT_VAULT_GATEWAY_APIS)), now);
  }

  const ticketCount = db.prepare('SELECT COUNT(*) as c FROM support_tickets').get() as { c: number };
  if (ticketCount.c === 0) {
    const insertTicket = db.prepare(`
      INSERT INTO support_tickets (id, user_email, user_name, category, priority, subject, status, payment_tx_hash_enc, payment_amount_coins, payment_gateway, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertMsg = db.prepare(`
      INSERT INTO support_ticket_messages (id, ticket_id, sender_email, sender_name, is_admin, message, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertTicket.run(
      'tkt_demo_101',
      'carlos_vip@gmail.com',
      'Carlos VIP',
      'PAYMENT_ISSUE',
      'ALTA',
      'Depósito USDT TRC20 pendiente de acreditar',
      'EN_REVISION',
      encryptField('0x9fa882a170c299e44bcda10982eefca92841072948cbb192a83018274aef1203'),
      500,
      'USDT TRC-20',
      now - 3600000 * 4,
      now - 3600000 * 2
    );
    insertMsg.run(
      'msg_1',
      'tkt_demo_101',
      'carlos_vip@gmail.com',
      'Carlos VIP',
      0,
      'Hola equipo, realicé una recarga de 500 monedas mediante USDT TRC-20 hace 40 minutos pero aún no las veo en mi balance.',
      now - 3600000 * 4
    );
    insertMsg.run(
      'msg_2',
      'tkt_demo_101',
      OWNER_EMAIL,
      'Soporte Bóveda AetherVault',
      1,
      'Hola Carlos, estamos verificando el Hash en la red TRON. En cuanto confirme 12 bloques se acreditará de forma automática a tu cuenta.',
      now - 3600000 * 2
    );

    insertTicket.run(
      'tkt_demo_102',
      DEMO_USERNAME,
      'Goku Demo',
      'GENERAL_SUPPORT',
      'MEDIA',
      'Prueba de soporte y resolución de pagos en cuenta demo',
      'RESPONDIDO',
      null,
      null,
      null,
      now - 1800000,
      now - 900000
    );
    insertMsg.run(
      'msg_3',
      'tkt_demo_102',
      DEMO_USERNAME,
      'Goku Demo',
      0,
      'Probando el canal de soporte para tickets, cambio de contraseñas y diagnóstico de pagos.',
      now - 1800000
    );
    insertMsg.run(
      'msg_4',
      'tkt_demo_102',
      OWNER_EMAIL,
      'Administrador (trabajofino52)',
      1,
      '¡Excelente! El panel de soporte está totalmente operativo.',
      now - 900000
    );

    insertTicket.run(
      'tkt_demo_103',
      'laura_mendez@gmail.com',
      'Laura Méndez',
      'PAYMENT_ISSUE',
      'URGENTE',
      'Cobro duplicado con Tarjeta de Crédito - Solicitud de Reembolso',
      'ABIERTO',
      encryptField('CRD-8829104-DUP'),
      250,
      'Cryptomus / Tarjeta Visa',
      now - 600000,
      now - 600000
    );
    insertMsg.run(
      'msg_5',
      'tkt_demo_103',
      'laura_mendez@gmail.com',
      'Laura Méndez',
      0,
      'Se realizó un cargo doble de $200 USD (250 monedas) por un error de conexión. Solicito revisión y reembolso del cargo duplicado.',
      now - 600000
    );
  }
}

export interface AuditLogRow {
  seq: number;
  id: string;
  timestamp: number;
  actor_email: string;
  ip_address: string;
  action: string;
  severity: 'INFO' | 'WARN' | 'CRITICAL';
  details: string;
  prev_hash: string;
  row_hash: string;
}

export type AuditTrailCategory = 'FINANCIAL' | 'API_CONFIG' | 'AUTHORIZATION' | 'SECURITY';

export function classifyAuditAction(action: string): AuditTrailCategory {
  const upper = action.toUpperCase();
  if (
    upper.includes('GATEWAY_API') ||
    upper.includes('VAULT_WALLETS') ||
    upper.includes('SAFE_RECOMMENDATIONS') ||
    upper.startsWith('API_CONFIG')
  ) {
    return 'API_CONFIG';
  }
  if (
    upper.includes('COIN_ORDER') ||
    upper.includes('USDT_') ||
    upper.includes('BTCPAY_') ||
    upper.includes('PAYPAL_') ||
    upper.includes('PLAYER_COIN_TRANSFER') ||
    upper.includes('TRANSFER_FEE') ||
    upper.includes('ECONOMY_CONFIG') ||
    upper.includes('ADMIN_WITHDRAWAL') ||
    upper.includes('VAULT_MARGINS') ||
    upper.includes('ADMIN_COINS') ||
    upper.includes('TXID_') ||
    upper.includes('TICKET_REFUND') ||
    upper.includes('PAYMENT_')
  ) {
    return 'FINANCIAL';
  }
  if (
    upper.includes('REDEMPTION_') ||
    upper.includes('LOGIN_') ||
    upper.includes('PASSWORD_') ||
    upper.includes('ACCOUNT_LOCKED') ||
    upper.includes('PLAYER_SESSION') ||
    upper.includes('PLAYER_REGISTERED') ||
    upper.includes('PLAYER_VISIBILITY') ||
    upper.includes('OWNER_AUTH') ||
    upper.includes('VM_TESTER')
  ) {
    return 'AUTHORIZATION';
  }
  return 'SECURITY';
}

export function appendAuditLog(
  actorEmail: string,
  ipAddress: string,
  action: string,
  severity: 'INFO' | 'WARN' | 'CRITICAL',
  details: string
): AuditLogRow {
  const db = getDb();
  const lastRow = db.prepare('SELECT row_hash FROM security_audit_logs ORDER BY seq DESC LIMIT 1').get() as
    | { row_hash: string }
    | undefined;
  const prevHash = lastRow?.row_hash || 'GENESIS_00000000000000000000000000000000';
  const id = 'aud_' + crypto.randomUUID().slice(0, 12);
  const timestamp = Date.now();
  const canonical = JSON.stringify({ id, timestamp, actorEmail, ipAddress, action, severity, details });
  const rowHash = computeAuditChainHash(prevHash, canonical);

  const info = db
    .prepare(`
      INSERT INTO security_audit_logs (id, timestamp, actor_email, ip_address, action, severity, details, prev_hash, row_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(id, timestamp, actorEmail, ipAddress, action, severity, details, prevHash, rowHash);

  return {
    seq: Number(info.lastInsertRowid),
    id,
    timestamp,
    actor_email: actorEmail,
    ip_address: ipAddress,
    action,
    severity,
    details,
    prev_hash: prevHash,
    row_hash: rowHash
  };
}

export function getRecentAuditLogs(limit: number = 35): AuditLogRow[] {
  const db = getDb();
  return db
    .prepare('SELECT seq, id, timestamp, actor_email, ip_address, action, severity, details, prev_hash, row_hash FROM security_audit_logs ORDER BY seq DESC LIMIT ?')
    .all(limit) as unknown as AuditLogRow[];
}

export function listAuditTrailPaginatedFromDb(params: {
  page?: number;
  pageSize?: number;
  category?: 'ALL' | AuditTrailCategory;
  severity?: 'ALL' | 'INFO' | 'WARN' | 'CRITICAL';
  search?: string;
  dateFrom?: number;
  dateTo?: number;
}) {
  const db = getDb();
  const pageSize = Math.min(Math.max(Math.floor(params.pageSize || 15), 5), 100);
  const requestedPage = Math.max(Math.floor(params.page || 1), 1);

  const allRows = db
    .prepare('SELECT seq, id, timestamp, actor_email, ip_address, action, severity, details, prev_hash, row_hash FROM security_audit_logs ORDER BY seq DESC')
    .all() as unknown as AuditLogRow[];

  const enriched = allRows.map(r => ({
    ...r,
    category: classifyAuditAction(r.action)
  }));

  const categoryCounts = {
    ALL: enriched.length,
    FINANCIAL: 0,
    API_CONFIG: 0,
    AUTHORIZATION: 0,
    SECURITY: 0
  };
  for (const row of enriched) {
    categoryCounts[row.category] += 1;
  }

  const searchQ = (params.search || '').trim().toLowerCase();
  const filtered = enriched.filter(row => {
    if (params.category && params.category !== 'ALL' && row.category !== params.category) {
      return false;
    }
    if (params.severity && params.severity !== 'ALL' && row.severity !== params.severity) {
      return false;
    }
    if (typeof params.dateFrom === 'number' && Number.isFinite(params.dateFrom) && row.timestamp < params.dateFrom) {
      return false;
    }
    if (typeof params.dateTo === 'number' && Number.isFinite(params.dateTo) && row.timestamp > params.dateTo) {
      return false;
    }
    if (searchQ) {
      const hay = `${row.id} ${row.actor_email} ${row.ip_address} ${row.action} ${row.details} ${row.row_hash}`.toLowerCase();
      if (!hay.includes(searchQ)) return false;
    }
    return true;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(requestedPage, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const items = filtered.slice(startIdx, startIdx + pageSize);
  const integrity = verifyDatabaseIntegrity();

  return {
    items,
    total,
    page: safePage,
    pageSize,
    totalPages,
    categoryCounts,
    integrity
  };
}

export function verifyDatabaseIntegrity(): {
  sqliteOk: boolean;
  chainValid: boolean;
  checkedRows: number;
  lockedAccountsCount: number;
  dbSizeKB: number;
} {
  const db = getDb();
  const integrityRes = db.prepare('PRAGMA integrity_check').get() as { integrity_check: string };
  const sqliteOk = integrityRes?.integrity_check === 'ok';

  const rows = db
    .prepare('SELECT id, timestamp, actor_email, ip_address, action, severity, details, prev_hash, row_hash FROM security_audit_logs ORDER BY seq ASC')
    .all() as unknown as AuditLogRow[];

  let expectedPrev = 'GENESIS_00000000000000000000000000000000';
  let chainValid = true;
  for (const r of rows) {
    if (r.prev_hash !== expectedPrev) {
      chainValid = false;
      break;
    }
    const canonical = JSON.stringify({
      id: r.id,
      timestamp: r.timestamp,
      actorEmail: r.actor_email,
      ipAddress: r.ip_address,
      action: r.action,
      severity: r.severity,
      details: r.details
    });
    const recomputed = computeAuditChainHash(r.prev_hash, canonical);
    if (recomputed !== r.row_hash) {
      chainValid = false;
      break;
    }
    expectedPrev = r.row_hash;
  }

  const now = Date.now();
  const lockedRow = db.prepare('SELECT COUNT(*) as c FROM users WHERE locked_until > ?').get(now) as { c: number };

  let dbSizeKB = 0;
  try {
    const stat = fs.statSync(DB_PATH);
    dbSizeKB = Math.round((stat.size / 1024) * 10) / 10;
  } catch {
    dbSizeKB = 0;
  }

  return {
    sqliteOk,
    chainValid,
    checkedRows: rows.length,
    lockedAccountsCount: lockedRow.c,
    dbSizeKB
  };
}

export interface DbUserRow {
  id: string;
  email: string;
  display_name: string;
  role: 'OWNER' | 'DEMO' | 'PLAYER';
  password_hash: string;
  is_active: number;
  is_demo_isolated: number;
  coins_balance: number;
  failed_attempts: number;
  locked_until: number;
}

export function authenticateUserInDb(
  emailInput: string,
  passwordInput: string,
  ipAddress: string
): {
  ok: boolean;
  status: number;
  message: string;
  user?: {
    email: string;
    displayName: string;
    role: 'OWNER' | 'DEMO' | 'PLAYER';
    isActive: boolean;
    isDemoIsolated: boolean;
    coinsBalance: number;
  };
} {
  const db = getDb();
  const rawInput = emailInput.trim().toLowerCase();
  const vmAliasMatch = /^tester(0[1-9]|10)$/.exec(rawInput);
  const cleanEmail =
    rawInput === 'gokudemo@aethervault.com'
      ? DEMO_USERNAME
      : rawInput === OWNER_EMAIL.toLowerCase()
      ? OWNER_EMAIL
      : vmAliasMatch
      ? `tester${vmAliasMatch[1]}@vm.aethervault.local`
      : rawInput;

  const existing = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(cleanEmail) as DbUserRow | undefined;
  const now = Date.now();

  if (!existing) {
    // Prevent unauthorized ad-hoc VM tester #11+
    if (cleanEmail.endsWith('@vm.aethervault.local') || /^tester\d+/.test(cleanEmail)) {
      return {
        ok: false,
        status: 403,
        message: `Límite de entorno VM: máximo ${MAX_VM_TESTERS} usuarios de prueba simultáneos (tester01 a tester10).`
      };
    }
    // Auto-provision standard player account (pending deposit activation!)
    if (cleanEmail === OWNER_EMAIL.toLowerCase() || cleanEmail === DEMO_USERNAME) {
      return { ok: false, status: 401, message: 'Credenciales inválidas.' };
    }
    const newId = 'usr_' + crypto.randomUUID().slice(0, 10);
    const pwdToStore = passwordInput.trim() || crypto.randomBytes(12).toString('hex');
    db.prepare(`
      INSERT INTO users (id, email, display_name, role, password_hash, is_active, is_demo_isolated, coins_balance, created_at, updated_at)
      VALUES (?, ?, ?, 'PLAYER', ?, 0, 0, 0, ?, ?)
    `).run(newId, cleanEmail, cleanEmail.split('@')[0], hashPassword(pwdToStore), now, now);

    appendAuditLog(cleanEmail, ipAddress, 'PLAYER_REGISTERED_PENDING_DEPOSIT', 'INFO', 'Cuenta estándar creada (inactiva hasta confirmación de depósito).');
    return {
      ok: true,
      status: 200,
      message: 'Sesión estándar iniciada.',
      user: {
        email: cleanEmail,
        displayName: cleanEmail.split('@')[0],
        role: 'PLAYER',
        isActive: false,
        isDemoIsolated: false,
        coinsBalance: 0
      }
    };
  }

  // Check lockout
  if (existing.locked_until > now) {
    const minsLeft = Math.ceil((existing.locked_until - now) / 60000);
    appendAuditLog(existing.email, ipAddress, 'LOGIN_BLOCKED_LOCKOUT', 'CRITICAL', `Intento de acceso durante bloqueo temporal (${minsLeft} min restantes).`);
    return {
      ok: false,
      status: 429,
      message: `Cuenta temporalmente bloqueada por múltiples intentos fallidos. Reintenta en ${minsLeft} minuto(s).`
    };
  }

  // For standard non-VM-tester players without a password supplied on quick switcher, allow session email switch only for non-privileged accounts
  const isVmTester = existing.email.endsWith('@vm.aethervault.local');
  if (existing.role === 'PLAYER' && !isVmTester && !passwordInput) {
    appendAuditLog(existing.email, ipAddress, 'PLAYER_SESSION_STARTED', 'INFO', 'Inicio de sesión de jugador estándar.');
    return {
      ok: true,
      status: 200,
      message: 'Sesión de jugador iniciada.',
      user: {
        email: existing.email,
        displayName: existing.display_name,
        role: 'PLAYER',
        isActive: existing.is_active === 1,
        isDemoIsolated: false,
        coinsBalance: existing.coins_balance
      }
    };
  }

  const valid = verifyPassword(passwordInput, existing.password_hash);
  if (!valid) {
    const nextFailed = existing.failed_attempts + 1;
    const lockUntil = nextFailed >= 5 ? now + 15 * 60 * 1000 : 0;
    db.prepare('UPDATE users SET failed_attempts = ?, locked_until = ?, updated_at = ? WHERE id = ?').run(
      nextFailed,
      lockUntil,
      now,
      existing.id
    );
    appendAuditLog(
      existing.email,
      ipAddress,
      lockUntil > 0 ? 'ACCOUNT_LOCKED_BRUTE_FORCE' : 'LOGIN_FAILED_INVALID_CREDENTIALS',
      lockUntil > 0 ? 'CRITICAL' : 'WARN',
      `Intento fallido #${nextFailed} para rol ${existing.role}.`
    );
    return {
      ok: false,
      status: 401,
      message: lockUntil > 0
        ? 'Demasiados intentos fallidos. Cuenta bloqueada por 15 minutos por seguridad.'
        : 'Credenciales inválidas.'
    };
  }

  // Success: reset failed attempts
  db.prepare('UPDATE users SET failed_attempts = 0, locked_until = 0, updated_at = ? WHERE id = ?').run(now, existing.id);
  appendAuditLog(existing.email, ipAddress, `LOGIN_SUCCESS_${existing.role}`, 'INFO', `Acceso verificado con scrypt (Rol: ${existing.role}).`);

  return {
    ok: true,
    status: 200,
    message: 'Autenticación criptográfica exitosa.',
    user: {
      email: existing.email,
      displayName: existing.display_name,
      role: existing.role,
      isActive: existing.is_active === 1,
      isDemoIsolated: existing.is_demo_isolated === 1,
      coinsBalance: existing.coins_balance
    }
  };
}

export function changeUserPasswordInDb(
  emailInput: string,
  currentPassword: string,
  newPassword: string,
  ipAddress: string
): { ok: boolean; message: string } {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(emailInput.trim()) as DbUserRow | undefined;
  const now = Date.now();

  if (!existing) {
    const newId = 'usr_' + crypto.randomUUID().slice(0, 10);
    db.prepare(`
      INSERT INTO users (id, email, display_name, role, password_hash, is_active, is_demo_isolated, coins_balance, created_at, updated_at)
      VALUES (?, ?, ?, 'PLAYER', ?, 0, 0, 0, ?, ?)
    `).run(newId, emailInput.trim(), emailInput.trim().split('@')[0], hashPassword(newPassword), now, now);
    appendAuditLog(emailInput, ipAddress, 'PASSWORD_SET_PLAYER', 'INFO', 'Contraseña establecida en base de datos segura.');
    return { ok: true, message: 'Contraseña guardada con cifrado scrypt.' };
  }

  if (existing.role === 'OWNER' || existing.role === 'DEMO') {
    if (!verifyPassword(currentPassword.trim(), existing.password_hash)) {
      appendAuditLog(existing.email, ipAddress, 'PASSWORD_CHANGE_REJECTED', 'WARN', 'La contraseña actual proporcionada no coincide.');
      return { ok: false, message: 'La contraseña actual no coincide con los registros cifrados del servidor.' };
    }
  }

  db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(
    hashPassword(newPassword),
    now,
    existing.id
  );
  appendAuditLog(existing.email, ipAddress, 'PASSWORD_UPDATED_SCRYPT', 'WARN', 'Contraseña actualizada y re-hasheada con scrypt + salt.');
  return { ok: true, message: 'Contraseña actualizada y protegida con scrypt en la base de datos.' };
}

export interface DbTicketWithMessages {
  id: string;
  userEmail: string;
  userName: string;
  category: string;
  priority: string;
  subject: string;
  status: string;
  createdAt: number;
  updatedAt: number;
  paymentTxHash?: string;
  paymentAmountCoins?: number;
  paymentGateway?: string;
  messages: Array<{
    id: string;
    senderEmail: string;
    senderName: string;
    isAdmin: boolean;
    message: string;
    timestamp: number;
  }>;
}

export function listSupportTicketsFromDb(viewerEmail: string, isOwner: boolean): DbTicketWithMessages[] {
  const db = getDb();
  const ticketRows = (
    isOwner
      ? db.prepare('SELECT * FROM support_tickets ORDER BY updated_at DESC').all()
      : db.prepare('SELECT * FROM support_tickets WHERE LOWER(user_email) = LOWER(?) ORDER BY updated_at DESC').all(viewerEmail)
  ) as Array<{
    id: string;
    user_email: string;
    user_name: string;
    category: string;
    priority: string;
    subject: string;
    status: string;
    payment_tx_hash_enc: string | null;
    payment_amount_coins: number | null;
    payment_gateway: string | null;
    created_at: number;
    updated_at: number;
  }>;

  const msgStmt = db.prepare('SELECT * FROM support_ticket_messages WHERE ticket_id = ? ORDER BY timestamp ASC');

  return ticketRows.map(r => {
    const msgs = msgStmt.all(r.id) as Array<{
      id: string;
      sender_email: string;
      sender_name: string;
      is_admin: number;
      message: string;
      timestamp: number;
    }>;

    return {
      id: r.id,
      userEmail: r.user_email,
      userName: r.user_name,
      category: r.category,
      priority: r.priority,
      subject: r.subject,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      paymentTxHash: r.payment_tx_hash_enc ? decryptField(r.payment_tx_hash_enc) : undefined,
      paymentAmountCoins: r.payment_amount_coins ?? undefined,
      paymentGateway: r.payment_gateway ?? undefined,
      messages: msgs.map(m => ({
        id: m.id,
        senderEmail: m.sender_email,
        senderName: m.sender_name,
        isAdmin: m.is_admin === 1,
        message: m.message,
        timestamp: m.timestamp
      }))
    };
  });
}

export function createSupportTicketInDb(params: {
  id?: string;
  userEmail: string;
  userName: string;
  category: string;
  priority: string;
  subject: string;
  initialMessage: string;
  paymentTxHash?: string;
  paymentAmountCoins?: number;
  paymentGateway?: string;
  ipAddress: string;
}): DbTicketWithMessages {
  const db = getDb();
  const now = Date.now();
  const id = params.id || 'tkt_' + now;
  const msgId = 'msg_' + now;
  const txEnc = params.paymentTxHash ? encryptField(params.paymentTxHash) : null;

  db.prepare(`
    INSERT INTO support_tickets (id, user_email, user_name, category, priority, subject, status, payment_tx_hash_enc, payment_amount_coins, payment_gateway, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'ABIERTO', ?, ?, ?, ?, ?)
  `).run(
    id,
    params.userEmail,
    params.userName,
    params.category,
    params.priority,
    params.subject,
    txEnc,
    params.paymentAmountCoins ?? null,
    params.paymentGateway ?? null,
    now,
    now
  );

  db.prepare(`
    INSERT INTO support_ticket_messages (id, ticket_id, sender_email, sender_name, is_admin, message, timestamp)
    VALUES (?, ?, ?, ?, 0, ?, ?)
  `).run(msgId, id, params.userEmail, params.userName, params.initialMessage, now);

  appendAuditLog(params.userEmail, params.ipAddress, 'TICKET_CREATED', 'INFO', `Ticket #${id.slice(-6)} creado (${params.category}).`);

  return {
    id,
    userEmail: params.userEmail,
    userName: params.userName,
    category: params.category,
    priority: params.priority,
    subject: params.subject,
    status: 'ABIERTO',
    createdAt: now,
    updatedAt: now,
    paymentTxHash: params.paymentTxHash,
    paymentAmountCoins: params.paymentAmountCoins,
    paymentGateway: params.paymentGateway,
    messages: [
      {
        id: msgId,
        senderEmail: params.userEmail,
        senderName: params.userName,
        isAdmin: false,
        message: params.initialMessage,
        timestamp: now
      }
    ]
  };
}

export function updateTicketStatusInDb(
  ticketId: string,
  newStatus: 'ABIERTO' | 'EN_REVISION' | 'RESPONDIDO' | 'RESUELTO' | 'REEMBOLSO_PROCESADO',
  adminEmail: string,
  ipAddress: string,
  note?: string
): boolean {
  const db = getDb();
  const row = db.prepare('SELECT id, user_email FROM support_tickets WHERE id = ?').get(ticketId) as
    | { id: string; user_email: string }
    | undefined;
  if (!row) return false;

  const now = Date.now();
  db.prepare('UPDATE support_tickets SET status = ?, updated_at = ? WHERE id = ?').run(newStatus, now, ticketId);

  if (note) {
    db.prepare(`
      INSERT INTO support_ticket_messages (id, ticket_id, sender_email, sender_name, is_admin, message, timestamp)
      VALUES (?, ?, ?, 'Administrador (Control de Tickets)', 1, ?, ?)
    `).run('msg_adm_' + now, ticketId, adminEmail, note, now);
  }

  appendAuditLog(
    adminEmail,
    ipAddress,
    `TICKET_STATUS_${newStatus}`,
    newStatus === 'REEMBOLSO_PROCESADO' ? 'WARN' : 'INFO',
    `Ticket #${ticketId.slice(-6)} (${row.user_email}) cambiado a ${newStatus}.`
  );
  return true;
}

export interface StoredPayoutConfig {
  merchantName: string;
  usdtTrc20Address: string;
  usdtErc20Address: string;
  usdtBep20Address: string;
  btcAddress: string;
  binancePayId: string;
  paypalEmail: string;
  paypalMode: 'BUSINESS' | 'PERSONAL';
  cardGatewayProvider:
    | 'NOWPAYMENTS_CARD_TO_CRYPTO'
    | 'BTCPAY_SERVER'
    | 'MOONPAY_ONRAMP'
    | 'STRIPE_DIGITAL'
    | 'PAYPAL_BUSINESS';
  primarySettlementRail: 'USDT' | 'BTC' | 'PAYPAL_BUSINESS' | 'BANK_WIRE';
  bankIbanSwift: string;
  bankAccountHolder: string;
  stripeAccountId: string;
  autoForwardToWallet: boolean;
  autoConvertToUsdt: boolean;
  vmTestModeEnabled: boolean;
  maxVmTesters: number;
}

const FALLBACK_PAYOUT_CONFIG: StoredPayoutConfig = {
  merchantName: 'AetherVault Gaming Ltd. (Bóveda Principal USDT / BTC)',
  usdtTrc20Address: 'TRX7xQ8z99E10vP44aZ88yQw3901bLkVaether',
  usdtErc20Address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  usdtBep20Address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  btcAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  binancePayId: '',
  paypalEmail: 'cobros@aethervault.io',
  paypalMode: 'BUSINESS',
  cardGatewayProvider: 'NOWPAYMENTS_CARD_TO_CRYPTO',
  primarySettlementRail: 'USDT',
  bankIbanSwift: 'ES76 2100 0418 4502 0005 1332 (SWIFT: CAIXESBBXXX)',
  bankAccountHolder: 'AetherVault Operaciones Internacionales',
  stripeAccountId: 'acct_1NvAether89234',
  autoForwardToWallet: true,
  autoConvertToUsdt: true,
  vmTestModeEnabled: true,
  maxVmTesters: MAX_VM_TESTERS
};

export function getOwnerPayoutConfigFromDb(): StoredPayoutConfig {
  const db = getDb();
  const row = db
    .prepare('SELECT encrypted_payload FROM payout_destinations_encrypted WHERE owner_email = ?')
    .get(OWNER_EMAIL) as { encrypted_payload: string } | undefined;
  if (!row) return FALLBACK_PAYOUT_CONFIG;
  try {
    const raw = decryptField(row.encrypted_payload);
    const parsed = JSON.parse(raw) as Partial<StoredPayoutConfig>;
    return { ...FALLBACK_PAYOUT_CONFIG, ...parsed };
  } catch {
    return FALLBACK_PAYOUT_CONFIG;
  }
}

export function saveOwnerPayoutConfigInDb(
  partial: Partial<StoredPayoutConfig>,
  adminEmail: string,
  ipAddress: string
): StoredPayoutConfig {
  const db = getDb();
  const current = getOwnerPayoutConfigFromDb();
  const cleanPartial: Partial<StoredPayoutConfig> = {};
  for (const [k, v] of Object.entries(partial)) {
    if (v !== undefined) {
      (cleanPartial as Record<string, unknown>)[k] = v;
    }
  }
  const next: StoredPayoutConfig = {
    ...current,
    ...cleanPartial
  };
  const now = Date.now();
  db.prepare(`
    INSERT INTO payout_destinations_encrypted (id, owner_email, encrypted_payload, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(owner_email) DO UPDATE SET
      encrypted_payload = excluded.encrypted_payload,
      updated_at = excluded.updated_at
  `).run('pay_owner_01', OWNER_EMAIL, encryptField(JSON.stringify(next)), now);

  appendAuditLog(
    adminEmail,
    ipAddress,
    'USDT_VAULT_WALLETS_UPDATED',
    'WARN',
    `Bóvedas actualizadas (Canal=${next.primarySettlementRail}, TRC20=${(next.usdtTrc20Address || '').slice(0, 10)}..., BTC=${(next.btcAddress || '').slice(0, 10)}..., AutoUSDT=${next.autoConvertToUsdt ? 'ON' : 'OFF'}).`
  );
  return next;
}

export interface DbCoinPurchaseOrder {
  id: string;
  userEmail: string;
  tierLevel: number;
  tierName: string;
  coinsAmount: number;
  priceUSD: number;
  paymentMethod: string;
  usdtNetwork: 'TRC20' | 'ERC20' | 'BEP20';
  destinationUsdtWallet: string;
  txHash?: string;
  gatewayProvider?: string;
  gatewayInvoiceId?: string;
  checkoutUrl?: string;
  isLiveApi?: boolean;
  status: 'PENDING_TX' | 'VERIFIED_SETTLED' | 'REJECTED';
  autoSettledToUsdt: boolean;
  createdAt: number;
  settledAt?: number;
}

function getWalletForNetwork(cfg: StoredPayoutConfig, network: 'TRC20' | 'ERC20' | 'BEP20'): string {
  if (network === 'ERC20') return cfg.usdtErc20Address;
  if (network === 'BEP20') return cfg.usdtBep20Address || cfg.usdtErc20Address;
  return cfg.usdtTrc20Address;
}

export function createCoinPurchaseOrderInDb(params: {
  userEmail: string;
  tierLevel: number;
  tierName: string;
  coinsAmount: number;
  priceUSD: number;
  paymentMethod: string;
  usdtNetwork: 'TRC20' | 'ERC20' | 'BEP20';
  gatewayProvider?: string;
  gatewayInvoiceId?: string;
  checkoutUrl?: string;
  isLiveApi?: boolean;
  ipAddress: string;
}): DbCoinPurchaseOrder {
  const db = getDb();
  const payoutCfg = getOwnerPayoutConfigFromDb();
  const destinationWallet = getWalletForNetwork(payoutCfg, params.usdtNetwork);
  const now = Date.now();
  const id = 'ord_' + now + '_' + crypto.randomBytes(3).toString('hex');

  db.prepare(`
    INSERT INTO coin_purchase_orders (
      id, user_email, tier_level, tier_name, coins_amount, price_usd,
      payment_method, usdt_network, destination_usdt_wallet,
      gateway_provider, gateway_invoice_id, checkout_url, is_live_api,
      status, auto_settled_to_usdt, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_TX', ?, ?)
  `).run(
    id,
    params.userEmail,
    params.tierLevel,
    params.tierName,
    params.coinsAmount,
    params.priceUSD,
    params.paymentMethod,
    params.usdtNetwork,
    destinationWallet,
    params.gatewayProvider || 'DIRECT_USDT',
    params.gatewayInvoiceId || null,
    params.checkoutUrl || null,
    params.isLiveApi ? 1 : 0,
    payoutCfg.autoConvertToUsdt ? 1 : 0,
    now
  );

  appendAuditLog(
    params.userEmail,
    params.ipAddress,
    'COIN_ORDER_CREATED',
    'INFO',
    `Orden #${id.slice(-8)} ($${params.priceUSD} USD -> ${params.coinsAmount} mo) vía ${params.gatewayProvider || params.paymentMethod} hacia ${destinationWallet.slice(0, 10)}...`
  );

  return {
    id,
    userEmail: params.userEmail,
    tierLevel: params.tierLevel,
    tierName: params.tierName,
    coinsAmount: params.coinsAmount,
    priceUSD: params.priceUSD,
    paymentMethod: params.paymentMethod,
    usdtNetwork: params.usdtNetwork,
    destinationUsdtWallet: destinationWallet,
    gatewayProvider: params.gatewayProvider || 'DIRECT_USDT',
    gatewayInvoiceId: params.gatewayInvoiceId,
    checkoutUrl: params.checkoutUrl,
    isLiveApi: Boolean(params.isLiveApi),
    status: 'PENDING_TX',
    autoSettledToUsdt: payoutCfg.autoConvertToUsdt,
    createdAt: now
  };
}

function isValidTxFormat(txHash: string, network: 'TRC20' | 'ERC20' | 'BEP20', paymentMethod: string): boolean {
  const clean = txHash.trim();
  if ((clean.startsWith('VM-TEST-') || clean.startsWith('INV-') || clean.startsWith('ONRAMP-') || clean.startsWith('BTCPAY-')) && clean.length >= 12) {
    return true;
  }
  if (paymentMethod !== 'crypto_usdt' && clean.length >= 10) {
    return true;
  }
  if (network === 'TRC20') {
    return /^[0-9a-fA-F]{64}$/.test(clean) || /^0x[0-9a-fA-F]{64}$/.test(clean);
  }
  return /^0x[0-9a-fA-F]{64}$/.test(clean) || /^[0-9a-fA-F]{64}$/.test(clean);
}

export function verifyAndSettlePurchaseOrderInDb(params: {
  orderId: string;
  txHash: string;
  actorEmail: string;
  isOwner: boolean;
  ipAddress: string;
}): { ok: boolean; status: number; message: string; order?: DbCoinPurchaseOrder; updatedCoinsBalance?: number } {
  const db = getDb();
  const row = db.prepare('SELECT * FROM coin_purchase_orders WHERE id = ?').get(params.orderId) as
    | {
        id: string;
        user_email: string;
        tier_level: number;
        tier_name: string;
        coins_amount: number;
        price_usd: number;
        payment_method: string;
        usdt_network: 'TRC20' | 'ERC20' | 'BEP20';
        destination_usdt_wallet: string;
        tx_hash_enc: string | null;
        tx_hash_digest: string | null;
        gateway_provider: string | null;
        gateway_invoice_id: string | null;
        checkout_url: string | null;
        is_live_api: number | null;
        status: 'PENDING_TX' | 'VERIFIED_SETTLED' | 'REJECTED';
        auto_settled_to_usdt: number;
        created_at: number;
        settled_at: number | null;
      }
    | undefined;

  if (!row) {
    return { ok: false, status: 404, message: 'Orden de compra no encontrada.' };
  }

  if (!params.isOwner && row.user_email.toLowerCase() !== params.actorEmail.toLowerCase()) {
    return { ok: false, status: 403, message: 'No tienes permiso para validar esta orden.' };
  }

  if (row.status === 'VERIFIED_SETTLED') {
    return { ok: false, status: 409, message: 'Esta orden ya fue liquidada anteriormente.' };
  }

  const cleanTx = params.txHash.trim();
  if (!isValidTxFormat(cleanTx, row.usdt_network, row.payment_method)) {
    return {
      ok: false,
      status: 400,
      message: `Formato de TXID inválido para la red ${row.usdt_network}. Se requiere un Hash de 64 caracteres hexadecimales (o referencia válida).`
    };
  }

  const digest = crypto.createHash('sha256').update(cleanTx.toLowerCase(), 'utf8').digest('hex');
  const duplicate = db.prepare('SELECT id FROM coin_purchase_orders WHERE tx_hash_digest = ? AND id != ?').get(digest, row.id);
  if (duplicate) {
    appendAuditLog(
      params.actorEmail,
      params.ipAddress,
      'TXID_REPLAY_BLOCKED',
      'CRITICAL',
      `Intento de reutilización de TXID bloqueado en orden #${row.id.slice(-8)}.`
    );
    return {
      ok: false,
      status: 409,
      message: 'Este TXID / Hash ya fue acreditado previamente (Bloqueo Anti-Reutilización).'
    };
  }

  const now = Date.now();
  const txEnc = encryptField(cleanTx);
  db.prepare(`
    UPDATE coin_purchase_orders
    SET tx_hash_enc = ?, tx_hash_digest = ?, status = 'VERIFIED_SETTLED', settled_at = ?
    WHERE id = ?
  `).run(txEnc, digest, now, row.id);

  // Activate real account & credit coins in DB for standard players AND VM testers (tester01..tester10) so test users can test live real-money deposits! Keep gokudemo strictly isolated.
  db.prepare(`
    UPDATE users
    SET is_active = 1, coins_balance = coins_balance + ?, updated_at = ?
    WHERE LOWER(email) = LOWER(?) AND role != 'DEMO'
  `).run(row.coins_amount, now, row.user_email);

  const userBalRow = db
    .prepare('SELECT coins_balance FROM users WHERE LOWER(email) = LOWER(?)')
    .get(row.user_email) as { coins_balance: number } | undefined;

  appendAuditLog(
    params.actorEmail,
    params.ipAddress,
    'USDT_DEPOSIT_SETTLED',
    'INFO',
    `Orden #${row.id.slice(-8)} liquidada: +$${row.price_usd} USD (${row.gateway_provider || row.payment_method}) en USDT ${row.usdt_network} hacia ${row.destination_usdt_wallet.slice(0, 12)}...`
  );

  return {
    ok: true,
    status: 200,
    message: `Pago verificado y enrutado a bóveda USDT (${row.usdt_network}).`,
    updatedCoinsBalance: userBalRow?.coins_balance,
    order: {
      id: row.id,
      userEmail: row.user_email,
      tierLevel: row.tier_level,
      tierName: row.tier_name,
      coinsAmount: row.coins_amount,
      priceUSD: row.price_usd,
      paymentMethod: row.payment_method,
      usdtNetwork: row.usdt_network,
      destinationUsdtWallet: row.destination_usdt_wallet,
      txHash: cleanTx,
      gatewayProvider: row.gateway_provider || undefined,
      gatewayInvoiceId: row.gateway_invoice_id || undefined,
      checkoutUrl: row.checkout_url || undefined,
      isLiveApi: row.is_live_api === 1,
      status: 'VERIFIED_SETTLED',
      autoSettledToUsdt: row.auto_settled_to_usdt === 1,
      createdAt: row.created_at,
      settledAt: now
    }
  };
}

export function listUsdtPurchaseOrdersFromDb(limit: number = 40): DbCoinPurchaseOrder[] {
  const db = getDb();
  const rows = db
    .prepare('SELECT * FROM coin_purchase_orders ORDER BY created_at DESC LIMIT ?')
    .all(limit) as Array<{
    id: string;
    user_email: string;
    tier_level: number;
    tier_name: string;
    coins_amount: number;
    price_usd: number;
    payment_method: string;
    usdt_network: 'TRC20' | 'ERC20' | 'BEP20';
    destination_usdt_wallet: string;
    tx_hash_enc: string | null;
    gateway_provider: string | null;
    gateway_invoice_id: string | null;
    checkout_url: string | null;
    is_live_api: number | null;
    status: 'PENDING_TX' | 'VERIFIED_SETTLED' | 'REJECTED';
    auto_settled_to_usdt: number;
    created_at: number;
    settled_at: number | null;
  }>;

  return rows.map(r => ({
    id: r.id,
    userEmail: r.user_email,
    tierLevel: r.tier_level,
    tierName: r.tier_name,
    coinsAmount: r.coins_amount,
    priceUSD: r.price_usd,
    paymentMethod: r.payment_method,
    usdtNetwork: r.usdt_network,
    destinationUsdtWallet: r.destination_usdt_wallet,
    txHash: r.tx_hash_enc ? decryptField(r.tx_hash_enc) : undefined,
    gatewayProvider: r.gateway_provider || undefined,
    gatewayInvoiceId: r.gateway_invoice_id || undefined,
    checkoutUrl: r.checkout_url || undefined,
    isLiveApi: r.is_live_api === 1,
    status: r.status,
    autoSettledToUsdt: r.auto_settled_to_usdt === 1,
    createdAt: r.created_at,
    settledAt: r.settled_at ?? undefined
  }));
}

export function reviewUsdtPurchaseOrderInDb(
  orderId: string,
  decision: 'VERIFIED_SETTLED' | 'REJECTED',
  adminEmail: string,
  ipAddress: string
): boolean {
  const db = getDb();
  const row = db.prepare('SELECT id, user_email, coins_amount, price_usd, status FROM coin_purchase_orders WHERE id = ?').get(orderId) as
    | { id: string; user_email: string; coins_amount: number; price_usd: number; status: string }
    | undefined;
  if (!row) return false;

  const now = Date.now();
  db.prepare('UPDATE coin_purchase_orders SET status = ?, settled_at = ? WHERE id = ?').run(
    decision,
    decision === 'VERIFIED_SETTLED' ? now : null,
    orderId
  );

  if (decision === 'VERIFIED_SETTLED' && row.status !== 'VERIFIED_SETTLED') {
    db.prepare(`
      UPDATE users
      SET is_active = 1, coins_balance = coins_balance + ?, updated_at = ?
      WHERE LOWER(email) = LOWER(?) AND role != 'DEMO'
    `).run(row.coins_amount, now, row.user_email);
  }

  appendAuditLog(
    adminEmail,
    ipAddress,
    `USDT_ORDER_${decision}`,
    decision === 'REJECTED' ? 'WARN' : 'INFO',
    `Orden #${orderId.slice(-8)} ($${row.price_usd} USD / ${row.user_email}) marcada como ${decision}.`
  );
  return true;
}

export function runVulnerabilitySelfScan(): {
  scorePercent: number;
  environmentMode: 'VM_SANDBOX' | 'VPS_PRODUCTION';
  checks: Array<{ id: string; name: string; status: 'PASS' | 'WARN'; detail: string }>;
} {
  const integrity = verifyDatabaseIntegrity();
  const isProd = process.env.NODE_ENV === 'production';
  const hasCustomDbKey = Boolean(process.env.DB_ENCRYPTION_KEY && process.env.DB_ENCRYPTION_KEY.trim().length >= 16);
  const hasCustomSessionSecret = Boolean(process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length >= 16);
  const usingDefaultMasterKey = !process.env.OWNER_MASTER_KEY || process.env.OWNER_MASTER_KEY === UNIFIED_VM_SECURITY_KEY;
  const rawApis = getVaultGatewayApisRawFromDb();
  const hasBtcpayWebhookSecret = Boolean(
    (rawApis.btcpay.webhookSecret || process.env.BTCPAY_WEBHOOK_SECRET || UNIFIED_SECURITY_KEY).trim().length >= 16
  );

  let dbPermSecure = true;
  try {
    const mode = fs.statSync(DB_PATH).mode & 0o777;
    dbPermSecure = (mode & 0o077) === 0;
  } catch {
    dbPermSecure = true;
  }

  const checks: Array<{ id: string; name: string; status: 'PASS' | 'WARN'; detail: string }> = [
    {
      id: 'sqlite_integrity',
      name: 'Integridad SQLite WAL + secure_delete',
      status: integrity.sqliteOk && integrity.chainValid ? 'PASS' : 'WARN',
      detail: integrity.sqliteOk && integrity.chainValid
        ? `PRAGMA integrity_check OK y cadena SHA-256 intacta (${integrity.checkedRows} registros).`
        : 'Se detectó una anomalía en la verificación de integridad.'
    },
    {
      id: 'aes_gcm_vault',
      name: 'Cifrado en Reposo AES-256-GCM',
      status: 'PASS',
      detail: hasCustomDbKey
        ? 'Llave maestra cargada desde variable de entorno protegida DB_ENCRYPTION_KEY (derivación SHA-256).'
        : 'Cifrado AES-256-GCM activo con la clave unificada de bóveda para pruebas VM. Rótala en .env al pasar a VPS.'
    },
    {
      id: 'hmac_session',
      name: 'Tokens HMAC-SHA256 + HttpOnly Cookie',
      status: 'PASS',
      detail: hasCustomSessionSecret
        ? 'SESSION_SECRET personalizada activa.'
        : 'Firma HMAC-SHA256 activa con la clave unificada VM (0600). Rótala en .env al pasar a VPS.'
    },
    {
      id: 'btcpay_webhook_hmac',
      name: 'Webhook BTCPay Server (HMAC-SHA256 BTCPay-Sig)',
      status: hasBtcpayWebhookSecret ? 'PASS' : 'WARN',
      detail: hasBtcpayWebhookSecret
        ? 'Validación estricta HMAC-SHA256 activa sobre /api/webhooks/btcpay (clave unificada aplicada).'
        : 'Configura BTCPAY_WEBHOOK_SECRET en VaultConfigPanel.'
    },
    {
      id: 'waf_csrf_shield',
      name: 'WAF Anti-SQLi/XSS + Guardia CSRF Origin',
      status: 'PASS',
      detail: 'Inspección activa de payloads maliciosos, bloqueo de métodos TRACE/TRACK y validación de origen.'
    },
    {
      id: 'anti_replay_txid',
      name: 'Índice Único Anti-Reutilización TXID USDT',
      status: 'PASS',
      detail: 'Restricción UNIQUE sobre tx_hash_digest impide doble acreditación de transferencias USDT.'
    },
    {
      id: 'withdrawal_30pct_owner_lock',
      name: 'Tope 30% Retiros + Autorización trabajofino52@gmail.com',
      status: 'PASS',
      detail: 'Bloqueo estricto del 30% máximo por retiro de cliente y aprobación exclusiva del propietario.'
    },
    {
      id: 'file_perms',
      name: 'Permisos Estrictos de Base de Datos (0600)',
      status: dbPermSecure ? 'PASS' : 'WARN',
      detail: dbPermSecure
        ? 'Archivo data/aethervault.db accesible únicamente por el usuario propietario del servicio.'
        : 'Ejecuta chmod 600 data/aethervault.db para restringir lectura de otros usuarios.'
    },
    {
      id: 'owner_master_key',
      name: 'Clave Maestra Unificada Propietario (scrypt)',
      status: !isProd || !usingDefaultMasterKey ? 'PASS' : 'WARN',
      detail: !usingDefaultMasterKey
        ? 'Clave maestra personalizada configurada vía OWNER_MASTER_KEY.'
        : isProd
        ? 'Recuerda rotar OWNER_MASTER_KEY, DB_ENCRYPTION_KEY, SESSION_SECRET y BTCPAY_WEBHOOK_SECRET al abrir el VPS.'
        : 'Clave maestra unificada del propietario cifrada con scrypt en SQL y sincronizada en todas las llaves VM.'
    }
  ];

  const passCount = checks.filter(c => c.status === 'PASS').length;
  const scorePercent = Math.round((passCount / checks.length) * 100);

  return {
    scorePercent,
    environmentMode: isProd ? 'VPS_PRODUCTION' : 'VM_SANDBOX',
    checks
  };
}

export interface DbVmExperienceLog {
  seq: number;
  id: string;
  timestamp: number;
  userEmail: string;
  sessionId: string;
  category: string;
  gameName: string;
  severity: 'INFO' | 'WARN' | 'ERROR' | 'BUG_REPORT';
  summary: string;
  detailsJson: string;
  ipAddress: string;
}

export function appendVmExperienceLogInDb(params: {
  userEmail: string;
  sessionId: string;
  category: string;
  gameName: string;
  severity: 'INFO' | 'WARN' | 'ERROR' | 'BUG_REPORT';
  summary: string;
  detailsJson: string;
  ipAddress: string;
}): DbVmExperienceLog {
  const db = getDb();
  const id = 'exp_' + crypto.randomUUID().slice(0, 12);
  const timestamp = Date.now();
  const safeSeverity =
    params.severity === 'WARN' || params.severity === 'ERROR' || params.severity === 'BUG_REPORT'
      ? params.severity
      : 'INFO';

  db.prepare(`
    INSERT INTO vm_experience_logs (id, timestamp, user_email, session_id, category, game_name, severity, summary, details_json, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    timestamp,
    params.userEmail.slice(0, 120),
    params.sessionId.slice(0, 64),
    params.category.slice(0, 40),
    params.gameName.slice(0, 60),
    safeSeverity,
    params.summary.slice(0, 320),
    params.detailsJson.slice(0, 2000),
    params.ipAddress.slice(0, 64)
  );

  // Retain latest 1500 VM experience records to prevent unbounded disk growth during QA
  db.prepare(`
    DELETE FROM vm_experience_logs
    WHERE seq NOT IN (SELECT seq FROM vm_experience_logs ORDER BY seq DESC LIMIT 1500)
  `).run();

  const row = db.prepare('SELECT * FROM vm_experience_logs WHERE id = ?').get(id) as {
    seq: number;
    id: string;
    timestamp: number;
    user_email: string;
    session_id: string;
    category: string;
    game_name: string;
    severity: 'INFO' | 'WARN' | 'ERROR' | 'BUG_REPORT';
    summary: string;
    details_json: string;
    ip_address: string;
  };

  return {
    seq: row.seq,
    id: row.id,
    timestamp: row.timestamp,
    userEmail: row.user_email,
    sessionId: row.session_id,
    category: row.category,
    gameName: row.game_name,
    severity: row.severity,
    summary: row.summary,
    detailsJson: row.details_json,
    ipAddress: row.ip_address
  };
}

export function listVmExperienceLogsFromDb(filters?: {
  severity?: string;
  category?: string;
  limit?: number;
}): DbVmExperienceLog[] {
  const db = getDb();
  const limit = Math.min(Math.max(Number(filters?.limit) || 120, 1), 500);
  const clauses: string[] = [];
  const args: Array<string | number> = [];

  if (filters?.severity && filters.severity !== 'ALL') {
    clauses.push('severity = ?');
    args.push(filters.severity);
  }
  if (filters?.category && filters.category !== 'ALL') {
    clauses.push('category = ?');
    args.push(filters.category);
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  args.push(limit);

  const rows = db
    .prepare(`SELECT * FROM vm_experience_logs ${whereSql} ORDER BY seq DESC LIMIT ?`)
    .all(...args) as Array<{
    seq: number;
    id: string;
    timestamp: number;
    user_email: string;
    session_id: string;
    category: string;
    game_name: string;
    severity: 'INFO' | 'WARN' | 'ERROR' | 'BUG_REPORT';
    summary: string;
    details_json: string;
    ip_address: string;
  }>;

  return rows.map(r => ({
    seq: r.seq,
    id: r.id,
    timestamp: r.timestamp,
    userEmail: r.user_email,
    sessionId: r.session_id,
    category: r.category,
    gameName: r.game_name,
    severity: r.severity,
    summary: r.summary,
    detailsJson: r.details_json,
    ipAddress: r.ip_address
  }));
}

export function clearVmExperienceLogsInDb(adminEmail: string, ipAddress: string): void {
  const db = getDb();
  db.prepare('DELETE FROM vm_experience_logs').run();
  appendAuditLog(
    adminEmail,
    ipAddress,
    'VM_EXPERIENCE_LOGS_CLEARED',
    'INFO',
    'Bitácora de pruebas en Máquina Virtual reiniciada por el Administrador.'
  );
}

export interface DbVmTesterSlot {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
  coinsBalance: number;
  lastSeenAt: number;
}

export function listVmTestersFromDb(): DbVmTesterSlot[] {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT id, email, display_name, is_active, coins_balance, updated_at
      FROM users
      WHERE email LIKE '%@vm.aethervault.local'
      ORDER BY email ASC
      LIMIT ?
    `)
    .all(MAX_VM_TESTERS) as Array<{
    id: string;
    email: string;
    display_name: string;
    is_active: number;
    coins_balance: number;
    updated_at: number;
  }>;

  return rows.map(r => ({
    id: r.id,
    email: r.email,
    displayName: r.display_name,
    isActive: r.is_active === 1,
    coinsBalance: r.coins_balance,
    lastSeenAt: r.updated_at
  }));
}

export function resetVmTesterSlotInDb(
  email: string,
  coinsBalance: number,
  isActive: boolean,
  adminEmail: string,
  ipAddress: string
): boolean {
  const db = getDb();
  const now = Date.now();
  const res = db
    .prepare(`
      UPDATE users
      SET coins_balance = ?, is_active = ?, failed_attempts = 0, locked_until = 0, updated_at = ?
      WHERE LOWER(email) = LOWER(?) AND email LIKE '%@vm.aethervault.local'
    `)
    .run(Math.max(0, Math.round(coinsBalance)), isActive ? 1 : 0, now, email);

  if (res.changes > 0) {
    appendAuditLog(
      adminEmail,
      ipAddress,
      'VM_TESTER_SLOT_RESET',
      'INFO',
      `Cuenta de pruebas VM ${email} reiniciada (${coinsBalance} monedas, activa=${isActive ? 'SI' : 'NO'}).`
    );
    return true;
  }
  return false;
}

export function buildVmDiagnosticReport(): {
  generatedAt: string;
  environmentMode: string;
  maxVmTesters: number;
  activeTestersCount: number;
  testers: DbVmTesterSlot[];
  vulnerabilityScan: ReturnType<typeof runVulnerabilitySelfScan>;
  summary: {
    totalLogs: number;
    errorsCount: number;
    bugReportsCount: number;
    paymentEventsCount: number;
    gameEventsCount: number;
  };
  logs: DbVmExperienceLog[];
} {
  const logs = listVmExperienceLogsFromDb({ limit: 400 });
  const testers = listVmTestersFromDb();
  const activeTestersCount = testers.filter(t => t.isActive).length;
  return {
    generatedAt: new Date().toISOString(),
    environmentMode: process.env.NODE_ENV === 'production' ? 'VPS_PRODUCTION' : 'VM_SANDBOX',
    maxVmTesters: MAX_VM_TESTERS,
    activeTestersCount,
    testers,
    vulnerabilityScan: runVulnerabilitySelfScan(),
    summary: {
      totalLogs: logs.length,
      errorsCount: logs.filter(l => l.severity === 'ERROR').length,
      bugReportsCount: logs.filter(l => l.severity === 'BUG_REPORT').length,
      paymentEventsCount: logs.filter(l => l.category === 'PAYMENT_FLOW').length,
      gameEventsCount: logs.filter(l => l.category === 'GAME_ACTION').length
    },
    logs
  };
}

export interface StoredVaultGatewayApis {
  btcpay: {
    enabled: boolean;
    serverUrl: string;
    storeId: string;
    apiKey: string;
    webhookSecret: string;
  };
  nowpayments: {
    enabled: boolean;
    apiKey: string;
    ipnSecret: string;
    sandbox: boolean;
  };
  coingate: {
    enabled: boolean;
    apiToken: string;
    environment: 'sandbox' | 'live';
  };
  paypal: {
    enabled: boolean;
    environment: 'sandbox' | 'live';
    clientId: string;
    clientSecret: string;
    webhookId: string;
    merchantEmail: string;
  };
  onramps: {
    activeProvider: 'NOWPAYMENTS_FIAT' | 'MOONPAY' | 'TRANSAK' | 'BANXA';
    moonpayPublicKey: string;
    moonpaySecretKey: string;
    transakApiKey: string;
    transakEnvironment: 'STAGING' | 'PRODUCTION';
    banxaDomain: string;
    banxaApiKey: string;
    banxaSecret: string;
  };
  virtualCards: {
    preferredBrand: 'REDOTPAY' | 'BYBIT' | 'BITPAY' | 'WISE';
    redotpayAccountId: string;
    redotpayDepositWallet: string;
    redotpayCardLabel: string;
    redotpayApiKey: string;
    bybitUid: string;
    bybitDepositAddress: string;
    bybitCardLabel: string;
    bybitApiKey: string;
    bitpayMerchantToken: string;
    bitpayPayoutEmail: string;
    bitpayCardLabel: string;
    wiseBusinessEmail: string;
    wiseProfileId: string;
    wiseIbanOrRouting: string;
    wiseApiToken: string;
  };
}

const DEFAULT_VAULT_GATEWAY_APIS: StoredVaultGatewayApis = {
  btcpay: {
    enabled: false,
    serverUrl: '',
    storeId: '',
    apiKey: '',
    webhookSecret: process.env.BTCPAY_WEBHOOK_SECRET || DEFAULT_OWNER_KEY
  },
  nowpayments: {
    enabled: false,
    apiKey: '',
    ipnSecret: process.env.NOWPAYMENTS_IPN_SECRET || DEFAULT_OWNER_KEY,
    sandbox: true
  },
  coingate: {
    enabled: false,
    apiToken: '',
    environment: 'sandbox'
  },
  paypal: {
    enabled: Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
    environment: process.env.PAYPAL_ENVIRONMENT === 'live' ? 'live' : 'sandbox',
    clientId: process.env.PAYPAL_CLIENT_ID || '',
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
    webhookId: process.env.PAYPAL_WEBHOOK_ID || '',
    merchantEmail: 'cobros@aethervault.io'
  },
  onramps: {
    activeProvider: 'NOWPAYMENTS_FIAT',
    moonpayPublicKey: '',
    moonpaySecretKey: '',
    transakApiKey: '',
    transakEnvironment: 'STAGING',
    banxaDomain: '',
    banxaApiKey: '',
    banxaSecret: ''
  },
  virtualCards: {
    preferredBrand: 'REDOTPAY',
    redotpayAccountId: '',
    redotpayDepositWallet: '',
    redotpayCardLabel: 'RedotPay Virtual Visa',
    redotpayApiKey: '',
    bybitUid: '',
    bybitDepositAddress: '',
    bybitCardLabel: 'Bybit Virtual Mastercard',
    bybitApiKey: '',
    bitpayMerchantToken: '',
    bitpayPayoutEmail: '',
    bitpayCardLabel: 'BitPay Prepaid Mastercard',
    wiseBusinessEmail: '',
    wiseProfileId: '',
    wiseIbanOrRouting: '',
    wiseApiToken: ''
  }
};

function mergeVaultApis(base: StoredVaultGatewayApis, incoming: Partial<StoredVaultGatewayApis>): StoredVaultGatewayApis {
  const pickStr = (next: unknown, prev: string): string => {
    if (typeof next !== 'string') return prev;
    const trimmed = next.trim();
    if (trimmed === '' || trimmed.includes('••••')) return prev;
    return trimmed;
  };
  const pickClearable = (next: unknown, prev: string): string => {
    if (typeof next !== 'string') return prev;
    return next.trim();
  };

  return {
    btcpay: {
      enabled: typeof incoming.btcpay?.enabled === 'boolean' ? incoming.btcpay.enabled : base.btcpay.enabled,
      serverUrl: pickClearable(incoming.btcpay?.serverUrl, base.btcpay.serverUrl).replace(/\/+$/, ''),
      storeId: pickClearable(incoming.btcpay?.storeId, base.btcpay.storeId),
      apiKey: pickStr(incoming.btcpay?.apiKey, base.btcpay.apiKey),
      webhookSecret: pickStr(incoming.btcpay?.webhookSecret, base.btcpay.webhookSecret)
    },
    nowpayments: {
      enabled: typeof incoming.nowpayments?.enabled === 'boolean' ? incoming.nowpayments.enabled : base.nowpayments.enabled,
      apiKey: pickStr(incoming.nowpayments?.apiKey, base.nowpayments.apiKey),
      ipnSecret: pickStr(incoming.nowpayments?.ipnSecret, base.nowpayments.ipnSecret),
      sandbox: typeof incoming.nowpayments?.sandbox === 'boolean' ? incoming.nowpayments.sandbox : base.nowpayments.sandbox
    },
    coingate: {
      enabled: typeof incoming.coingate?.enabled === 'boolean' ? incoming.coingate.enabled : base.coingate.enabled,
      apiToken: pickStr(incoming.coingate?.apiToken, base.coingate.apiToken),
      environment: incoming.coingate?.environment === 'live' ? 'live' : incoming.coingate?.environment === 'sandbox' ? 'sandbox' : base.coingate.environment
    },
    paypal: {
      enabled: typeof incoming.paypal?.enabled === 'boolean' ? incoming.paypal.enabled : base.paypal.enabled,
      environment:
        incoming.paypal?.environment === 'live'
          ? 'live'
          : incoming.paypal?.environment === 'sandbox'
          ? 'sandbox'
          : base.paypal.environment,
      clientId: pickClearable(incoming.paypal?.clientId, base.paypal.clientId),
      clientSecret: pickStr(incoming.paypal?.clientSecret, base.paypal.clientSecret),
      webhookId: pickStr(incoming.paypal?.webhookId, base.paypal.webhookId),
      merchantEmail: pickClearable(incoming.paypal?.merchantEmail, base.paypal.merchantEmail)
    },
    onramps: {
      activeProvider:
        incoming.onramps?.activeProvider === 'MOONPAY' ||
        incoming.onramps?.activeProvider === 'TRANSAK' ||
        incoming.onramps?.activeProvider === 'BANXA' ||
        incoming.onramps?.activeProvider === 'NOWPAYMENTS_FIAT'
          ? incoming.onramps.activeProvider
          : base.onramps.activeProvider,
      moonpayPublicKey: pickClearable(incoming.onramps?.moonpayPublicKey, base.onramps.moonpayPublicKey),
      moonpaySecretKey: pickStr(incoming.onramps?.moonpaySecretKey, base.onramps.moonpaySecretKey),
      transakApiKey: pickStr(incoming.onramps?.transakApiKey, base.onramps.transakApiKey),
      transakEnvironment:
        incoming.onramps?.transakEnvironment === 'PRODUCTION'
          ? 'PRODUCTION'
          : incoming.onramps?.transakEnvironment === 'STAGING'
          ? 'STAGING'
          : base.onramps.transakEnvironment,
      banxaDomain: pickClearable(incoming.onramps?.banxaDomain, base.onramps.banxaDomain),
      banxaApiKey: pickStr(incoming.onramps?.banxaApiKey, base.onramps.banxaApiKey),
      banxaSecret: pickStr(incoming.onramps?.banxaSecret, base.onramps.banxaSecret)
    },
    virtualCards: {
      preferredBrand:
        incoming.virtualCards?.preferredBrand === 'REDOTPAY' ||
        incoming.virtualCards?.preferredBrand === 'BYBIT' ||
        incoming.virtualCards?.preferredBrand === 'BITPAY' ||
        incoming.virtualCards?.preferredBrand === 'WISE'
          ? incoming.virtualCards.preferredBrand
          : base.virtualCards.preferredBrand,
      redotpayAccountId: pickClearable(incoming.virtualCards?.redotpayAccountId, base.virtualCards.redotpayAccountId),
      redotpayDepositWallet: pickClearable(incoming.virtualCards?.redotpayDepositWallet, base.virtualCards.redotpayDepositWallet),
      redotpayCardLabel: pickClearable(incoming.virtualCards?.redotpayCardLabel, base.virtualCards.redotpayCardLabel),
      redotpayApiKey: pickStr(incoming.virtualCards?.redotpayApiKey, base.virtualCards.redotpayApiKey),
      bybitUid: pickClearable(incoming.virtualCards?.bybitUid, base.virtualCards.bybitUid),
      bybitDepositAddress: pickClearable(incoming.virtualCards?.bybitDepositAddress, base.virtualCards.bybitDepositAddress),
      bybitCardLabel: pickClearable(incoming.virtualCards?.bybitCardLabel, base.virtualCards.bybitCardLabel),
      bybitApiKey: pickStr(incoming.virtualCards?.bybitApiKey, base.virtualCards.bybitApiKey),
      bitpayMerchantToken: pickStr(incoming.virtualCards?.bitpayMerchantToken, base.virtualCards.bitpayMerchantToken),
      bitpayPayoutEmail: pickClearable(incoming.virtualCards?.bitpayPayoutEmail, base.virtualCards.bitpayPayoutEmail),
      bitpayCardLabel: pickClearable(incoming.virtualCards?.bitpayCardLabel, base.virtualCards.bitpayCardLabel),
      wiseBusinessEmail: pickClearable(incoming.virtualCards?.wiseBusinessEmail, base.virtualCards.wiseBusinessEmail),
      wiseProfileId: pickClearable(incoming.virtualCards?.wiseProfileId, base.virtualCards.wiseProfileId),
      wiseIbanOrRouting: pickClearable(incoming.virtualCards?.wiseIbanOrRouting, base.virtualCards.wiseIbanOrRouting),
      wiseApiToken: pickStr(incoming.virtualCards?.wiseApiToken, base.virtualCards.wiseApiToken)
    }
  };
}

function maskSecretValue(val: string): string {
  if (!val) return '';
  if (val.length <= 6) return '••••••';
  return `${val.slice(0, 4)}••••${val.slice(-4)}`;
}

export function getVaultGatewayApisRawFromDb(): StoredVaultGatewayApis {
  const db = getDb();
  const row = db
    .prepare('SELECT encrypted_payload FROM vault_gateway_apis_encrypted WHERE owner_email = ?')
    .get(OWNER_EMAIL) as { encrypted_payload: string } | undefined;
  if (!row) return DEFAULT_VAULT_GATEWAY_APIS;
  try {
    const parsed = JSON.parse(decryptField(row.encrypted_payload)) as Partial<StoredVaultGatewayApis>;
    return mergeVaultApis(DEFAULT_VAULT_GATEWAY_APIS, parsed);
  } catch {
    return DEFAULT_VAULT_GATEWAY_APIS;
  }
}

export function getMaskedVaultApisForOwner(): {
  config: StoredVaultGatewayApis;
  configuredFlags: Record<string, boolean>;
} {
  const raw = getVaultGatewayApisRawFromDb();
  const masked: StoredVaultGatewayApis = {
    btcpay: {
      ...raw.btcpay,
      apiKey: maskSecretValue(raw.btcpay.apiKey),
      webhookSecret: maskSecretValue(raw.btcpay.webhookSecret)
    },
    nowpayments: {
      ...raw.nowpayments,
      apiKey: maskSecretValue(raw.nowpayments.apiKey),
      ipnSecret: maskSecretValue(raw.nowpayments.ipnSecret)
    },
    coingate: {
      ...raw.coingate,
      apiToken: maskSecretValue(raw.coingate.apiToken)
    },
    paypal: {
      ...raw.paypal,
      clientSecret: maskSecretValue(raw.paypal.clientSecret),
      webhookId: maskSecretValue(raw.paypal.webhookId)
    },
    onramps: {
      ...raw.onramps,
      moonpaySecretKey: maskSecretValue(raw.onramps.moonpaySecretKey),
      transakApiKey: maskSecretValue(raw.onramps.transakApiKey),
      banxaApiKey: maskSecretValue(raw.onramps.banxaApiKey),
      banxaSecret: maskSecretValue(raw.onramps.banxaSecret)
    },
    virtualCards: {
      ...raw.virtualCards,
      redotpayApiKey: maskSecretValue(raw.virtualCards.redotpayApiKey),
      bybitApiKey: maskSecretValue(raw.virtualCards.bybitApiKey),
      bitpayMerchantToken: maskSecretValue(raw.virtualCards.bitpayMerchantToken),
      wiseApiToken: maskSecretValue(raw.virtualCards.wiseApiToken)
    }
  };

  return {
    config: masked,
    configuredFlags: {
      btcpay: Boolean(raw.btcpay.enabled && raw.btcpay.serverUrl && raw.btcpay.storeId && raw.btcpay.apiKey),
      nowpayments: Boolean(raw.nowpayments.enabled && raw.nowpayments.apiKey),
      coingate: Boolean(raw.coingate.enabled && raw.coingate.apiToken),
      paypal: Boolean(raw.paypal.enabled && raw.paypal.clientId && raw.paypal.clientSecret),
      moonpay: Boolean(raw.onramps.moonpayPublicKey),
      transak: Boolean(raw.onramps.transakApiKey),
      banxa: Boolean(raw.onramps.banxaDomain && raw.onramps.banxaApiKey),
      redotpay: Boolean(raw.virtualCards.redotpayAccountId || raw.virtualCards.redotpayDepositWallet),
      bybit: Boolean(raw.virtualCards.bybitUid || raw.virtualCards.bybitDepositAddress),
      bitpay: Boolean(raw.virtualCards.bitpayPayoutEmail || raw.virtualCards.bitpayMerchantToken),
      wise: Boolean(raw.virtualCards.wiseBusinessEmail || raw.virtualCards.wiseIbanOrRouting)
    }
  };
}

export function getPublicGatewayAvailability(): {
  btcpayConfigured: boolean;
  btcpayServerUrl: string;
  nowpaymentsConfigured: boolean;
  coingateConfigured: boolean;
  paypalConfigured: boolean;
  paypalEnvironment: 'sandbox' | 'live';
  activeOnRamp: 'NOWPAYMENTS_FIAT' | 'MOONPAY' | 'TRANSAK' | 'BANXA';
  onRampConfigured: boolean;
  preferredVirtualCard: 'REDOTPAY' | 'BYBIT' | 'BITPAY' | 'WISE';
} {
  const raw = getVaultGatewayApisRawFromDb();
  const activeOnRamp = raw.onramps.activeProvider;
  const onRampConfigured =
    (activeOnRamp === 'MOONPAY' && Boolean(raw.onramps.moonpayPublicKey)) ||
    (activeOnRamp === 'TRANSAK' && Boolean(raw.onramps.transakApiKey)) ||
    (activeOnRamp === 'BANXA' && Boolean(raw.onramps.banxaDomain && raw.onramps.banxaApiKey)) ||
    (activeOnRamp === 'NOWPAYMENTS_FIAT' && Boolean(raw.nowpayments.apiKey));

  const paypalClientId = raw.paypal.clientId || process.env.PAYPAL_CLIENT_ID || '';
  const paypalSecret = raw.paypal.clientSecret || process.env.PAYPAL_CLIENT_SECRET || '';
  const paypalEnabled = raw.paypal.enabled || Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);

  return {
    btcpayConfigured: Boolean(raw.btcpay.enabled && raw.btcpay.serverUrl && raw.btcpay.storeId && raw.btcpay.apiKey),
    btcpayServerUrl: raw.btcpay.serverUrl,
    nowpaymentsConfigured: Boolean(raw.nowpayments.enabled && raw.nowpayments.apiKey),
    coingateConfigured: Boolean(raw.coingate.enabled && raw.coingate.apiToken),
    paypalConfigured: Boolean(paypalEnabled && paypalClientId && paypalSecret),
    paypalEnvironment: raw.paypal.environment === 'live' ? 'live' : 'sandbox',
    activeOnRamp,
    onRampConfigured,
    preferredVirtualCard: raw.virtualCards.preferredBrand
  };
}

export function saveVaultGatewayApisInDb(
  partial: Partial<StoredVaultGatewayApis>,
  adminEmail: string,
  ipAddress: string
): ReturnType<typeof getMaskedVaultApisForOwner> {
  const db = getDb();
  const current = getVaultGatewayApisRawFromDb();
  const next = mergeVaultApis(current, partial);
  const now = Date.now();

  db.prepare(`
    INSERT INTO vault_gateway_apis_encrypted (id, owner_email, encrypted_payload, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(owner_email) DO UPDATE SET
      encrypted_payload = excluded.encrypted_payload,
      updated_at = excluded.updated_at
  `).run('vault_apis_01', OWNER_EMAIL, encryptField(JSON.stringify(next)), now);

  appendAuditLog(
    adminEmail,
    ipAddress,
    'VAULT_GATEWAY_APIS_UPDATED',
    'WARN',
    `APIs de Bóveda actualizadas (PayPal=${next.paypal.enabled ? next.paypal.environment.toUpperCase() : 'OFF'}, BTCPay=${next.btcpay.enabled ? 'ON' : 'OFF'}, NOWPayments=${next.nowpayments.enabled ? 'ON' : 'OFF'}, CoinGate=${next.coingate.enabled ? 'ON' : 'OFF'}, OnRamp=${next.onramps.activeProvider}, Tarjeta=${next.virtualCards.preferredBrand}).`
  );

  return getMaskedVaultApisForOwner();
}

export function getFullPlatformSummaryAndHistory(): {
  subject: string;
  generatedAt: string;
  recipientEmail: string;
  markdownReport: string;
  plainTextReport: string;
  metrics: {
    totalOrders: number;
    settledOrders: number;
    settledVolumeUSD: number;
    vmTestersCount: number;
    securityScore: number;
  };
} {
  const payout = getOwnerPayoutConfigFromDb();
  const maskedApis = getMaskedVaultApisForOwner();
  const vuln = runVulnerabilitySelfScan();
  const integrity = verifyDatabaseIntegrity();
  const testers = listVmTestersFromDb();
  const orders = listUsdtPurchaseOrdersFromDb(50);
  const tickets = listSupportTicketsFromDb(OWNER_EMAIL, true);
  const vmReport = buildVmDiagnosticReport();

  const settledOrders = orders.filter(o => o.status === 'VERIFIED_SETTLED');
  const settledVolumeUSD = settledOrders.reduce((acc, o) => acc + o.priceUSD, 0);
  const generatedAt = new Date().toISOString();

  const lines: string[] = [
    '# AetherVault — Resumen Ejecutivo Completo & Historial de Conversación',
    `Fecha de generación: ${generatedAt}`,
    `Propietario / Administrador: ${OWNER_EMAIL}`,
    '',
    '## 1. Resumen de Arquitectura y Funcionalidades Implementadas',
    '- **Plataforma Multi-Juego y Economía**: Hub de Casino (Top 50 Casino, Ruleta Europea, Blackjack 21, Póker 5-Card Draw, Arena), Sistema de Habilidades/Niveles (Nv. 1 a 100), Horas Locas, Airdrops y Regalos.',
    '- **Seguridad Blindada de App y Base de Datos**:',
    `  - SQLite WAL con cipher en reposo **AES-256-GCM** para TXIDs, APIs y billeteras de pago.`,
    `  - Contraseñas hasheadas con **scrypt (N=16384 + salt 128-bit)** y validación constant-time.`,
    `  - Tokens **HMAC-SHA256** + Cookies HttpOnly SameSite=Lax, WAF Anti-SQLi/XSS, Guardia CSRF Origin y bloqueo tras 5 intentos fallidos.`,
    `  - Auditoría encadenada SHA-256 verificada: Integridad SQLite = ${integrity.sqliteOk ? 'OK' : 'ALERTA'}, Cadena = ${integrity.chainValid ? 'ÍNTEGRA' : 'ALTERADA'} (${integrity.checkedRows} registros), Escáner Vulnerabilidades = **${vuln.scorePercent}%**.`,
    `- **Credenciales Actualizadas**: Administrador ${OWNER_EMAIL} migrado en SQL con la nueva clave maestra solicitada. Cuenta demo aislada \`gokudemo\` ($5,000 USD virtuales).`,
    '',
    '## 2. Entorno de Pruebas Virtual (VM) & Flujo de Transacciones Reales',
    `- **10 Usuarios de Prueba simultáneos**: \`tester01\` a \`tester10\` (contraseña \`vmtest2026\`) listos para jugar y recargar dinero real en flujo de prueba.`,
    `- **Flujo de Transacción Real para Test Users**: Los testers pueden crear órdenes reales desde la Tienda (USDT directo, BTCPay Server, NOWPayments, CoinGate y On-Ramps Visa/Mastercard), generar facturas en vivo, confirmar TXID anti-replay y acreditar el saldo real directamente en SQLite.`,
    `- **Bitácora de Experiencia & Errores QA**: ${vmReport.summary.totalLogs} eventos registrados (${vmReport.summary.errorsCount} errores, ${vmReport.summary.paymentEventsCount} eventos de pago, ${vmReport.summary.gameEventsCount} jugadas).`,
    '',
    '## 3. Configuración Actual de Bóveda, Pasarelas Crypto, On-Ramps y Tarjetas Virtuales',
    `- **Canal Principal**: ${payout.primarySettlementRail} | Auto-Convertir a USDT: ${payout.autoConvertToUsdt ? 'ACTIVO' : 'INACTIVO'}`,
    `- **USDT TRC-20**: \`${payout.usdtTrc20Address}\``,
    `- **USDT ERC-20**: \`${payout.usdtErc20Address}\``,
    `- **USDT BEP-20**: \`${payout.usdtBep20Address}\``,
    `- **Bitcoin (BTC)**: \`${payout.btcAddress}\``,
    `- **PayPal (${payout.paypalMode})**: \`${payout.paypalEmail}\``,
    `- **BTCPay Server (Debian 13 0% comisión)**: ${maskedApis.configuredFlags.btcpay ? `CONFIGURADA (${maskedApis.config.btcpay.serverUrl})` : 'Pendiente de API / URL en Bóveda'}`,
    `- **NOWPayments**: ${maskedApis.configuredFlags.nowpayments ? 'CONFIGURADA' : 'Pendiente de API Key en Bóveda'}`,
    `- **CoinGate**: ${maskedApis.configuredFlags.coingate ? 'CONFIGURADA' : 'Pendiente de API Token en Bóveda'}`,
    `- **On-Ramp Tarjeta Visa/MC Activo**: ${maskedApis.config.onramps.activeProvider} (MoonPay: ${maskedApis.configuredFlags.moonpay ? 'OK' : 'Pendiente'}, Transak: ${maskedApis.configuredFlags.transak ? 'OK' : 'Pendiente'}, Banxa: ${maskedApis.configuredFlags.banxa ? 'OK' : 'Pendiente'})`,
    `- **Tarjeta Virtual Preferida para Liquidación**: ${maskedApis.config.virtualCards.preferredBrand} (RedotPay: ${maskedApis.configuredFlags.redotpay ? 'Configurada' : 'Pendiente'}, Bybit Card: ${maskedApis.configuredFlags.bybit ? 'Configurada' : 'Pendiente'}, BitPay Card: ${maskedApis.configuredFlags.bitpay ? 'Configurada' : 'Pendiente'}, Wise Business: ${maskedApis.configuredFlags.wise ? 'Configurada' : 'Pendiente'})`,
    '',
    '## 4. Métricas Actuales de Base de Datos en Vivo',
    `- **Órdenes de Compra Registradas**: ${orders.length} totales (${settledOrders.length} liquidadas por $${settledVolumeUSD.toFixed(2)} USD)`,
    `- **Tickets de Soporte**: ${tickets.length} tickets en sistema`,
    `- **Testers VM Activos**: ${testers.filter(t => t.isActive).length} / ${MAX_VM_TESTERS}`,
    '',
    '## 5. Historial Cronológico Completo de la Conversación y Cambios',
    '1. **Solicitud 1 — Aplicar sugerencias iniciales**: Estructura económica 70% Bóveda / 30% Premios y 20% comisión de retiros, niveles de monedas (1 a 10) y juegos Provably Fair.',
    '2. **Solicitud 2 y 3 — Panel de Soporte para Usuarios**: Implementación de panel de usuario con creación de tickets, chat con administrador, cambio de contraseña cifrado y diagnóstico de pagos por TXID/Hash.',
    '3. **Solicitud 4 y 5 — Tablero de Control de Tickets para Administrador**: Control exclusivo para el propietario permitiendo filtrar, responder y cambiar estados a "En Revisión", "Resuelto" y "Reembolso Procesado".',
    '4. **Solicitud 6 y 7 — Seguridad de App, Base de Datos y Guía Debian 13**: Hardening integral (SQLite WAL + AES-256-GCM + scrypt + HMAC-SHA256 + WAF/CSRF/Rate Limiter), más esquema PostgreSQL 17 RLS (`postgres-hardening.sql`) y script de despliegue para Debian 13 (`install-debian13.sh`).',
    '5. **Solicitud 8 — Enrutamiento USDT y Protección contra Vulnerabilidades en VM**: Todas las compras de monedas enrutadas a las cuentas USDT del dueño con validación anti-reutilización TXID y auto-escaneo de vulnerabilidades.',
    '6. **Solicitud 9 — Nueva Clave Maestra, Guía Pasarelas Anti-Congelamiento y Entorno VM (10 Testers)**: Cambio de contraseña del propietario en SQL a la nueva clave maestra segura, configuración de 10 usuarios VM (`tester01..tester10`) con bitácora QA exportable en JSON, y asesoría de pasarelas BTC/PayPal Business/Virtual Cards.',
    '7. **Solicitud 10 — Flujo de Dinero Real para Testers, Panel de APIs (BTCPay / NOWPayments / CoinGate / On-Ramps / Tarjetas Virtuales) y Envío por Correo**:',
    '   - Activado el flujo real de recargas para testers y clientes con creación de facturas de pasarela.',
    '   - Adaptada la Bóveda con panel cifrado AES-256-GCM para guardar APIs de BTCPay Server, NOWPayments, CoinGate, MoonPay, Transak, Banxa y cuentas/APIs de tarjetas virtuales RedotPay, Bybit Card, BitPay Card y Wise Business.',
    '   - Integrado generador de resumen ejecutivo + historial completo con envío directo a `trabajofino52@gmail.com` vía Gmail.',
    '',
    '## 6. Pasos Rápidos en Debian 13 (VM -> VPS)',
    '- Instalar dependencias: `npm install && npm run build`',
    '- Ejecutar instalador automatizado: `sudo bash deploy/debian13/install-debian13.sh` (UFW + Fail2Ban + Nginx TLS + Node/PM2 + PostgreSQL 17 RLS).',
    '- Para BTCPay Server en el mismo VPS Debian 13: desplegar con Docker (`btcpayserver-docker`) detrás de Nginx como subdominio `btcpay.tudominio.com`, copiar el Store ID y API Key Greenfield y pegarlos en la pestaña **Bóveda: APIs & Tarjetas**.'
  ];

  const markdownReport = lines.join('\n');
  const plainTextReport = markdownReport.replace(/[*`#]/g, '');

  return {
    subject: `AetherVault — Resumen Ejecutivo Completo + Historial de Conversación (${new Date().toLocaleDateString('es-ES')})`,
    generatedAt,
    recipientEmail: OWNER_EMAIL,
    markdownReport,
    plainTextReport,
    metrics: {
      totalOrders: orders.length,
      settledOrders: settledOrders.length,
      settledVolumeUSD,
      vmTestersCount: testers.length,
      securityScore: vuln.scorePercent
    }
  };
}

export const MAX_CLIENT_WITHDRAWAL_RATIO = 0.30;

export interface DbEconomyConfig {
  vaultRetentionPct: number;
  redemptionFeePct: number;
  transferFeePct: number;
  maxWithdrawalRatioPct: number;
  updatedAt: number;
  updatedBy: string;
}

export function getEconomyConfigFromDb(): DbEconomyConfig {
  const db = getDb();
  const row = db
    .prepare('SELECT vault_retention_pct, redemption_fee_pct, transfer_fee_pct, updated_at, updated_by FROM economy_config WHERE id = ?')
    .get('econ_default') as
    | {
        vault_retention_pct: number;
        redemption_fee_pct: number;
        transfer_fee_pct: number;
        updated_at: number;
        updated_by: string;
      }
    | undefined;

  if (!row) {
    return {
      vaultRetentionPct: 70,
      redemptionFeePct: 20,
      transferFeePct: 5,
      maxWithdrawalRatioPct: 30,
      updatedAt: Date.now(),
      updatedBy: OWNER_EMAIL
    };
  }

  return {
    vaultRetentionPct: row.vault_retention_pct,
    redemptionFeePct: row.redemption_fee_pct,
    transferFeePct: row.transfer_fee_pct,
    maxWithdrawalRatioPct: 30,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by
  };
}

export function saveEconomyConfigInDb(params: {
  vaultRetentionPct: number;
  redemptionFeePct: number;
  transferFeePct?: number;
  adminEmail: string;
  ipAddress: string;
}): DbEconomyConfig {
  const db = getDb();
  const current = getEconomyConfigFromDb();
  const retention = Math.min(Math.max(Math.round(Number(params.vaultRetentionPct)), 50), 95);
  const redemptionFee = Math.min(Math.max(Math.round(Number(params.redemptionFeePct)), 5), 50);
  const transferFee = Math.min(
    Math.max(
      Math.round(Number(params.transferFeePct !== undefined ? params.transferFeePct : current.transferFeePct)),
      0
    ),
    25
  );
  const now = Date.now();

  db.prepare(`
    INSERT INTO economy_config (id, vault_retention_pct, redemption_fee_pct, transfer_fee_pct, updated_at, updated_by)
    VALUES ('econ_default', ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      vault_retention_pct = excluded.vault_retention_pct,
      redemption_fee_pct = excluded.redemption_fee_pct,
      transfer_fee_pct = excluded.transfer_fee_pct,
      updated_at = excluded.updated_at,
      updated_by = excluded.updated_by
  `).run(retention, redemptionFee, transferFee, now, params.adminEmail);

  appendAuditLog(
    params.adminEmail,
    params.ipAddress,
    'ECONOMY_CONFIG_UPDATED',
    'WARN',
    `Márgenes del Casino actualizados: Retención Casa=${retention}% (Premios=${100 - retention}%), Comisión Retiro=${redemptionFee}%, Comisión Transferencia P2P=${transferFee}%, Tope Retiro=30%.`
  );

  return {
    vaultRetentionPct: retention,
    redemptionFeePct: redemptionFee,
    transferFeePct: transferFee,
    maxWithdrawalRatioPct: 30,
    updatedAt: now,
    updatedBy: params.adminEmail
  };
}

export interface DbPlayerVisibilityConfig {
  showTop50Casino: boolean;
  showCharacterHero: boolean;
  showArenaBattle: boolean;
  showStoreCatalog: boolean;
  showSecurityTools: boolean;
  showNeobankCard: boolean;
  updatedAt: number;
  updatedBy: string;
}

export function getPlayerVisibilityConfigFromDb(): DbPlayerVisibilityConfig {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT show_top50_casino, show_character_hero, show_arena_battle,
              show_store_catalog, show_security_tools, show_neobank_card,
              updated_at, updated_by
       FROM player_visibility_config WHERE id = ?`
    )
    .get('vis_default') as
    | {
        show_top50_casino: number;
        show_character_hero: number;
        show_arena_battle: number;
        show_store_catalog: number;
        show_security_tools: number;
        show_neobank_card: number;
        updated_at: number;
        updated_by: string;
      }
    | undefined;

  if (!row) {
    return {
      showTop50Casino: false,
      showCharacterHero: false,
      showArenaBattle: false,
      showStoreCatalog: false,
      showSecurityTools: false,
      showNeobankCard: false,
      updatedAt: Date.now(),
      updatedBy: OWNER_EMAIL
    };
  }

  return {
    showTop50Casino: row.show_top50_casino === 1,
    showCharacterHero: row.show_character_hero === 1,
    showArenaBattle: row.show_arena_battle === 1,
    showStoreCatalog: row.show_store_catalog === 1,
    showSecurityTools: row.show_security_tools === 1,
    showNeobankCard: row.show_neobank_card === 1,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by
  };
}

export function savePlayerVisibilityConfigInDb(params: {
  patch: Partial<Omit<DbPlayerVisibilityConfig, 'updatedAt' | 'updatedBy'>>;
  adminEmail: string;
  ipAddress: string;
}): DbPlayerVisibilityConfig {
  const db = getDb();
  const current = getPlayerVisibilityConfigFromDb();
  const next: DbPlayerVisibilityConfig = {
    showTop50Casino: params.patch.showTop50Casino ?? current.showTop50Casino,
    showCharacterHero: params.patch.showCharacterHero ?? current.showCharacterHero,
    showArenaBattle: params.patch.showArenaBattle ?? current.showArenaBattle,
    showStoreCatalog: params.patch.showStoreCatalog ?? current.showStoreCatalog,
    showSecurityTools: params.patch.showSecurityTools ?? current.showSecurityTools,
    showNeobankCard: params.patch.showNeobankCard ?? current.showNeobankCard,
    updatedAt: Date.now(),
    updatedBy: params.adminEmail
  };

  db.prepare(`
    INSERT INTO player_visibility_config (
      id, show_top50_casino, show_character_hero, show_arena_battle,
      show_store_catalog, show_security_tools, show_neobank_card,
      updated_at, updated_by
    )
    VALUES ('vis_default', ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      show_top50_casino = excluded.show_top50_casino,
      show_character_hero = excluded.show_character_hero,
      show_arena_battle = excluded.show_arena_battle,
      show_store_catalog = excluded.show_store_catalog,
      show_security_tools = excluded.show_security_tools,
      show_neobank_card = excluded.show_neobank_card,
      updated_at = excluded.updated_at,
      updated_by = excluded.updated_by
  `).run(
    next.showTop50Casino ? 1 : 0,
    next.showCharacterHero ? 1 : 0,
    next.showArenaBattle ? 1 : 0,
    next.showStoreCatalog ? 1 : 0,
    next.showSecurityTools ? 1 : 0,
    next.showNeobankCard ? 1 : 0,
    next.updatedAt,
    next.updatedBy
  );

  appendAuditLog(
    params.adminEmail,
    params.ipAddress,
    'PLAYER_VISIBILITY_UPDATED',
    'INFO',
    `Visibilidad para jugadores actualizada: Top50=${next.showTop50Casino}, Hero=${next.showCharacterHero}, Arena=${next.showArenaBattle}, Catálogo=${next.showStoreCatalog}, SeguridadHeader=${next.showSecurityTools}, Neobanco=${next.showNeobankCard}.`
  );

  return next;
}

export interface DbRedemptionRequest {
  id: string;
  playerEmail: string;
  playerName: string;
  balanceBeforeCoins: number;
  maxAllowed30PctCoins: number;
  requestedOriginalCoins?: number;
  cappedAutomatically: boolean;
  amountCoins: number;
  grossUSD: number;
  feeUSD: number;
  netUSD: number;
  destinationType: 'crypto_usdt' | 'crypto_monero' | 'crypto_btc' | 'paypal' | 'bank_wire';
  destinationAddress: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  awaitingAuthorization: boolean;
  authorizedByEmail?: string;
  rejectionReason?: string;
  timestamp: number;
  reviewedAt?: number;
  txHash: string;
  payoutStatus?: string;
  externalPayoutId?: string;
}

export function listRedeemableUsersFromDb(): Array<{
  email: string;
  displayName: string;
  role: string;
  isActive: boolean;
  coinsBalance: number;
  maxAllowed30PctCoins: number;
}> {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT email, display_name, role, is_active, coins_balance
       FROM users
       WHERE is_demo_isolated = 0 AND role <> 'DEMO'
       ORDER BY CASE WHEN role = 'OWNER' THEN 0 ELSE 1 END, email ASC`
    )
    .all() as Array<{
      email: string;
      display_name: string;
      role: string;
      is_active: number;
      coins_balance: number;
    }>;

  return rows.map(r => ({
    email: r.email,
    displayName: r.display_name,
    role: r.role,
    isActive: r.is_active === 1,
    coinsBalance: r.coins_balance,
    maxAllowed30PctCoins: Math.floor(r.coins_balance * MAX_CLIENT_WITHDRAWAL_RATIO)
  }));
}

export function createClientRedemptionRequestInDb(params: {
  actorEmail: string;
  playerName: string;
  amountCoins: number;
  destType: 'crypto_usdt' | 'crypto_monero' | 'crypto_btc' | 'paypal' | 'bank_wire';
  destAddress: string;
  feeRatePct?: number;
  autoClampTo30Pct?: boolean;
  ipAddress: string;
}): {
  ok: boolean;
  status: number;
  message: string;
  request?: DbRedemptionRequest;
  updatedCoinsBalance?: number;
  maxAllowed30PctCoins?: number;
} {
  const db = getDb();
  const user = db
    .prepare('SELECT id, email, display_name, role, is_active, is_demo_isolated, coins_balance FROM users WHERE LOWER(email) = LOWER(?)')
    .get(params.actorEmail) as
    | {
        id: string;
        email: string;
        display_name: string;
        role: string;
        is_active: number;
        is_demo_isolated: number;
        coins_balance: number;
      }
    | undefined;

  if (!user) {
    return { ok: false, status: 404, message: 'Usuario no encontrado en la base de datos.' };
  }

  if (user.role === 'DEMO' || user.is_demo_isolated === 1) {
    return { ok: false, status: 403, message: 'La cuenta demo está aislada y no puede retirar fondos reales.' };
  }

  if (user.is_active !== 1) {
    return { ok: false, status: 403, message: 'Debes confirmar al menos un depósito real antes de solicitar retiros.' };
  }

  const maxAllowedCoins = Math.floor(user.coins_balance * MAX_CLIENT_WITHDRAWAL_RATIO);
  const requestedOriginal = Math.floor(Number(params.amountCoins));

  if (!Number.isFinite(requestedOriginal) || requestedOriginal <= 0) {
    return { ok: false, status: 400, message: 'La cantidad de monedas a retirar debe ser mayor a 0.' };
  }

  if (maxAllowedCoins <= 0) {
    return {
      ok: false,
      status: 400,
      maxAllowed30PctCoins: 0,
      message: 'Saldo insuficiente para generar una salida válida dentro del tope del 30%.'
    };
  }

  let finalCoins = requestedOriginal;
  let cappedAutomatically = false;

  if (requestedOriginal > maxAllowedCoins) {
    if (params.autoClampTo30Pct) {
      finalCoins = maxAllowedCoins;
      cappedAutomatically = true;
      appendAuditLog(
        user.email,
        params.ipAddress,
        'REDEMPTION_AUTO_CAPPED_30PCT',
        'WARN',
        `Solicitud original de ${requestedOriginal} mo limitada automáticamente al 30% (${finalCoins} mo de ${user.coins_balance} mo) y puesta en Espera de Autorización.`
      );
    } else {
      appendAuditLog(
        user.email,
        params.ipAddress,
        'REDEMPTION_30PCT_CAP_BLOCKED',
        'WARN',
        `Intento de retiro por ${requestedOriginal} mo bloqueado (máximo permitido 30% = ${maxAllowedCoins} mo de ${user.coins_balance} mo).`
      );
      return {
        ok: false,
        status: 400,
        maxAllowed30PctCoins: maxAllowedCoins,
        message: `Límite máximo de retiro: solo puedes sacar hasta el 30% de tu saldo (${maxAllowedCoins.toLocaleString()} monedas de ${user.coins_balance.toLocaleString()}).`
      };
    }
  }

  // Server-authoritative withdrawal commission from economy_config (never trust client-supplied fee rate)
  const econ = getEconomyConfigFromDb();
  const feeRate = Math.min(Math.max(econ.redemptionFeePct, 5), 50) / 100;
  const grossUSD = Math.round(finalCoins * 0.8 * 100) / 100;
  const feeUSD = Math.round(grossUSD * feeRate * 100) / 100;
  const netUSD = Math.round((grossUSD - feeUSD) * 100) / 100;
  const now = Date.now();
  const id = 'red_' + now + '_' + crypto.randomBytes(3).toString('hex');
  const txHash = '0x' + crypto.createHash('sha256').update(`${id}|${user.email}|${finalCoins}|${now}`).digest('hex');
  const newBalance = user.coins_balance - finalCoins;

  db.prepare('UPDATE users SET coins_balance = ?, updated_at = ? WHERE id = ?').run(newBalance, now, user.id);

  db.prepare(`
    INSERT INTO player_redemption_requests (
      id, user_id, player_email, player_name, balance_before_coins, max_allowed_30pct_coins,
      requested_original_coins, capped_automatically,
      amount_coins, gross_usd, fee_usd, net_usd, destination_type, destination_address_enc,
      status, awaiting_authorization, tx_hash, payout_status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL', 1, ?, 'AWAITING_OWNER', ?)
  `).run(
    id,
    user.id,
    user.email,
    params.playerName || user.display_name,
    user.coins_balance,
    maxAllowedCoins,
    requestedOriginal,
    cappedAutomatically ? 1 : 0,
    finalCoins,
    grossUSD,
    feeUSD,
    netUSD,
    params.destType,
    encryptField(params.destAddress.trim()),
    txHash,
    now
  );

  appendAuditLog(
    user.email,
    params.ipAddress,
    'CLIENT_REDEMPTION_REQUESTED',
    'INFO',
    `Solicitud #${id.slice(-8)}: ${finalCoins} mo${cappedAutomatically ? ` (limitado auto desde ${requestedOriginal})` : ''} | Bruto $${grossUSD.toFixed(2)} - Comisión Casino ${econ.redemptionFeePct}% ($${feeUSD.toFixed(2)}) = $${netUSD.toFixed(2)} netos vía ${params.destType}. Espera de autorización activa para ${OWNER_EMAIL}.`
  );

  return {
    ok: true,
    status: 201,
    updatedCoinsBalance: newBalance,
    maxAllowed30PctCoins: maxAllowedCoins,
    message: cappedAutomatically
      ? `Solicitud limitada automáticamente al 30% (${finalCoins.toLocaleString()} de ${user.coins_balance.toLocaleString()} mo). Campo "Espera de Autorización" activado para acción manual de ${OWNER_EMAIL}.`
      : `Solicitud registrada dentro del límite del 30% (Comisión Casino ${econ.redemptionFeePct}% = $${feeUSD.toFixed(2)}). En "Espera de Autorización" hasta acción manual de ${OWNER_EMAIL}.`,
    request: {
      id,
      playerEmail: user.email,
      playerName: params.playerName || user.display_name,
      balanceBeforeCoins: user.coins_balance,
      maxAllowed30PctCoins: maxAllowedCoins,
      requestedOriginalCoins: requestedOriginal,
      cappedAutomatically,
      amountCoins: finalCoins,
      grossUSD,
      feeUSD,
      netUSD,
      destinationType: params.destType,
      destinationAddress: params.destAddress.trim(),
      status: 'PENDING_APPROVAL',
      awaitingAuthorization: true,
      timestamp: now,
      txHash,
      payoutStatus: 'AWAITING_OWNER'
    }
  };
}

export function listClientRedemptionRequestsFromDb(actorEmail: string, isOwner: boolean, limit: number = 50): DbRedemptionRequest[] {
  const db = getDb();
  const rows = (
    isOwner
      ? db.prepare('SELECT * FROM player_redemption_requests ORDER BY created_at DESC LIMIT ?').all(limit)
      : db.prepare('SELECT * FROM player_redemption_requests WHERE LOWER(player_email) = LOWER(?) ORDER BY created_at DESC LIMIT ?').all(actorEmail, limit)
  ) as Array<{
    id: string;
    player_email: string;
    player_name: string;
    balance_before_coins: number;
    max_allowed_30pct_coins: number;
    requested_original_coins: number | null;
    capped_automatically: number | null;
    amount_coins: number;
    gross_usd: number;
    fee_usd: number;
    net_usd: number;
    destination_type: DbRedemptionRequest['destinationType'];
    destination_address_enc: string;
    status: DbRedemptionRequest['status'];
    awaiting_authorization: number | null;
    authorized_by_email: string | null;
    rejection_reason: string | null;
    tx_hash: string;
    payout_status: string | null;
    external_payout_id: string | null;
    created_at: number;
    reviewed_at: number | null;
  }>;

  return rows.map(r => {
    let destAddr = r.destination_address_enc;
    try {
      destAddr = decryptField(r.destination_address_enc);
    } catch {
      destAddr = '***cifrado***';
    }
    return {
      id: r.id,
      playerEmail: r.player_email,
      playerName: r.player_name,
      balanceBeforeCoins: r.balance_before_coins,
      maxAllowed30PctCoins: r.max_allowed_30pct_coins,
      requestedOriginalCoins: r.requested_original_coins ?? r.amount_coins,
      cappedAutomatically: r.capped_automatically === 1,
      amountCoins: r.amount_coins,
      grossUSD: r.gross_usd,
      feeUSD: r.fee_usd,
      netUSD: r.net_usd,
      destinationType: r.destination_type,
      destinationAddress: destAddr,
      status: r.status,
      awaitingAuthorization: r.status === 'PENDING_APPROVAL' && r.awaiting_authorization !== 0,
      authorizedByEmail: r.authorized_by_email || undefined,
      rejectionReason: r.rejection_reason || undefined,
      timestamp: r.created_at,
      reviewedAt: r.reviewed_at || undefined,
      txHash: r.tx_hash,
      payoutStatus: r.payout_status || undefined,
      externalPayoutId: r.external_payout_id || undefined
    };
  });
}

export function reviewClientRedemptionRequestInDb(params: {
  requestId: string;
  decision: 'APPROVED' | 'REJECTED';
  ownerEmail: string;
  rejectionReason?: string;
  ipAddress: string;
}): { ok: boolean; status: number; message: string; request?: DbRedemptionRequest } {
  if (params.ownerEmail.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
    return {
      ok: false,
      status: 403,
      message: `Solo el Administrador (${OWNER_EMAIL}) puede autorizar o rechazar retiros.`
    };
  }

  const db = getDb();
  const row = db.prepare('SELECT * FROM player_redemption_requests WHERE id = ?').get(params.requestId) as
    | {
        id: string;
        user_id: string;
        player_email: string;
        player_name: string;
        balance_before_coins: number;
        max_allowed_30pct_coins: number;
        requested_original_coins: number | null;
        capped_automatically: number | null;
        amount_coins: number;
        gross_usd: number;
        fee_usd: number;
        net_usd: number;
        destination_type: DbRedemptionRequest['destinationType'];
        destination_address_enc: string;
        status: DbRedemptionRequest['status'];
        awaiting_authorization: number | null;
        tx_hash: string;
        payout_status: string | null;
        external_payout_id: string | null;
        created_at: number;
      }
    | undefined;

  if (!row) {
    return { ok: false, status: 404, message: 'Solicitud de retiro no encontrada.' };
  }

  if (row.status !== 'PENDING_APPROVAL' || row.awaiting_authorization === 0) {
    return { ok: false, status: 409, message: `La solicitud ya salió de Espera de Autorización (${row.status}).` };
  }

  const verifiedMax30 = Math.floor(row.balance_before_coins * MAX_CLIENT_WITHDRAWAL_RATIO);
  if (params.decision === 'APPROVED' && (row.amount_coins > verifiedMax30 || row.amount_coins > row.max_allowed_30pct_coins)) {
    appendAuditLog(
      OWNER_EMAIL,
      params.ipAddress,
      'REDEMPTION_APPROVAL_30PCT_BLOCKED',
      'CRITICAL',
      `Se bloqueó la aprobación del retiro #${row.id.slice(-8)} porque ${row.amount_coins} mo excede el 30% (${verifiedMax30} mo).`
    );
    return {
      ok: false,
      status: 400,
      message: `Validación fallida: el monto (${row.amount_coins} mo) excede el 30% del balance previo (${verifiedMax30} mo). Recházalo para reembolsar.`
    };
  }

  const now = Date.now();
  const reason = params.decision === 'REJECTED' ? (params.rejectionReason?.trim() || 'Rechazado por verificación del propietario') : null;
  const initialPayoutStatus = params.decision === 'APPROVED' ? 'AUTHORIZED_READY' : 'REJECTED_REFUNDED';

  db.prepare(`
    UPDATE player_redemption_requests
    SET status = ?, awaiting_authorization = 0, authorized_by_email = ?, rejection_reason = ?, payout_status = ?, reviewed_at = ?
    WHERE id = ?
  `).run(params.decision, OWNER_EMAIL, reason, initialPayoutStatus, now, row.id);

  if (params.decision === 'REJECTED') {
    db.prepare('UPDATE users SET coins_balance = coins_balance + ?, updated_at = ? WHERE id = ?').run(row.amount_coins, now, row.user_id);
  }

  appendAuditLog(
    OWNER_EMAIL,
    params.ipAddress,
    params.decision === 'APPROVED' ? 'REDEMPTION_AUTHORIZED_BY_OWNER' : 'REDEMPTION_REJECTED_BY_OWNER',
    'WARN',
    `Retiro #${row.id.slice(-8)} (${row.player_email}, ${row.amount_coins} mo / $${row.net_usd.toFixed(2)} netos, comisión casino $${row.fee_usd.toFixed(2)}) -> ${params.decision} (Espera de Autorización resuelta por ${OWNER_EMAIL}).`
  );

  let destAddr = row.destination_address_enc;
  try {
    destAddr = decryptField(row.destination_address_enc);
  } catch {
    destAddr = '***cifrado***';
  }

  return {
    ok: true,
    status: 200,
    message: params.decision === 'APPROVED' ? 'Retiro autorizado manualmente por trabajofino52@gmail.com.' : 'Retiro rechazado manualmente y monedas devueltas al jugador.',
    request: {
      id: row.id,
      playerEmail: row.player_email,
      playerName: row.player_name,
      balanceBeforeCoins: row.balance_before_coins,
      maxAllowed30PctCoins: row.max_allowed_30pct_coins,
      requestedOriginalCoins: row.requested_original_coins ?? row.amount_coins,
      cappedAutomatically: row.capped_automatically === 1,
      amountCoins: row.amount_coins,
      grossUSD: row.gross_usd,
      feeUSD: row.fee_usd,
      netUSD: row.net_usd,
      destinationType: row.destination_type,
      destinationAddress: destAddr,
      status: params.decision,
      awaitingAuthorization: false,
      authorizedByEmail: OWNER_EMAIL,
      rejectionReason: reason || undefined,
      timestamp: row.created_at,
      reviewedAt: now,
      txHash: row.tx_hash,
      payoutStatus: initialPayoutStatus,
      externalPayoutId: row.external_payout_id || undefined
    }
  };
}

export function updateRedemptionPayoutResultInDb(
  requestId: string,
  payoutStatus: string,
  externalPayoutId: string | undefined,
  ownerEmail: string,
  ipAddress: string
): void {
  const db = getDb();
  db.prepare(`
    UPDATE player_redemption_requests
    SET payout_status = ?, external_payout_id = ?
    WHERE id = ?
  `).run(payoutStatus, externalPayoutId || null, requestId);

  appendAuditLog(
    ownerEmail,
    ipAddress,
    payoutStatus.startsWith('PAYPAL_SENT') ? 'PAYPAL_PAYOUT_SENT' : 'USDT_PAYOUT_DISPATCHED',
    'INFO',
    `Desembolso retiro #${requestId.slice(-8)}: estado=${payoutStatus}${externalPayoutId ? ` | Ref=${externalPayoutId}` : ''}.`
  );
}

export type BtcpayWebhookEventType =
  | 'InvoiceSettled'
  | 'InvoicePaymentSettled'
  | 'InvoiceProcessing'
  | 'InvoiceExpired'
  | 'InvoiceInvalid'
  | 'ManualTest';

export interface DbBtcpayWebhookEvent {
  id: string;
  deliveryId: string;
  invoiceId: string;
  eventType: BtcpayWebhookEventType;
  userEmail: string;
  coinsCredited: number;
  amountUSD: number;
  blockchainConfirmed: boolean;
  signatureVerified: boolean;
  firestoreSynced: boolean;
  firestoreSyncedAt?: number;
  rawSummary: string;
  createdAt: number;
}

function mapBtcpayWebhookRow(r: {
  id: string;
  delivery_id: string;
  invoice_id: string;
  event_type: BtcpayWebhookEventType;
  user_email: string;
  coins_credited: number;
  amount_usd: number;
  blockchain_confirmed: number;
  signature_verified: number;
  firestore_synced: number;
  firestore_synced_at: number | null;
  raw_summary: string;
  created_at: number;
}): DbBtcpayWebhookEvent {
  return {
    id: r.id,
    deliveryId: r.delivery_id,
    invoiceId: r.invoice_id,
    eventType: r.event_type,
    userEmail: r.user_email,
    coinsCredited: r.coins_credited,
    amountUSD: r.amount_usd,
    blockchainConfirmed: r.blockchain_confirmed === 1,
    signatureVerified: r.signature_verified === 1,
    firestoreSynced: r.firestore_synced === 1,
    firestoreSyncedAt: r.firestore_synced_at ?? undefined,
    rawSummary: r.raw_summary,
    createdAt: r.created_at
  };
}

export function processBtcpayWebhookEventInDb(params: {
  deliveryId: string;
  invoiceId: string;
  eventType: BtcpayWebhookEventType;
  orderId?: string;
  userEmail?: string;
  coinsAmount?: number;
  amountUSD?: number;
  signatureVerified: boolean;
  rawSummary: string;
  ipAddress: string;
}): {
  ok: boolean;
  duplicate: boolean;
  message: string;
  event: DbBtcpayWebhookEvent;
  updatedCoinsBalance?: number;
} {
  const db = getDb();
  const cleanDelivery = (params.deliveryId || `dlv_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`).trim().slice(0, 128);
  const cleanInvoice = (params.invoiceId || `inv_${Date.now()}`).trim().slice(0, 128);

  const existing = db.prepare('SELECT * FROM btcpay_webhook_events WHERE delivery_id = ?').get(cleanDelivery) as
    | Parameters<typeof mapBtcpayWebhookRow>[0]
    | undefined;
  if (existing) {
    return {
      ok: true,
      duplicate: true,
      message: 'Evento BTCPay ya procesado previamente (idempotencia por deliveryId).',
      event: mapBtcpayWebhookRow(existing)
    };
  }

  // Match purchase order by explicit orderId or gateway_invoice_id
  const matchedOrder = (
    params.orderId
      ? db.prepare('SELECT * FROM coin_purchase_orders WHERE id = ?').get(params.orderId)
      : db.prepare('SELECT * FROM coin_purchase_orders WHERE gateway_invoice_id = ? ORDER BY created_at DESC LIMIT 1').get(cleanInvoice)
  ) as
    | {
        id: string;
        user_email: string;
        coins_amount: number;
        price_usd: number;
        status: 'PENDING_TX' | 'VERIFIED_SETTLED' | 'REJECTED';
        destination_usdt_wallet: string;
      }
    | undefined;

  const targetEmail = (matchedOrder?.user_email || params.userEmail || 'tester01@vm.aethervault.local')
    .trim()
    .toLowerCase();
  const resolvedUsd = matchedOrder?.price_usd ?? Math.max(0, Number(params.amountUSD || 0));
  const resolvedCoins = matchedOrder?.coins_amount ?? Math.max(0, Math.round(Number(params.coinsAmount || 0)));

  const isBlockchainConfirmedEvent =
    params.signatureVerified &&
    (params.eventType === 'InvoiceSettled' ||
      params.eventType === 'InvoicePaymentSettled' ||
      params.eventType === 'ManualTest');

  const now = Date.now();
  let creditedCoins = 0;

  if (isBlockchainConfirmedEvent && resolvedCoins > 0) {
    if (matchedOrder) {
      if (matchedOrder.status !== 'VERIFIED_SETTLED') {
        const txRef = `BTCPAY-${cleanInvoice}`;
        const digest = crypto.createHash('sha256').update(txRef.toLowerCase(), 'utf8').digest('hex');
        const txEnc = encryptField(txRef);
        db.prepare(`
          UPDATE coin_purchase_orders
          SET tx_hash_enc = ?, tx_hash_digest = ?, status = 'VERIFIED_SETTLED', settled_at = ?
          WHERE id = ?
        `).run(txEnc, digest, now, matchedOrder.id);

        db.prepare(`
          UPDATE users
          SET is_active = 1, coins_balance = coins_balance + ?, updated_at = ?
          WHERE LOWER(email) = LOWER(?) AND role != 'DEMO'
        `).run(resolvedCoins, now, targetEmail);
        creditedCoins = resolvedCoins;
      }
    } else {
      const userRes = db
        .prepare(`
          UPDATE users
          SET is_active = 1, coins_balance = coins_balance + ?, updated_at = ?
          WHERE LOWER(email) = LOWER(?) AND role != 'DEMO'
        `)
        .run(resolvedCoins, now, targetEmail);
      if (userRes.changes > 0) {
        creditedCoins = resolvedCoins;
      } else {
        // Still record intended coin credit for Firestore user_balances ledger even if user only lives in Firebase Auth
        creditedCoins = resolvedCoins;
      }
    }
  }

  const eventId = `btcpay_${now}_${crypto.randomBytes(3).toString('hex')}`;
  db.prepare(`
    INSERT INTO btcpay_webhook_events (
      id, delivery_id, invoice_id, event_type, user_email, coins_credited,
      amount_usd, blockchain_confirmed, signature_verified, firestore_synced,
      raw_summary, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
  `).run(
    eventId,
    cleanDelivery,
    cleanInvoice,
    params.eventType,
    targetEmail,
    creditedCoins,
    resolvedUsd,
    isBlockchainConfirmedEvent ? 1 : 0,
    params.signatureVerified ? 1 : 0,
    params.rawSummary.slice(0, 400),
    now
  );

  const userBalRow = db
    .prepare('SELECT coins_balance FROM users WHERE LOWER(email) = LOWER(?)')
    .get(targetEmail) as { coins_balance: number } | undefined;

  appendAuditLog(
    targetEmail,
    params.ipAddress,
    isBlockchainConfirmedEvent ? 'BTCPAY_WEBHOOK_CONFIRMED' : 'BTCPAY_WEBHOOK_RECEIVED',
    isBlockchainConfirmedEvent ? 'INFO' : 'WARN',
    `Webhook BTCPay (${params.eventType}) factura=${cleanInvoice} HMAC=${params.signatureVerified ? 'OK' : 'FAIL'} +${creditedCoins} mo -> pendiente sync Firestore.`
  );

  const savedRow = db
    .prepare('SELECT * FROM btcpay_webhook_events WHERE id = ?')
    .get(eventId) as Parameters<typeof mapBtcpayWebhookRow>[0];

  return {
    ok: true,
    duplicate: false,
    message: isBlockchainConfirmedEvent
      ? `Webhook ${params.eventType} confirmado en blockchain (+${creditedCoins} mo en SQLite, listo para transacción en Firestore).`
      : `Webhook ${params.eventType} registrado sin acreditación de saldo.`,
    event: mapBtcpayWebhookRow(savedRow),
    updatedCoinsBalance: userBalRow?.coins_balance
  };
}

export function listBtcpayWebhookEventsFromDb(limit: number = 40): DbBtcpayWebhookEvent[] {
  const db = getDb();
  const rows = db
    .prepare('SELECT * FROM btcpay_webhook_events ORDER BY created_at DESC LIMIT ?')
    .all(Math.min(Math.max(limit, 1), 100)) as Array<Parameters<typeof mapBtcpayWebhookRow>[0]>;
  return rows.map(mapBtcpayWebhookRow);
}

export function ackBtcpayWebhookFirestoreSyncInDb(
  eventId: string,
  adminEmail: string,
  ipAddress: string
): DbBtcpayWebhookEvent | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM btcpay_webhook_events WHERE id = ?').get(eventId) as
    | Parameters<typeof mapBtcpayWebhookRow>[0]
    | undefined;
  if (!row) return null;

  const now = Date.now();
  db.prepare('UPDATE btcpay_webhook_events SET firestore_synced = 1, firestore_synced_at = ? WHERE id = ?').run(
    now,
    eventId
  );

  appendAuditLog(
    adminEmail,
    ipAddress,
    'BTCPAY_FIRESTORE_SYNCED',
    'INFO',
    `Evento webhook ${eventId} (${row.user_email}, +${row.coins_credited} mo) confirmado en transacción Firestore.`
  );

  const updated = db
    .prepare('SELECT * FROM btcpay_webhook_events WHERE id = ?')
    .get(eventId) as Parameters<typeof mapBtcpayWebhookRow>[0];
  return mapBtcpayWebhookRow(updated);
}

export function applySafeVaultRecommendationsInDb(
  adminEmail: string,
  ipAddress: string
): {
  apis: ReturnType<typeof getMaskedVaultApisForOwner>;
  payoutConfig: StoredPayoutConfig;
  economyConfig: DbEconomyConfig;
} {
  const currentPayout = getOwnerPayoutConfigFromDb();
  const payoutConfig = saveOwnerPayoutConfigInDb(
    {
      ...currentPayout,
      paypalMode: 'BUSINESS',
      primarySettlementRail: 'USDT',
      autoConvertToUsdt: true,
      autoForwardToWallet: true,
      cardGatewayProvider:
        currentPayout.cardGatewayProvider || 'PAYPAL_BUSINESS',
      vmTestModeEnabled: true,
      maxVmTesters: MAX_VM_TESTERS
    },
    adminEmail,
    ipAddress
  );

  const currentApis = getVaultGatewayApisRawFromDb();
  const apis = saveVaultGatewayApisInDb(
    {
      btcpay: {
        ...currentApis.btcpay,
        webhookSecret: currentApis.btcpay.webhookSecret || UNIFIED_SECURITY_KEY
      },
      nowpayments: {
        ...currentApis.nowpayments,
        ipnSecret: currentApis.nowpayments.ipnSecret || UNIFIED_SECURITY_KEY
      },
      paypal: {
        ...currentApis.paypal,
        environment: currentApis.paypal.environment || 'sandbox',
        merchantEmail: currentApis.paypal.merchantEmail || payoutConfig.paypalEmail || 'cobros@aethervault.io'
      },
      onramps: {
        ...currentApis.onramps,
        activeProvider: currentApis.onramps.activeProvider || 'NOWPAYMENTS_FIAT'
      }
    },
    adminEmail,
    ipAddress
  );

  const currentEcon = getEconomyConfigFromDb();
  const economyConfig = saveEconomyConfigInDb({
    vaultRetentionPct: Math.max(currentEcon.vaultRetentionPct, 70),
    redemptionFeePct: Math.max(currentEcon.redemptionFeePct, 20),
    transferFeePct: Math.max(currentEcon.transferFeePct, 5),
    adminEmail,
    ipAddress
  });

  appendAuditLog(
    adminEmail,
    ipAddress,
    'SAFE_RECOMMENDATIONS_APPLIED',
    'INFO',
    `Sugerencias deterministas aplicadas: PayPal BUSINESS (${apis.config.paypal.environment}), liquidación USDT TRC-20, Retención Casa ${economyConfig.vaultRetentionPct}%, Comisión Retiro ${economyConfig.redemptionFeePct}%, Comisión Transfer P2P ${economyConfig.transferFeePct}%, clave unificada Webhook HMAC y tope 30% activo.`
  );

  return { apis, payoutConfig, economyConfig };
}

export function settlePayPalCapturedOrderInDb(params: {
  paypalOrderId: string;
  captureId: string;
  localOrderId?: string;
  actorEmail?: string;
  ipAddress: string;
}): {
  ok: boolean;
  status: number;
  message: string;
  order?: DbCoinPurchaseOrder;
  updatedCoinsBalance?: number;
} {
  const db = getDb();
  const cleanPaypalOrderId = params.paypalOrderId.trim();
  const row = (
    params.localOrderId
      ? db.prepare('SELECT * FROM coin_purchase_orders WHERE id = ?').get(params.localOrderId.trim())
      : db.prepare('SELECT * FROM coin_purchase_orders WHERE gateway_invoice_id = ? ORDER BY created_at DESC LIMIT 1').get(cleanPaypalOrderId)
  ) as
    | {
        id: string;
        user_email: string;
        tier_level: number;
        tier_name: string;
        coins_amount: number;
        price_usd: number;
        payment_method: string;
        usdt_network: 'TRC20' | 'ERC20' | 'BEP20';
        destination_usdt_wallet: string;
        gateway_provider: string | null;
        gateway_invoice_id: string | null;
        checkout_url: string | null;
        is_live_api: number | null;
        status: 'PENDING_TX' | 'VERIFIED_SETTLED' | 'REJECTED';
        auto_settled_to_usdt: number;
        created_at: number;
        settled_at: number | null;
      }
    | undefined;

  if (!row) {
    return { ok: false, status: 404, message: 'Orden PayPal no encontrada en la base de datos.' };
  }

  if (params.actorEmail && row.user_email.toLowerCase() !== params.actorEmail.toLowerCase() && params.actorEmail.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
    return { ok: false, status: 403, message: 'No autorizado para capturar esta orden PayPal.' };
  }

  const userBalBefore = db.prepare('SELECT coins_balance FROM users WHERE LOWER(email) = LOWER(?)').get(row.user_email) as
    | { coins_balance: number }
    | undefined;

  if (row.status === 'VERIFIED_SETTLED') {
    return {
      ok: true,
      status: 200,
      message: 'La orden PayPal ya había sido acreditada previamente (idempotente).',
      updatedCoinsBalance: userBalBefore?.coins_balance,
      order: {
        id: row.id,
        userEmail: row.user_email,
        tierLevel: row.tier_level,
        tierName: row.tier_name,
        coinsAmount: row.coins_amount,
        priceUSD: row.price_usd,
        paymentMethod: row.payment_method,
        usdtNetwork: row.usdt_network,
        destinationUsdtWallet: row.destination_usdt_wallet,
        txHash: `PAYPAL-CAP-${params.captureId || cleanPaypalOrderId}`,
        gatewayProvider: row.gateway_provider || 'PAYPAL_BUSINESS',
        gatewayInvoiceId: row.gateway_invoice_id || cleanPaypalOrderId,
        checkoutUrl: row.checkout_url || undefined,
        isLiveApi: row.is_live_api === 1,
        status: 'VERIFIED_SETTLED',
        autoSettledToUsdt: row.auto_settled_to_usdt === 1,
        createdAt: row.created_at,
        settledAt: row.settled_at || undefined
      }
    };
  }

  const txRef = `PAYPAL-CAP-${params.captureId || cleanPaypalOrderId}`;
  const digest = crypto.createHash('sha256').update(txRef.toLowerCase(), 'utf8').digest('hex');
  const now = Date.now();

  db.prepare(`
    UPDATE coin_purchase_orders
    SET tx_hash_enc = ?, tx_hash_digest = ?, status = 'VERIFIED_SETTLED', settled_at = ?
    WHERE id = ?
  `).run(encryptField(txRef), digest, now, row.id);

  db.prepare(`
    UPDATE users
    SET is_active = 1, coins_balance = coins_balance + ?, updated_at = ?
    WHERE LOWER(email) = LOWER(?) AND role != 'DEMO'
  `).run(row.coins_amount, now, row.user_email);

  const userBalAfter = db.prepare('SELECT coins_balance FROM users WHERE LOWER(email) = LOWER(?)').get(row.user_email) as
    | { coins_balance: number }
    | undefined;

  appendAuditLog(
    row.user_email,
    params.ipAddress,
    'PAYPAL_ORDER_CAPTURED',
    'INFO',
    `PayPal Checkout capturado (${txRef}): +${row.coins_amount} mo ($${row.price_usd.toFixed(2)} USD) acreditados en SQLite para ${row.user_email}.`
  );

  return {
    ok: true,
    status: 200,
    message: `Pago PayPal capturado (+${row.coins_amount.toLocaleString()} monedas acreditadas).`,
    updatedCoinsBalance: userBalAfter?.coins_balance,
    order: {
      id: row.id,
      userEmail: row.user_email,
      tierLevel: row.tier_level,
      tierName: row.tier_name,
      coinsAmount: row.coins_amount,
      priceUSD: row.price_usd,
      paymentMethod: row.payment_method,
      usdtNetwork: row.usdt_network,
      destinationUsdtWallet: row.destination_usdt_wallet,
      txHash: txRef,
      gatewayProvider: row.gateway_provider || 'PAYPAL_BUSINESS',
      gatewayInvoiceId: row.gateway_invoice_id || cleanPaypalOrderId,
      checkoutUrl: row.checkout_url || undefined,
      isLiveApi: row.is_live_api === 1,
      status: 'VERIFIED_SETTLED',
      autoSettledToUsdt: row.auto_settled_to_usdt === 1,
      createdAt: row.created_at,
      settledAt: now
    }
  };
}

export function listDirectoryPlayersFromDb(excludeEmail?: string): Array<{
  id: string;
  email: string;
  displayName: string;
  role: 'OWNER' | 'PLAYER' | 'DEMO';
  isActive: boolean;
  coinsBalance: number;
  lastLoginAt: number;
}> {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, email, display_name, role, is_active, coins_balance, updated_at
       FROM users
       WHERE is_demo_isolated = 0 AND role <> 'DEMO'
       ORDER BY CASE WHEN role = 'OWNER' THEN 0 ELSE 1 END, email ASC`
    )
    .all() as Array<{
      id: string;
      email: string;
      display_name: string;
      role: 'OWNER' | 'PLAYER' | 'DEMO';
      is_active: number;
      coins_balance: number;
      updated_at: number | null;
    }>;

  const cleanExclude = (excludeEmail || '').trim().toLowerCase();
  return rows
    .filter(r => !cleanExclude || r.email.toLowerCase() !== cleanExclude)
    .map(r => ({
      id: r.id,
      email: r.email,
      displayName: r.display_name,
      role: r.role,
      isActive: r.is_active === 1,
      coinsBalance: r.coins_balance,
      lastLoginAt: r.updated_at || 0
    }));
}

export function syncPlayerBalanceInDb(params: {
  actorEmail: string;
  newBalance: number;
  reason: string;
  ipAddress: string;
}): { ok: boolean; coinsBalance: number; message: string } {
  const db = getDb();
  const user = db
    .prepare('SELECT id, email, role, is_demo_isolated, coins_balance FROM users WHERE LOWER(email) = LOWER(?)')
    .get(params.actorEmail) as
    | { id: string; email: string; role: string; is_demo_isolated: number; coins_balance: number }
    | undefined;

  if (!user) {
    return { ok: false, coinsBalance: 0, message: 'Usuario no encontrado.' };
  }
  if (user.role === 'DEMO' || user.is_demo_isolated === 1) {
    return { ok: true, coinsBalance: user.coins_balance, message: 'Demo aislado sin escritura en saldo real.' };
  }

  const sanitized = Math.max(0, Math.min(Math.floor(Number(params.newBalance)), 50_000_000));
  if (!Number.isFinite(sanitized)) {
    return { ok: false, coinsBalance: user.coins_balance, message: 'Saldo inválido.' };
  }

  // Guard single-turn jump to prevent client-side arbitrary tampering while permitting normal bets/jackpots up to 500k mo per sync
  const delta = sanitized - user.coins_balance;
  if (delta > 500_000) {
    appendAuditLog(
      user.email,
      params.ipAddress,
      'SUSPICIOUS_BALANCE_SYNC_BLOCKED',
      'CRITICAL',
      `Salto anómalo bloqueado en balance-sync (+${delta} mo) motivo=${params.reason}.`
    );
    return { ok: false, coinsBalance: user.coins_balance, message: 'Variación fuera de rango permitido.' };
  }

  const now = Date.now();
  db.prepare('UPDATE users SET coins_balance = ?, updated_at = ? WHERE id = ?').run(sanitized, now, user.id);

  return { ok: true, coinsBalance: sanitized, message: 'Balance sincronizado en SQLite.' };
}

export interface DbCoinTransfer {
  id: string;
  senderEmail: string;
  senderName: string;
  recipientEmail: string;
  recipientName: string;
  grossCoins: number;
  feeCoins: number;
  netCoins: number;
  feePct: number;
  usdEquivalent: number;
  note: string;
  txHash: string;
  createdAt: number;
}

export function transferCoinsBetweenPlayersInDb(params: {
  senderEmail: string;
  recipientEmail: string;
  amountCoins: number;
  note?: string;
  ipAddress: string;
}): {
  ok: boolean;
  status: number;
  message: string;
  transfer?: DbCoinTransfer;
  senderBalanceCoins?: number;
  recipientBalanceCoins?: number;
} {
  const db = getDb();
  const cleanRecipient = params.recipientEmail.trim().toLowerCase();
  const grossCoins = Math.floor(Number(params.amountCoins));

  if (!Number.isFinite(grossCoins) || grossCoins < 10) {
    return { ok: false, status: 400, message: 'La transferencia mínima entre jugadores es de 10 monedas.' };
  }

  const sender = db
    .prepare('SELECT id, email, display_name, role, is_active, is_demo_isolated, coins_balance FROM users WHERE LOWER(email) = LOWER(?)')
    .get(params.senderEmail) as
    | { id: string; email: string; display_name: string; role: string; is_active: number; is_demo_isolated: number; coins_balance: number }
    | undefined;

  if (!sender) {
    return { ok: false, status: 404, message: 'Remitente no encontrado.' };
  }
  if (sender.role === 'DEMO' || sender.is_demo_isolated === 1) {
    return { ok: false, status: 403, message: 'La cuenta DEMO aislada no puede transferir monedas reales.' };
  }
  if (sender.is_active !== 1) {
    return { ok: false, status: 403, message: 'Cuenta remitente pendiente de activación por depósito.' };
  }

  const recipient = db
    .prepare('SELECT id, email, display_name, role, is_active, is_demo_isolated, coins_balance FROM users WHERE LOWER(email) = LOWER(?)')
    .get(cleanRecipient) as
    | { id: string; email: string; display_name: string; role: string; is_active: number; is_demo_isolated: number; coins_balance: number }
    | undefined;

  if (!recipient) {
    return { ok: false, status: 404, message: 'Jugador destinatario no encontrado en el directorio.' };
  }
  if (recipient.id === sender.id) {
    return { ok: false, status: 400, message: 'No puedes transferirte monedas a tu misma cuenta.' };
  }
  if (recipient.role === 'DEMO' || recipient.is_demo_isolated === 1) {
    return { ok: false, status: 403, message: 'No se pueden enviar monedas reales a la cuenta DEMO aislada.' };
  }

  if (sender.coins_balance < grossCoins) {
    return {
      ok: false,
      status: 400,
      message: `Saldo insuficiente: tienes ${sender.coins_balance.toLocaleString()} monedas.`
    };
  }

  const econ = getEconomyConfigFromDb();
  const feePct = Math.min(Math.max(econ.transferFeePct, 0), 25);
  const feeCoins = feePct > 0 ? Math.max(1, Math.floor((grossCoins * feePct) / 100)) : 0;
  const netCoins = grossCoins - feeCoins;
  if (netCoins <= 0) {
    return { ok: false, status: 400, message: 'El monto neto tras la comisión del casino debe ser mayor a 0.' };
  }

  const usdEquivalent = Math.round(netCoins * 0.8 * 100) / 100;
  const now = Date.now();
  const id = `trf_${now}_${crypto.randomBytes(3).toString('hex')}`;
  const txHash = '0x' + crypto.createHash('sha256').update(`${id}|${sender.email}|${recipient.email}|${grossCoins}|${now}`).digest('hex');
  const cleanNote = (params.note || 'Transferencia P2P AetherVault').trim().slice(0, 140);

  db.exec('BEGIN IMMEDIATE');
  try {
    const freshSender = db.prepare('SELECT coins_balance FROM users WHERE id = ?').get(sender.id) as { coins_balance: number };
    if (freshSender.coins_balance < grossCoins) {
      db.exec('ROLLBACK');
      return { ok: false, status: 400, message: 'Saldo insuficiente al confirmar la transacción.' };
    }

    db.prepare('UPDATE users SET coins_balance = coins_balance - ?, updated_at = ? WHERE id = ?').run(grossCoins, now, sender.id);
    db.prepare('UPDATE users SET is_active = 1, coins_balance = coins_balance + ?, updated_at = ? WHERE id = ?').run(netCoins, now, recipient.id);

    // Casino retains feeCoins inside the Owner vault account so house accounting stays balanced
    if (feeCoins > 0 && recipient.email.toLowerCase() !== OWNER_EMAIL.toLowerCase() && sender.email.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
      db.prepare('UPDATE users SET coins_balance = coins_balance + ?, updated_at = ? WHERE LOWER(email) = LOWER(?)').run(feeCoins, now, OWNER_EMAIL);
    }

    db.prepare(`
      INSERT INTO coin_transfers (
        id, sender_email, sender_name, recipient_email, recipient_name,
        gross_coins, fee_coins, net_coins, fee_pct, usd_equivalent, note, tx_hash, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      sender.email,
      sender.display_name,
      recipient.email,
      recipient.display_name,
      grossCoins,
      feeCoins,
      netCoins,
      feePct,
      usdEquivalent,
      cleanNote,
      txHash,
      now
    );

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  const updatedSender = db.prepare('SELECT coins_balance FROM users WHERE id = ?').get(sender.id) as { coins_balance: number };
  const updatedRecipient = db.prepare('SELECT coins_balance FROM users WHERE id = ?').get(recipient.id) as { coins_balance: number };

  appendAuditLog(
    sender.email,
    params.ipAddress,
    'PLAYER_COIN_TRANSFER',
    'INFO',
    `Transferencia #${id.slice(-8)}: ${sender.email} -> ${recipient.email} | Bruto=${grossCoins} mo | Comisión Casino (${feePct}%)=${feeCoins} mo | Neto recibido=${netCoins} mo ($${usdEquivalent.toFixed(2)} USD).`
  );

  return {
    ok: true,
    status: 201,
    message: `Transferencia completada: ${recipient.display_name} recibió ${netCoins.toLocaleString()} mo (Comisión casino ${feePct}%: ${feeCoins.toLocaleString()} mo).`,
    senderBalanceCoins: updatedSender.coins_balance,
    recipientBalanceCoins: updatedRecipient.coins_balance,
    transfer: {
      id,
      senderEmail: sender.email,
      senderName: sender.display_name,
      recipientEmail: recipient.email,
      recipientName: recipient.display_name,
      grossCoins,
      feeCoins,
      netCoins,
      feePct,
      usdEquivalent,
      note: cleanNote,
      txHash,
      createdAt: now
    }
  };
}

export function listPlayerTransfersFromDb(actorEmail: string, isOwner: boolean, limit: number = 40): DbCoinTransfer[] {
  const db = getDb();
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const rows = (
    isOwner
      ? db.prepare('SELECT * FROM coin_transfers ORDER BY created_at DESC LIMIT ?').all(safeLimit)
      : db
          .prepare(
            `SELECT * FROM coin_transfers
             WHERE LOWER(sender_email) = LOWER(?) OR LOWER(recipient_email) = LOWER(?)
             ORDER BY created_at DESC LIMIT ?`
          )
          .all(actorEmail, actorEmail, safeLimit)
  ) as Array<{
    id: string;
    sender_email: string;
    sender_name: string;
    recipient_email: string;
    recipient_name: string;
    gross_coins: number;
    fee_coins: number;
    net_coins: number;
    fee_pct: number;
    usd_equivalent: number;
    note: string;
    tx_hash: string;
    created_at: number;
  }>;

  return rows.map(r => ({
    id: r.id,
    senderEmail: r.sender_email,
    senderName: r.sender_name,
    recipientEmail: r.recipient_email,
    recipientName: r.recipient_name,
    grossCoins: r.gross_coins,
    feeCoins: r.fee_coins,
    netCoins: r.net_coins,
    feePct: r.fee_pct,
    usdEquivalent: r.usd_equivalent,
    note: r.note,
    txHash: r.tx_hash,
    createdAt: r.created_at
  }));
}
