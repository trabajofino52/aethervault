import type { Request, Response, NextFunction } from 'express';
import { verifySessionToken, type SessionPayload } from './cryptoVault.ts';
import { OWNER_EMAIL, appendAuditLog } from './db.ts';

export interface AuthenticatedRequest extends Request {
  sessionUser?: SessionPayload;
  clientIp?: string;
}

export function extractClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '127.0.0.1';
}

/**
 * HTTP Security Headers Middleware
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.removeHeader('X-Powered-By');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('X-DNS-Prefetch-Control', 'off');

  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  if (isHttps) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // CSP compatible with React/Vite SPA + iframe preview
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self' https: wss: ws:; object-src 'none'; base-uri 'self';"
  );

  next();
}

/**
 * Anti-Prototype-Pollution & Payload Sanitizer
 */
function cleanObject(obj: unknown, depth: number = 0): unknown {
  if (depth > 6) return null;
  if (typeof obj === 'string') {
    return obj.slice(0, 10000);
  }
  if (Array.isArray(obj)) {
    return obj.slice(0, 200).map(item => cleanObject(item, depth + 1));
  }
  if (obj && typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      out[k] = cleanObject(v, depth + 1);
    }
    return out;
  }
  return obj;
}

export function sanitizeBodyMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = cleanObject(req.body);
  }
  next();
}

/**
 * In-Memory Sliding Window Rate Limiter (Global + Strict Auth Anti-Brute-Force)
 */
interface Bucket {
  timestamps: number[];
}

const rateBuckets = new Map<string, Bucket>();
let blockedRequestsCount = 0;

export function getRateLimiterStats(): { activeBuckets: number; blockedRequestsCount: number } {
  return {
    activeBuckets: rateBuckets.size,
    blockedRequestsCount
  };
}

export function createRateLimiter(options: { windowMs: number; maxRequests: number; bucketPrefix: string }) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = extractClientIp(req);
    const key = `${options.bucketPrefix}:${ip}`;
    const now = Date.now();
    const cutoff = now - options.windowMs;

    let bucket = rateBuckets.get(key);
    if (!bucket) {
      bucket = { timestamps: [] };
      rateBuckets.set(key, bucket);
    }

    bucket.timestamps = bucket.timestamps.filter(ts => ts > cutoff);

    if (bucket.timestamps.length >= options.maxRequests) {
      blockedRequestsCount += 1;
      res.setHeader('Retry-After', String(Math.ceil(options.windowMs / 1000)));
      if (options.bucketPrefix === 'auth') {
        try {
          appendAuditLog(
            String((req.body as Record<string, unknown>)?.email || 'UNKNOWN'),
            ip,
            'RATE_LIMIT_AUTH_BLOCKED',
            'CRITICAL',
            `Bloqueo por exceso de peticiones en ${req.path} (${options.maxRequests} máx / ventana).`
          );
        } catch {
          // ignore
        }
      }
      res.status(429).json({
        error: 'Demasiadas solicitudes desde esta dirección IP. Espera unos minutos por seguridad.'
      });
      return;
    }

    bucket.timestamps.push(now);
    next();
  };
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const pair of cookieHeader.split(';')) {
    const idx = pair.indexOf('=');
    if (idx > -1) {
      const key = pair.slice(0, idx).trim();
      const val = pair.slice(idx + 1).trim();
      result[key] = decodeURIComponent(val);
    }
  }
  return result;
}

export function extractAuthToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookies = parseCookies(req.headers.cookie);
  if (cookies.av_session) {
    return cookies.av_session;
  }
  return null;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = extractAuthToken(req);
  if (!token) {
    res.status(401).json({ error: 'Sesión no autenticada.' });
    return;
  }
  const payload = verifySessionToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Token de sesión inválido o expirado.' });
    return;
  }
  req.sessionUser = payload;
  req.clientIp = extractClientIp(req);
  next();
}

export function requireOwner(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (
      !req.sessionUser ||
      req.sessionUser.role !== 'OWNER' ||
      req.sessionUser.sub.toLowerCase() !== OWNER_EMAIL.toLowerCase()
    ) {
      const ip = extractClientIp(req);
      appendAuditLog(
        req.sessionUser?.sub || 'ANONYMOUS',
        ip,
        'UNAUTHORIZED_OWNER_ACCESS_ATTEMPT',
        'CRITICAL',
        `Intento de acceso a ruta exclusiva de Propietario (${req.path}).`
      );
      res.status(403).json({ error: `Acceso denegado: Se requieren privilegios de Propietario (${OWNER_EMAIL}).` });
      return;
    }
    next();
  });
}
