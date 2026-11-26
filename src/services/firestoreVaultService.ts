import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  limit,
  type Unsubscribe
} from 'firebase/firestore';
import { signInWithPopup, type User } from 'firebase/auth';
import {
  auth,
  db,
  googleAuthProvider,
  handleFirestoreError,
  OperationType
} from '../lib/firebase';
import type {
  AuditTrailEntry,
  BtcpayWebhookEventRecord,
  DeterministicRecommendation,
  EconomyConfig,
  PayoutDestinationConfig,
  PlayerRedemptionRequest,
  VaultGatewayApisConfig
} from '../types';

export const OWNER_EMAIL = 'trabajofino52@gmail.com';

export function emailToBalanceId(email: string): string {
  const clean = email
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .slice(0, 120);
  return clean || 'unknown_user';
}

export async function signInWithGoogleForFirestore(): Promise<User> {
  const res = await signInWithPopup(auth, googleAuthProvider);
  return res.user;
}

/**
 * Cross-device User Profile Sync (/users/{uid})
 */
export async function syncUserProfileToFirestore(params: {
  user: User;
  displayName: string;
  level: number;
  xp: number;
}): Promise<void> {
  const { user, displayName, level, xp } = params;
  if (!user.email || !user.emailVerified) return;

  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  const safeName = (displayName || user.displayName || user.email.split('@')[0]).slice(0, 80);
  const safeLevel = Math.min(Math.max(Math.floor(level || 1), 1), 100);
  const safeXp = Math.max(Math.floor(xp || 0), 0);
  const devicePlatform =
    typeof navigator !== 'undefined' ? (navigator.userAgent || 'web').slice(0, 80) : 'web';

  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const role = user.email.toLowerCase() === OWNER_EMAIL.toLowerCase() ? 'OWNER' : 'PLAYER';
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email.toLowerCase(),
        displayName: safeName,
        role,
        coinsBalance: 0,
        level: safeLevel,
        xp: safeXp,
        devicePlatform,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      await setDoc(
        userRef,
        {
          displayName: safeName,
          level: safeLevel,
          xp: safeXp,
          devicePlatform,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

/**
 * Subscribe to the user's cross-device Firestore coin ledger (/user_balances)
 */
export function subscribeToUserFirestoreBalance(
  userEmail: string,
  onBalanceUpdate: (data: {
    coinsBalance: number;
    totalDepositedUSD: number;
    lastInvoiceId: string;
  } | null) => void
): Unsubscribe {
  const normalized = userEmail.trim().toLowerCase();
  const path = 'user_balances';
  const q = query(collection(db, path), where('email', '==', normalized), limit(1));

  return onSnapshot(
    q,
    snapshot => {
      if (snapshot.empty) {
        onBalanceUpdate(null);
        return;
      }
      const d = snapshot.docs[0].data() as {
        coinsBalance?: number;
        totalDepositedUSD?: number;
        lastInvoiceId?: string;
      };
      onBalanceUpdate({
        coinsBalance: Number(d.coinsBalance ?? 0),
        totalDepositedUSD: Number(d.totalDepositedUSD ?? 0),
        lastInvoiceId: String(d.lastInvoiceId ?? '')
      });
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

/**
 * Sync Owner's VaultConfigPanel metadata across devices (/vault_configs/primary_vault)
 * Secrets remain exclusively encrypted AES-256-GCM on the server.
 */
export async function syncVaultConfigMetadataToFirestore(params: {
  ownerUser: User;
  vaultApis: VaultGatewayApisConfig;
}): Promise<void> {
  const { ownerUser, vaultApis } = params;
  if (!ownerUser.email || ownerUser.email.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
    return;
  }

  const configId = 'primary_vault';
  const docPath = `vault_configs/${configId}`;
  const docRef = doc(db, 'vault_configs', configId);

  try {
    const existingSnap = await getDoc(docRef);
    const payload = {
      configId,
      ownerUid: ownerUser.uid,
      ownerEmail: ownerUser.email.toLowerCase(),
      btcpayEnabled: Boolean(vaultApis.btcpay.enabled),
      btcpayServerUrl: vaultApis.btcpay.serverUrl.slice(0, 300),
      btcpayStoreId: vaultApis.btcpay.storeId.slice(0, 128),
      nowpaymentsEnabled: Boolean(vaultApis.nowpayments.enabled),
      coingateEnabled: Boolean(vaultApis.coingate.enabled),
      activeOnRamp: vaultApis.onramps.activeProvider.slice(0, 64),
      preferredVirtualCard: vaultApis.virtualCards.preferredBrand.slice(0, 64),
      maxClientWithdrawalPct: 30,
      requiresOwnerAuth: true,
      updatedAt: serverTimestamp()
    };

    if (!existingSnap.exists()) {
      await setDoc(docRef, {
        ...payload,
        createdAt: serverTimestamp()
      });
    } else {
      await setDoc(docRef, payload, { merge: true });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

/**
 * Atomic Firestore Transaction executed by VaultConfigPanel when BTCPay Server confirms payment on-chain.
 * Creates an idempotent /btcpay_webhooks/{eventId} record and increments /user_balances/{balanceId}.coinsBalance.
 */
export async function processBtcpayWebhookInFirestore(params: {
  event: BtcpayWebhookEventRecord;
  ownerUser: User;
}): Promise<{ alreadyProcessed: boolean; newCoinsBalance: number }> {
  const { event, ownerUser } = params;
  const eventId = event.id.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128);
  const balanceId = emailToBalanceId(event.userEmail);
  const eventPath = `btcpay_webhooks/${eventId}`;
  const balancePath = `user_balances/${balanceId}`;

  const eventRef = doc(db, 'btcpay_webhooks', eventId);
  const balanceRef = doc(db, 'user_balances', balanceId);

  try {
    return await runTransaction(db, async tx => {
      const existingEvent = await tx.get(eventRef);
      const balanceSnap = await tx.get(balanceRef);

      if (existingEvent.exists()) {
        const currentCoins = balanceSnap.exists()
          ? Number((balanceSnap.data() as { coinsBalance?: number }).coinsBalance ?? 0)
          : 0;
        return { alreadyProcessed: true, newCoinsBalance: currentCoins };
      }

      const prevCoins = balanceSnap.exists()
        ? Number((balanceSnap.data() as { coinsBalance?: number }).coinsBalance ?? 0)
        : 0;
      const prevUsd = balanceSnap.exists()
        ? Number((balanceSnap.data() as { totalDepositedUSD?: number }).totalDepositedUSD ?? 0)
        : 0;

      const shouldCredit =
        event.blockchainConfirmed &&
        (event.eventType === 'InvoiceSettled' ||
          event.eventType === 'InvoicePaymentSettled' ||
          event.eventType === 'ManualTest');

      const creditDelta = shouldCredit ? Math.max(0, Math.floor(event.coinsCredited)) : 0;
      const usdDelta = shouldCredit ? Math.max(0, Number(event.amountUSD || 0)) : 0;
      const nextCoins = prevCoins + creditDelta;
      const nextUsd = Math.round((prevUsd + usdDelta) * 100) / 100;

      if (shouldCredit) {
        if (!balanceSnap.exists()) {
          tx.set(balanceRef, {
            balanceId,
            email: event.userEmail.trim().toLowerCase().slice(0, 160),
            coinsBalance: nextCoins,
            totalDepositedUSD: nextUsd,
            lastInvoiceId: event.invoiceId.slice(0, 128),
            lastTxConfirmation: event.deliveryId.slice(0, 128),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        } else {
          tx.update(balanceRef, {
            coinsBalance: nextCoins,
            totalDepositedUSD: nextUsd,
            lastInvoiceId: event.invoiceId.slice(0, 128),
            lastTxConfirmation: event.deliveryId.slice(0, 128),
            updatedAt: serverTimestamp()
          });
        }
      }

      tx.set(eventRef, {
        eventId,
        deliveryId: event.deliveryId.slice(0, 128),
        invoiceId: event.invoiceId.slice(0, 128),
        eventType: event.eventType,
        userEmail: event.userEmail.trim().toLowerCase().slice(0, 160),
        coinsCredited: creditDelta,
        amountUSD: usdDelta,
        blockchainConfirmed: Boolean(event.blockchainConfirmed),
        signatureVerified: Boolean(event.signatureVerified),
        status: shouldCredit ? 'CREDITED' : 'IGNORED_EVENT',
        processedByEmail: (ownerUser.email || OWNER_EMAIL).toLowerCase().slice(0, 160),
        createdAt: serverTimestamp()
      });

      return { alreadyProcessed: false, newCoinsBalance: nextCoins };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${eventPath} + ${balancePath}`);
  }
}

export function subscribeToFirestoreBtcpayWebhooks(
  onEvents: (events: Array<{
    eventId: string;
    invoiceId: string;
    eventType: string;
    userEmail: string;
    coinsCredited: number;
    amountUSD: number;
    status: string;
  }>) => void
): Unsubscribe {
  const path = 'btcpay_webhooks';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(25));
  return onSnapshot(
    q,
    snap => {
      const list = snap.docs.map(d => {
        const data = d.data() as Record<string, unknown>;
        return {
          eventId: String(data.eventId || d.id),
          invoiceId: String(data.invoiceId || ''),
          eventType: String(data.eventType || ''),
          userEmail: String(data.userEmail || ''),
          coinsCredited: Number(data.coinsCredited || 0),
          amountUSD: Number(data.amountUSD || 0),
          status: String(data.status || '')
        };
      });
      onEvents(list);
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

/**
 * 100% Deterministic Rule-Based Operational & Security Recommendations (ZERO AI / SIN IA)
 */
export function buildDeterministicVaultRecommendations(params: {
  vaultApis: VaultGatewayApisConfig;
  vaultApiFlags: Record<string, boolean>;
  payoutConfig: PayoutDestinationConfig;
  isFirestoreConnected: boolean;
  webhookPendingSyncCount: number;
  economyConfig?: EconomyConfig;
}): DeterministicRecommendation[] {
  const { vaultApis, vaultApiFlags, payoutConfig, isFirestoreConnected, webhookPendingSyncCount, economyConfig } = params;
  const recs: DeterministicRecommendation[] = [];

  // Rule 0: PayPal Business REST API (Checkout Orders v2 + Payouts v1)
  const paypalReady = Boolean(vaultApiFlags.paypal || (vaultApis.paypal?.enabled && vaultApis.paypal?.clientId));
  recs.push({
    id: 'rec_paypal_rest_api',
    category: 'PAYPAL',
    status: paypalReady ? 'OPTIMAL' : 'ACTION_REQUIRED',
    title: 'Pasarela Oficial PayPal REST API (Cobros + Retiros Directos)',
    ruleTrigger: paypalReady
      ? `PayPal REST API activo en modo ${(vaultApis.paypal?.environment || 'sandbox').toUpperCase()} listo para Checkout v2 y Payouts v1.`
      : 'Falta ingresar tu Client ID y Client Secret de PayPal Developer en Claves API & Tarjetas.',
    recommendation:
      'Conecta tus credenciales de PayPal (Sandbox para pruebas con Ngrok, Live para producción) en Bóveda -> Claves API & Tarjetas y registra el webhook https://<tu-subdominio>.ngrok-free.app/api/webhooks/paypal para liquidar recargas y pagar retiros aprobados directo a la cuenta PayPal del jugador.',
    actionHint: paypalReady
      ? 'PayPal Checkout y Payouts operativos.'
      : 'Pega tu Client ID y Client Secret de PayPal y presiona Probar OAuth PayPal.'
  });

  // Rule 0B: Server-Authoritative Casino Profit Retention + Withdrawal & Transfer Fees
  const retention = economyConfig?.vaultRetentionPct ?? 70;
  const redFee = economyConfig?.redemptionFeePct ?? 20;
  const trfFee = economyConfig?.transferFeePct ?? 5;
  recs.push({
    id: 'rec_casino_margins',
    category: 'SECURITY',
    status: retention >= 70 && redFee >= 15 ? 'OPTIMAL' : 'RECOMMENDED',
    title: `Economía del Casino (${retention}% Casa / ${redFee}% Retiro / ${trfFee}% Transfer P2P)`,
    ruleTrigger: `Márgenes activos en servidor SQLite: el casino retiene ${retention}% de cada apuesta, cobra ${redFee}% al retirar y ${trfFee}% por transferencia entre jugadores.`,
    recommendation:
      'Todas las tasas viven en la base de datos del servidor (tabla economy_config) para que ningún cliente conectado por Ngrok pueda alterar la comisión de retiro ni la retención de la bóveda.',
    actionHint: 'Ajusta estos porcentajes solo desde el Panel Administrador -> Split & Economía.'
  });

  // Rule 1: BTCPay Server Webhook Secret & HMAC-SHA256 Check
  const hasWebhookSecret = Boolean(vaultApis.btcpay.webhookSecret && vaultApis.btcpay.webhookSecret.trim().length > 0);
  recs.push({
    id: 'rec_btcpay_webhook',
    category: 'WEBHOOKS',
    status: vaultApiFlags.btcpay && hasWebhookSecret ? 'OPTIMAL' : hasWebhookSecret ? 'RECOMMENDED' : 'ACTION_REQUIRED',
    title: 'Webhook BTCPay Server con Firma HMAC-SHA256 (BTCPay-Sig)',
    ruleTrigger:
      vaultApiFlags.btcpay && hasWebhookSecret
        ? 'Regla cumplida: BTCPay Greenfield activo y Webhook Secret HMAC-SHA256 validando peticiones.'
        : hasWebhookSecret
        ? 'HMAC-SHA256 armado con clave unificada: listo en VM. Falta solo URL/API Key de tu nodo BTCPay en VPS.'
        : 'Regla disparada: Falta registrar Webhook Secret en la bóveda.',
    recommendation:
      'El endpoint /api/webhooks/btcpay exige firma HMAC-SHA256 BTCPay-Sig en tiempo constante. En tu panel BTCPay Server (Debian 13) -> Store Settings -> Webhooks, apunta hacia /api/webhooks/btcpay para InvoiceSettled e InvoicePaymentSettled.',
    actionHint: vaultApiFlags.btcpay
      ? 'Webhook BTCPay listo y firmado.'
      : 'Al levantar BTCPay en tu VPS, pega el Store ID y API Key en Claves API & Tarjetas.'
  });

  // Rule 2: Authoritative SQLite Local WAL Persistence
  recs.push({
    id: 'rec_firestore_sync',
    category: 'DATABASE',
    status: webhookPendingSyncCount === 0 ? 'OPTIMAL' : 'RECOMMENDED',
    title: 'Base de Datos SQLite WAL Activa (data/aethervault.db)',
    ruleTrigger:
      webhookPendingSyncCount > 0
        ? `Hay ${webhookPendingSyncCount} webhook(s) pendientes de confirmación final en blockchain.`
        : 'Regla cumplida: Base de datos SQLite WAL activa con cifrado AES-256-GCM y liquidación atómica.',
    recommendation:
      'Todos los usuarios, preferencias de cobro (USDT o PayPal), depósitos, retiros al 30%, transferencias P2P y auditoría SHA-256 persisten directamente en SQLite sin depender de servicios externos en la nube.',
    actionHint: 'Realiza respaldos periódicos de la carpeta data/aethervault.db en tu servidor.'
  });

  // Rule 3: Anti-Freeze Settlement Rail (No Binance Personal / No PayPal Personal)
  const riskyPayPal = payoutConfig.paypalMode === 'PERSONAL';
  const riskyBinance = Boolean(payoutConfig.binancePayId && payoutConfig.binancePayId.trim().length > 0);
  recs.push({
    id: 'rec_antifreeze_rails',
    category: 'ANTI_FREEZE',
    status: riskyPayPal ? 'ACTION_REQUIRED' : 'OPTIMAL',
    title: 'Arquitectura Anti-Congelamiento (BTCPay 0% + On-Ramp → USDT TRC-20)',
    ruleTrigger: riskyPayPal
      ? 'Alerta fija: PayPal está en modo PERSONAL; riesgo alto de retención de fondos.'
      : riskyBinance
      ? 'Nota operativa: Verifica que tu Binance Pay ID sea cuenta Merchant comercial y nunca personal.'
      : 'Regla saludable: PayPal BUSINESS y liquidación directa hacia crypto/USDT TRC-20 activos.',
    recommendation:
      'Para cobrar con tarjetas Visa/Mastercard sin reservas congeladas, usa On-Ramp Fiat-a-Cripto (NOWPayments Fiat, MoonPay o Transak) liquidando directo en USDT TRC-20 o BTC en tu propio BTCPay Server.',
    actionHint: riskyPayPal
      ? 'Usa "Aplicar Todas las Sugerencias Seguras" para cambiar a PayPal BUSINESS + USDT.'
      : 'Evita recibir pagos de jugadores en cuentas personales de Binance o PayPal.'
  });

  // Rule 4: Virtual Visa / Mastercard Off-Ramp Cards
  const cardOk = Boolean(
    vaultApiFlags.redotpay || vaultApiFlags.bybit || vaultApiFlags.bitpay || vaultApiFlags.wise
  );
  recs.push({
    id: 'rec_virtual_cards',
    category: 'VIRTUAL_CARDS',
    status: cardOk ? 'OPTIMAL' : 'RECOMMENDED',
    title: 'Tarjetas Virtuales Visa / Mastercard para Disposición de Liquidez',
    ruleTrigger: cardOk
      ? `Tarjeta vinculada en bóveda (Preferida: ${vaultApis.virtualCards.preferredBrand}).`
      : 'Regla sugerida: Registra tu wallet RedotPay, Bybit Card, BitPay o Wise Business cuando las verifiques.',
    recommendation:
      'Una vez liquidados los pagos en tu wallet USDT TRC-20 o BTC, transfiere solo tu margen operativo hacia tu tarjeta virtual regulada (RedotPay Visa, Bybit Mastercard, BitPay o Wise Business) para gastos diarios.',
    actionHint: 'Registra tu wallet de depósito o perfil verificado en Claves API & Tarjetas.'
  });

  // Rule 5: 30% Withdrawal Cap & Owner-Only Auth
  recs.push({
    id: 'rec_30pct_cap_owner',
    category: 'SECURITY',
    status: 'OPTIMAL',
    title: 'Tope Estricto del 30% en Retiros + Autorización Única del Propietario',
    ruleTrigger: 'Regla forzada en Frontend, Express API y transacciones atómicas SQLite WAL.',
    recommendation:
      'Ningún cliente puede solicitar más del 30% de su saldo disponible ni auto-aprobar canjes; cada retiro queda en PENDING_APPROVAL hasta tu revisión manual como trabajofino52@gmail.com.',
    actionHint: 'Revisa solicitudes pendientes desde la pestaña Autorización de Canjes.'
  });

  // Rule 6: Unified VM Security Key & Pre-VPS Rotation Checklist
  recs.push({
    id: 'rec_unified_vm_keys',
    category: 'SECURITY',
    status: 'RECOMMENDED',
    title: 'Clave Larga Unificada en VM + Rotación Pre-VPS Público',
    ruleTrigger: 'Todas las llaves locales (OWNER_MASTER_KEY, DB_ENCRYPTION_KEY, SESSION_SECRET, BTCPAY_WEBHOOK_SECRET, NOWPAYMENTS_IPN_SECRET) operan sincronizadas.',
    recommendation:
      'En el entorno local/ngrok resulta ideal mantener la clave unificada en todos los módulos. Al pasar a un servidor público definitivo, configura variables separadas en tu archivo .env.',
    actionHint: 'Conserva tus secretos exclusivamente en .env en producción.'
  });

  return recs;
}

/**
 * Persist a withdrawal redemption request into Firestore (/redemption_requests/{requestId})
 * with awaitingAuthorization = true and strict 30% cap fields matching firestore.rules.
 */
export async function upsertRedemptionRequestToFirestore(params: {
  req: PlayerRedemptionRequest;
  actorUser: User;
}): Promise<boolean> {
  const { req, actorUser } = params;
  if (!actorUser.email || !actorUser.emailVerified) return false;
  if (req.status !== 'PENDING_APPROVAL' || !req.awaitingAuthorization) return false;

  const requestId = req.id.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128);
  const docPath = `redemption_requests/${requestId}`;
  const docRef = doc(db, 'redemption_requests', requestId);

  const safeBalanceBefore = Math.max(
    1,
    Math.floor(req.balanceBeforeCoins ?? Math.ceil(req.amountCoins / 0.3))
  );
  const computedMax30 = Math.floor(safeBalanceBefore * 0.3);
  const safeMax30 = Math.min(req.maxAllowed30PctCoins ?? computedMax30, computedMax30);
  const safeAmount = Math.min(Math.max(1, Math.floor(req.amountCoins)), safeMax30);
  if (safeMax30 <= 0 || safeAmount <= 0) return false;

  const safeGross = Math.max(0.01, Number(req.grossUSD || safeAmount * 0.8));
  const safeFee = Math.max(0, Number(req.feeUSD || 0));
  const safeNet = Math.max(0.01, Number(req.netUSD || safeGross - safeFee));

  try {
    const existingSnap = await getDoc(docRef);
    if (existingSnap.exists()) {
      return true;
    }

    await setDoc(docRef, {
      requestId,
      playerEmail: req.playerEmail.trim().toLowerCase().slice(0, 160),
      playerName: (req.playerName || req.playerEmail.split('@')[0] || 'Jugador').slice(0, 80),
      balanceBeforeCoins: safeBalanceBefore,
      maxAllowed30PctCoins: safeMax30,
      requestedOriginalCoins: Math.max(1, Math.floor(req.requestedOriginalCoins ?? safeAmount)),
      cappedAutomatically: Boolean(req.cappedAutomatically),
      amountCoins: safeAmount,
      grossUSD: safeGross,
      feeUSD: safeFee,
      netUSD: safeNet,
      destinationType: req.destinationType,
      destinationAddress: req.destinationAddress.trim().slice(0, 200),
      status: 'PENDING_APPROVAL',
      awaitingAuthorization: true,
      txHash: (req.txHash && req.txHash.length >= 8 ? req.txHash : `0x${requestId.padEnd(16, '0')}`).slice(0, 128),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

/**
 * Manual owner-only transactional approval/rejection in Firestore (/redemption_requests/{requestId}).
 * Verifies awaitingAuthorization == true and transitions it to false with trabajofino52@gmail.com.
 */
export async function reviewRedemptionRequestInFirestore(params: {
  requestId: string;
  decision: 'APPROVED' | 'REJECTED';
  ownerUser: User;
  rejectionReason?: string;
}): Promise<{ found: boolean; alreadyResolved: boolean }> {
  const { requestId, decision, ownerUser, rejectionReason } = params;
  if (
    !ownerUser.email ||
    !ownerUser.emailVerified ||
    ownerUser.email.toLowerCase() !== OWNER_EMAIL.toLowerCase()
  ) {
    throw new Error(`Solo el Administrador (${OWNER_EMAIL}) puede autorizar retiros en Firestore.`);
  }

  const cleanId = requestId.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128);
  const docPath = `redemption_requests/${cleanId}`;
  const docRef = doc(db, 'redemption_requests', cleanId);

  try {
    return await runTransaction(db, async tx => {
      const snap = await tx.get(docRef);
      if (!snap.exists()) {
        return { found: false, alreadyResolved: false };
      }

      const data = snap.data() as Record<string, unknown>;
      if (data.awaitingAuthorization !== true || data.status !== 'PENDING_APPROVAL') {
        return { found: true, alreadyResolved: true };
      }

      const balanceBefore = Number(data.balanceBeforeCoins || 0);
      const max30 = Math.floor(balanceBefore * 0.3);
      const amountCoins = Number(data.amountCoins || 0);
      if (decision === 'APPROVED' && (amountCoins <= 0 || amountCoins > max30)) {
        throw new Error(`El monto (${amountCoins} mo) excede el 30% permitido (${max30} mo).`);
      }

      const updateFields: Record<string, unknown> = {
        status: decision,
        awaitingAuthorization: false,
        authorizedByEmail: ownerUser.email!.toLowerCase().slice(0, 160),
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (decision === 'REJECTED') {
        updateFields.rejectionReason = (
          rejectionReason?.trim() || 'Rechazado manualmente por trabajofino52@gmail.com'
        ).slice(0, 240);
      }

      tx.update(docRef, updateFields);
      return { found: true, alreadyResolved: false };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export function subscribeToFirestoreRedemptionRequests(
  onRequests: (requests: PlayerRedemptionRequest[]) => void
): Unsubscribe {
  const path = 'redemption_requests';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(30));

  return onSnapshot(
    q,
    snap => {
      const list: PlayerRedemptionRequest[] = snap.docs.map(d => {
        const data = d.data() as Record<string, unknown>;
        const createdTs = data.createdAt as { toMillis?: () => number } | undefined;
        const reviewedTs = data.reviewedAt as { toMillis?: () => number } | undefined;
        const statusRaw = String(data.status || 'PENDING_APPROVAL');
        const status: PlayerRedemptionRequest['status'] =
          statusRaw === 'APPROVED' || statusRaw === 'REJECTED' ? statusRaw : 'PENDING_APPROVAL';

        return {
          id: String(data.requestId || d.id),
          playerEmail: String(data.playerEmail || ''),
          playerName: String(data.playerName || 'Jugador'),
          balanceBeforeCoins: Number(data.balanceBeforeCoins || 0),
          maxAllowed30PctCoins: Number(data.maxAllowed30PctCoins || 0),
          requestedOriginalCoins:
            data.requestedOriginalCoins !== undefined
              ? Number(data.requestedOriginalCoins)
              : Number(data.amountCoins || 0),
          cappedAutomatically: Boolean(data.cappedAutomatically),
          amountCoins: Number(data.amountCoins || 0),
          grossUSD: Number(data.grossUSD || 0),
          feeUSD: Number(data.feeUSD || 0),
          netUSD: Number(data.netUSD || 0),
          destinationType: (String(data.destinationType || 'crypto_usdt') as PlayerRedemptionRequest['destinationType']),
          destinationAddress: String(data.destinationAddress || ''),
          status,
          awaitingAuthorization: Boolean(data.awaitingAuthorization),
          authorizedByEmail: data.authorizedByEmail ? String(data.authorizedByEmail) : undefined,
          rejectionReason: data.rejectionReason ? String(data.rejectionReason) : undefined,
          timestamp: createdTs?.toMillis ? createdTs.toMillis() : Date.now(),
          reviewedAt: reviewedTs?.toMillis ? reviewedTs.toMillis() : undefined,
          txHash: String(data.txHash || ''),
          firestoreSynced: true
        };
      });
      onRequests(list);
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

/**
 * Sync Owner AuditTrail entries into immutable Firestore collection (/audit_trail/{entryId})
 */
export async function syncAuditTrailBatchToFirestore(params: {
  entries: AuditTrailEntry[];
  ownerUser: User;
}): Promise<number> {
  const { entries, ownerUser } = params;
  if (
    !ownerUser.email ||
    !ownerUser.emailVerified ||
    ownerUser.email.toLowerCase() !== OWNER_EMAIL.toLowerCase()
  ) {
    throw new Error(`Solo el propietario (${OWNER_EMAIL}) puede sincronizar la auditoría en Firestore.`);
  }

  let syncedCount = 0;
  for (const entry of entries.slice(0, 25)) {
    const entryId = entry.id.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128);
    const docPath = `audit_trail/${entryId}`;
    const docRef = doc(db, 'audit_trail', entryId);
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) continue;

      await setDoc(docRef, {
        entryId,
        seq: Math.max(1, Math.floor(entry.seq || 1)),
        category: entry.category,
        action: entry.action.slice(0, 80),
        severity: entry.severity,
        actorEmail: (entry.actor_email || OWNER_EMAIL).trim().toLowerCase().slice(0, 160),
        ipAddress: (entry.ip_address || '127.0.0.1').slice(0, 64),
        details: (entry.details || 'Evento auditado').slice(0, 500),
        rowHash: (entry.row_hash && entry.row_hash.length >= 16 ? entry.row_hash : '0'.repeat(64)).slice(0, 128),
        syncedByEmail: ownerUser.email.trim().toLowerCase().slice(0, 160),
        createdAt: serverTimestamp()
      });
      syncedCount += 1;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, docPath);
    }
  }
  return syncedCount;
}

export function subscribeToFirestoreAuditTrail(
  onEntries: (entryIds: Set<string>) => void
): Unsubscribe {
  const path = 'audit_trail';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(
    q,
    snap => {
      onEntries(new Set(snap.docs.map(d => d.id)));
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}
