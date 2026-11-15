import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  hashPassword,
  verifyPassword,
  encryptField,
  decryptField,
  computeAuditChainHash
} from './cryptoVault.ts';

export const OWNER_EMAIL = 'trabajofino52@gmail.com';
const DEFAULT_OWNER_KEY = process.env.OWNER_MASTER_KEY || 'GokuCheckersMasterKey2024Secure';
export const DEMO_USERNAME = 'gokudemo';
const DEFAULT_DEMO_PASS = 'goku30309982';

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

    CREATE INDEX IF NOT EXISTS idx_tickets_user_email ON support_tickets(user_email);
    CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);
    CREATE INDEX IF NOT EXISTS idx_audit_ts ON security_audit_logs(timestamp DESC);
  `);

  dbInstance = db;
  seedInitialSecurityRecords(db);
  return db;
}

function seedInitialSecurityRecords(db: DatabaseSync): void {
  const now = Date.now();
  const findUser = db.prepare('SELECT id FROM users WHERE email = ?');

  if (!findUser.get(OWNER_EMAIL)) {
    db.prepare(`
      INSERT INTO users (id, email, display_name, role, password_hash, is_active, is_demo_isolated, coins_balance, created_at, updated_at)
      VALUES (?, ?, ?, 'OWNER', ?, 1, 0, 25000, ?, ?)
    `).run('usr_owner_01', OWNER_EMAIL, 'Administrador Principal', hashPassword(DEFAULT_OWNER_KEY), now, now);
  }

  if (!findUser.get(DEMO_USERNAME)) {
    db.prepare(`
      INSERT INTO users (id, email, display_name, role, password_hash, is_active, is_demo_isolated, coins_balance, created_at, updated_at)
      VALUES (?, ?, ?, 'DEMO', ?, 1, 1, 6250, ?, ?)
    `).run('usr_demo_01', DEMO_USERNAME, 'Goku Demo ($5,000 USD)', hashPassword(DEFAULT_DEMO_PASS), now, now);
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

export function appendAuditLog(
  actorEmail: string,
  ipAddress: string,
  action: string,
  severity: 'INFO' | 'WARN' | 'CRITICAL',
  details: string
): void {
  const db = getDb();
  const lastRow = db.prepare('SELECT row_hash FROM security_audit_logs ORDER BY seq DESC LIMIT 1').get() as
    | { row_hash: string }
    | undefined;
  const prevHash = lastRow?.row_hash || 'GENESIS_00000000000000000000000000000000';
  const id = 'aud_' + crypto.randomUUID().slice(0, 12);
  const timestamp = Date.now();
  const canonical = JSON.stringify({ id, timestamp, actorEmail, ipAddress, action, severity, details });
  const rowHash = computeAuditChainHash(prevHash, canonical);

  db.prepare(`
    INSERT INTO security_audit_logs (id, timestamp, actor_email, ip_address, action, severity, details, prev_hash, row_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, timestamp, actorEmail, ipAddress, action, severity, details, prevHash, rowHash);
}

export function getRecentAuditLogs(limit: number = 35): AuditLogRow[] {
  const db = getDb();
  return db
    .prepare('SELECT seq, id, timestamp, actor_email, ip_address, action, severity, details, prev_hash, row_hash FROM security_audit_logs ORDER BY seq DESC LIMIT ?')
    .all(limit) as unknown as AuditLogRow[];
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
  user?: { email: string; displayName: string; role: 'OWNER' | 'DEMO' | 'PLAYER'; isActive: boolean; isDemoIsolated: boolean };
} {
  const db = getDb();
  const cleanEmail = emailInput.trim().toLowerCase() === 'gokudemo@aethervault.com'
    ? DEMO_USERNAME
    : emailInput.trim().toLowerCase() === OWNER_EMAIL.toLowerCase()
    ? OWNER_EMAIL
    : emailInput.trim().toLowerCase();

  const existing = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(cleanEmail) as DbUserRow | undefined;
  const now = Date.now();

  if (!existing) {
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
        isDemoIsolated: false
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

  // For standard players without a password supplied on quick switcher, allow session email switch only for non-privileged PLAYER accounts
  if (existing.role === 'PLAYER' && !passwordInput) {
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
        isDemoIsolated: false
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
      isDemoIsolated: existing.is_demo_isolated === 1
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
