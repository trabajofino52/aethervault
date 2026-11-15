import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const MASTER_KEY_FILE = path.join(DATA_DIR, '.master.key');
const SESSION_KEY_FILE = path.join(DATA_DIR, '.session.key');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  }
  try {
    fs.chmodSync(DATA_DIR, 0o700);
  } catch {
    // Ignore on filesystems without POSIX permissions
  }
}

function loadOrCreateHexSecret(envVarName: string, keyFilePath: string): Buffer {
  const envValue = process.env[envVarName];
  if (envValue && envValue.trim().length >= 32) {
    return crypto.createHash('sha256').update(envValue.trim(), 'utf8').digest();
  }

  ensureDataDir();
  if (fs.existsSync(keyFilePath)) {
    const raw = fs.readFileSync(keyFilePath, 'utf8').trim();
    if (/^[0-9a-f]{64}$/i.test(raw)) {
      return Buffer.from(raw, 'hex');
    }
  }

  const generated = crypto.randomBytes(32);
  fs.writeFileSync(keyFilePath, generated.toString('hex'), { mode: 0o600 });
  try {
    fs.chmodSync(keyFilePath, 0o600);
  } catch {
    // Ignore on non-POSIX FS
  }
  return generated;
}

let cachedEncryptionKey: Buffer | null = null;
let cachedSessionKey: Buffer | null = null;

export function getEncryptionKey(): Buffer {
  if (!cachedEncryptionKey) {
    cachedEncryptionKey = loadOrCreateHexSecret('DB_ENCRYPTION_KEY', MASTER_KEY_FILE);
  }
  return cachedEncryptionKey;
}

export function getSessionSigningKey(): Buffer {
  if (!cachedSessionKey) {
    cachedSessionKey = loadOrCreateHexSecret('SESSION_SECRET', SESSION_KEY_FILE);
  }
  return cachedSessionKey;
}

/**
 * Cryptographic Password Hashing using scrypt (N=16384, r=8, p=1) + 16-byte random salt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  return `scrypt$16384$8$1$${salt}$${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    return false;
  }
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = parts[4];
  const expectedHex = parts[5];

  if (!salt || !expectedHex || !Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) {
    return false;
  }

  try {
    const derived = crypto.scryptSync(password, salt, 64, { N, r, p });
    const expected = Buffer.from(expectedHex, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/**
 * AES-256-GCM Authenticated Encryption at Rest for sensitive database columns
 */
export function encryptField(plaintext: string): string {
  if (!plaintext) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `gcm$${iv.toString('base64url')}$${authTag.toString('base64url')}$${encrypted.toString('base64url')}`;
}

export function decryptField(payload: string): string {
  if (!payload) return '';
  if (!payload.startsWith('gcm$')) {
    return payload;
  }
  const parts = payload.split('$');
  if (parts.length !== 4) return '';
  try {
    const iv = Buffer.from(parts[1], 'base64url');
    const authTag = Buffer.from(parts[2], 'base64url');
    const ciphertext = Buffer.from(parts[3], 'base64url');
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return '[DECRYPTION_ERROR]';
  }
}

export interface SessionPayload {
  sub: string;
  role: 'OWNER' | 'DEMO' | 'PLAYER';
  iat: number;
  exp: number;
  jti: string;
}

/**
 * HMAC-SHA256 Signed Stateless Session Token (JWT-compatible compact format)
 */
export function signSessionToken(
  sub: string,
  role: 'OWNER' | 'DEMO' | 'PLAYER',
  ttlSeconds: number = 60 * 60 * 12
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    sub,
    role,
    iat: now,
    exp: now + ttlSeconds,
    jti: crypto.randomUUID()
  };
  const headerB64 = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'AVT' })).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signingInput = `${headerB64}.${payloadB64}`;
  const sig = crypto.createHmac('sha256', getSessionSigningKey()).update(signingInput).digest('base64url');
  return `${signingInput}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, sigB64] = parts;
  const signingInput = `${headerB64}.${payloadB64}`;
  const expectedSig = crypto.createHmac('sha256', getSessionSigningKey()).update(signingInput).digest('base64url');

  const sigBuf = Buffer.from(sigB64, 'utf8');
  const expBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as SessionPayload;
    const now = Math.floor(Date.now() / 1000);
    if (!parsed.sub || !parsed.role || !parsed.exp || parsed.exp < now) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function computeAuditChainHash(prevHash: string, entryCanonicalJson: string): string {
  return crypto
    .createHash('sha256')
    .update(`${prevHash}|${entryCanonicalJson}`, 'utf8')
    .digest('hex');
}
