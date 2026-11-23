import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGame, OWNER_EMAIL } from '../context/GameContext';
import { soundFx } from '../utils/audio';
import {
  signInWithGoogleForFirestore,
  syncVaultConfigMetadataToFirestore,
  processBtcpayWebhookInFirestore,
  subscribeToFirestoreBtcpayWebhooks,
  buildDeterministicVaultRecommendations
} from '../services/firestoreVaultService';
import {
  BtcpayWebhookEventRecord,
  CardGatewayProvider,
  OnRampProvider,
  PrimarySettlementRail,
  VaultGatewayApisConfig,
  VirtualCardBrand
} from '../types';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Cloud,
  CloudOff,
  Coins,
  Copy,
  CreditCard,
  Database,
  KeyRound,
  ListChecks,
  Lock,
  Play,
  QrCode,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Wallet,
  Webhook,
  Zap
} from 'lucide-react';

export const VaultConfigPanel: React.FC = () => {
  const {
    isOwner,
    userEmail,
    authToken,
    firebaseUser,
    firestoreSyncedBalance,
    loginOwnerWithKey,
    payoutConfig,
    updatePayoutConfig,
    refreshPayoutConfigFromServer,
    vaultRetentionRate,
    redemptionFeeRate,
    transferFeeRate,
    addNotification
  } = useGame();

  const [masterKeyInput, setMasterKeyInput] = useState('');
  const [vaultSection, setVaultSection] = useState<
    'apis' | 'withdraw_accounts' | 'webhooks_firestore' | 'recommendations_no_ai'
  >('apis');

  // --- Encrypted Gateway APIs State (PayPal, BTCPay, NOWPayments, CoinGate, On-Ramps, Virtual Cards) ---
  const [vaultApis, setVaultApis] = useState<VaultGatewayApisConfig>({
    btcpay: { enabled: false, serverUrl: '', storeId: '', apiKey: '', webhookSecret: '' },
    nowpayments: { enabled: false, apiKey: '', ipnSecret: '', sandbox: true },
    coingate: { enabled: false, apiToken: '', environment: 'sandbox' },
    paypal: {
      enabled: false,
      environment: 'sandbox',
      clientId: '',
      clientSecret: '',
      webhookId: '',
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
  });
  const [vaultApiFlags, setVaultApiFlags] = useState<Record<string, boolean>>({});
  const [isLoadingVaultApis, setIsLoadingVaultApis] = useState(false);
  const [isSavingVaultApis, setIsSavingVaultApis] = useState(false);
  const [testingGateway, setTestingGateway] = useState<'btcpay' | 'nowpayments' | 'coingate' | 'paypal' | null>(null);
  const [vaultFeedback, setVaultFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [copiedPaypalWebhook, setCopiedPaypalWebhook] = useState(false);

  // --- Encrypted Withdrawal / Settlement Accounts State (USDT / BTC / PayPal / IBAN) ---
  const [trc20, setTrc20] = useState(payoutConfig.usdtTrc20Address);
  const [erc20, setErc20] = useState(payoutConfig.usdtErc20Address);
  const [bep20, setBep20] = useState(payoutConfig.usdtBep20Address || payoutConfig.usdtErc20Address);
  const [btcAddress, setBtcAddress] = useState(
    payoutConfig.btcAddress || 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'
  );
  const [binancePayId, setBinancePayId] = useState(payoutConfig.binancePayId || '');
  const [autoConvertToUsdt, setAutoConvertToUsdt] = useState(payoutConfig.autoConvertToUsdt ?? true);
  const [paypal, setPaypal] = useState(payoutConfig.paypalEmail);
  const [paypalMode, setPaypalMode] = useState<'BUSINESS' | 'PERSONAL'>(payoutConfig.paypalMode || 'BUSINESS');
  const [cardGatewayProvider, setCardGatewayProvider] = useState<CardGatewayProvider>(
    payoutConfig.cardGatewayProvider || 'NOWPAYMENTS_CARD_TO_CRYPTO'
  );
  const [primarySettlementRail, setPrimarySettlementRail] = useState<PrimarySettlementRail>(
    payoutConfig.primarySettlementRail || 'USDT'
  );
  const [vmTestModeEnabled, setVmTestModeEnabled] = useState<boolean>(payoutConfig.vmTestModeEnabled ?? true);
  const [iban, setIban] = useState(payoutConfig.bankIbanSwift);
  const [holder, setHolder] = useState(payoutConfig.bankAccountHolder);
  const [merchant, setMerchant] = useState(payoutConfig.merchantName);
  const [isSavingWithdrawAccounts, setIsSavingWithdrawAccounts] = useState(false);
  const [withdrawAccountsSaved, setWithdrawAccountsSaved] = useState(false);

  // --- BTCPay Server Webhooks -> Firestore Atomic Sync State ---
  const [webhookEvents, setWebhookEvents] = useState<BtcpayWebhookEventRecord[]>([]);
  const [firestoreWebhooks, setFirestoreWebhooks] = useState<
    Array<{
      eventId: string;
      invoiceId: string;
      eventType: string;
      userEmail: string;
      coinsCredited: number;
      amountUSD: number;
      status: string;
    }>
  >([]);
  const [isLoadingWebhooks, setIsLoadingWebhooks] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [isSimulatingWebhook, setIsSimulatingWebhook] = useState(false);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);
  const [simEmail, setSimEmail] = useState('tester01@vm.aethervault.local');
  const [simCoins, setSimCoins] = useState('100');
  const [simUsd, setSimUsd] = useState('80');
  const [simEventType, setSimEventType] = useState<'InvoiceSettled' | 'InvoicePaymentSettled' | 'InvoiceProcessing' | 'ManualTest'>('InvoiceSettled');
  const [simFeedback, setSimFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [isApplyingRecs, setIsApplyingRecs] = useState(false);
  const [recFeedback, setRecFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const syncingEventIdsRef = useRef<Set<string>>(new Set());

  const isVerifiedAdminGoogle = Boolean(
    firebaseUser?.emailVerified && firebaseUser.email?.toLowerCase() === OWNER_EMAIL.toLowerCase()
  );

  // Sync local withdrawal form when global payoutConfig updates from server
  useEffect(() => {
    setTrc20(payoutConfig.usdtTrc20Address);
    setErc20(payoutConfig.usdtErc20Address);
    setBep20(payoutConfig.usdtBep20Address || payoutConfig.usdtErc20Address);
    setBtcAddress(payoutConfig.btcAddress || 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh');
    setBinancePayId(payoutConfig.binancePayId || '');
    setAutoConvertToUsdt(payoutConfig.autoConvertToUsdt ?? true);
    setPaypal(payoutConfig.paypalEmail);
    setPaypalMode(payoutConfig.paypalMode || 'BUSINESS');
    setCardGatewayProvider(payoutConfig.cardGatewayProvider || 'NOWPAYMENTS_CARD_TO_CRYPTO');
    setPrimarySettlementRail(payoutConfig.primarySettlementRail || 'USDT');
    setVmTestModeEnabled(payoutConfig.vmTestModeEnabled ?? true);
    setIban(payoutConfig.bankIbanSwift);
    setHolder(payoutConfig.bankAccountHolder);
    setMerchant(payoutConfig.merchantName);
  }, [payoutConfig]);

  const fetchVaultApis = useCallback(async () => {
    if (!authToken) return;
    setIsLoadingVaultApis(true);
    try {
      const res = await fetch('/api/admin/vault-apis', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = (await res.json()) as {
          config?: VaultGatewayApisConfig;
          configuredFlags?: Record<string, boolean>;
        };
        if (data.config) setVaultApis(data.config);
        if (data.configuredFlags) setVaultApiFlags(data.configuredFlags);
      }
    } catch {
      // ignore network error cleanly
    } finally {
      setIsLoadingVaultApis(false);
    }
  }, [authToken]);

  const fetchBtcpayWebhooks = useCallback(async () => {
    if (!authToken) return;
    setIsLoadingWebhooks(true);
    try {
      const res = await fetch('/api/admin/btcpay/webhooks', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = (await res.json()) as { events?: BtcpayWebhookEventRecord[] };
        if (Array.isArray(data.events)) {
          setWebhookEvents(data.events);
        }
      }
    } catch {
      // ignore network error
    } finally {
      setIsLoadingWebhooks(false);
    }
  }, [authToken]);

  useEffect(() => {
    if (isOwner && authToken) {
      fetchVaultApis();
      fetchBtcpayWebhooks();
    }
  }, [isOwner, authToken, fetchVaultApis, fetchBtcpayWebhooks]);

  useEffect(() => {
    if (!isVerifiedAdminGoogle) {
      setFirestoreWebhooks([]);
      return;
    }
    const unsub = subscribeToFirestoreBtcpayWebhooks(events => {
      setFirestoreWebhooks(events);
    });
    return () => unsub();
  }, [isVerifiedAdminGoogle]);

  const syncSingleWebhookToFirestore = useCallback(
    async (ev: BtcpayWebhookEventRecord) => {
      if (!isVerifiedAdminGoogle || !firebaseUser || !authToken) return;
      if (syncingEventIdsRef.current.has(ev.id)) return;
      syncingEventIdsRef.current.add(ev.id);

      try {
        const txResult = await processBtcpayWebhookInFirestore({
          event: ev,
          ownerUser: firebaseUser
        });

        await fetch(`/api/admin/btcpay/webhooks/${encodeURIComponent(ev.id)}/ack-firestore`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` }
        });

        setWebhookEvents(prev =>
          prev.map(item =>
            item.id === ev.id
              ? { ...item, firestoreSynced: true, firestoreSyncedAt: Date.now() }
              : item
          )
        );

        if (!txResult.alreadyProcessed && ev.coinsCredited > 0) {
          addNotification(
            'Firestore Actualizado por Webhook BTCPay',
            `Confirmación blockchain reflejada en Firestore para ${ev.userEmail}: +${ev.coinsCredited} monedas (Saldo Firestore: ${txResult.newCoinsBalance}).`,
            'success',
            ev.coinsCredited
          );
        }
      } catch (err) {
        setSimFeedback({
          ok: false,
          message: `Error sincronizando webhook ${ev.invoiceId} en Firestore: ${
            err instanceof Error ? err.message : 'verifica permisos de Google Admin'
          }`
        });
      } finally {
        syncingEventIdsRef.current.delete(ev.id);
      }
    },
    [isVerifiedAdminGoogle, firebaseUser, authToken, addNotification]
  );

  // Automatically process confirmed BTCPay webhooks into Firestore once Google Owner session is connected
  useEffect(() => {
    if (!isVerifiedAdminGoogle || !firebaseUser || !authToken) return;
    const pending = webhookEvents.filter(e => e.blockchainConfirmed && !e.firestoreSynced);
    if (pending.length === 0) return;

    for (const ev of pending) {
      void syncSingleWebhookToFirestore(ev);
    }
  }, [isVerifiedAdminGoogle, firebaseUser, authToken, webhookEvents, syncSingleWebhookToFirestore]);

  const handleConnectGoogleFirestore = async () => {
    setIsConnectingGoogle(true);
    setSimFeedback(null);
    try {
      const user = await signInWithGoogleForFirestore();
      if (user.email?.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
        setSimFeedback({
          ok: false,
          message: `Iniciaste sesión como ${user.email}. Solo ${OWNER_EMAIL} tiene permisos de escritura administrativa en Firestore.`
        });
      } else {
        soundFx.playBiometricSuccess();
        setSimFeedback({
          ok: true,
          message: `Google Firestore conectado como ${user.email}. Sincronización multidispositivo y webhooks blockchain activos.`
        });
        void syncVaultConfigMetadataToFirestore({ ownerUser: user, vaultApis }).catch(() => {});
      }
    } catch (err) {
      setSimFeedback({
        ok: false,
        message: `No se pudo completar el acceso Google: ${err instanceof Error ? err.message : 'cancelado'}`
      });
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const handleSimulateBtcpayWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    setIsSimulatingWebhook(true);
    setSimFeedback(null);
    try {
      const coinsNum = Math.max(1, Number(simCoins) || 100);
      const usdNum = Math.max(1, Number(simUsd) || Math.round(coinsNum * 0.8 * 100) / 100);
      const res = await fetch('/api/admin/btcpay/webhooks/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          userEmail: simEmail.trim(),
          coinsAmount: coinsNum,
          amountUSD: usdNum,
          eventType: simEventType
        })
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        event?: BtcpayWebhookEventRecord;
        hmacHeaderPreview?: string;
        error?: string;
      };
      if (res.ok && data.event) {
        soundFx.playCoinChime();
        setSimFeedback({
          ok: true,
          message: `${data.message} (${data.hmacHeaderPreview || 'HMAC-SHA256 OK'})`
        });
        await fetchBtcpayWebhooks();
      } else {
        setSimFeedback({ ok: false, message: data.error || 'No se pudo procesar la simulación de webhook.' });
      }
    } catch {
      setSimFeedback({ ok: false, message: 'Error de red ejecutando /api/admin/btcpay/webhooks/simulate.' });
    } finally {
      setIsSimulatingWebhook(false);
    }
  };

  const handleApplyAllRecommendations = async () => {
    if (!authToken) return;
    setIsApplyingRecs(true);
    setRecFeedback(null);
    try {
      const res = await fetch('/api/admin/vault/apply-recommendations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      const data = (await res.json()) as {
        ok?: boolean;
        apis?: { config?: VaultGatewayApisConfig; configuredFlags?: Record<string, boolean> };
        message?: string;
        error?: string;
      };
      if (res.ok && data.ok) {
        if (data.apis?.config) setVaultApis(data.apis.config);
        if (data.apis?.configuredFlags) setVaultApiFlags(data.apis.configuredFlags);
        await refreshPayoutConfigFromServer();
        if (isVerifiedAdminGoogle && firebaseUser) {
          void syncVaultConfigMetadataToFirestore({
            ownerUser: firebaseUser,
            vaultApis: data.apis?.config || vaultApis
          }).catch(() => {});
        }
        soundFx.playBiometricSuccess();
        setRecFeedback({
          ok: true,
          message:
            data.message ||
            'Todas las sugerencias seguras y la clave unificada en HMAC/Bóveda fueron aplicadas correctamente.'
        });
        addNotification(
          'Sugerencias Aplicadas',
          'Configuración anti-congelamiento, Webhook HMAC unificado y límite 30% verificados.',
          'success'
        );
      } else {
        setRecFeedback({ ok: false, message: data.error || 'No se pudieron aplicar las sugerencias.' });
      }
    } catch {
      setRecFeedback({ ok: false, message: 'Error de red aplicando recomendaciones seguras.' });
    } finally {
      setIsApplyingRecs(false);
    }
  };

  const handleSaveVaultApis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    setIsSavingVaultApis(true);
    setVaultFeedback(null);
    try {
      const res = await fetch('/api/admin/vault-apis', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(vaultApis)
      });
      const data = (await res.json()) as {
        ok?: boolean;
        config?: VaultGatewayApisConfig;
        configuredFlags?: Record<string, boolean>;
        error?: string;
      };
      if (res.ok && data.ok) {
        if (data.config) setVaultApis(data.config);
        if (data.configuredFlags) setVaultApiFlags(data.configuredFlags);
        await refreshPayoutConfigFromServer();
        if (isVerifiedAdminGoogle && firebaseUser) {
          void syncVaultConfigMetadataToFirestore({
            ownerUser: firebaseUser,
            vaultApis: data.config || vaultApis
          }).catch(() => {});
        }
        soundFx.playBiometricSuccess();
        setVaultFeedback({
          ok: true,
          message:
            'Credenciales de BTCPay, NOWPayments, CoinGate, On-Ramps y Tarjetas Virtuales cifradas con AES-256-GCM y guardadas en bóveda.'
        });
        addNotification(
          'VaultConfigPanel Actualizado',
          'Claves API encriptadas con AES-256-GCM en la bóveda del servidor.',
          'success'
        );
      } else {
        setVaultFeedback({ ok: false, message: data.error || 'Error guardando APIs en bóveda.' });
      }
    } catch {
      setVaultFeedback({ ok: false, message: 'No se pudo conectar con el servidor de bóveda.' });
    } finally {
      setIsSavingVaultApis(false);
    }
  };

  const handleTestGatewayApi = async (target: 'btcpay' | 'nowpayments' | 'coingate' | 'paypal') => {
    if (!authToken) return;
    setTestingGateway(target);
    setVaultFeedback(null);
    try {
      const res = await fetch('/api/admin/vault-apis/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ target })
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      setVaultFeedback({
        ok: Boolean(data.ok),
        message: data.message || (data.ok ? 'Conexión verificada correctamente.' : 'Error probando la pasarela.')
      });
      if (data.ok) soundFx.playCoinChime();
    } catch {
      setVaultFeedback({ ok: false, message: 'Error de red probando la conexión de la pasarela.' });
    } finally {
      setTestingGateway(null);
    }
  };

  const handleSaveWithdrawAccounts = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingWithdrawAccounts(true);
    try {
      await updatePayoutConfig({
        usdtTrc20Address: trc20.trim(),
        usdtErc20Address: erc20.trim(),
        usdtBep20Address: bep20.trim(),
        btcAddress: btcAddress.trim(),
        binancePayId: binancePayId.trim(),
        autoConvertToUsdt,
        paypalEmail: paypal.trim(),
        paypalMode,
        cardGatewayProvider,
        primarySettlementRail,
        vmTestModeEnabled,
        maxVmTesters: 10,
        bankIbanSwift: iban.trim(),
        bankAccountHolder: holder.trim(),
        merchantName: merchant.trim()
      });
      setWithdrawAccountsSaved(true);
      soundFx.playBiometricSuccess();
      addNotification(
        'Cuentas de Retiro Cifradas',
        'Tus direcciones USDT, BTC, PayPal e IBAN quedaron guardadas con cifrado AES-256-GCM.',
        'success'
      );
      setTimeout(() => setWithdrawAccountsSaved(false), 3000);
    } finally {
      setIsSavingWithdrawAccounts(false);
    }
  };

  // Exclusive Owner Guard
  const isStrictlyOwner = isOwner && userEmail.toLowerCase() === OWNER_EMAIL.toLowerCase();
  if (!isStrictlyOwner) {
    return (
      <div className="p-8 rounded-3xl bg-slate-950 border border-rose-500/40 text-center space-y-3 shadow-2xl">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-400">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-extrabold text-rose-200 font-display">
          Acceso Exclusivo del Propietario — VaultConfigPanel
        </h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Este módulo administrativo está bloqueado criptográficamente y solo puede ser abierto por la cuenta maestra{' '}
          <span className="text-amber-300 font-mono">{OWNER_EMAIL}</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Security Rules Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-amber-500/35 space-y-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-slate-100 font-display flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                VaultConfigPanel — Bóveda Maestra Cifrada
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                AES-256-GCM + Salt E2EE
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                <Database className="w-3 h-3" />
                SQLite + PostgreSQL + Firestore
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border flex items-center gap-1 ${
                  isVerifiedAdminGoogle
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {isVerifiedAdminGoogle ? <Cloud className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
                {isVerifiedAdminGoogle ? 'Firestore Sync Activo' : 'Firestore Pendiente Auth'}
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              Panel exclusivo para <strong className="text-amber-300">{OWNER_EMAIL}</strong>. Administra de forma cifrada las claves API de{' '}
              <strong>BTCPay Server</strong>, webhooks de confirmación blockchain hacia <strong>Firestore</strong>,{' '}
              <strong>NOWPayments</strong>, <strong>CoinGate</strong>, cuentas <strong>USDT / BTC / PayPal / IBAN</strong> y reglas fijas sin IA.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setVaultSection('apis')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                vaultSection === 'apis'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>Claves API & Tarjetas</span>
            </button>
            <button
              type="button"
              onClick={() => setVaultSection('withdraw_accounts')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                vaultSection === 'withdraw_accounts'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Cuentas de Retiro</span>
            </button>
            <button
              type="button"
              onClick={() => setVaultSection('webhooks_firestore')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                vaultSection === 'webhooks_firestore'
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              <Webhook className="w-3.5 h-3.5" />
              <span>Webhooks BTCPay → Firestore</span>
              {webhookEvents.some(e => e.blockchainConfirmed && !e.firestoreSynced) && (
                <span className="px-1.5 py-0.2 rounded bg-rose-500 text-white text-[10px]">
                  {webhookEvents.filter(e => e.blockchainConfirmed && !e.firestoreSynced).length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setVaultSection('recommendations_no_ai')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                vaultSection === 'recommendations_no_ai'
                  ? 'bg-indigo-500 text-white border-indigo-400 shadow'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              <ListChecks className="w-3.5 h-3.5" />
              <span>Recomendaciones (Sin IA)</span>
            </button>
            {authToken && vaultSection === 'apis' && (
              <button
                type="button"
                onClick={fetchVaultApis}
                disabled={isLoadingVaultApis}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingVaultApis ? 'animate-spin' : ''}`} />
                <span>Recargar</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Security Policy Strip: 30% Withdrawal Cap & Owner-Only Authorization */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-950 to-amber-950/30 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-emerald-300 font-semibold">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>
              Regla de Retiros Activa en Servidor & PostgreSQL: Clientes limitados a un máximo del{' '}
              <strong className="text-amber-300">30% de su saldo</strong> +{' '}
              <strong className="text-cyan-300">autorización obligatoria</strong> de {OWNER_EMAIL}.
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 shrink-0">
            TRIGGER + RLS ENFORCED
          </span>
        </div>

        {!authToken ? (
          <div className="p-6 rounded-2xl bg-slate-950/90 border border-amber-500/40 space-y-4">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-amber-300">Desbloqueo Criptográfico de Bóveda Requerido</h3>
                <p className="text-xs text-slate-400">
                  Valida tu Clave Maestra de Propietario ({OWNER_EMAIL}) para descifrar y editar APIs, cuentas USDT/BTC/PayPal y tarjetas virtuales.
                </p>
              </div>
            </div>
            <form
              onSubmit={async e => {
                e.preventDefault();
                if (!masterKeyInput.trim()) return;
                const ok = await loginOwnerWithKey(masterKeyInput.trim());
                if (ok) setMasterKeyInput('');
              }}
              className="flex flex-col sm:flex-row gap-2 max-w-xl"
            >
              <input
                type="password"
                value={masterKeyInput}
                onChange={e => setMasterKeyInput(e.target.value)}
                placeholder="Ingresa la Clave Maestra del Propietario..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-amber-400 font-mono"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition"
              >
                Desbloquear Bóveda
              </button>
            </form>
          </div>
        ) : vaultSection === 'apis' ? (
          <form onSubmit={handleSaveVaultApis} className="space-y-6">
            {vaultFeedback && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                  vaultFeedback.ok
                    ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                    : 'bg-amber-950/50 border-amber-500/40 text-amber-200'
                }`}
              >
                {vaultFeedback.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <span>{vaultFeedback.message}</span>
              </div>
            )}

            {/* 0. PayPal Business REST API (Checkout Orders v2 + Payouts Directos) */}
            <div className="p-5 rounded-2xl bg-slate-950/85 border border-blue-500/35 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-bold text-slate-100">
                    PayPal REST API Oficial (Recargas Checkout v2 + Pagos de Retiros Payouts v1)
                  </h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      vaultApiFlags.paypal
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-900 text-slate-400 border-slate-700'
                    }`}
                  >
                    {vaultApiFlags.paypal ? 'CONECTADA' : 'Pendiente Client ID/Secret'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setVaultApis(v => ({ ...v, paypal: { ...v.paypal, enabled: !v.paypal.enabled } }))
                    }
                    className={`px-3 py-1 rounded-lg text-[11px] font-black border ${
                      vaultApis.paypal.enabled
                        ? 'bg-blue-500 text-slate-950 border-blue-400'
                        : 'bg-slate-900 text-slate-400 border-slate-700'
                    }`}
                  >
                    {vaultApis.paypal.enabled ? 'ACTIVO' : 'INACTIVO'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestGatewayApi('paypal')}
                    disabled={testingGateway === 'paypal'}
                    className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 text-[11px] font-bold border border-slate-700"
                  >
                    {testingGateway === 'paypal' ? 'Probando OAuth...' : 'Probar OAuth PayPal'}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Entorno PayPal</label>
                  <select
                    value={vaultApis.paypal.environment}
                    onChange={e =>
                      setVaultApis(v => ({
                        ...v,
                        paypal: { ...v.paypal, environment: e.target.value === 'live' ? 'live' : 'sandbox' }
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 font-bold"
                  >
                    <option value="sandbox">Sandbox (Pruebas Ngrok / Local)</option>
                    <option value="live">Live (Producción Real)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">PayPal Client ID</label>
                  <input
                    type="text"
                    value={vaultApis.paypal.clientId}
                    onChange={e =>
                      setVaultApis(v => ({ ...v, paypal: { ...v.paypal, clientId: e.target.value } }))
                    }
                    placeholder="AZDxjDScFpQtjWTOUtWK..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">PayPal Client Secret (Cifrado)</label>
                  <input
                    type="password"
                    value={vaultApis.paypal.clientSecret}
                    onChange={e =>
                      setVaultApis(v => ({ ...v, paypal: { ...v.paypal, clientSecret: e.target.value } }))
                    }
                    placeholder="Pega tu Client Secret de PayPal..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">PayPal Webhook ID (Opcional Ngrok)</label>
                  <input
                    type="password"
                    value={vaultApis.paypal.webhookId}
                    onChange={e =>
                      setVaultApis(v => ({ ...v, paypal: { ...v.paypal, webhookId: e.target.value } }))
                    }
                    placeholder="Ej. 8PT597110X687430L..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Correo PayPal Merchant / Bóveda</label>
                  <input
                    type="email"
                    value={vaultApis.paypal.merchantEmail}
                    onChange={e =>
                      setVaultApis(v => ({ ...v, paypal: { ...v.paypal, merchantEmail: e.target.value } }))
                    }
                    placeholder="cobros@tuempresa.com"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">URL Webhook para PayPal Developer (Ngrok)</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/paypal`}
                      className="flex-1 px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-cyan-300 font-mono text-[11px]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${window.location.origin}/api/webhooks/paypal`;
                        void navigator.clipboard?.writeText(url);
                        setCopiedPaypalWebhook(true);
                        setTimeout(() => setCopiedPaypalWebhook(false), 2000);
                      }}
                      className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold"
                    >
                      {copiedPaypalWebhook ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 1. BTCPay Server */}
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-emerald-500/30 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-slate-100">BTCPay Server (VPS Debian 13 — 0% Comisión, Sin KYC)</h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      vaultApiFlags.btcpay
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-900 text-slate-400 border-slate-700'
                    }`}
                  >
                    {vaultApiFlags.btcpay ? 'CONFIGURADA' : 'Pendiente'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setVaultApis(v => ({ ...v, btcpay: { ...v.btcpay, enabled: !v.btcpay.enabled } }))
                    }
                    className={`px-3 py-1 rounded-lg text-[11px] font-black border ${
                      vaultApis.btcpay.enabled
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-900 text-slate-400 border-slate-700'
                    }`}
                  >
                    {vaultApis.btcpay.enabled ? 'ACTIVO' : 'INACTIVO'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestGatewayApi('btcpay')}
                    disabled={testingGateway === 'btcpay'}
                    className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-bold border border-slate-700"
                  >
                    {testingGateway === 'btcpay' ? 'Probando...' : 'Probar Conexión'}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">URL de tu BTCPay Server</label>
                  <input
                    type="url"
                    value={vaultApis.btcpay.serverUrl}
                    onChange={e =>
                      setVaultApis(v => ({ ...v, btcpay: { ...v.btcpay, serverUrl: e.target.value } }))
                    }
                    placeholder="https://btcpay.tudominio.com"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Store ID (BTCPay Greenfield)</label>
                  <input
                    type="text"
                    value={vaultApis.btcpay.storeId}
                    onChange={e =>
                      setVaultApis(v => ({ ...v, btcpay: { ...v.btcpay, storeId: e.target.value } }))
                    }
                    placeholder="Ej. 8xK9p..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">API Key Greenfield (Permiso Crear Facturas)</label>
                  <input
                    type="password"
                    value={vaultApis.btcpay.apiKey}
                    onChange={e =>
                      setVaultApis(v => ({ ...v, btcpay: { ...v.btcpay, apiKey: e.target.value } }))
                    }
                    placeholder="Pega tu API Key de BTCPay..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Webhook Secret (Opcional IPN)</label>
                  <input
                    type="password"
                    value={vaultApis.btcpay.webhookSecret}
                    onChange={e =>
                      setVaultApis(v => ({ ...v, btcpay: { ...v.btcpay, webhookSecret: e.target.value } }))
                    }
                    placeholder="Secreto Webhook BTCPay..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>
            </div>

            {/* 2. NOWPayments & CoinGate */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-cyan-500/30 space-y-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-bold text-slate-100">NOWPayments (Crypto & Fiat-to-Crypto)</h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        vaultApiFlags.nowpayments
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-900 text-slate-400 border-slate-700'
                      }`}
                    >
                      {vaultApiFlags.nowpayments ? 'CONFIGURADA' : 'Pendiente'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setVaultApis(v => ({
                          ...v,
                          nowpayments: { ...v.nowpayments, enabled: !v.nowpayments.enabled }
                        }))
                      }
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${
                        vaultApis.nowpayments.enabled
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                          : 'bg-slate-900 text-slate-400 border-slate-700'
                      }`}
                    >
                      {vaultApis.nowpayments.enabled ? 'ON' : 'OFF'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTestGatewayApi('nowpayments')}
                      disabled={testingGateway === 'nowpayments'}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-bold border border-slate-700"
                    >
                      {testingGateway === 'nowpayments' ? '...' : 'Probar'}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">API Key NOWPayments</label>
                  <input
                    type="password"
                    value={vaultApis.nowpayments.apiKey}
                    onChange={e =>
                      setVaultApis(v => ({
                        ...v,
                        nowpayments: { ...v.nowpayments, apiKey: e.target.value }
                      }))
                    }
                    placeholder="Pega tu x-api-key de NOWPayments..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-medium">IPN Secret</label>
                    <input
                      type="password"
                      value={vaultApis.nowpayments.ipnSecret}
                      onChange={e =>
                        setVaultApis(v => ({
                          ...v,
                          nowpayments: { ...v.nowpayments, ipnSecret: e.target.value }
                        }))
                      }
                      placeholder="IPN Secret..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-medium">Modo Entorno</label>
                    <select
                      value={vaultApis.nowpayments.sandbox ? 'sandbox' : 'live'}
                      onChange={e =>
                        setVaultApis(v => ({
                          ...v,
                          nowpayments: { ...v.nowpayments, sandbox: e.target.value === 'sandbox' }
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 font-bold"
                    >
                      <option value="sandbox">Sandbox (Pruebas VM)</option>
                      <option value="live">Producción (Live)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950/80 border border-indigo-500/30 space-y-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-bold text-slate-100">CoinGate (Crypto Checkout Directo)</h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        vaultApiFlags.coingate
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-900 text-slate-400 border-slate-700'
                      }`}
                    >
                      {vaultApiFlags.coingate ? 'CONFIGURADA' : 'Pendiente'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setVaultApis(v => ({
                          ...v,
                          coingate: { ...v.coingate, enabled: !v.coingate.enabled }
                        }))
                      }
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${
                        vaultApis.coingate.enabled
                          ? 'bg-indigo-500 text-white border-indigo-400'
                          : 'bg-slate-900 text-slate-400 border-slate-700'
                      }`}
                    >
                      {vaultApis.coingate.enabled ? 'ON' : 'OFF'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTestGatewayApi('coingate')}
                      disabled={testingGateway === 'coingate'}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[10px] font-bold border border-slate-700"
                    >
                      {testingGateway === 'coingate' ? '...' : 'Probar'}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">API Auth Token CoinGate</label>
                  <input
                    type="password"
                    value={vaultApis.coingate.apiToken}
                    onChange={e =>
                      setVaultApis(v => ({
                        ...v,
                        coingate: { ...v.coingate, apiToken: e.target.value }
                      }))
                    }
                    placeholder="Pega tu CoinGate API Token..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Entorno CoinGate</label>
                  <select
                    value={vaultApis.coingate.environment}
                    onChange={e =>
                      setVaultApis(v => ({
                        ...v,
                        coingate: {
                          ...v.coingate,
                          environment: e.target.value === 'live' ? 'live' : 'sandbox'
                        }
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 font-bold"
                  >
                    <option value="sandbox">Sandbox (api-sandbox.coingate.com)</option>
                    <option value="live">Producción (api.coingate.com)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 3. Card -> Crypto On-Ramps */}
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-amber-500/30 space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    On-Ramps Tarjeta Débito/Crédito (Visa / Mastercard → Liquidación USDT/BTC)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    El cliente paga con tarjeta Visa/MC y el procesador liquida automáticamente en USDT TRC-20/ERC-20 o BTC sin reservas congeladas.
                  </p>
                </div>
                <select
                  value={vaultApis.onramps.activeProvider}
                  onChange={e =>
                    setVaultApis(v => ({
                      ...v,
                      onramps: { ...v.onramps, activeProvider: e.target.value as OnRampProvider }
                    }))
                  }
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-amber-500/40 text-amber-300 font-bold"
                >
                  <option value="NOWPAYMENTS_FIAT">NOWPayments Fiat-to-Crypto</option>
                  <option value="MOONPAY">MoonPay (HMAC Firmado)</option>
                  <option value="TRANSAK">Transak Widget</option>
                  <option value="BANXA">Banxa On-Ramp</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="font-bold text-slate-100 flex items-center justify-between">
                    <span>MoonPay</span>
                    <span className="text-[10px] text-emerald-400">{vaultApiFlags.moonpay ? 'OK' : 'Opcional'}</span>
                  </div>
                  <input
                    type="text"
                    value={vaultApis.onramps.moonpayPublicKey}
                    onChange={e =>
                      setVaultApis(v => ({
                        ...v,
                        onramps: { ...v.onramps, moonpayPublicKey: e.target.value }
                      }))
                    }
                    placeholder="MoonPay Public Key (pk_live_...)"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono text-[11px]"
                  />
                  <input
                    type="password"
                    value={vaultApis.onramps.moonpaySecretKey}
                    onChange={e =>
                      setVaultApis(v => ({
                        ...v,
                        onramps: { ...v.onramps, moonpaySecretKey: e.target.value }
                      }))
                    }
                    placeholder="MoonPay Secret Key (HMAC)"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono text-[11px]"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="font-bold text-slate-100 flex items-center justify-between">
                    <span>Transak</span>
                    <span className="text-[10px] text-emerald-400">{vaultApiFlags.transak ? 'OK' : 'Opcional'}</span>
                  </div>
                  <input
                    type="password"
                    value={vaultApis.onramps.transakApiKey}
                    onChange={e =>
                      setVaultApis(v => ({
                        ...v,
                        onramps: { ...v.onramps, transakApiKey: e.target.value }
                      }))
                    }
                    placeholder="Transak API Key"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono text-[11px]"
                  />
                  <select
                    value={vaultApis.onramps.transakEnvironment}
                    onChange={e =>
                      setVaultApis(v => ({
                        ...v,
                        onramps: {
                          ...v.onramps,
                          transakEnvironment: e.target.value === 'PRODUCTION' ? 'PRODUCTION' : 'STAGING'
                        }
                      }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-[11px] font-bold"
                  >
                    <option value="STAGING">STAGING (Pruebas)</option>
                    <option value="PRODUCTION">PRODUCTION (Real)</option>
                  </select>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="font-bold text-slate-100 flex items-center justify-between">
                    <span>Banxa</span>
                    <span className="text-[10px] text-emerald-400">{vaultApiFlags.banxa ? 'OK' : 'Opcional'}</span>
                  </div>
                  <input
                    type="text"
                    value={vaultApis.onramps.banxaDomain}
                    onChange={e =>
                      setVaultApis(v => ({
                        ...v,
                        onramps: { ...v.onramps, banxaDomain: e.target.value }
                      }))
                    }
                    placeholder="Subdominio Banxa (tuapp.banxa.com)"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono text-[11px]"
                  />
                  <input
                    type="password"
                    value={vaultApis.onramps.banxaApiKey}
                    onChange={e =>
                      setVaultApis(v => ({
                        ...v,
                        onramps: { ...v.onramps, banxaApiKey: e.target.value }
                      }))
                    }
                    placeholder="Banxa API Key"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono text-[11px]"
                  />
                </div>
              </div>
            </div>

            {/* 4. Virtual Visa / Mastercard Accounts */}
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-purple-500/30 space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-purple-300 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Cuentas & APIs de Tarjetas Virtuales Visa / Mastercard (Off-Ramp)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Vincula tus cuentas verificadas de <strong>RedotPay</strong>, <strong>Bybit Card</strong>, <strong>BitPay Card</strong> o{' '}
                    <strong>Wise Business</strong> para disponer del saldo liquidado en USDT/BTC.
                  </p>
                </div>
                <select
                  value={vaultApis.virtualCards.preferredBrand}
                  onChange={e =>
                    setVaultApis(v => ({
                      ...v,
                      virtualCards: { ...v.virtualCards, preferredBrand: e.target.value as VirtualCardBrand }
                    }))
                  }
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-purple-500/40 text-purple-200 font-bold"
                >
                  <option value="REDOTPAY">Preferida: RedotPay Visa</option>
                  <option value="BYBIT">Preferida: Bybit Card Mastercard</option>
                  <option value="BITPAY">Preferida: BitPay Card</option>
                  <option value="WISE">Preferida: Wise Business Visa</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100">RedotPay (Tarjeta Virtual Visa)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-emerald-300">
                      {vaultApiFlags.redotpay ? 'Vinculada' : 'Sin configurar'}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={vaultApis.virtualCards.redotpayAccountId}
                    onChange={e =>
                      setVaultApis(v => ({
                        ...v,
                        virtualCards: { ...v.virtualCards, redotpayAccountId: e.target.value }
                      }))
                    }
                    placeholder="ID Cuenta / Correo RedotPay"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono text-[11px]"
                  />
                  <input
                    type="text"
                    value={vaultApis.virtualCards.redotpayDepositWallet}
                    onChange={e =>
                      setVaultApis(v => ({
                        ...v,
                        virtualCards: { ...v.virtualCards, redotpayDepositWallet: e.target.value }
                      }))
                    }
                    placeholder="Wallet de Depósito USDT RedotPay (TRC20/ERC20)"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono text-[11px]"
                  />
                  <input
                    type="password"
                    value={vaultApis.virtualCards.redotpayApiKey}
                    onChange={e =>
                      setVaultApis(v => ({
                        ...v,
                        virtualCards: { ...v.virtualCards, redotpayApiKey: e.target.value }
                      }))
                    }
                    placeholder="API Key / Token RedotPay (Opcional)"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono text-[11px]"
                  />
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100">Bybit Card (Virtual Mastercard)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-emerald-300">
                      {vaultApiFlags.bybit ? 'Vinculada' : 'Sin configurar'}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={vaultApis.virtualCards.bybitUid}
                    onChange={e =>
                      setVaultApis(v => ({
                        ...v,
                        virtualCards: { ...v.virtualCards, bybitUid: e.target.value }
                      }))
                    }
                    placeholder="Bybit UID"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono text-[11px]"
                  />
                  <input
                    type="text"
                    value={vaultApis.virtualCards.bybitDepositAddress}
                    onChange={e =>
                      setVaultApis(v => ({
                        ...v,
                        virtualCards: { ...v.virtualCards, bybitDepositAddress: e.target.value }
                      }))
                    }
                    placeholder="Dirección de Depósito USDT Funding Bybit"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono text-[11px]"
                  />
                  <input
                    type="password"
                    value={vaultApis.virtualCards.bybitApiKey}
                    onChange={e =>
                      setVaultApis(v => ({
                        ...v,
                        virtualCards: { ...v.virtualCards, bybitApiKey: e.target.value }
                      }))
                    }
                    placeholder="Bybit API Key (Solo lectura / balance)"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono text-[11px]"
                  />
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100">BitPay Card & Merchant</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-emerald-300">
                      {vaultApiFlags.bitpay ? 'Vinculada' : 'Sin configurar'}
                    </span>
                  </div>
                  <input
                    type="email"
                    value={vaultApis.virtualCards.bitpayPayoutEmail}
                    onChange={e =>
                      setVaultApis(v => ({
                        ...v,
                        virtualCards: { ...v.virtualCards, bitpayPayoutEmail: e.target.value }
                      }))
                    }
                    placeholder="Correo de Cuenta BitPay"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono text-[11px]"
                  />
                  <input
                    type="password"
                    value={vaultApis.virtualCards.bitpayMerchantToken}
                    onChange={e =>
                      setVaultApis(v => ({
                        ...v,
                        virtualCards: { ...v.virtualCards, bitpayMerchantToken: e.target.value }
                      }))
                    }
                    placeholder="BitPay Merchant Pairing / API Token"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono text-[11px]"
                  />
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100">Wise Business (Tarjeta Virtual Multi-Divisa)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-emerald-300">
                      {vaultApiFlags.wise ? 'Vinculada' : 'Sin configurar'}
                    </span>
                  </div>
                  <input
                    type="email"
                    value={vaultApis.virtualCards.wiseBusinessEmail}
                    onChange={e =>
                      setVaultApis(v => ({
                        ...v,
                        virtualCards: { ...v.virtualCards, wiseBusinessEmail: e.target.value }
                      }))
                    }
                    placeholder="Correo Wise Business"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono text-[11px]"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={vaultApis.virtualCards.wiseProfileId}
                      onChange={e =>
                        setVaultApis(v => ({
                          ...v,
                          virtualCards: { ...v.virtualCards, wiseProfileId: e.target.value }
                        }))
                      }
                      placeholder="Profile ID"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono text-[11px]"
                    />
                    <input
                      type="text"
                      value={vaultApis.virtualCards.wiseIbanOrRouting}
                      onChange={e =>
                        setVaultApis(v => ({
                          ...v,
                          virtualCards: { ...v.virtualCards, wiseIbanOrRouting: e.target.value }
                        }))
                      }
                      placeholder="IBAN / ACH Routing"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono text-[11px]"
                    />
                  </div>
                  <input
                    type="password"
                    value={vaultApis.virtualCards.wiseApiToken}
                    onChange={e =>
                      setVaultApis(v => ({
                        ...v,
                        virtualCards: { ...v.virtualCards, wiseApiToken: e.target.value }
                      }))
                    }
                    placeholder="Wise Personal/Business API Token"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono text-[11px]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSavingVaultApis}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 transition active:scale-95 disabled:opacity-60"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>
                  {isSavingVaultApis ? 'Cifrando con AES-256-GCM...' : 'Guardar APIs & Tarjetas en Bóveda Cifrada'}
                </span>
              </button>
            </div>
          </form>
        ) : vaultSection === 'withdraw_accounts' ? (
          /* SECTION B: WITHDRAWAL & SETTLEMENT ACCOUNTS (USDT / BTC / PAYPAL / IBAN) */
          <form onSubmit={handleSaveWithdrawAccounts} className="space-y-6">
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Enrutamiento Automático de Recargas & Ganancias a Cuenta USDT
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Todas las compras de monedas se registran contablemente hacia tu destino cripto principal con cifrado AES-256-GCM.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAutoConvertToUsdt(v => !v)}
                className={`px-4 py-2 rounded-xl text-xs font-black border transition shrink-0 ${
                  autoConvertToUsdt
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-950 text-slate-400 border-slate-700'
                }`}
              >
                {autoConvertToUsdt ? 'AUTO-USDT: ACTIVO' : 'AUTO-USDT: PAUSADO'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4" />
                  Cuentas de Retiro Cripto (USDT / Bitcoin BTC)
                </h3>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">Canal Principal de Liquidación</label>
                  <select
                    value={primarySettlementRail}
                    onChange={e => setPrimarySettlementRail(e.target.value as PrimarySettlementRail)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-amber-300 font-bold text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="USDT">USDT Directo (TRC-20 / BEP-20 / ERC-20)</option>
                    <option value="BTC">Bitcoin (BTC Native SegWit)</option>
                    <option value="PAYPAL_BUSINESS">PayPal Business</option>
                    <option value="BANK_WIRE">Transferencia Bancaria IBAN / SWIFT</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">Wallet USDT (Red TRC-20 Tron)</label>
                  <input
                    type="text"
                    value={trc20}
                    onChange={e => setTrc20(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs focus:outline-none focus:border-amber-500"
                    placeholder="TRX..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">Wallet USDT / USDC (Red ERC-20 Ethereum)</label>
                  <input
                    type="text"
                    value={erc20}
                    onChange={e => setErc20(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs focus:outline-none focus:border-amber-500"
                    placeholder="0x..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">Wallet USDT (Red BEP-20 BNB Smart Chain)</label>
                  <input
                    type="text"
                    value={bep20}
                    onChange={e => setBep20(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs focus:outline-none focus:border-amber-500"
                    placeholder="0x..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">Dirección Bitcoin (BTC Native SegWit)</label>
                  <input
                    type="text"
                    value={btcAddress}
                    onChange={e => setBtcAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-amber-200 font-mono text-xs focus:outline-none focus:border-amber-500"
                    placeholder="bc1q..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">Binance Pay Merchant ID (Opcional)</label>
                  <input
                    type="text"
                    value={binancePayId}
                    onChange={e => setBinancePayId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs focus:outline-none focus:border-amber-500"
                    placeholder="Solo Merchant ID comercial"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  PayPal, Pasarela de Tarjetas & Banco
                </h3>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">Pasarela de Tarjeta Débito / Crédito</label>
                  <select
                    value={cardGatewayProvider}
                    onChange={e => setCardGatewayProvider(e.target.value as CardGatewayProvider)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 font-bold text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value="NOWPAYMENTS_CARD_TO_CRYPTO">NOWPayments / Banxa (Tarjeta Visa/MC → USDT/BTC directo)</option>
                    <option value="BTCPAY_SERVER">BTCPay Server (VPS Debian 13, 0% comisión)</option>
                    <option value="MOONPAY_ONRAMP">MoonPay / Transak (On-Ramp Fiat → Wallet)</option>
                    <option value="PAYPAL_BUSINESS">PayPal Business Checkout</option>
                    <option value="STRIPE_DIGITAL">Stripe Merchant</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs text-slate-300 font-medium">Correo PayPal de Retiro</label>
                    <input
                      type="email"
                      value={paypal}
                      onChange={e => setPaypal(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500"
                      placeholder="pagos@tuempresa.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300 font-medium">Tipo Cuenta</label>
                    <select
                      value={paypalMode}
                      onChange={e => setPaypalMode(e.target.value as 'BUSINESS' | 'PERSONAL')}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-300 font-bold text-xs focus:outline-none focus:border-cyan-500"
                    >
                      <option value="BUSINESS">Business</option>
                      <option value="PERSONAL">Personal</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">Nombre del Comerciante / Bóveda</label>
                  <input
                    type="text"
                    value={merchant}
                    onChange={e => setMerchant(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">IBAN Bancario & SWIFT/BIC</label>
                  <input
                    type="text"
                    value={iban}
                    onChange={e => setIban(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">Titular de la Cuenta</label>
                  <input
                    type="text"
                    value={holder}
                    onChange={e => setHolder(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-cyan-300">Modo Pruebas Virtual (Máx. 10 Testers)</div>
                    <div className="text-[11px] text-slate-400">Habilita tester01..tester10 y bitácora QA continua</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVmTestModeEnabled(v => !v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black border shrink-0 ${
                      vmTestModeEnabled
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                        : 'bg-slate-950 text-slate-400 border-slate-700'
                    }`}
                  >
                    {vmTestModeEnabled ? 'VM QA: ON (10)' : 'VM QA: OFF'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSavingWithdrawAccounts}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 transition active:scale-95 disabled:opacity-60"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {withdrawAccountsSaved
                    ? '¡Cuentas Guardadas y Cifradas!'
                    : isSavingWithdrawAccounts
                    ? 'Cifrando en Servidor...'
                    : 'Guardar Cuentas de Retiro (AES-256-GCM)'}
                </span>
              </button>
            </div>
          </form>
        ) : vaultSection === 'webhooks_firestore' ? (
          /* SECTION C: BTCPAY SERVER WEBHOOK HANDLER & FIRESTORE CROSS-DEVICE SYNC */
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-slate-950/90 border border-cyan-500/35 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                    <Webhook className="w-4 h-4" />
                    Endpoint Receptor de Webhooks BTCPay Server (HMAC-SHA256 BTCPay-Sig)
                  </h3>
                  <p className="text-xs text-slate-400 max-w-2xl">
                    Configura esta URL en tu BTCPay Server (Debian 13) para procesar los eventos{' '}
                    <code className="text-emerald-300">InvoiceSettled</code> e{' '}
                    <code className="text-emerald-300">InvoicePaymentSettled</code> tras confirmación en la cadena de bloques y reflejar los saldos automáticamente en Firestore multidispositivo.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleConnectGoogleFirestore}
                    disabled={isConnectingGoogle}
                    className={`px-4 py-2 rounded-xl text-xs font-black border flex items-center gap-1.5 transition ${
                      isVerifiedAdminGoogle
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                        : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 border-cyan-400 shadow'
                    }`}
                  >
                    {isVerifiedAdminGoogle ? <Cloud className="w-3.5 h-3.5" /> : <CloudOff className="w-3.5 h-3.5" />}
                    <span>
                      {isConnectingGoogle
                        ? 'Conectando Google...'
                        : isVerifiedAdminGoogle
                        ? `Google Conectado (${firebaseUser?.email})`
                        : 'Conectar Google / Firestore'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={fetchBtcpayWebhooks}
                    disabled={isLoadingWebhooks}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingWebhooks ? 'animate-spin' : ''}`} />
                    <span>Actualizar Cola</span>
                  </button>
                </div>
              </div>

              {/* Copyable Webhook URL & Strict HMAC Badge */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="space-y-1">
                  <div className="font-mono text-emerald-300 break-all">
                    POST {typeof window !== 'undefined' ? window.location.origin : 'https://tudominio.com'}/api/webhooks/btcpay
                  </div>
                  <div className="text-[11px] text-cyan-300/90 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>
                      Validación HMAC-SHA256 (<code>BTCPay-Sig</code>) activa y pre-armada con la clave unificada de bóveda.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/api/webhooks/btcpay`;
                    void navigator.clipboard?.writeText(url);
                    setCopiedWebhookUrl(true);
                    setTimeout(() => setCopiedWebhookUrl(false), 2000);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-[11px] flex items-center gap-1.5 shrink-0"
                >
                  {copiedWebhookUrl ? <ClipboardCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedWebhookUrl ? 'URL Copiada' : 'Copiar URL Webhook'}</span>
                </button>
              </div>

              {firestoreSyncedBalance !== null && (
                <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center justify-between">
                  <span>Saldo sincronizado en Firestore para tu sesión Google actual:</span>
                  <strong className="font-mono text-sm">{firestoreSyncedBalance.toLocaleString()} monedas</strong>
                </div>
              )}

              {simFeedback && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    simFeedback.ok
                      ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-950/50 border-rose-500/40 text-rose-200'
                  }`}
                >
                  {simFeedback.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                  <span>{simFeedback.message}</span>
                </div>
              )}
            </div>

            {/* Signed Webhook Simulator for VM / Pre-VPS Testing */}
            <form
              onSubmit={handleSimulateBtcpayWebhook}
              className="p-5 rounded-2xl bg-slate-950/80 border border-amber-500/30 space-y-4 text-xs"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h4 className="font-bold text-amber-300 flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  Simulador de Webhook BTCPay Firmado (HMAC-SHA256 → SQLite → Transacción Firestore)
                </h4>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
                  Idempotente por deliveryId
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Correo del Jugador / Tester VM</label>
                  <input
                    type="text"
                    value={simEmail}
                    onChange={e => setSimEmail(e.target.value)}
                    placeholder="tester01@vm.aethervault.local"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Monedas a Acreditar</label>
                  <input
                    type="number"
                    min={1}
                    value={simCoins}
                    onChange={e => setSimCoins(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Monto USD Liquidado</label>
                  <input
                    type="number"
                    min={1}
                    step="0.01"
                    value={simUsd}
                    onChange={e => setSimUsd(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Tipo de Evento BTCPay</label>
                  <select
                    value={simEventType}
                    onChange={e =>
                      setSimEventType(
                        e.target.value as 'InvoiceSettled' | 'InvoicePaymentSettled' | 'InvoiceProcessing' | 'ManualTest'
                      )
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-cyan-300 font-bold"
                  >
                    <option value="InvoiceSettled">InvoiceSettled (Confirmado On-Chain)</option>
                    <option value="InvoicePaymentSettled">InvoicePaymentSettled (Liquidado)</option>
                    <option value="InvoiceProcessing">InvoiceProcessing (Pendiente 0 conf)</option>
                    <option value="ManualTest">ManualTest (Prueba de flujo)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSimulatingWebhook}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black uppercase tracking-wider text-xs flex items-center gap-2 transition active:scale-95 disabled:opacity-60"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>
                    {isSimulatingWebhook ? 'Procesando Webhook...' : 'Disparar Webhook Firmado y Sincronizar'}
                  </span>
                </button>
              </div>
            </form>

            {/* Backend Webhook Queue + Firestore Transaction Ledger */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Cola de Webhooks Recibidos (Backend + HMAC)
                  </h4>
                  <span className="text-[11px] font-mono text-slate-400">{webhookEvents.length} eventos</span>
                </div>
                {webhookEvents.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">
                    No hay webhooks recibidos aún. Dispara una prueba arriba o envía un POST desde tu nodo BTCPay.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {webhookEvents.map(ev => (
                      <div
                        key={ev.id}
                        className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono font-bold text-cyan-300">{ev.eventType}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                              {ev.invoiceId}
                            </span>
                            {ev.signatureVerified && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                HMAC OK
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {ev.userEmail} · <strong className="text-amber-300">+{ev.coinsCredited} mo</strong> (${ev.amountUSD.toFixed(2)} USD)
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {ev.firestoreSynced ? (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                              Firestore OK
                            </span>
                          ) : ev.blockchainConfirmed ? (
                            <button
                              type="button"
                              disabled={!isVerifiedAdminGoogle}
                              onClick={() => void syncSingleWebhookToFirestore(ev)}
                              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-[10px] transition"
                            >
                              {isVerifiedAdminGoogle ? 'Acreditar en Firestore' : 'Conecta Google'}
                            </button>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 text-[10px]">
                              Sin confirmación final
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                    Auditoría Firestore En Tiempo Real (/btcpay_webhooks)
                  </h4>
                  <span className="text-[11px] font-mono text-slate-400">
                    {isVerifiedAdminGoogle ? `${firestoreWebhooks.length} confirmados` : 'Google requerido'}
                  </span>
                </div>
                {!isVerifiedAdminGoogle ? (
                  <div className="py-6 text-center space-y-2">
                    <p className="text-xs text-slate-400">
                      Conecta tu cuenta Google (<strong className="text-amber-300">{OWNER_EMAIL}</strong>) arriba para visualizar el libro mayor en tiempo real y ejecutar transacciones atómicas en Firestore.
                    </p>
                  </div>
                ) : firestoreWebhooks.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">
                    Colección <code>/btcpay_webhooks</code> lista y escuchando confirmaciones on-chain.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {firestoreWebhooks.map(fw => (
                      <div
                        key={fw.eventId}
                        className="p-3 rounded-xl bg-slate-900/90 border border-emerald-500/20 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="font-mono text-emerald-300 font-bold truncate">
                            {fw.invoiceId} · {fw.eventType}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {fw.userEmail} · +{fw.coinsCredited} mo (${fw.amountUSD.toFixed(2)} USD)
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold shrink-0">
                          {fw.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* SECTION D: DETERMINISTIC NON-AI RECOMMENDATIONS */
          <div className="space-y-5">
            <div className="p-5 rounded-2xl bg-indigo-950/30 border border-indigo-500/35 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-indigo-200 flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-indigo-400" />
                  Recomendaciones Operativas y de Seguridad (100% Sin IA — Motor de Reglas Fijas)
                </h3>
                <p className="text-xs text-slate-400">
                  Evaluación determinista basada directamente en el estado actual de tus claves cifradas, estado de Firestore, canales anti-congelamiento y límites del 30%.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <span className="px-3 py-1.5 rounded-lg bg-slate-900 border border-indigo-500/40 text-indigo-300 text-[10px] font-mono font-bold">
                  SIN LLM / SIN IA · DETERMINISTA
                </span>
                <button
                  type="button"
                  disabled={isApplyingRecs}
                  onClick={() => void handleApplyAllRecommendations()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow flex items-center gap-1.5 transition active:scale-95 disabled:opacity-60"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isApplyingRecs ? 'Aplicando...' : 'Aplicar Todas las Sugerencias'}</span>
                </button>
              </div>
            </div>

            {recFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  recFeedback.ok
                    ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/50 border-rose-500/40 text-rose-200'
                }`}
              >
                {recFeedback.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{recFeedback.message}</span>
              </div>
            )}

            {/* Unified Security Key Summary (VM -> VPS Rotation Guide) */}
            <div className="p-4 rounded-2xl bg-slate-950/90 border border-amber-500/35 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="font-bold text-amber-300 flex items-center gap-2">
                  <KeyRound className="w-4 h-4" />
                  Clave Maestra Unificada Activa para VM / Pruebas Locales
                </div>
                <p className="text-slate-400">
                  Aplicada de forma unificada en <strong className="text-slate-200">OWNER_MASTER_KEY</strong>,{' '}
                  <strong className="text-slate-200">DB_ENCRYPTION_KEY (AES-256-GCM)</strong>,{' '}
                  <strong className="text-slate-200">SESSION_SECRET (HMAC-SHA256)</strong>,{' '}
                  <strong className="text-slate-200">BTCPAY_WEBHOOK_SECRET</strong>,{' '}
                  <strong className="text-slate-200">NOWPAYMENTS_IPN_SECRET</strong> y credenciales locales de{' '}
                  <strong className="text-slate-200">PostgreSQL 17</strong>. Al instalar en tu VPS público con{' '}
                  <code className="text-cyan-300">--vps-prod</code> podrás rotar cada llave por separado.
                </p>
              </div>
              <span className="px-3 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono text-[10px] font-bold shrink-0">
                UNIFICADA EN VM · ROTAR EN VPS
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {buildDeterministicVaultRecommendations({
                vaultApis,
                vaultApiFlags,
                payoutConfig,
                isFirestoreConnected: isVerifiedAdminGoogle,
                webhookPendingSyncCount: webhookEvents.filter(e => e.blockchainConfirmed && !e.firestoreSynced).length,
                economyConfig: {
                  vaultRetentionPct: vaultRetentionRate,
                  redemptionFeePct: redemptionFeeRate,
                  transferFeePct: transferFeeRate,
                  maxWithdrawalRatioPct: 30,
                  updatedAt: Date.now(),
                  updatedBy: OWNER_EMAIL
                }
              }).map(rec => (
                <div
                  key={rec.id}
                  className={`p-4 rounded-2xl bg-slate-950/90 border space-y-2.5 text-xs ${
                    rec.status === 'OPTIMAL'
                      ? 'border-emerald-500/35'
                      : rec.status === 'ACTION_REQUIRED'
                      ? 'border-amber-500/45'
                      : 'border-cyan-500/35'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                      {rec.category}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        rec.status === 'OPTIMAL'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                          : rec.status === 'ACTION_REQUIRED'
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                          : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
                      }`}
                    >
                      {rec.status === 'OPTIMAL'
                        ? 'ÓPTIMO'
                        : rec.status === 'ACTION_REQUIRED'
                        ? 'ACCIÓN REQUERIDA'
                        : 'RECOMENDADO'}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-100 text-sm">{rec.title}</h4>
                  <div className="text-[11px] font-mono text-amber-300/90">{rec.ruleTrigger}</div>
                  <p className="text-slate-300 leading-relaxed">{rec.recommendation}</p>
                  <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-cyan-300 font-medium">
                      Paso siguiente: {rec.actionHint}
                    </span>
                    {rec.id === 'rec_firestore_sync' && !isVerifiedAdminGoogle && (
                      <button
                        type="button"
                        onClick={() => void handleConnectGoogleFirestore()}
                        className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[10px] transition"
                      >
                        Conectar Google
                      </button>
                    )}
                    {(rec.id === 'rec_btcpay_webhook' || rec.id === 'rec_virtual_cards' || rec.id === 'rec_paypal_rest_api') && (
                      <button
                        type="button"
                        onClick={() => setVaultSection('apis')}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-[10px] transition"
                      >
                        Abrir APIs & Tarjetas
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
