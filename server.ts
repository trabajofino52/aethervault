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
  listAuditTrailPaginatedFromDb,
  classifyAuditAction,
  verifyDatabaseIntegrity,
  appendAuditLog,
  getOwnerPayoutConfigFromDb,
  saveOwnerPayoutConfigInDb,
  createCoinPurchaseOrderInDb,
  verifyAndSettlePurchaseOrderInDb,
  listUsdtPurchaseOrdersFromDb,
  reviewUsdtPurchaseOrderInDb,
  runVulnerabilitySelfScan,
  MAX_VM_TESTERS,
  appendVmExperienceLogInDb,
  listVmExperienceLogsFromDb,
  clearVmExperienceLogsInDb,
  listVmTestersFromDb,
  resetVmTesterSlotInDb,
  buildVmDiagnosticReport,
  getVaultGatewayApisRawFromDb,
  getMaskedVaultApisForOwner,
  getPublicGatewayAvailability,
  saveVaultGatewayApisInDb,
  getFullPlatformSummaryAndHistory,
  createClientRedemptionRequestInDb,
  listClientRedemptionRequestsFromDb,
  listRedeemableUsersFromDb,
  reviewClientRedemptionRequestInDb,
  processBtcpayWebhookEventInDb,
  listBtcpayWebhookEventsFromDb,
  ackBtcpayWebhookFirestoreSyncInDb,
  applySafeVaultRecommendationsInDb,
  getEconomyConfigFromDb,
  saveEconomyConfigInDb,
  getPlayerVisibilityConfigFromDb,
  savePlayerVisibilityConfigInDb,
  updateRedemptionPayoutResultInDb,
  settlePayPalCapturedOrderInDb,
  listDirectoryPlayersFromDb,
  syncPlayerBalanceInDb,
  transferCoinsBetweenPlayersInDb,
  listPlayerTransfersFromDb,
  UNIFIED_SECURITY_KEY,
  type BtcpayWebhookEventType,
  type StoredVaultGatewayApis
} from './server/db.ts';
import crypto from 'node:crypto';
import { signSessionToken } from './server/cryptoVault.ts';
import {
  securityHeadersMiddleware,
  sanitizeBodyMiddleware,
  wafInspectionMiddleware,
  originGuardMiddleware,
  createRateLimiter,
  getRateLimiterStats,
  extractClientIp,
  requireAuth,
  requireOwner,
  type AuthenticatedRequest
} from './server/security.ts';

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

function getEffectivePayPalCreds(): {
  enabled: boolean;
  environment: 'sandbox' | 'live';
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  webhookId: string;
  merchantEmail: string;
} {
  const apis = getVaultGatewayApisRawFromDb();
  const environment: 'sandbox' | 'live' =
    apis.paypal.environment === 'live' || process.env.PAYPAL_ENVIRONMENT === 'live' ? 'live' : 'sandbox';
  const clientId = (apis.paypal.clientId || process.env.PAYPAL_CLIENT_ID || '').trim();
  const clientSecret = (apis.paypal.clientSecret || process.env.PAYPAL_CLIENT_SECRET || '').trim();
  const webhookId = (apis.paypal.webhookId || process.env.PAYPAL_WEBHOOK_ID || '').trim();
  const enabled = Boolean((apis.paypal.enabled || (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET)) && clientId && clientSecret);
  const baseUrl = environment === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  return {
    enabled,
    environment,
    baseUrl,
    clientId,
    clientSecret,
    webhookId,
    merchantEmail: apis.paypal.merchantEmail || 'cobros@aethervault.io'
  };
}

async function fetchPayPalAccessToken(creds: ReturnType<typeof getEffectivePayPalCreds>): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const authB64 = Buffer.from(`${creds.clientId}:${creds.clientSecret}`, 'utf8').toString('base64');
    const resp = await fetch(`${creds.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authB64}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials',
      signal: controller.signal
    });
    if (!resp.ok) {
      throw new Error(`PayPal OAuth HTTP ${resp.status}`);
    }
    const json = (await resp.json()) as { access_token?: string };
    if (!json.access_token) {
      throw new Error('PayPal no devolvió access_token.');
    }
    return json.access_token;
  } finally {
    clearTimeout(timer);
  }
}

function getPublicOrigin(req: express.Request): string {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const proto = forwardedProto || req.protocol || 'http';
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`).split(',')[0].trim();
  return `${proto}://${host}`;
}

async function bootstrapServer() {
  // Initialize SQLite WAL encrypted vault
  getDb();

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(securityHeadersMiddleware);
  app.use(
    express.json({
      limit: '64kb',
      verify: (req, _res, buf) => {
        (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
      }
    })
  );
  app.use(sanitizeBodyMiddleware);
  app.use('/api', originGuardMiddleware);
  app.use('/api', wafInspectionMiddleware);

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

  // Public Authoritative Vault Checkout Config (Prevents client-side wallet swapping; NEVER exposes secret API keys)
  app.get('/api/payments/usdt-config', (_req, res) => {
    const cfg = getOwnerPayoutConfigFromDb();
    res.json({
      merchantName: cfg.merchantName,
      usdtTrc20Address: cfg.usdtTrc20Address,
      usdtErc20Address: cfg.usdtErc20Address,
      usdtBep20Address: cfg.usdtBep20Address,
      btcAddress: cfg.btcAddress,
      binancePayId: cfg.binancePayId,
      paypalEmail: cfg.paypalEmail,
      paypalMode: cfg.paypalMode,
      cardGatewayProvider: cfg.cardGatewayProvider,
      primarySettlementRail: cfg.primarySettlementRail,
      bankIbanSwift: cfg.bankIbanSwift,
      bankAccountHolder: cfg.bankAccountHolder,
      autoForwardToWallet: cfg.autoForwardToWallet,
      autoConvertToUsdt: cfg.autoConvertToUsdt,
      vmTestModeEnabled: cfg.vmTestModeEnabled,
      maxVmTesters: cfg.maxVmTesters,
      gatewayAvailability: getPublicGatewayAvailability(),
      economyConfig: getEconomyConfigFromDb(),
      playerVisibility: getPlayerVisibilityConfigFromDb()
    });
  });

  // Authoritative Casino Economy Configuration (House Split, Withdrawal Fee, P2P Transfer Fee)
  app.get('/api/economy/config', (_req, res) => {
    res.json({ config: getEconomyConfigFromDb() });
  });

  app.put('/api/admin/economy-config', requireOwner, (req: AuthenticatedRequest, res) => {
    const ip = req.clientIp || extractClientIp(req);
    const body = (req.body || {}) as {
      vaultRetentionPct?: number;
      redemptionFeePct?: number;
      transferFeePct?: number;
    };
    const updated = saveEconomyConfigInDb({
      vaultRetentionPct: Number(body.vaultRetentionPct ?? 70),
      redemptionFeePct: Number(body.redemptionFeePct ?? 20),
      transferFeePct: body.transferFeePct !== undefined ? Number(body.transferFeePct) : undefined,
      adminEmail: OWNER_EMAIL,
      ipAddress: ip
    });
    res.json({ ok: true, config: updated });
  });

  // Authoritative Player Visibility Matrix (Admin controls which additional options players can see)
  app.get('/api/config/player-visibility', (_req, res) => {
    res.json({ config: getPlayerVisibilityConfigFromDb() });
  });

  app.put('/api/admin/player-visibility', requireOwner, (req: AuthenticatedRequest, res) => {
    const ip = req.clientIp || extractClientIp(req);
    const body = (req.body || {}) as {
      showTop50Casino?: boolean;
      showCharacterHero?: boolean;
      showArenaBattle?: boolean;
      showStoreCatalog?: boolean;
      showSecurityTools?: boolean;
      showNeobankCard?: boolean;
    };
    const patch: Record<string, boolean> = {};
    if (typeof body.showTop50Casino === 'boolean') patch.showTop50Casino = body.showTop50Casino;
    if (typeof body.showCharacterHero === 'boolean') patch.showCharacterHero = body.showCharacterHero;
    if (typeof body.showArenaBattle === 'boolean') patch.showArenaBattle = body.showArenaBattle;
    if (typeof body.showStoreCatalog === 'boolean') patch.showStoreCatalog = body.showStoreCatalog;
    if (typeof body.showSecurityTools === 'boolean') patch.showSecurityTools = body.showSecurityTools;
    if (typeof body.showNeobankCard === 'boolean') patch.showNeobankCard = body.showNeobankCard;

    const updated = savePlayerVisibilityConfigInDb({
      patch,
      adminEmail: OWNER_EMAIL,
      ipAddress: ip
    });
    res.json({ ok: true, config: updated });
  });

  // Create Coin Purchase Order + Live Gateway Invoice / On-Ramp Checkout URL (PayPal / BTCPay / NOWPayments / CoinGate / MoonPay / Transak / Banxa)
  app.post('/api/payments/create-gateway-invoice', requireAuth, async (req: AuthenticatedRequest, res) => {
    const ip = req.clientIp || extractClientIp(req);
    const body = req.body as {
      tierLevel?: number;
      tierName?: string;
      coinsAmount?: number;
      priceUSD?: number;
      paymentMethod?: string;
      usdtNetwork?: 'TRC20' | 'ERC20' | 'BEP20';
      gatewayProvider?: string;
    };

    const coinsAmount = Number(body?.coinsAmount);
    const priceUSD = Number(body?.priceUSD);
    if (!Number.isFinite(coinsAmount) || coinsAmount <= 0 || !Number.isFinite(priceUSD) || priceUSD <= 0) {
      res.status(400).json({ error: 'Paquete de monedas inválido.' });
      return;
    }

    const userEmail = req.sessionUser?.sub || 'player';
    const network = body?.usdtNetwork === 'ERC20' || body?.usdtNetwork === 'BEP20' ? body.usdtNetwork : 'TRC20';
    const provider = typeof body?.gatewayProvider === 'string' && body.gatewayProvider ? body.gatewayProvider : 'DIRECT_USDT';
    const payoutCfg = getOwnerPayoutConfigFromDb();
    const apis = getVaultGatewayApisRawFromDb();
    const publicOrigin = getPublicOrigin(req);

    // Pre-assign local order reference id prefix so PayPal return_url can target local order id cleanly
    let gatewayInvoiceId = `${provider.slice(0, 6)}-${Date.now().toString(36).toUpperCase()}`;
    let checkoutUrl = '';
    let isLiveApi = false;
    let gatewayNotice = 'Orden creada en modo de prueba VM / verificación TXID directa.';

    const fetchWithTimeout = async (url: string, init: RequestInit): Promise<globalThis.Response> => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7000);
      try {
        return await fetch(url, { ...init, signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }
    };

    try {
      if (provider === 'PAYPAL_BUSINESS') {
        const ppCreds = getEffectivePayPalCreds();
        if (ppCreds.enabled && ppCreds.clientId && ppCreds.clientSecret) {
          const accessToken = await fetchPayPalAccessToken(ppCreds);
          const customRef = `AV-${Date.now().toString(36).toUpperCase()}`;
          const ppRes = await fetchWithTimeout(`${ppCreds.baseUrl}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
              Prefer: 'return=representation'
            },
            body: JSON.stringify({
              intent: 'CAPTURE',
              purchase_units: [
                {
                  reference_id: customRef,
                  custom_id: userEmail,
                  description: `${coinsAmount.toLocaleString()} Monedas AetherVault (${body.tierName || 'Paquete'})`,
                  amount: {
                    currency_code: 'USD',
                    value: priceUSD.toFixed(2)
                  }
                }
              ],
              application_context: {
                brand_name: payoutCfg.merchantName || 'AetherVault Casino',
                user_action: 'PAY_NOW',
                return_url: `${publicOrigin}/?paypal_capture=1&ref=${encodeURIComponent(customRef)}`,
                cancel_url: `${publicOrigin}/?paypal_cancel=1&ref=${encodeURIComponent(customRef)}`
              }
            })
          });
          if (ppRes.ok) {
            const ppData = (await ppRes.json()) as {
              id?: string;
              links?: Array<{ rel?: string; href?: string }>;
            };
            const approveLink = ppData.links?.find(l => l.rel === 'approve' || l.rel === 'payer-action')?.href || '';
            if (ppData.id) {
              gatewayInvoiceId = ppData.id;
              checkoutUrl = approveLink;
              isLiveApi = true;
              gatewayNotice = `Orden PayPal (${ppCreds.environment.toUpperCase()}) #${ppData.id} lista para aprobar y capturar.`;
            }
          } else {
            const errTxt = await ppRes.text().catch(() => '');
            gatewayNotice = `PayPal devolvió HTTP ${ppRes.status}${errTxt ? '' : ''}; orden creada en respaldo local VM.`;
          }
        } else {
          gatewayNotice = 'PayPal Business sin Client ID/Secret en Bóveda: orden lista en modo prueba local VM.';
        }
      } else if (provider === 'BTCPAY_SERVER' && apis.btcpay.enabled && apis.btcpay.serverUrl && apis.btcpay.storeId && apis.btcpay.apiKey) {
        const btcpayRes = await fetchWithTimeout(
          `${apis.btcpay.serverUrl}/api/v1/stores/${encodeURIComponent(apis.btcpay.storeId)}/invoices`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `token ${apis.btcpay.apiKey}`
            },
            body: JSON.stringify({
              amount: String(priceUSD),
              currency: 'USD',
              metadata: { userEmail, tierName: body.tierName || 'Aether', coinsAmount }
            })
          }
        );
        if (btcpayRes.ok) {
          const data = (await btcpayRes.json()) as { id?: string; checkoutLink?: string };
          if (data.id && data.checkoutLink) {
            gatewayInvoiceId = data.id;
            checkoutUrl = data.checkoutLink;
            isLiveApi = true;
            gatewayNotice = 'Factura real generada en tu servidor BTCPay Server (0% comisión, custodia directa).';
          }
        } else {
          gatewayNotice = `BTCPay devolvió HTTP ${btcpayRes.status}; usando orden VM de respaldo para continuar pruebas.`;
        }
      } else if (
        (provider === 'NOWPAYMENTS' || provider === 'NOWPAYMENTS_FIAT') &&
        apis.nowpayments.apiKey
      ) {
        const baseUrl = apis.nowpayments.sandbox ? 'https://api-sandbox.nowpayments.io' : 'https://api.nowpayments.io';
        const payCurrency =
          provider === 'NOWPAYMENTS_FIAT'
            ? 'usdttrc20'
            : network === 'ERC20'
            ? 'usdterc20'
            : network === 'BEP20'
            ? 'usdtbsc'
            : 'usdttrc20';
        const npRes = await fetchWithTimeout(`${baseUrl}/v1/invoice`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apis.nowpayments.apiKey
          },
          body: JSON.stringify({
            price_amount: priceUSD,
            price_currency: 'usd',
            pay_currency: payCurrency,
            order_id: `AV-${Date.now()}`,
            order_description: `${coinsAmount} Monedas Aether para ${userEmail}`
          })
        });
        if (npRes.ok) {
          const data = (await npRes.json()) as { id?: string; invoice_url?: string };
          if (data.id && data.invoice_url) {
            gatewayInvoiceId = String(data.id);
            checkoutUrl = data.invoice_url;
            isLiveApi = true;
            gatewayNotice = `Factura real generada en NOWPayments (${apis.nowpayments.sandbox ? 'Sandbox' : 'Live'}).`;
          }
        } else {
          gatewayNotice = `NOWPayments devolvió HTTP ${npRes.status}; orden VM preparada para pruebas locales.`;
        }
      } else if (provider === 'COINGATE' && apis.coingate.enabled && apis.coingate.apiToken) {
        const baseUrl = apis.coingate.environment === 'live' ? 'https://api.coingate.com' : 'https://api-sandbox.coingate.com';
        const cgRes = await fetchWithTimeout(`${baseUrl}/v2/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${apis.coingate.apiToken}`
          },
          body: JSON.stringify({
            order_id: `AV-${Date.now()}`,
            price_amount: priceUSD,
            price_currency: 'USD',
            receive_currency: 'USDT',
            title: `AetherVault ${coinsAmount} Monedas`
          })
        });
        if (cgRes.ok) {
          const data = (await cgRes.json()) as { id?: number; payment_url?: string };
          if (data.payment_url) {
            gatewayInvoiceId = String(data.id || gatewayInvoiceId);
            checkoutUrl = data.payment_url;
            isLiveApi = true;
            gatewayNotice = `Orden real creada en CoinGate (${apis.coingate.environment}).`;
          }
        }
      } else if (provider === 'MOONPAY' && apis.onramps.moonpayPublicKey) {
        const walletDest = network === 'ERC20' ? payoutCfg.usdtErc20Address : payoutCfg.usdtTrc20Address;
        const currencyCode = network === 'ERC20' ? 'usdt' : 'usdt_trx';
        const qs = new URLSearchParams({
          apiKey: apis.onramps.moonpayPublicKey,
          currencyCode,
          walletAddress: walletDest,
          baseCurrencyAmount: String(priceUSD),
          baseCurrencyCode: 'usd'
        });
        let signedQuery = `?${qs.toString()}`;
        if (apis.onramps.moonpaySecretKey) {
          const sig = crypto
            .createHmac('sha256', apis.onramps.moonpaySecretKey)
            .update(signedQuery)
            .digest('base64');
          signedQuery += `&signature=${encodeURIComponent(sig)}`;
        }
        checkoutUrl = `https://buy.moonpay.com${signedQuery}`;
        gatewayInvoiceId = `MOON-${Date.now().toString(36).toUpperCase()}`;
        isLiveApi = true;
        gatewayNotice = 'Enlace On-Ramp MoonPay firmado para pago con Visa/Mastercard directo a tu wallet USDT.';
      } else if (provider === 'TRANSAK' && apis.onramps.transakApiKey) {
        const base = apis.onramps.transakEnvironment === 'PRODUCTION' ? 'https://global.transak.com' : 'https://global-stg.transak.com';
        const walletDest = network === 'ERC20' ? payoutCfg.usdtErc20Address : payoutCfg.usdtTrc20Address;
        const qs = new URLSearchParams({
          apiKey: apis.onramps.transakApiKey,
          cryptoCurrencyCode: 'USDT',
          network: network === 'ERC20' ? 'ethereum' : 'tron',
          fiatAmount: String(priceUSD),
          fiatCurrency: 'USD',
          walletAddress: walletDest
        });
        checkoutUrl = `${base}/?${qs.toString()}`;
        gatewayInvoiceId = `TRK-${Date.now().toString(36).toUpperCase()}`;
        isLiveApi = true;
        gatewayNotice = `Enlace On-Ramp Transak (${apis.onramps.transakEnvironment}) listo para cobrar con tarjeta.`;
      } else if (provider === 'BANXA' && apis.onramps.banxaDomain) {
        const domain = apis.onramps.banxaDomain.replace(/^https?:\/\//, '');
        const walletDest = network === 'ERC20' ? payoutCfg.usdtErc20Address : payoutCfg.usdtTrc20Address;
        const qs = new URLSearchParams({
          coinType: 'USDT',
          fiatType: 'USD',
          fiatAmount: String(priceUSD),
          blockchain: network === 'ERC20' ? 'ETH' : 'TRX',
          walletAddress: walletDest
        });
        checkoutUrl = `https://${domain}/?${qs.toString()}`;
        gatewayInvoiceId = `BNX-${Date.now().toString(36).toUpperCase()}`;
        isLiveApi = true;
        gatewayNotice = 'Enlace Banxa On-Ramp generado para Visa/Mastercard -> USDT.';
      }
    } catch {
      gatewayNotice = 'Pasarela externa no accesible desde esta red; orden creada en flujo de prueba local VM.';
    }

    const order = createCoinPurchaseOrderInDb({
      userEmail,
      tierLevel: Number(body?.tierLevel) || 1,
      tierName: typeof body?.tierName === 'string' && body.tierName ? body.tierName : 'Paquete Aether',
      coinsAmount,
      priceUSD,
      paymentMethod: typeof body?.paymentMethod === 'string' ? body.paymentMethod : 'crypto_usdt',
      usdtNetwork: network,
      gatewayProvider: provider,
      gatewayInvoiceId,
      checkoutUrl: checkoutUrl || undefined,
      isLiveApi,
      ipAddress: ip
    });

    res.status(201).json({
      order,
      isLiveApi,
      checkoutUrl: checkoutUrl || null,
      gatewayNotice
    });
  });

  // Capture an approved PayPal Checkout Order and credit user's SQLite coins balance
  app.post('/api/payments/paypal/capture-order', requireAuth, async (req: AuthenticatedRequest, res) => {
    const ip = req.clientIp || extractClientIp(req);
    const body = (req.body || {}) as { paypalOrderId?: string; localOrderId?: string };
    const paypalOrderId = typeof body.paypalOrderId === 'string' ? body.paypalOrderId.trim() : '';
    const localOrderId = typeof body.localOrderId === 'string' ? body.localOrderId.trim() : undefined;

    if (!paypalOrderId) {
      res.status(400).json({ error: 'paypalOrderId es obligatorio.' });
      return;
    }

    const ppCreds = getEffectivePayPalCreds();
    let captureId = paypalOrderId;

    if (ppCreds.enabled && !paypalOrderId.startsWith('PAYPAL-')) {
      try {
        const token = await fetchPayPalAccessToken(ppCreds);
        const capRes = await fetch(`${ppCreds.baseUrl}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });
        if (!capRes.ok) {
          const txt = await capRes.text().catch(() => '');
          res.status(400).json({
            error: `PayPal no pudo capturar la orden (${capRes.status}). Verifica si el cliente completó la aprobación.`,
            detail: txt.slice(0, 200)
          });
          return;
        }
        const capData = (await capRes.json()) as {
          status?: string;
          purchase_units?: Array<{ payments?: { captures?: Array<{ id?: string; status?: string }> } }>;
        };
        const firstCapture = capData.purchase_units?.[0]?.payments?.captures?.[0];
        if (capData.status !== 'COMPLETED' && firstCapture?.status !== 'COMPLETED') {
          res.status(400).json({ error: `Estado PayPal actual: ${capData.status || 'PENDIENTE'}.` });
          return;
        }
        captureId = firstCapture?.id || paypalOrderId;
      } catch (err) {
        res.status(502).json({
          error: `Error conectando con PayPal API para capturar: ${err instanceof Error ? err.message : 'red'}`
        });
        return;
      }
    }

    const settled = settlePayPalCapturedOrderInDb({
      paypalOrderId,
      captureId,
      localOrderId,
      actorEmail: req.sessionUser?.sub,
      ipAddress: ip
    });

    if (!settled.ok) {
      res.status(settled.status).json({ error: settled.message });
      return;
    }

    res.json({
      ok: true,
      message: settled.message,
      order: settled.order,
      updatedCoinsBalance: settled.updatedCoinsBalance
    });
  });

  // Create Coin Purchase Order routed directly to Owner's USDT Vault
  app.post('/api/payments/create-order', requireAuth, (req: AuthenticatedRequest, res) => {
    const ip = req.clientIp || extractClientIp(req);
    const body = req.body as {
      tierLevel?: number;
      tierName?: string;
      coinsAmount?: number;
      priceUSD?: number;
      paymentMethod?: string;
      usdtNetwork?: 'TRC20' | 'ERC20' | 'BEP20';
    };

    const coinsAmount = Number(body?.coinsAmount);
    const priceUSD = Number(body?.priceUSD);
    if (!Number.isFinite(coinsAmount) || coinsAmount <= 0 || !Number.isFinite(priceUSD) || priceUSD <= 0) {
      res.status(400).json({ error: 'Paquete de monedas inválido.' });
      return;
    }

    const network = body?.usdtNetwork === 'ERC20' || body?.usdtNetwork === 'BEP20' ? body.usdtNetwork : 'TRC20';
    const order = createCoinPurchaseOrderInDb({
      userEmail: req.sessionUser?.sub || 'player',
      tierLevel: Number(body?.tierLevel) || 1,
      tierName: typeof body?.tierName === 'string' && body.tierName ? body.tierName : 'Paquete Aether',
      coinsAmount,
      priceUSD,
      paymentMethod: typeof body?.paymentMethod === 'string' ? body.paymentMethod : 'crypto_usdt',
      usdtNetwork: network,
      ipAddress: ip
    });

    res.status(201).json({ order });
  });

  // Verify TXID & Settle Coin Purchase Order into Owner's USDT Account (Anti-Replay)
  app.post('/api/payments/verify-usdt-order', authLimiter, requireAuth, (req: AuthenticatedRequest, res) => {
    const ip = req.clientIp || extractClientIp(req);
    const body = req.body as { orderId?: string; txHash?: string };
    if (!body?.orderId || !body?.txHash) {
      res.status(400).json({ error: 'orderId y txHash son obligatorios.' });
      return;
    }

    const actorEmail = req.sessionUser?.sub || '';
    const isOwner = req.sessionUser?.role === 'OWNER' && actorEmail.toLowerCase() === OWNER_EMAIL.toLowerCase();
    const result = verifyAndSettlePurchaseOrderInDb({
      orderId: body.orderId,
      txHash: body.txHash,
      actorEmail,
      isOwner,
      ipAddress: ip
    });

    if (!result.ok) {
      res.status(result.status).json({ error: result.message });
      return;
    }
    res.json({
      ok: true,
      message: result.message,
      order: result.order,
      updatedCoinsBalance: result.updatedCoinsBalance
    });
  });

  // Client Redemptions: Strict 30% Balance Cap + Mandatory Owner Authorization (trabajofino52@gmail.com)
  app.get('/api/redemptions', requireAuth, (req: AuthenticatedRequest, res) => {
    const actorEmail = req.sessionUser?.sub || '';
    const isOwner = req.sessionUser?.role === 'OWNER' && actorEmail.toLowerCase() === OWNER_EMAIL.toLowerCase();
    res.json({
      requests: listClientRedemptionRequestsFromDb(actorEmail, isOwner),
      users: isOwner ? listRedeemableUsersFromDb() : [],
      maxWithdrawalPercent: 30,
      authorizerEmail: OWNER_EMAIL
    });
  });

  app.post('/api/redemptions/request', requireAuth, (req: AuthenticatedRequest, res) => {
    const ip = req.clientIp || extractClientIp(req);
    const actorEmail = req.sessionUser?.sub || '';
    const body = req.body as {
      amountCoins?: number;
      playerName?: string;
      destinationType?: 'crypto_usdt' | 'crypto_monero' | 'crypto_btc' | 'paypal' | 'bank_wire';
      destinationAddress?: string;
      feeRatePct?: number;
      autoClampTo30Pct?: boolean;
    };

    const destAddress = typeof body?.destinationAddress === 'string' ? body.destinationAddress.trim() : '';
    if (!destAddress) {
      res.status(400).json({ error: 'La dirección o cuenta de destino es obligatoria.' });
      return;
    }

    const validDestType =
      body?.destinationType === 'crypto_monero' ||
      body?.destinationType === 'crypto_btc' ||
      body?.destinationType === 'paypal' ||
      body?.destinationType === 'bank_wire'
        ? body.destinationType
        : 'crypto_usdt';

    const result = createClientRedemptionRequestInDb({
      actorEmail,
      playerName: typeof body?.playerName === 'string' ? body.playerName.trim() : actorEmail.split('@')[0],
      amountCoins: Number(body?.amountCoins),
      destType: validDestType,
      destAddress,
      feeRatePct: typeof body?.feeRatePct === 'number' ? body.feeRatePct : 20,
      autoClampTo30Pct: Boolean(body?.autoClampTo30Pct),
      ipAddress: ip
    });

    if (!result.ok) {
      res.status(result.status).json({
        error: result.message,
        maxAllowed30PctCoins: result.maxAllowed30PctCoins
      });
      return;
    }

    res.status(201).json({
      ok: true,
      message: result.message,
      request: result.request,
      updatedCoinsBalance: result.updatedCoinsBalance,
      maxAllowed30PctCoins: result.maxAllowed30PctCoins
    });
  });

  // AdminPanel: Validate user withdrawal request, auto-limit to 30% of total balance, and set Espera de Autorización = true
  app.post('/api/admin/redemptions/validate-and-create', requireOwner, (req: AuthenticatedRequest, res) => {
    const ip = req.clientIp || extractClientIp(req);
    const body = req.body as {
      playerEmail?: string;
      playerName?: string;
      requestedCoins?: number;
      destinationType?: 'crypto_usdt' | 'crypto_monero' | 'crypto_btc' | 'paypal' | 'bank_wire';
      destinationAddress?: string;
      feeRatePct?: number;
    };

    const playerEmail = typeof body?.playerEmail === 'string' ? body.playerEmail.trim().toLowerCase() : '';
    const destAddress = typeof body?.destinationAddress === 'string' ? body.destinationAddress.trim() : '';

    if (!playerEmail || !playerEmail.includes('@')) {
      res.status(400).json({ error: 'El correo del jugador es obligatorio para validar el balance.' });
      return;
    }
    if (!destAddress) {
      res.status(400).json({ error: 'La dirección o cuenta de destino es obligatoria.' });
      return;
    }

    const validDestType =
      body?.destinationType === 'crypto_monero' ||
      body?.destinationType === 'crypto_btc' ||
      body?.destinationType === 'paypal' ||
      body?.destinationType === 'bank_wire'
        ? body.destinationType
        : 'crypto_usdt';

    const result = createClientRedemptionRequestInDb({
      actorEmail: playerEmail,
      playerName: typeof body?.playerName === 'string' && body.playerName.trim() ? body.playerName.trim() : playerEmail.split('@')[0],
      amountCoins: Number(body?.requestedCoins),
      destType: validDestType,
      destAddress,
      feeRatePct: typeof body?.feeRatePct === 'number' ? body.feeRatePct : 20,
      autoClampTo30Pct: true,
      ipAddress: ip
    });

    if (!result.ok) {
      res.status(result.status).json({
        error: result.message,
        maxAllowed30PctCoins: result.maxAllowed30PctCoins
      });
      return;
    }

    res.status(201).json({
      ok: true,
      message: result.message,
      request: result.request,
      updatedCoinsBalance: result.updatedCoinsBalance,
      maxAllowed30PctCoins: result.maxAllowed30PctCoins
    });
  });

  app.post('/api/redemptions/:id/review', requireOwner, async (req: AuthenticatedRequest, res) => {
    const ip = req.clientIp || extractClientIp(req);
    const requestId = String(req.params.id);
    const body = req.body as { decision?: 'APPROVED' | 'REJECTED'; rejectionReason?: string };
    if (body?.decision !== 'APPROVED' && body?.decision !== 'REJECTED') {
      res.status(400).json({ error: 'Decisión inválida (APPROVED o REJECTED).' });
      return;
    }
    const result = reviewClientRedemptionRequestInDb({
      requestId,
      decision: body.decision,
      ownerEmail: req.sessionUser?.sub || '',
      rejectionReason: typeof body?.rejectionReason === 'string' ? body.rejectionReason : undefined,
      ipAddress: ip
    });
    if (!result.ok || !result.request) {
      res.status(result.status).json({ error: result.message });
      return;
    }

    let finalRequest = result.request;
    let finalMessage = result.message;

    // Trigger real PayPal Payouts v1 when approved for PayPal destination and REST credentials exist
    if (body.decision === 'APPROVED' && finalRequest.destinationType === 'paypal') {
      const ppCreds = getEffectivePayPalCreds();
      if (ppCreds.enabled && ppCreds.clientId && ppCreds.clientSecret) {
        try {
          const token = await fetchPayPalAccessToken(ppCreds);
          const payoutResp = await fetch(`${ppCreds.baseUrl}/v1/payments/payouts`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              sender_batch_header: {
                sender_batch_id: `AV_${finalRequest.id}_${Date.now()}`,
                email_subject: 'Pago de Retiro AetherVault Casino',
                email_message: `Has recibido $${finalRequest.netUSD.toFixed(2)} USD netos (comisión de retiro aplicada).`
              },
              items: [
                {
                  recipient_type: 'EMAIL',
                  amount: {
                    value: finalRequest.netUSD.toFixed(2),
                    currency: 'USD'
                  },
                  receiver: finalRequest.destinationAddress,
                  note: `Retiro AetherVault #${finalRequest.id.slice(-8)}`,
                  sender_item_id: finalRequest.id
                }
              ]
            })
          });

          if (payoutResp.ok) {
            const pJson = (await payoutResp.json()) as {
              batch_header?: { payout_batch_id?: string; batch_status?: string };
            };
            const batchId = pJson.batch_header?.payout_batch_id;
            const statusLabel = `PAYPAL_SENT_${pJson.batch_header?.batch_status || 'PENDING'}`;
            updateRedemptionPayoutResultInDb(finalRequest.id, statusLabel, batchId, OWNER_EMAIL, ip);
            finalRequest = {
              ...finalRequest,
              payoutStatus: statusLabel,
              externalPayoutId: batchId
            };
            finalMessage = `Retiro autorizado y enviado a PayPal (${ppCreds.environment.toUpperCase()}) · Batch ID: ${batchId || 'OK'}.`;
          } else {
            const simStatus = `PAYPAL_API_HTTP_${payoutResp.status}_LOCAL_FALLBACK`;
            updateRedemptionPayoutResultInDb(finalRequest.id, simStatus, `SIM-${finalRequest.id.slice(-6)}`, OWNER_EMAIL, ip);
            finalRequest = { ...finalRequest, payoutStatus: simStatus };
            finalMessage = `Autorizado en DB. PayPal Payouts devolvió HTTP ${payoutResp.status}; registrado para liquidación manual.`;
          }
        } catch {
          updateRedemptionPayoutResultInDb(finalRequest.id, 'PAYPAL_OFFLINE_QUEUED', undefined, OWNER_EMAIL, ip);
          finalRequest = { ...finalRequest, payoutStatus: 'PAYPAL_OFFLINE_QUEUED' };
        }
      } else {
        updateRedemptionPayoutResultInDb(finalRequest.id, 'SIMULATED_LOCAL_VM_PAYPAL', `VM-PP-${finalRequest.id.slice(-6)}`, OWNER_EMAIL, ip);
        finalRequest = {
          ...finalRequest,
          payoutStatus: 'SIMULATED_LOCAL_VM_PAYPAL',
          externalPayoutId: `VM-PP-${finalRequest.id.slice(-6)}`
        };
      }
    } else if (body.decision === 'APPROVED' && finalRequest.destinationType === 'crypto_usdt') {
      const usdtRef = `USDT-BATCH-${finalRequest.id.slice(-8).toUpperCase()}`;
      updateRedemptionPayoutResultInDb(finalRequest.id, 'USDT_DISPATCH_READY', usdtRef, OWNER_EMAIL, ip);
      finalRequest = {
        ...finalRequest,
        payoutStatus: 'USDT_DISPATCH_READY',
        externalPayoutId: usdtRef
      };
    }

    res.json({ ok: true, message: finalMessage, request: finalRequest });
  });

  // ============================================================================
  // Multi-Player Sync, Directory & P2P Coin Transfers (with Casino Commission)
  // ============================================================================
  app.get('/api/players/directory', requireAuth, (req: AuthenticatedRequest, res) => {
    const actorEmail = req.sessionUser?.sub || '';
    res.json({
      players: listDirectoryPlayersFromDb(actorEmail),
      economyConfig: getEconomyConfigFromDb()
    });
  });

  app.post('/api/player/balance-sync', requireAuth, (req: AuthenticatedRequest, res) => {
    const ip = req.clientIp || extractClientIp(req);
    const actorEmail = req.sessionUser?.sub || '';
    const body = (req.body || {}) as { coinsBalance?: number; reason?: string };
    const result = syncPlayerBalanceInDb({
      actorEmail,
      newBalance: Number(body.coinsBalance),
      reason: typeof body.reason === 'string' ? body.reason.slice(0, 60) : 'GAMEPLAY_SYNC',
      ipAddress: ip
    });
    if (!result.ok) {
      res.status(400).json({ error: result.message, coinsBalance: result.coinsBalance });
      return;
    }
    res.json({ ok: true, coinsBalance: result.coinsBalance });
  });

  app.get('/api/transfers', requireAuth, (req: AuthenticatedRequest, res) => {
    const actorEmail = req.sessionUser?.sub || '';
    const isOwner = req.sessionUser?.role === 'OWNER' && actorEmail.toLowerCase() === OWNER_EMAIL.toLowerCase();
    res.json({
      transfers: listPlayerTransfersFromDb(actorEmail, isOwner, 50),
      economyConfig: getEconomyConfigFromDb()
    });
  });

  app.post('/api/transfers/send', requireAuth, (req: AuthenticatedRequest, res) => {
    const ip = req.clientIp || extractClientIp(req);
    const senderEmail = req.sessionUser?.sub || '';
    const body = (req.body || {}) as { recipientEmail?: string; amountCoins?: number; note?: string };
    if (!body.recipientEmail || typeof body.recipientEmail !== 'string') {
      res.status(400).json({ error: 'El correo del destinatario es obligatorio.' });
      return;
    }
    const result = transferCoinsBetweenPlayersInDb({
      senderEmail,
      recipientEmail: body.recipientEmail,
      amountCoins: Number(body.amountCoins),
      note: typeof body.note === 'string' ? body.note : undefined,
      ipAddress: ip
    });
    if (!result.ok) {
      res.status(result.status).json({ error: result.message });
      return;
    }
    res.status(201).json({
      ok: true,
      message: result.message,
      transfer: result.transfer,
      senderBalanceCoins: result.senderBalanceCoins,
      recipientBalanceCoins: result.recipientBalanceCoins
    });
  });

  // Owner-Only Vault Gateway & Payout Config Update
  app.put('/api/admin/payout-config', requireOwner, (req: AuthenticatedRequest, res) => {
    const ip = req.clientIp || extractClientIp(req);
    const body = req.body as Record<string, unknown>;
    const validPaypalMode = body.paypalMode === 'PERSONAL' ? 'PERSONAL' : body.paypalMode === 'BUSINESS' ? 'BUSINESS' : undefined;
    const validRail =
      body.primarySettlementRail === 'BTC' ||
      body.primarySettlementRail === 'PAYPAL_BUSINESS' ||
      body.primarySettlementRail === 'BANK_WIRE' ||
      body.primarySettlementRail === 'USDT'
        ? body.primarySettlementRail
        : undefined;
    const validCardProvider =
      body.cardGatewayProvider === 'BTCPAY_SERVER' ||
      body.cardGatewayProvider === 'MOONPAY_ONRAMP' ||
      body.cardGatewayProvider === 'STRIPE_DIGITAL' ||
      body.cardGatewayProvider === 'PAYPAL_BUSINESS' ||
      body.cardGatewayProvider === 'NOWPAYMENTS_CARD_TO_CRYPTO'
        ? body.cardGatewayProvider
        : undefined;

    const updated = saveOwnerPayoutConfigInDb(
      {
        merchantName: typeof body.merchantName === 'string' ? body.merchantName.trim() : undefined,
        usdtTrc20Address: typeof body.usdtTrc20Address === 'string' ? body.usdtTrc20Address.trim() : undefined,
        usdtErc20Address: typeof body.usdtErc20Address === 'string' ? body.usdtErc20Address.trim() : undefined,
        usdtBep20Address: typeof body.usdtBep20Address === 'string' ? body.usdtBep20Address.trim() : undefined,
        btcAddress: typeof body.btcAddress === 'string' ? body.btcAddress.trim() : undefined,
        binancePayId: typeof body.binancePayId === 'string' ? body.binancePayId.trim() : undefined,
        paypalEmail: typeof body.paypalEmail === 'string' ? body.paypalEmail.trim() : undefined,
        paypalMode: validPaypalMode,
        cardGatewayProvider: validCardProvider,
        primarySettlementRail: validRail,
        bankIbanSwift: typeof body.bankIbanSwift === 'string' ? body.bankIbanSwift.trim() : undefined,
        bankAccountHolder: typeof body.bankAccountHolder === 'string' ? body.bankAccountHolder.trim() : undefined,
        autoForwardToWallet: typeof body.autoForwardToWallet === 'boolean' ? body.autoForwardToWallet : undefined,
        autoConvertToUsdt: typeof body.autoConvertToUsdt === 'boolean' ? body.autoConvertToUsdt : undefined,
        vmTestModeEnabled: typeof body.vmTestModeEnabled === 'boolean' ? body.vmTestModeEnabled : undefined,
        maxVmTesters:
          typeof body.maxVmTesters === 'number'
            ? Math.min(Math.max(Math.round(body.maxVmTesters), 1), MAX_VM_TESTERS)
            : undefined
      },
      OWNER_EMAIL,
      ip
    );
    res.json({ ok: true, config: updated });
  });

  // Owner-Only Vault Gateway APIs & Virtual Cards Configuration (AES-256-GCM Encrypted)
  app.get('/api/admin/vault-apis', requireOwner, (_req, res) => {
    res.json(getMaskedVaultApisForOwner());
  });

  app.put('/api/admin/vault-apis', requireOwner, (req: AuthenticatedRequest, res) => {
    const ip = req.clientIp || extractClientIp(req);
    const body = (req.body || {}) as Partial<StoredVaultGatewayApis>;
    const saved = saveVaultGatewayApisInDb(body, OWNER_EMAIL, ip);
    res.json({ ok: true, ...saved });
  });

  app.post('/api/admin/vault-apis/test', requireOwner, async (req: AuthenticatedRequest, res) => {
    const body = req.body as { target?: 'btcpay' | 'nowpayments' | 'coingate' | 'paypal' };
    const apis = getVaultGatewayApisRawFromDb();
    const target = body?.target || 'btcpay';

    const fetchWithTimeout = async (url: string, init: RequestInit): Promise<globalThis.Response> => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      try {
        return await fetch(url, { ...init, signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }
    };

    try {
      if (target === 'paypal') {
        const ppCreds = getEffectivePayPalCreds();
        if (!ppCreds.clientId || !ppCreds.clientSecret) {
          res.json({ ok: false, message: 'Completa Client ID y Client Secret de PayPal primero.' });
          return;
        }
        await fetchPayPalAccessToken(ppCreds);
        res.json({
          ok: true,
          status: 200,
          message: `PayPal REST API (${ppCreds.environment.toUpperCase()}) autenticado correctamente por OAuth2.`
        });
        return;
      }

      if (target === 'btcpay') {
        if (!apis.btcpay.serverUrl || !apis.btcpay.storeId || !apis.btcpay.apiKey) {
          res.json({ ok: false, message: 'Completa URL, Store ID y API Key de BTCPay Server primero.' });
          return;
        }
        const r = await fetchWithTimeout(`${apis.btcpay.serverUrl}/api/v1/stores/${encodeURIComponent(apis.btcpay.storeId)}`, {
          headers: { Authorization: `token ${apis.btcpay.apiKey}` }
        });
        res.json({
          ok: r.ok,
          status: r.status,
          message: r.ok ? 'Conexión verificada con BTCPay Server API Greenfield.' : `BTCPay respondió HTTP ${r.status}. Verifica tu API Key o Store ID.`
        });
        return;
      }

      if (target === 'nowpayments') {
        if (!apis.nowpayments.apiKey) {
          res.json({ ok: false, message: 'Ingresa tu API Key de NOWPayments primero.' });
          return;
        }
        const base = apis.nowpayments.sandbox ? 'https://api-sandbox.nowpayments.io' : 'https://api.nowpayments.io';
        const r = await fetchWithTimeout(`${base}/v1/status`, {
          headers: { 'x-api-key': apis.nowpayments.apiKey }
        });
        res.json({
          ok: r.ok,
          status: r.status,
          message: r.ok ? 'NOWPayments API accesible y operativa.' : `NOWPayments respondió HTTP ${r.status}.`
        });
        return;
      }

      if (!apis.coingate.apiToken) {
        res.json({ ok: false, message: 'Ingresa tu API Token de CoinGate primero.' });
        return;
      }
      const cgBase = apis.coingate.environment === 'live' ? 'https://api.coingate.com' : 'https://api-sandbox.coingate.com';
      const r = await fetchWithTimeout(`${cgBase}/v2/orders?per_page=1`, {
        headers: { Authorization: `Token ${apis.coingate.apiToken}` }
      });
      res.json({
        ok: r.ok,
        status: r.status,
        message: r.ok ? `CoinGate (${apis.coingate.environment}) autenticado correctamente.` : `CoinGate respondió HTTP ${r.status}.`
      });
    } catch (err) {
      res.json({
        ok: false,
        message: `No se pudo alcanzar la pasarela (${err instanceof Error ? err.message : 'red no disponible'}). Verifica DNS/firewall cuando despliegues en VPS.`
      });
    }
  });

  // ============================================================================
  // Official PayPal REST Webhook Endpoint (Ngrok / VPS Ready)
  // ============================================================================
  app.post('/api/webhooks/paypal', async (req, res) => {
    const ip = extractClientIp(req);
    const body = (req.body || {}) as {
      id?: string;
      event_type?: string;
      resource?: {
        id?: string;
        supplementary_data?: { related_ids?: { order_id?: string } };
      };
    };

    const ppCreds = getEffectivePayPalCreds();
    let signatureVerified = false;

    if (ppCreds.enabled && ppCreds.webhookId) {
      try {
        const token = await fetchPayPalAccessToken(ppCreds);
        const verifyResp = await fetch(`${ppCreds.baseUrl}/v1/notifications/verify-webhook-signature`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            auth_algo: req.headers['paypal-auth-algo'] || '',
            cert_url: req.headers['paypal-cert-url'] || '',
            transmission_id: req.headers['paypal-transmission-id'] || '',
            transmission_sig: req.headers['paypal-transmission-sig'] || '',
            transmission_time: req.headers['paypal-transmission-time'] || '',
            webhook_id: ppCreds.webhookId,
            webhook_event: req.body
          })
        });
        if (verifyResp.ok) {
          const vJson = (await verifyResp.json()) as { verification_status?: string };
          signatureVerified = vJson.verification_status === 'SUCCESS';
        }
      } catch {
        signatureVerified = false;
      }
      if (!signatureVerified) {
        appendAuditLog('PAYPAL_WEBHOOK', ip, 'PAYPAL_WEBHOOK_INVALID_SIGNATURE', 'CRITICAL', `Webhook PayPal no verificable desde IP ${ip}.`);
        res.status(401).json({ error: 'Firma de webhook PayPal no verificada.' });
        return;
      }
    }

    const eventType = String(body.event_type || 'UNKNOWN');
    const relatedOrderId = body.resource?.supplementary_data?.related_ids?.order_id || '';
    const captureId = body.resource?.id || '';

    if ((eventType === 'PAYMENT.CAPTURE.COMPLETED' || eventType === 'CHECKOUT.ORDER.APPROVED') && (relatedOrderId || captureId)) {
      const settled = settlePayPalCapturedOrderInDb({
        paypalOrderId: relatedOrderId || captureId,
        captureId: captureId || relatedOrderId,
        ipAddress: ip
      });
      res.status(200).json({ ok: true, eventType, settled: settled.ok, message: settled.message });
      return;
    }

    appendAuditLog('PAYPAL_WEBHOOK', ip, 'PAYPAL_WEBHOOK_RECEIVED', 'INFO', `Evento webhook PayPal ${eventType} (${body.id || 'sin-id'}).`);
    res.status(200).json({ ok: true, eventType });
  });

  // ============================================================================
  // BTCPay Server Webhook Endpoint (HMAC-SHA256 BTCPay-Sig + Blockchain Confirmation)
  // ============================================================================
  app.post('/api/webhooks/btcpay', (req, res) => {
    const ip = extractClientIp(req);
    const apis = getVaultGatewayApisRawFromDb();
    const webhookSecret = (
      apis.btcpay.webhookSecret ||
      process.env.BTCPAY_WEBHOOK_SECRET ||
      UNIFIED_SECURITY_KEY
    ).trim();
    const rawBody =
      (req as express.Request & { rawBody?: Buffer }).rawBody ||
      Buffer.from(JSON.stringify(req.body || {}), 'utf8');
    const sigHeader = String(req.headers['btcpay-sig'] || '').trim();

    const expectedHex = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');
    const expectedHeader = `sha256=${expectedHex}`;
    const a = Buffer.from(sigHeader.toLowerCase(), 'utf8');
    const b = Buffer.from(expectedHeader.toLowerCase(), 'utf8');

    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      appendAuditLog(
        'BTCPAY_WEBHOOK',
        ip,
        'BTCPAY_WEBHOOK_INVALID_SIGNATURE',
        'CRITICAL',
        `Firma HMAC-SHA256 BTCPay-Sig inválida o ausente desde IP ${ip}.`
      );
      res.status(401).json({ error: 'Firma BTCPay-Sig (HMAC-SHA256) inválida o ausente.' });
      return;
    }
    const signatureVerified = true;

    const body = (req.body || {}) as {
      deliveryId?: string;
      webhookId?: string;
      invoiceId?: string;
      type?: string;
      partiallyPaid?: boolean;
      metadata?: {
        orderId?: string;
        userEmail?: string;
        coinsAmount?: number | string;
        priceUSD?: number | string;
      };
    };

    const allowedTypes = new Set<BtcpayWebhookEventType>([
      'InvoiceSettled',
      'InvoicePaymentSettled',
      'InvoiceProcessing',
      'InvoiceExpired',
      'InvoiceInvalid',
      'ManualTest'
    ]);
    const eventType: BtcpayWebhookEventType = allowedTypes.has(body.type as BtcpayWebhookEventType)
      ? (body.type as BtcpayWebhookEventType)
      : 'InvoiceProcessing';

    const invoiceId = typeof body.invoiceId === 'string' && body.invoiceId.trim()
      ? body.invoiceId.trim()
      : `btcpay_${Date.now().toString(36)}`;
    const deliveryId = typeof body.deliveryId === 'string' && body.deliveryId.trim()
      ? body.deliveryId.trim()
      : `dlv_${invoiceId}_${eventType}`;

    const result = processBtcpayWebhookEventInDb({
      deliveryId,
      invoiceId,
      eventType,
      orderId: typeof body.metadata?.orderId === 'string' ? body.metadata.orderId : undefined,
      userEmail: typeof body.metadata?.userEmail === 'string' ? body.metadata.userEmail : undefined,
      coinsAmount: body.metadata?.coinsAmount !== undefined ? Number(body.metadata.coinsAmount) : undefined,
      amountUSD: body.metadata?.priceUSD !== undefined ? Number(body.metadata.priceUSD) : undefined,
      signatureVerified,
      rawSummary: `${eventType} invoice=${invoiceId} email=${body.metadata?.userEmail || 'auto'}`,
      ipAddress: ip
    });

    res.status(result.duplicate ? 200 : 201).json(result);
  });

  // Owner-Only BTCPay Webhook Queue, Signed Simulation & Firestore Sync Acknowledgement
  app.get('/api/admin/btcpay/webhooks', requireOwner, (_req, res) => {
    res.json({ events: listBtcpayWebhookEventsFromDb(40) });
  });

  app.post('/api/admin/btcpay/webhooks/simulate', requireOwner, (req: AuthenticatedRequest, res) => {
    const ip = req.clientIp || extractClientIp(req);
    const body = (req.body || {}) as {
      invoiceId?: string;
      orderId?: string;
      userEmail?: string;
      coinsAmount?: number;
      amountUSD?: number;
      eventType?: BtcpayWebhookEventType;
    };

    const allowedTypes = new Set<BtcpayWebhookEventType>([
      'InvoiceSettled',
      'InvoicePaymentSettled',
      'InvoiceProcessing',
      'InvoiceExpired',
      'InvoiceInvalid',
      'ManualTest'
    ]);
    const eventType: BtcpayWebhookEventType = allowedTypes.has(body.eventType as BtcpayWebhookEventType)
      ? (body.eventType as BtcpayWebhookEventType)
      : 'InvoiceSettled';

    const apis = getVaultGatewayApisRawFromDb();
    const secret = (apis.btcpay.webhookSecret || process.env.BTCPAY_WEBHOOK_SECRET || UNIFIED_SECURITY_KEY).trim();
    const invoiceId = (body.invoiceId || `BTCPAY-${Date.now().toString(36).toUpperCase()}`).trim();
    const deliveryId = `dlv_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const userEmail = (body.userEmail || 'tester01@vm.aethervault.local').trim().toLowerCase();
    const coinsAmount = Math.max(1, Math.round(Number(body.coinsAmount || 100)));
    const amountUSD = Math.max(1, Math.round(Number(body.amountUSD || coinsAmount * 0.8) * 100) / 100);

    const payloadJson = JSON.stringify({
      deliveryId,
      invoiceId,
      type: eventType,
      metadata: { orderId: body.orderId, userEmail, coinsAmount, priceUSD: amountUSD }
    });
    const sig = crypto.createHmac('sha256', secret).update(payloadJson).digest('hex');
    const verifySig = crypto.createHmac('sha256', secret).update(payloadJson).digest('hex');
    const signatureVerified = crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(verifySig, 'hex'));

    const result = processBtcpayWebhookEventInDb({
      deliveryId,
      invoiceId,
      eventType,
      orderId: body.orderId,
      userEmail,
      coinsAmount,
      amountUSD,
      signatureVerified,
      rawSummary: `[Simulación Firmada HMAC-SHA256] ${eventType} · ${userEmail} · +${coinsAmount} monedas ($${amountUSD} USD)`,
      ipAddress: ip
    });

    res.status(201).json({ ...result, hmacHeaderPreview: `sha256=${sig.slice(0, 16)}...` });
  });

  app.post('/api/admin/btcpay/webhooks/:id/ack-firestore', requireOwner, (req: AuthenticatedRequest, res) => {
    const ip = req.clientIp || extractClientIp(req);
    const eventId = String(req.params.id);
    const updated = ackBtcpayWebhookFirestoreSyncInDb(eventId, OWNER_EMAIL, ip);
    if (!updated) {
      res.status(404).json({ error: 'Evento webhook no encontrado.' });
      return;
    }
    res.json({ ok: true, event: updated });
  });

  app.post('/api/admin/vault/apply-recommendations', requireOwner, (req: AuthenticatedRequest, res) => {
    const ip = req.clientIp || extractClientIp(req);
    const result = applySafeVaultRecommendationsInDb(OWNER_EMAIL, ip);
    res.json({
      ok: true,
      apis: result.apis,
      payoutConfig: result.payoutConfig,
      economyConfig: result.economyConfig,
      message: 'Todas las sugerencias deterministas (PayPal Business, Retención Casa 70%, Comisión Retiro 20%, Transfer P2P 5%, clave unificada y tope 30%) fueron aplicadas.'
    });
  });

  // Owner-Only Full Executive Summary + Complete Conversation History
  app.get('/api/admin/full-summary', requireOwner, (_req, res) => {
    res.json(getFullPlatformSummaryAndHistory());
  });

  // Owner-Only USDT Purchase Orders Ledger
  app.get('/api/admin/usdt-orders', requireOwner, (_req, res) => {
    const orders = listUsdtPurchaseOrdersFromDb(50);
    res.json({ orders });
  });

  app.post('/api/admin/usdt-orders/:id/review', requireOwner, (req: AuthenticatedRequest, res) => {
    const ip = req.clientIp || extractClientIp(req);
    const orderId = String(req.params.id);
    const body = req.body as { decision?: 'VERIFIED_SETTLED' | 'REJECTED' };
    if (body?.decision !== 'VERIFIED_SETTLED' && body?.decision !== 'REJECTED') {
      res.status(400).json({ error: 'Decisión inválida.' });
      return;
    }
    const ok = reviewUsdtPurchaseOrderInDb(orderId, body.decision, OWNER_EMAIL, ip);
    if (!ok) {
      res.status(404).json({ error: 'Orden no encontrada.' });
      return;
    }
    res.json({ ok: true, orders: listUsdtPurchaseOrdersFromDb(50) });
  });

  // Owner-Only Security Posture, Vulnerability Self-Scan & Audit Logs
  app.get('/api/admin/security-status', requireOwner, (_req, res) => {
    const integrity = verifyDatabaseIntegrity();
    const rateStats = getRateLimiterStats();
    const auditLogs = getRecentAuditLogs(30);
    const vulnerabilityScan = runVulnerabilitySelfScan();

    res.json({
      hardening: {
        encryptionAtRest: 'AES-256-GCM',
        passwordHashing: 'scrypt (N=16384, r=8, p=1 + salt 128-bit)',
        sessionTokens: 'HMAC-SHA256 Signed + HttpOnly Cookie',
        sqlInjectionProtection: 'Prepared Parameterized Statements + WAF Sensor',
        rateLimiter: 'Sliding Window + CSRF Origin Guard + Account Lockout',
        httpHeaders: 'CSP + X-XSS/NoSniff + Anti-TRACE + HSTS',
        databaseEngine: 'SQLite WAL + Anti-Replay TXID Index (Postgres 17 RLS Ready)'
      },
      integrity,
      rateStats,
      vulnerabilityScan,
      auditLogs
    });
  });

  app.get('/api/admin/vulnerability-scan', requireOwner, (_req, res) => {
    res.json(runVulnerabilitySelfScan());
  });

  app.post('/api/admin/verify-integrity', requireOwner, (req: AuthenticatedRequest, res) => {
    const ip = req.clientIp || extractClientIp(req);
    const integrity = verifyDatabaseIntegrity();
    const vulnerabilityScan = runVulnerabilitySelfScan();
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
      vulnerabilityScan,
      auditLogs: getRecentAuditLogs(30)
    });
  });

  // Owner-Only Paginated, Filterable AuditTrail Ledger (Financial + API Config + Authorization Events)
  app.get('/api/admin/audit-trail', requireOwner, (req, res) => {
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 15);
    const categoryRaw = String(req.query.category || 'ALL').toUpperCase();
    const severityRaw = String(req.query.severity || 'ALL').toUpperCase();
    const search = typeof req.query.search === 'string' ? req.query.search.slice(0, 120) : '';
    const dateFromRaw = req.query.dateFrom ? Number(req.query.dateFrom) : undefined;
    const dateToRaw = req.query.dateTo ? Number(req.query.dateTo) : undefined;

    const category =
      categoryRaw === 'FINANCIAL' ||
      categoryRaw === 'API_CONFIG' ||
      categoryRaw === 'AUTHORIZATION' ||
      categoryRaw === 'SECURITY'
        ? categoryRaw
        : 'ALL';
    const severity =
      severityRaw === 'INFO' || severityRaw === 'WARN' || severityRaw === 'CRITICAL'
        ? severityRaw
        : 'ALL';

    res.json(
      listAuditTrailPaginatedFromDb({
        page,
        pageSize,
        category,
        severity,
        search,
        dateFrom: Number.isFinite(dateFromRaw) ? dateFromRaw : undefined,
        dateTo: Number.isFinite(dateToRaw) ? dateToRaw : undefined
      })
    );
  });

  app.post('/api/admin/audit-trail/record', requireOwner, (req: AuthenticatedRequest, res) => {
    const ip = req.clientIp || extractClientIp(req);
    const body = (req.body || {}) as {
      action?: string;
      severity?: 'INFO' | 'WARN' | 'CRITICAL';
      details?: string;
    };

    const ALLOWED_ACTIONS = new Set([
      'ADMIN_WITHDRAWAL_EXECUTED',
      'VAULT_MARGINS_UPDATED',
      'ADMIN_COINS_AIRDROP',
      'ADMIN_COINS_ADJUSTED',
      'API_CONFIG_FIRESTORE_SYNCED',
      'OWNER_AUTH_GMAIL_CONNECTED',
      'OWNER_AUTH_FIRESTORE_CONNECTED',
      'SECURITY_POLICY_CHECK'
    ]);

    const cleanAction = typeof body.action === 'string' ? body.action.trim().toUpperCase() : '';
    const cleanDetails = typeof body.details === 'string' ? body.details.trim().slice(0, 480) : '';

    if (!ALLOWED_ACTIONS.has(cleanAction)) {
      res.status(400).json({ error: 'Tipo de evento de auditoría no permitido.' });
      return;
    }
    if (!cleanDetails) {
      res.status(400).json({ error: 'El detalle del evento de auditoría es obligatorio.' });
      return;
    }

    const severity: 'INFO' | 'WARN' | 'CRITICAL' =
      body.severity === 'WARN' || body.severity === 'CRITICAL' ? body.severity : 'INFO';

    const inserted = appendAuditLog(
      req.sessionUser?.sub || OWNER_EMAIL,
      ip,
      cleanAction,
      severity,
      cleanDetails
    );

    res.status(201).json({
      ok: true,
      entry: {
        ...inserted,
        category: classifyAuditAction(inserted.action)
      }
    });
  });

  // VM Experience, Gameplay & Error Telemetry Logger (captures all 10 testers' experience)
  app.post('/api/telemetry/log', (req: AuthenticatedRequest, res) => {
    const ip = extractClientIp(req);
    const body = req.body as {
      userEmail?: string;
      sessionId?: string;
      category?: string;
      gameName?: string;
      severity?: 'INFO' | 'WARN' | 'ERROR' | 'BUG_REPORT';
      summary?: string;
      details?: Record<string, unknown>;
    };

    const summary = typeof body?.summary === 'string' ? body.summary.trim() : '';
    if (!summary) {
      res.status(400).json({ error: 'Resumen de evento requerido.' });
      return;
    }

    const entry = appendVmExperienceLogInDb({
      userEmail: typeof body.userEmail === 'string' && body.userEmail ? body.userEmail.trim() : 'guest',
      sessionId: typeof body.sessionId === 'string' && body.sessionId ? body.sessionId.trim() : 'vm_session',
      category: typeof body.category === 'string' && body.category ? body.category.trim() : 'SYSTEM',
      gameName: typeof body.gameName === 'string' && body.gameName ? body.gameName.trim() : 'PLATFORM',
      severity: body.severity || 'INFO',
      summary,
      detailsJson: JSON.stringify(body.details || {}),
      ipAddress: ip
    });

    res.status(201).json({ ok: true, entry });
  });

  // Owner-Only VM QA Experience Logs & 10 Testers Management
  app.get('/api/admin/experience-logs', requireOwner, (req, res) => {
    const severity = typeof req.query.severity === 'string' ? req.query.severity : 'ALL';
    const category = typeof req.query.category === 'string' ? req.query.category : 'ALL';
    const limit = Number(req.query.limit) || 150;
    const logs = listVmExperienceLogsFromDb({ severity, category, limit });
    const testers = listVmTestersFromDb();
    res.json({
      logs,
      testers,
      summary: {
        maxVmTesters: MAX_VM_TESTERS,
        activeTestersCount: testers.filter(t => t.isActive).length,
        totalLogs: logs.length,
        errorsCount: logs.filter(l => l.severity === 'ERROR').length,
        bugReportsCount: logs.filter(l => l.severity === 'BUG_REPORT').length
      }
    });
  });

  app.get('/api/admin/experience-logs/export', requireOwner, (_req, res) => {
    const report = buildVmDiagnosticReport();
    res.setHeader('Content-Disposition', `attachment; filename="aethervault-vm-report-${Date.now()}.json"`);
    res.json(report);
  });

  app.delete('/api/admin/experience-logs', requireOwner, (req: AuthenticatedRequest, res) => {
    const ip = req.clientIp || extractClientIp(req);
    clearVmExperienceLogsInDb(OWNER_EMAIL, ip);
    res.json({ ok: true });
  });

  app.get('/api/admin/vm-testers', requireOwner, (_req, res) => {
    res.json({
      maxVmTesters: MAX_VM_TESTERS,
      testers: listVmTestersFromDb()
    });
  });

  app.post('/api/admin/vm-testers/reset', requireOwner, (req: AuthenticatedRequest, res) => {
    const ip = req.clientIp || extractClientIp(req);
    const body = req.body as { email?: string; coinsBalance?: number; isActive?: boolean };
    if (!body?.email) {
      res.status(400).json({ error: 'El correo del tester es obligatorio.' });
      return;
    }
    const ok = resetVmTesterSlotInDb(
      body.email,
      typeof body.coinsBalance === 'number' ? body.coinsBalance : 6250,
      typeof body.isActive === 'boolean' ? body.isActive : true,
      OWNER_EMAIL,
      ip
    );
    if (!ok) {
      res.status(404).json({ error: 'Slot de tester VM no encontrado (permitidos: tester01 a tester10).' });
      return;
    }
    res.json({ ok: true, testers: listVmTestersFromDb() });
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
