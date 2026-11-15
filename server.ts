import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { createServer as createViteServer } from 'vite';
import {
  getDb,
  OWNER_EMAIL,
  authenticateUserInDb,
  changeUserPasswordInDb,
  listSupportTicketsFromDb,
  createSupportTicketInDb,
  updateTicketStatusInDb,
  getRecentAuditLogs,
  verifyDatabaseIntegrity,
  appendAuditLog
} from './server/db.ts';
import { signSessionToken } from './server/cryptoVault.ts';
import {
  securityHeadersMiddleware,
  sanitizeBodyMiddleware,
  createRateLimiter,
  getRateLimiterStats,
  extractClientIp,
  requireAuth,
  requireOwner,
  type AuthenticatedRequest
} from './server/security.ts';

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

async function bootstrapServer() {
  // Initialize SQLite WAL encrypted vault
  getDb();

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(securityHeadersMiddleware);
  app.use(express.json({ limit: '100kb' }));
  app.use(sanitizeBodyMiddleware);

  const apiLimiter = createRateLimiter({ windowMs: 60 * 1000, maxRequests: 120, bucketPrefix: 'api' });
  const authLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 25, bucketPrefix: 'auth' });

  app.use('/api', apiLimiter);

  // Healthcheck
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'AetherVault Security Engine',
      timestamp: Date.now()
    });
  });

  // Authentication endpoint (Owner, Demo, Standard Player)
  app.post('/api/auth/login', authLimiter, (req, res) => {
    const ip = extractClientIp(req);
    const body = req.body as { email?: string; password?: string };
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!email) {
      res.status(400).json({ error: 'El correo o usuario es obligatorio.' });
      return;
    }

    const authResult = authenticateUserInDb(email, password, ip);
    if (!authResult.ok || !authResult.user) {
      res.status(authResult.status).json({ error: authResult.message });
      return;
    }

    const token = signSessionToken(authResult.user.email, authResult.user.role);

    res.cookie('av_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
      maxAge: 12 * 60 * 60 * 1000
    });

    res.json({
      token,
      user: authResult.user,
      message: authResult.message
    });
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('av_session');
    res.json({ ok: true });
  });

  // Change Password (Protected & Rate-Limited)
  app.post('/api/auth/change-password', authLimiter, requireAuth, (req: AuthenticatedRequest, res) => {
    const ip = req.clientIp || extractClientIp(req);
    const body = req.body as { currentPassword?: string; newPassword?: string };
    const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : '';
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
      return;
    }

    const actorEmail = req.sessionUser?.sub || '';
    const result = changeUserPasswordInDb(actorEmail, currentPassword, newPassword, ip);
    if (!result.ok) {
      res.status(400).json({ error: result.message });
      return;
    }

    res.json({ ok: true, message: result.message });
  });

  // Support Tickets (Authenticated)
  app.get('/api/support/tickets', requireAuth, (req: AuthenticatedRequest, res) => {
    const email = req.sessionUser?.sub || '';
    const isOwner = req.sessionUser?.role === 'OWNER' && email.toLowerCase() === OWNER_EMAIL.toLowerCase();
    const tickets = listSupportTicketsFromDb(email, isOwner);
    res.json({ tickets });
  });

  app.post('/api/support/tickets', requireAuth, (req: AuthenticatedRequest, res) => {
    const ip = req.clientIp || extractClientIp(req);
    const body = req.body as {
      id?: string;
      userName?: string;
      category?: string;
      priority?: string;
      subject?: string;
      initialMessage?: string;
      paymentTxHash?: string;
      paymentAmountCoins?: number;
      paymentGateway?: string;
    };

    if (!body?.subject || !body?.initialMessage) {
      res.status(400).json({ error: 'Asunto y mensaje inicial son obligatorios.' });
      return;
    }

    const ticket = createSupportTicketInDb({
      id: body.id,
      userEmail: req.sessionUser?.sub || 'player',
      userName: body.userName || (req.sessionUser?.sub || 'Jugador').split('@')[0],
      category: body.category || 'GENERAL_SUPPORT',
      priority: body.priority || 'MEDIA',
      subject: body.subject,
      initialMessage: body.initialMessage,
      paymentTxHash: body.paymentTxHash,
      paymentAmountCoins: body.paymentAmountCoins,
      paymentGateway: body.paymentGateway,
      ipAddress: ip
    });

    res.status(201).json({ ticket });
  });

  app.post('/api/support/tickets/:id/reply', requireAuth, (req: AuthenticatedRequest, res) => {
    const ip = req.clientIp || extractClientIp(req);
    const ticketId = String(req.params.id);
    const body = req.body as { message?: string };
    const messageText = typeof body?.message === 'string' ? body.message.trim() : '';

    if (!messageText) {
      res.status(400).json({ error: 'El mensaje no puede estar vacío.' });
      return;
    }

    const db = getDb();
    const ticketRow = db.prepare('SELECT id, user_email FROM support_tickets WHERE id = ?').get(ticketId) as
      | { id: string; user_email: string }
      | undefined;

    if (!ticketRow) {
      res.status(404).json({ error: 'Ticket no encontrado.' });
      return;
    }

    const actorEmail = req.sessionUser?.sub || '';
    const isAdmin = req.sessionUser?.role === 'OWNER' && actorEmail.toLowerCase() === OWNER_EMAIL.toLowerCase();
    if (!isAdmin && ticketRow.user_email.toLowerCase() !== actorEmail.toLowerCase()) {
      res.status(403).json({ error: 'No tienes permiso para responder a este ticket.' });
      return;
    }

    const now = Date.now();
    const nextStatus = isAdmin ? 'RESPONDIDO' : 'EN_REVISION';
    db.prepare(`
      INSERT INTO support_ticket_messages (id, ticket_id, sender_email, sender_name, is_admin, message, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'msg_' + now,
      ticketId,
      isAdmin ? OWNER_EMAIL : actorEmail,
      isAdmin ? 'Administrador Bóveda' : actorEmail.split('@')[0],
      isAdmin ? 1 : 0,
      messageText,
      now
    );
    db.prepare('UPDATE support_tickets SET status = ?, updated_at = ? WHERE id = ?').run(nextStatus, now, ticketId);

    appendAuditLog(actorEmail, ip, 'TICKET_REPLY', 'INFO', `Respuesta agregada al ticket #${ticketId.slice(-6)}.`);
    res.json({ ok: true, status: nextStatus });
  });

  // Owner-Only Ticket Status Control
  app.patch('/api/support/tickets/:id/status', requireOwner, (req: AuthenticatedRequest, res) => {
    const ip = req.clientIp || extractClientIp(req);
    const ticketId = String(req.params.id);
    const body = req.body as {
      status?: 'ABIERTO' | 'EN_REVISION' | 'RESPONDIDO' | 'RESUELTO' | 'REEMBOLSO_PROCESADO';
      note?: string;
    };

    const allowed = new Set(['ABIERTO', 'EN_REVISION', 'RESPONDIDO', 'RESUELTO', 'REEMBOLSO_PROCESADO']);
    if (!body?.status || !allowed.has(body.status)) {
      res.status(400).json({ error: 'Estado de ticket inválido.' });
      return;
    }

    const updated = updateTicketStatusInDb(ticketId, body.status, OWNER_EMAIL, ip, body.note);
    if (!updated) {
      res.status(404).json({ error: 'Ticket no encontrado.' });
      return;
    }

    res.json({ ok: true, status: body.status });
  });

  // Owner-Only Security Posture & Audit Logs
  app.get('/api/admin/security-status', requireOwner, (_req, res) => {
    const integrity = verifyDatabaseIntegrity();
    const rateStats = getRateLimiterStats();
    const auditLogs = getRecentAuditLogs(30);

    res.json({
      hardening: {
        encryptionAtRest: 'AES-256-GCM',
        passwordHashing: 'scrypt (N=16384, r=8, p=1 + salt 128-bit)',
        sessionTokens: 'HMAC-SHA256 Signed + HttpOnly Cookie',
        sqlInjectionProtection: 'Prepared Parameterized Statements Only',
        rateLimiter: 'Sliding Window Active (Auth Anti-Brute-Force + Lockout)',
        httpHeaders: 'CSP + X-Frame/XSS/NoSniff + HSTS',
        databaseEngine: 'SQLite WAL (Production Postgres 17 RLS Script Ready)'
      },
      integrity,
      rateStats,
      auditLogs
    });
  });

  app.post('/api/admin/verify-integrity', requireOwner, (req: AuthenticatedRequest, res) => {
    const ip = req.clientIp || extractClientIp(req);
    const integrity = verifyDatabaseIntegrity();
    appendAuditLog(
      OWNER_EMAIL,
      ip,
      'MANUAL_DB_INTEGRITY_AUDIT',
      integrity.sqliteOk && integrity.chainValid ? 'INFO' : 'CRITICAL',
      `Auditoría completada: SQLite=${integrity.sqliteOk ? 'OK' : 'FAIL'}, CadenaSHA256=${integrity.chainValid ? 'VÁLIDA' : 'ALTERADA'} (${integrity.checkedRows} registros).`
    );
    res.json({
      ok: integrity.sqliteOk && integrity.chainValid,
      integrity,
      auditLogs: getRecentAuditLogs(30)
    });
  });

  // Mount Vite middleware in dev or serve dist/ in production
  if (!IS_PROD) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true'
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir, { maxAge: '1d' }));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AetherVault] Servidor seguro activo en http://0.0.0.0:${PORT} (${IS_PROD ? 'PRODUCTION' : 'DEV'})`);
  });
}

bootstrapServer().catch(err => {
  console.error('[AetherVault] Error fatal al iniciar servidor:', err);
  process.exit(1);
});
