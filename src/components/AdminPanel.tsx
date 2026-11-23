import React, { useState, useEffect, useCallback } from 'react';
import { useGame, OWNER_EMAIL } from '../context/GameContext';
import {
  Wallet,
  DollarSign,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Coins,
  Settings,
  CreditCard,
  QrCode,
  CheckCircle2,
  Lock,
  Download,
  RefreshCw,
  Copy,
  ExternalLink,
  Sliders,
  History,
  TrendingUp,
  AlertCircle,
  Users,
  Server,
  Activity,
  Check,
  X,
  PieChart,
  Cpu,
  HardDrive,
  Radio,
  Clock,
  Sparkles,
  Gift,
  Flame,
  PlusCircle,
  MinusCircle,
  Send,
  Zap,
  Award,
  LifeBuoy,
  MessageSquare,
  Search,
  RotateCcw,
  Database,
  KeyRound,
  ShieldAlert,
  FileText,
  Mail
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import {
  CoinGiftRecord,
  HappyHourGameSection,
  HappyHourTargetGroup,
  TicketStatus,
  CoinPurchaseOrder,
  VmExperienceLog,
  VmTesterSlot,
  CardGatewayProvider,
  PrimarySettlementRail
} from '../types';
import { VaultConfigPanel } from './VaultConfigPanel';
import { AuditTrail } from './AuditTrail';
import {
  initGmailAuth,
  signInWithGoogleForGmail,
  getGmailAccessToken,
  logoutGmail,
  sendSummaryViaGmailApi
} from '../utils/gmailAuth';

export const AdminPanel: React.FC = () => {
  const {
    payoutConfig,
    updatePayoutConfig,
    adminWithdrawals,
    executeAdminWithdrawal,
    grossRevenueUSD,
    withdrawnUSD,
    availableBalanceUSD,
    totalCoinsSold,
    transactions,
    addNotification,
    redemptionRequests,
    redeemableUsers,
    refreshRedemptionsFromServer,
    validateAndCreateAdminRedemption,
    syncRedemptionToFirestore,
    approveRedemptionRequest,
    rejectRedemptionRequest,
    vaultEconomics,
    vaultRetentionRate,
    playerPrizeRate,
    redemptionFeeRate,
    transferFeeRate,
    updateVaultMargins,
    provablyFairHistory,
    serverMetrics,
    playerSessions,
    totalPlayersCount,
    onlinePlayersCount,
    offlinePlayersCount,
    userEmail,
    authToken,
    firebaseUser,
    loginOwnerWithKey,
    isOwner,
    coins,
    coinGifts,
    sendCoinsGift,
    adminAdjustUserCoins,
    happyHourCampaign,
    updateHappyHourCampaign,
    toggleHappyHour,
    supportTickets,
    replyToTicket,
    resolveSupportTicket,
    updateSupportTicketStatus
  } = useGame();

  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'currency_control'
    | 'happy_hour'
    | 'redemptions'
    | 'support_tickets'
    | 'vm_qa_logs'
    | 'security_hardening'
    | 'vault_split'
    | 'server_telemetry'
    | 'destinations'
    | 'vault_apis'
    | 'executive_summary'
    | 'withdraw'
    | 'audit'
    | 'audit_trail'
  >('redemptions');

  // Server & Database Security Hardening State
  const [securityStatus, setSecurityStatus] = useState<{
    hardening: Record<string, string>;
    integrity: {
      sqliteOk: boolean;
      chainValid: boolean;
      checkedRows: number;
      lockedAccountsCount: number;
      dbSizeKB: number;
    };
    rateStats: {
      activeBuckets: number;
      blockedRequestsCount: number;
      wafBlockedCount?: number;
      csrfBlockedCount?: number;
    };
    vulnerabilityScan?: {
      scorePercent: number;
      environmentMode: 'VM_SANDBOX' | 'VPS_PRODUCTION';
      checks: Array<{ id: string; name: string; status: 'PASS' | 'WARN'; detail: string }>;
    };
    auditLogs: Array<{
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
    }>;
  } | null>(null);
  const [isLoadingSecurity, setIsLoadingSecurity] = useState(false);
  const [isVerifyingIntegrity, setIsVerifyingIntegrity] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [serverMasterKeyInput, setServerMasterKeyInput] = useState('');

  // USDT Purchase Orders Ledger State
  const [usdtOrders, setUsdtOrders] = useState<CoinPurchaseOrder[]>([]);
  const [isLoadingUsdtOrders, setIsLoadingUsdtOrders] = useState(false);

  // VM QA Experience Logs & 10 Testers State
  const [vmLogs, setVmLogs] = useState<VmExperienceLog[]>([]);
  const [vmTesters, setVmTesters] = useState<VmTesterSlot[]>([]);
  const [vmLogsSummary, setVmLogsSummary] = useState<{
    maxVmTesters: number;
    activeTestersCount: number;
    totalLogs: number;
    errorsCount: number;
    bugReportsCount: number;
  }>({ maxVmTesters: 10, activeTestersCount: 10, totalLogs: 0, errorsCount: 0, bugReportsCount: 0 });
  const [vmLogSeverityFilter, setVmLogSeverityFilter] = useState<'ALL' | 'ERROR' | 'BUG_REPORT' | 'WARN' | 'INFO'>('ALL');
  const [isLoadingVmLogs, setIsLoadingVmLogs] = useState(false);

  // Executive Summary & Full Conversation History State
  const [fullSummary, setFullSummary] = useState<{
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
  } | null>(null);
  const [isLoadingFullSummary, setIsLoadingFullSummary] = useState(false);

  // Gmail Client-Side Delivery State (In-Memory Token Only)
  const [gmailUserEmail, setGmailUserEmail] = useState<string | null>(null);
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [isConnectingGmail, setIsConnectingGmail] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showGmailConfirmModal, setShowGmailConfirmModal] = useState(false);
  const [gmailSendFeedback, setGmailSendFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  const fetchUsdtOrders = useCallback(async () => {
    if (!authToken) return;
    setIsLoadingUsdtOrders(true);
    try {
      const res = await fetch('/api/admin/usdt-orders', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = (await res.json()) as { orders?: CoinPurchaseOrder[] };
        setUsdtOrders(data.orders || []);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingUsdtOrders(false);
    }
  }, [authToken]);

  const handleReviewUsdtOrder = async (orderId: string, decision: 'VERIFIED_SETTLED' | 'REJECTED') => {
    if (!authToken) return;
    try {
      const res = await fetch(`/api/admin/usdt-orders/${encodeURIComponent(orderId)}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ decision })
      });
      if (res.ok) {
        const data = (await res.json()) as { orders?: CoinPurchaseOrder[] };
        if (data.orders) setUsdtOrders(data.orders);
        soundFx.playCoinChime();
        addNotification(
          decision === 'VERIFIED_SETTLED' ? 'Orden USDT Aprobada' : 'Orden USDT Rechazada',
          `La orden #${orderId.slice(-6)} ha sido actualizada en la bóveda USDT.`,
          decision === 'VERIFIED_SETTLED' ? 'success' : 'info'
        );
      }
    } catch {
      // ignore
    }
  };

  const fetchSecurityStatus = useCallback(async () => {
    if (!authToken) return;
    setIsLoadingSecurity(true);
    setSecurityError(null);
    try {
      const res = await fetch('/api/admin/security-status', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setSecurityError(err.error || 'No se pudo consultar el estado de seguridad del servidor.');
      } else {
        const data = await res.json();
        setSecurityStatus(data);
      }
    } catch {
      setSecurityError('Error de conexión con el motor de seguridad del servidor.');
    } finally {
      setIsLoadingSecurity(false);
    }
  }, [authToken]);

  const fetchVmExperienceLogs = useCallback(async () => {
    if (!authToken) return;
    setIsLoadingVmLogs(true);
    try {
      const qs = new URLSearchParams({ severity: vmLogSeverityFilter, limit: '200' });
      const res = await fetch(`/api/admin/experience-logs?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = (await res.json()) as {
          logs?: VmExperienceLog[];
          testers?: VmTesterSlot[];
          summary?: typeof vmLogsSummary;
        };
        setVmLogs(data.logs || []);
        setVmTesters(data.testers || []);
        if (data.summary) setVmLogsSummary(data.summary);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingVmLogs(false);
    }
  }, [authToken, vmLogSeverityFilter]);

  const handleResetVmTester = async (email: string) => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/admin/vm-testers/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ email, coinsBalance: 6250, isActive: true })
      });
      if (res.ok) {
        const data = (await res.json()) as { testers?: VmTesterSlot[] };
        if (data.testers) setVmTesters(data.testers);
        soundFx.playCoinChime();
        addNotification('Tester VM Reiniciado', `${email} reiniciado con 6,250 monedas ($5,000 USD de prueba).`, 'success');
      }
    } catch {
      // ignore
    }
  };

  const handleExportVmReport = async () => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/admin/experience-logs/export', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const report = await res.json();
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aethervault-vm-diagnostic-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        soundFx.playCoinChime();
        addNotification(
          'Reporte QA Descargado',
          'Archivo JSON con toda la experiencia de los 10 testers, errores y vulnerabilidades listo para analizar.',
          'success'
        );
      }
    } catch {
      // ignore
    }
  };

  const handleClearVmLogs = async () => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/admin/experience-logs', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        setVmLogs([]);
        fetchVmExperienceLogs();
        addNotification('Bitácora QA Limpiada', 'Listo para una nueva ronda de pruebas en Máquina Virtual.', 'info');
      }
    } catch {
      // ignore
    }
  };

  const fetchFullSummary = useCallback(async () => {
    if (!authToken) return;
    setIsLoadingFullSummary(true);
    try {
      const res = await fetch('/api/admin/full-summary', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFullSummary(data);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingFullSummary(false);
    }
  }, [authToken]);

  useEffect(() => {
    if (activeTab === 'security_hardening' && authToken) {
      fetchSecurityStatus();
    }
    if (activeTab === 'destinations' && authToken) {
      fetchUsdtOrders();
    }
    if (activeTab === 'vm_qa_logs' && authToken) {
      fetchVmExperienceLogs();
    }
    if (activeTab === 'executive_summary' && authToken) {
      fetchFullSummary();
    }
  }, [activeTab, authToken, fetchSecurityStatus, fetchUsdtOrders, fetchVmExperienceLogs, fetchFullSummary]);

  useEffect(() => {
    const unsubscribe = initGmailAuth(
      user => {
        setIsGmailConnected(true);
        setGmailUserEmail(user.email || OWNER_EMAIL);
      },
      () => {
        setIsGmailConnected(false);
        setGmailUserEmail(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleConnectGmail = async () => {
    setIsConnectingGmail(true);
    setGmailSendFeedback(null);
    try {
      const result = await signInWithGoogleForGmail();
      if (result) {
        setIsGmailConnected(true);
        setGmailUserEmail(result.user.email || OWNER_EMAIL);
        soundFx.playBiometricSuccess();
        addNotification(
          'Gmail Conectado',
          `Sesión autorizada como ${result.user.email || OWNER_EMAIL} para enviar el resumen completo.`,
          'success'
        );
        if (authToken) {
          void fetch('/api/admin/audit-trail/record', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`
            },
            body: JSON.stringify({
              action: 'OWNER_AUTH_GMAIL_CONNECTED',
              severity: 'INFO',
              details: `Sesión Gmail OAuth conectada como ${result.user.email || OWNER_EMAIL}`
            })
          }).catch(() => {});
        }
      }
    } catch (err) {
      setGmailSendFeedback({
        ok: false,
        message: err instanceof Error ? err.message : 'No se pudo completar el inicio de sesión con Google.'
      });
    } finally {
      setIsConnectingGmail(false);
    }
  };

  const handleConfirmSendGmail = async () => {
    if (!fullSummary) return;
    const token = getGmailAccessToken();
    if (!token) {
      setIsGmailConnected(false);
      setShowGmailConfirmModal(false);
      setGmailSendFeedback({
        ok: false,
        message: 'La autorización de Gmail expiró. Vuelve a iniciar sesión con Google.'
      });
      return;
    }

    setIsSendingEmail(true);
    setGmailSendFeedback(null);
    try {
      const result = await sendSummaryViaGmailApi({
        toEmail: OWNER_EMAIL,
        subject: fullSummary.subject,
        bodyText: fullSummary.plainTextReport
      });
      setShowGmailConfirmModal(false);
      if (result.ok) {
        soundFx.playWinFanfare();
        setGmailSendFeedback({
          ok: true,
          message: `¡Correo enviado con éxito a ${OWNER_EMAIL}! (ID: ${result.messageId || 'confirmado'})`
        });
        addNotification(
          'Resumen Enviado por Gmail',
          `Se envió el resumen completo + historial de conversación a ${OWNER_EMAIL}.`,
          'success'
        );
      } else {
        setGmailSendFeedback({
          ok: false,
          message: result.error || 'Error al enviar el correo mediante Gmail.'
        });
      }
    } catch {
      setShowGmailConfirmModal(false);
      setGmailSendFeedback({
        ok: false,
        message: 'Error de red enviando el mensaje a través de Gmail.'
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleRunIntegrityAudit = async () => {
    if (!authToken) return;
    setIsVerifyingIntegrity(true);
    setSecurityError(null);
    try {
      const res = await fetch('/api/admin/verify-integrity', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (!res.ok) {
        setSecurityError(data.error || 'Error ejecutando la auditoría criptográfica.');
      } else {
        setSecurityStatus(prev =>
          prev
            ? {
                ...prev,
                integrity: data.integrity,
                vulnerabilityScan: data.vulnerabilityScan || prev.vulnerabilityScan,
                auditLogs: data.auditLogs || prev.auditLogs
              }
            : prev
        );
        soundFx.playBiometricSuccess();
        addNotification(
          data.ok ? 'Integridad Criptográfica Verificada' : 'Alerta de Integridad Detectada',
          data.ok
            ? `Base de datos SQLite OK y cadena SHA-256 intacta (${data.integrity?.checkedRows || 0} registros auditados).`
            : 'Se detectó una inconsistencia en la verificación de integridad.',
          data.ok ? 'success' : 'security'
        );
      }
    } catch {
      setSecurityError('No se pudo conectar con /api/admin/verify-integrity.');
    } finally {
      setIsVerifyingIntegrity(false);
    }
  };

  // Support Tickets Admin State
  const [selectedAdminTicketId, setSelectedAdminTicketId] = useState<string | null>(null);
  const [ticketStatusFilter, setTicketStatusFilter] = useState<'ALL' | TicketStatus>('ALL');
  const [ticketSearchQuery, setTicketSearchQuery] = useState<string>('');
  const [adminReplyText, setAdminReplyText] = useState<string>('');
  const [creditCoinsInput, setCreditCoinsInput] = useState<string>('0');
  const [resolutionNotesInput, setResolutionNotesInput] = useState<string>('');

  // Currency Administration & Airdrops Local State
  const [giftTargetType, setGiftTargetType] = useState<CoinGiftRecord['targetType']>('ALL_PLAYERS');
  const [giftAmount, setGiftAmount] = useState<number>(100);
  const [giftReason, setGiftReason] = useState<string>('Bono de Fidelidad de la Bóveda');
  const [customGiftEmail, setCustomGiftEmail] = useState<string>('');
  const [isSendingGift, setIsSendingGift] = useState(false);
  const [giftFeedback, setGiftFeedback] = useState<string | null>(null);

  // Direct Coin Adjustment State
  const [directAdjustAmount, setDirectAdjustAmount] = useState<number>(500);
  const [directAdjustReason, setDirectAdjustReason] = useState<string>('Recarga manual de tesorería');

  // Happy Hour Local Edit State
  const [hhTitle, setHhTitle] = useState(happyHourCampaign.title);
  const [hhMultiplier, setHhMultiplier] = useState(happyHourCampaign.multiplier);
  const [hhGameSection, setHhGameSection] = useState<HappyHourGameSection>(happyHourCampaign.gameSection);
  const [hhTargetGroup, setHhTargetGroup] = useState<HappyHourTargetGroup>(happyHourCampaign.targetGroup);
  const [hhDurationMinutes, setHhDurationMinutes] = useState(happyHourCampaign.durationMinutes);
  const [hhSavedAlert, setHhSavedAlert] = useState(false);
  
  // Destination form state
  const [trc20, setTrc20] = useState(payoutConfig.usdtTrc20Address);
  const [erc20, setErc20] = useState(payoutConfig.usdtErc20Address);
  const [bep20, setBep20] = useState(payoutConfig.usdtBep20Address || payoutConfig.usdtErc20Address);
  const [btcAddress, setBtcAddress] = useState(payoutConfig.btcAddress || 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh');
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
  const [isSaved, setIsSaved] = useState(false);

  // Dynamic Margins Local State
  const [sliderRetention, setSliderRetention] = useState(vaultRetentionRate);
  const [sliderFee, setSliderFee] = useState(redemptionFeeRate);
  const [sliderTransferFee, setSliderTransferFee] = useState(transferFeeRate);
  const [marginsSaved, setMarginsSaved] = useState(false);

  useEffect(() => {
    setSliderRetention(vaultRetentionRate);
    setSliderFee(redemptionFeeRate);
    setSliderTransferFee(transferFeeRate);
  }, [vaultRetentionRate, redemptionFeeRate, transferFeeRate]);

  // Withdrawal form state
  const [withdrawAmount, setWithdrawAmount] = useState<string>('500');
  const [withdrawMethod, setWithdrawMethod] = useState<'crypto_usdt' | 'bank_wire' | 'paypal'>('crypto_usdt');
  const [isProcessingWd, setIsProcessingWd] = useState(false);

  // Client 30% Withdrawal Validator & Espera de Autorización Engine State
  const [wdPlayerEmail, setWdPlayerEmail] = useState<string>('');
  const [wdRequestedCoins, setWdRequestedCoins] = useState<string>('5000');
  const [wdDestType, setWdDestType] = useState<'crypto_usdt' | 'crypto_monero' | 'crypto_btc' | 'paypal' | 'bank_wire'>('crypto_usdt');
  const [wdDestAddress, setWdDestAddress] = useState<string>('TX_VM_USDT_TRC20_TEST');
  const [isValidatingWd, setIsValidatingWd] = useState<boolean>(false);
  const [wdValidatorResult, setWdValidatorResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [redemptionStatusFilter, setRedemptionStatusFilter] = useState<'ALL' | 'AWAITING' | 'APPROVED' | 'REJECTED'>('ALL');

  useEffect(() => {
    if (!wdPlayerEmail && redeemableUsers.length > 0) {
      const preferred = redeemableUsers.find(u => u.isActive && u.coinsBalance > 0) || redeemableUsers[0];
      if (preferred) setWdPlayerEmail(preferred.email);
    }
  }, [redeemableUsers, wdPlayerEmail]);

  const pendingRedemptionsCount = redemptionRequests.filter(
    r => r.status === 'PENDING_APPROVAL' || r.awaitingAuthorization
  ).length;
  const openTicketsCount = supportTickets.filter(t => t.status !== 'RESUELTO' && t.status !== 'REEMBOLSO_PROCESADO').length;

  const handleSendGift = async () => {
    if (giftAmount <= 0) return;
    setIsSendingGift(true);
    let targetLabel = 'Comunidad Global';
    switch (giftTargetType) {
      case 'ALL_PLAYERS':
        targetLabel = 'Todos los Usuarios Registrados';
        break;
      case 'ONLINE_ONLY':
        targetLabel = 'Usuarios Conectados en Línea';
        break;
      case 'GAME_ROULETTE':
        targetLabel = 'Jugadores de Ruleta Europea';
        break;
      case 'GAME_BLACKJACK':
        targetLabel = 'Jugadores de Blackjack 21';
        break;
      case 'GAME_POKER':
        targetLabel = 'Jugadores de Póker 5-Card Draw';
        break;
      case 'GAME_ARENA':
        targetLabel = 'Gladiadores de la Arena';
        break;
      case 'VIP_TIER':
        targetLabel = 'Jugadores VIP (Nivel > 10)';
        break;
      case 'SPECIFIC_USER':
        targetLabel = customGiftEmail ? `Usuario: ${customGiftEmail}` : 'Usuario Específico';
        break;
    }

    const res = await sendCoinsGift(
      giftTargetType,
      targetLabel,
      giftAmount,
      giftReason,
      customGiftEmail
    );

    setIsSendingGift(false);
    setGiftFeedback(`¡Airdrop completado con éxito! Se acreditaron ${giftAmount} monedas a ${res.recipientsCount} usuarios (${res.totalCoins.toLocaleString()} monedas distribuidas en total).`);
    setTimeout(() => setGiftFeedback(null), 4500);
  };

  const handleSaveHappyHour = () => {
    updateHappyHourCampaign({
      title: hhTitle,
      multiplier: hhMultiplier,
      gameSection: hhGameSection,
      targetGroup: hhTargetGroup,
      durationMinutes: hhDurationMinutes
    });
    setHhSavedAlert(true);
    soundFx.playCoinChime();
    setTimeout(() => setHhSavedAlert(false), 3000);
  };

  const handleApplyPresetHappyHour = (preset: {
    title: string;
    multiplier: number;
    gameSection: HappyHourGameSection;
    targetGroup: HappyHourTargetGroup;
    durationMinutes: number;
  }) => {
    setHhTitle(preset.title);
    setHhMultiplier(preset.multiplier);
    setHhGameSection(preset.gameSection);
    setHhTargetGroup(preset.targetGroup);
    setHhDurationMinutes(preset.durationMinutes);
    updateHappyHourCampaign({
      title: preset.title,
      multiplier: preset.multiplier,
      gameSection: preset.gameSection,
      targetGroup: preset.targetGroup,
      durationMinutes: preset.durationMinutes,
      isActive: true
    });
    setHhSavedAlert(true);
    soundFx.playWinFanfare();
    setTimeout(() => setHhSavedAlert(false), 3000);
  };

  const handleSaveMargins = () => {
    updateVaultMargins(sliderRetention, sliderFee, sliderTransferFee);
    setMarginsSaved(true);
    setTimeout(() => setMarginsSaved(false), 2500);
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Fecha', 'Tipo', 'Detalles', 'Monedas', 'Monto USD', 'Estado', 'Hash Transaccion'];
    const rows = transactions.map(t => [
      t.id,
      new Date(t.timestamp).toISOString(),
      t.type,
      `"${t.title.replace(/"/g, '""')}"`,
      t.amountCoins,
      t.amountUSD || 0,
      t.status,
      t.txHash
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `aethervault_auditoria_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    soundFx.playCoinChime();
    addNotification('Libro Contable Descargado', 'El archivo CSV oficial con todas las transacciones ha sido descargado.', 'success');
  };

  const handleExportJSON = () => {
    const data = {
      owner: OWNER_EMAIL,
      timestamp: new Date().toISOString(),
      vaultEconomics,
      payoutConfig,
      serverMetrics,
      provablyFairHistory
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aethervault_e2ee_security_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    soundFx.playCoinChime();
    addNotification('Auditoría Criptográfica Descargada', 'Registro JSON con hashes SHA-256 descargado.', 'success');
  };

  const handleSaveDestinations = (e: React.FormEvent) => {
    e.preventDefault();
    updatePayoutConfig({
      usdtTrc20Address: trc20,
      usdtErc20Address: erc20,
      usdtBep20Address: bep20,
      btcAddress,
      binancePayId,
      autoConvertToUsdt,
      paypalEmail: paypal,
      paypalMode,
      cardGatewayProvider,
      primarySettlementRail,
      vmTestModeEnabled,
      maxVmTesters: 10,
      bankIbanSwift: iban,
      bankAccountHolder: holder,
      merchantName: merchant
    });
    setIsSaved(true);
    addNotification(
      'Bóveda de Cobros Actualizada',
      'Tus cuentas USDT, Bitcoin (BTC), PayPal, Banco y pasarela de tarjetas quedaron cifradas con AES-256-GCM en la bóveda.',
      'success'
    );
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleExecuteWithdrawal = async () => {
    const val = parseFloat(withdrawAmount);
    if (isNaN(val) || val <= 0) {
      addNotification('Monto Inválido', 'Ingresa un monto válido para retirar.', 'info');
      return;
    }
    if (val > availableBalanceUSD) {
      addNotification('Fondos Insuficientes', `El saldo disponible es de $${availableBalanceUSD.toLocaleString()} USD.`, 'info');
      return;
    }

    setIsProcessingWd(true);
    let targetAddress = trc20;
    if (withdrawMethod === 'bank_wire') targetAddress = iban;
    if (withdrawMethod === 'paypal') targetAddress = paypal;

    setTimeout(async () => {
      const ok = await executeAdminWithdrawal(val, withdrawMethod, targetAddress);
      setIsProcessingWd(false);
      if (ok) {
        addNotification(
          '¡Retiro de Ganancias Exitoso!',
          `Se han transferido $${val.toLocaleString()} USD directamente a tu destino (${withdrawMethod.toUpperCase()}).`,
          'success'
        );
      }
    }, 1200);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Top Banner: Administrative Ownership */}
      <div className="relative rounded-3xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-950 border border-amber-500/40 p-6 sm:p-8 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-widest text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
                Bóveda Principal del Propietario
              </span>
              <span className="text-xs text-emerald-400 font-mono-numbers flex items-center gap-1 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
                <ShieldCheck className="w-3.5 h-3.5" />
                {OWNER_EMAIL}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-display">
              Bóveda de Recaudación, Retiros & Control de Servidor
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Gestión centralizada de fondos: autorización exclusiva de canjes de jugadores con 20% de comisión automática retenida para la bóveda, reserva 70/30 de apuestas y telemetría de servidor en vivo.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/90 border border-amber-500/40 flex items-center gap-4 shrink-0 shadow-lg">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
                Bóveda Neta Disponible
              </span>
              <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono-numbers mt-0.5">
                ${availableBalanceUSD.toLocaleString()} <span className="text-xs font-normal text-slate-400">USD</span>
              </div>
            </div>
            <button
              onClick={() => {
                setActiveTab('withdraw');
                soundFx.playClick();
              }}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow transition-transform active:scale-95 whitespace-nowrap"
            >
              Extraer Fondos
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Retención 70% Bóveda</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 font-mono-numbers">
            {vaultEconomics.houseVaultShare.toLocaleString()} <span className="text-xs text-amber-400">monedas</span>
          </div>
          <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            70% de todo el volumen apostado
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Comisiones Retiro (20%)</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300 font-mono-numbers">
            ${vaultEconomics.withdrawalFeesCollected.toFixed(2)} USD
          </div>
          <div className="text-[11px] text-slate-400 font-mono-numbers">
            20% auto-deducido por cada canje
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Jugadores en Vivo</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-300 font-mono-numbers flex items-center gap-2">
            <span>{onlinePlayersCount}</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="text-[11px] text-slate-400">
            {totalPlayersCount.toLocaleString()} usuarios registrados
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Canjes Pendientes</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono-numbers flex items-center gap-2">
            <span>{pendingRedemptionsCount}</span>
            {pendingRedemptionsCount > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Requiere tu Aprobación
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400">
            Solo {OWNER_EMAIL} puede autorizar
          </div>
        </div>

      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-900 rounded-2xl border border-slate-800 text-xs font-semibold overflow-x-auto shadow-inner">
        {(
          [
            { id: 'currency_control' as const, label: 'Monedas & Regalos / Airdrops', icon: Gift },
            { id: 'happy_hour' as const, label: 'Horas Locas & Multiplicadores', icon: Flame, isLive: happyHourCampaign.isActive },
            { id: 'redemptions' as const, label: 'Autorización de Canjes', badge: pendingRedemptionsCount },
            { id: 'support_tickets' as const, label: 'Tablero de Tickets de Soporte', icon: LifeBuoy, badge: openTicketsCount },
            { id: 'vm_qa_logs' as const, label: 'Logs QA & 10 Testers VM', icon: Activity },
            { id: 'security_hardening' as const, label: 'Seguridad App & BD', icon: Lock },
            { id: 'vault_split' as const, label: 'Economía 70% Bóveda / 30% Premios' },
            { id: 'server_telemetry' as const, label: 'Telemetría del Servidor & Jugadores' },
            { id: 'destinations' as const, label: 'Órdenes USDT & Destinos', icon: Wallet },
            { id: 'vault_apis' as const, label: 'VaultConfigPanel: APIs & Retiros', icon: KeyRound },
            { id: 'executive_summary' as const, label: 'Resumen & Correo', icon: Mail },
            { id: 'withdraw' as const, label: 'Retirar Fondos a Billetera' },
            { id: 'audit' as const, label: 'Libro Contable' },
            { id: 'audit_trail' as const, label: 'AuditTrail (Auditoría Integral)', icon: ShieldCheck },
            { id: 'overview' as const, label: 'Guía de Recaudación' }
          ] as const
        ).map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              soundFx.playClick();
            }}
            className={`py-2 px-3.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === tab.id
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
            }`}
          >
            {'icon' in tab && tab.icon && <tab.icon className="w-3.5 h-3.5" />}
            <span>{tab.label}</span>
            {'isLive' in tab && tab.isLive && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
            )}
            {'badge' in tab && typeof tab.badge === 'number' && tab.badge > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === tab.id ? 'bg-slate-950 text-amber-300' : 'bg-amber-500 text-slate-950'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB: CURRENCY CONTROL & AIRDROPS / GIFTS */}
      {activeTab === 'currency_control' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Header & Quick Stats */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-100 font-display flex items-center gap-2">
                    <Gift className="w-5 h-5 text-amber-400" />
                    Gestión de Monedas & Airdrops / Regalos Masivos
                  </h2>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    Control de Tesorería
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                  Envía regalos de monedas Aether a todos los jugadores o a grupos segmentados por juego (Ruleta, Blackjack, Póker, Arena o VIPs). Cada airdrop se audita criptográficamente y se anuncia a la comunidad.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                  Saldo Sesión: <strong className="text-amber-400 font-bold">{coins.toLocaleString()} monedas</strong>
                </span>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Airdrops Emitidos</span>
                <div className="text-lg font-bold text-amber-300 font-mono-numbers">
                  {coinGifts.length} eventos
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Monedas Distribuidas</span>
                <div className="text-lg font-bold text-emerald-400 font-mono-numbers">
                  {coinGifts.reduce((acc, g) => acc + g.totalCoinsDistributed, 0).toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Comunidad Alcanzada</span>
                <div className="text-lg font-bold text-cyan-300 font-mono-numbers">
                  {totalPlayersCount.toLocaleString()} usuarios
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Usuarios en Línea</span>
                <div className="text-lg font-bold text-slate-200 font-mono-numbers flex items-center gap-1.5">
                  <span>{onlinePlayersCount}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
              </div>
            </div>
          </div>

          {/* Feedback Alert if sent */}
          {giftFeedback && (
            <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 flex items-center gap-3 text-xs text-emerald-200 shadow-xl animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="font-medium">{giftFeedback}</div>
            </div>
          )}

          {/* Section 1: Generador de Airdrops & Regalos */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-slate-100 font-display">
                  Emitir Regalo de Monedas / Airdrop Segmentado
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Notificación instantánea + Anuncio en Chat
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Left Column: Target Group Selector */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                    1. Seleccionar Destinatarios del Regalo:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { type: 'ALL_PLAYERS' as const, label: 'Todos los Jugadores', desc: `Comunidad Global (${totalPlayersCount} usuarios)`, icon: '🌐' },
                      { type: 'ONLINE_ONLY' as const, label: 'Solo Usuarios en Línea', desc: `Jugadores activos ahora (${onlinePlayersCount})`, icon: '🟢' },
                      { type: 'GAME_ROULETTE' as const, label: 'Jugadores de Ruleta', desc: 'Mesa Ruleta Europea (385)', icon: '🎡' },
                      { type: 'GAME_BLACKJACK' as const, label: 'Jugadores de Blackjack', desc: 'Mesa Blackjack 21 (452)', icon: '🃏' },
                      { type: 'GAME_POKER' as const, label: 'Jugadores de Póker', desc: 'Mesa 5-Card Draw (312)', icon: '♠️' },
                      { type: 'GAME_ARENA' as const, label: 'Gladiadores de Arena', desc: 'Luchadores activos (295)', icon: '⚔️' },
                      { type: 'VIP_TIER' as const, label: 'Jugadores VIP (Nivel > 10)', desc: 'High Rollers de la Bóveda (126)', icon: '💎' },
                      { type: 'SPECIFIC_USER' as const, label: 'Usuario Específico', desc: 'Por correo electrónico o ID', icon: '👤' }
                    ].map(target => (
                      <button
                        key={target.type}
                        type="button"
                        onClick={() => {
                          setGiftTargetType(target.type);
                          soundFx.playClick();
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          giftTargetType === target.type
                            ? 'bg-amber-500/15 border-amber-500 text-amber-200 shadow-md ring-1 ring-amber-500/40'
                            : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{target.icon}</span>
                          <span className="text-xs font-bold text-slate-200">{target.label}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">{target.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Specific User Email Input if selected */}
                {giftTargetType === 'SPECIFIC_USER' && (
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-2 animate-in fade-in">
                    <label className="text-[11px] font-bold text-amber-300 uppercase tracking-wide block">
                      Correo del Usuario Beneficiario:
                    </label>
                    <input
                      type="email"
                      value={customGiftEmail}
                      onChange={e => setCustomGiftEmail(e.target.value)}
                      placeholder="ejemplo: jugador@gmail.com"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-amber-400 font-mono"
                    />
                    <p className="text-[10px] text-slate-400">
                      Ingresa el correo registrado del jugador para asignarle el regalo de forma individual.
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column: Amount & Reason */}
              <div className="space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  
                  {/* Amount Selector */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                      2. Monedas por Usuario:
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {[50, 100, 250, 500, 1000, 2500, 5000].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => {
                            setGiftAmount(amt);
                            soundFx.playClick();
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all ${
                            giftAmount === amt
                              ? 'bg-amber-500 text-slate-950 shadow'
                              : 'bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          +{amt}
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="100000"
                        value={giftAmount}
                        onChange={e => setGiftAmount(Math.max(1, Number(e.target.value)))}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-bold text-amber-400 font-mono focus:outline-none focus:border-amber-400"
                      />
                      <span className="absolute right-4 top-2.5 text-xs text-slate-500 font-mono">
                        monedas / jugador
                      </span>
                    </div>
                  </div>

                  {/* Reason Selector */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                      3. Motivo o Título del Regalo:
                    </label>
                    <select
                      value={giftReason}
                      onChange={e => setGiftReason(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-amber-400 mb-2"
                    >
                      <option value="Bono de Fidelidad de la Bóveda">Bono de Fidelidad de la Bóveda</option>
                      <option value="Recompensa Especial de Fin de Semana">Recompensa Especial de Fin de Semana</option>
                      <option value="Airdrop de Bienvenida a la Comunidad">Airdrop de Bienvenida a la Comunidad</option>
                      <option value="Compensación por Mantenimiento de Servidor">Compensación por Mantenimiento de Servidor</option>
                      <option value="Cortesía Exclusiva del Propietario">Cortesía Exclusiva del Propietario</option>
                      <option value="Premio a los Mejores Gladiadores">Premio a los Mejores Gladiadores</option>
                    </select>
                    <input
                      type="text"
                      value={giftReason}
                      onChange={e => setGiftReason(e.target.value)}
                      placeholder="Escribe un motivo personalizado..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Live Distribution Impact Box */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-950 to-slate-950 border border-amber-500/30 space-y-2">
                    <div className="text-xs text-amber-300 font-bold flex items-center justify-between">
                      <span>Resumen del Impacto del Airdrop:</span>
                      <span className="text-[10px] text-slate-400 font-mono">Auto-calculado</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Beneficiarios</span>
                        <span className="font-bold text-slate-200 font-mono">
                          {giftTargetType === 'ALL_PLAYERS' ? totalPlayersCount : giftTargetType === 'ONLINE_ONLY' ? onlinePlayersCount : giftTargetType === 'SPECIFIC_USER' ? 1 : giftTargetType === 'VIP_TIER' ? 126 : 385}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Por Jugador</span>
                        <span className="font-bold text-amber-400 font-mono">
                          {giftAmount} mo
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Total a Inyectar</span>
                        <span className="font-bold text-emerald-400 font-mono">
                          {((giftTargetType === 'ALL_PLAYERS' ? totalPlayersCount : giftTargetType === 'ONLINE_ONLY' ? onlinePlayersCount : giftTargetType === 'SPECIFIC_USER' ? 1 : giftTargetType === 'VIP_TIER' ? 126 : 385) * giftAmount).toLocaleString()} mo
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Submit Action */}
                <button
                  type="button"
                  disabled={isSendingGift}
                  onClick={handleSendGift}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSendingGift ? 'Distribuyendo Airdrop Criptográfico...' : 'Ejecutar Regalo Masivo / Airdrop Ahora'}</span>
                </button>
              </div>

            </div>
          </div>

          {/* Section 2: Inyección & Ajuste Directo de Saldo */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-slate-100 font-display">
                  Ajuste Directo de Tesorería (Monedas de Cuenta)
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Saldo Actual: <strong className="text-amber-400">{coins.toLocaleString()}</strong> monedas
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-4 space-y-1">
                <label className="text-xs text-slate-300 font-bold uppercase tracking-wider block">
                  Cantidad a Ajustar:
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={directAdjustAmount}
                    onChange={e => setDirectAdjustAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="md:col-span-5 space-y-1">
                <label className="text-xs text-slate-300 font-bold uppercase tracking-wider block">
                  Motivo del Ajuste de Saldo:
                </label>
                <input
                  type="text"
                  value={directAdjustReason}
                  onChange={e => setDirectAdjustReason(e.target.value)}
                  placeholder="Motivo del cambio de saldo..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="md:col-span-3 flex gap-2 pt-5 md:pt-0">
                <button
                  type="button"
                  onClick={() => {
                    adminAdjustUserCoins(Math.abs(directAdjustAmount), directAdjustReason || 'Recarga de monedas');
                  }}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow transition-transform active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Añadir</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    adminAdjustUserCoins(-Math.abs(directAdjustAmount), directAdjustReason || 'Deducción de monedas');
                  }}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow transition-transform active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <MinusCircle className="w-4 h-4" />
                  <span>Deducir</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Historial Auditado de Airdrops Emitidos */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-slate-100 font-display">
                  Registro Histórico de Airdrops y Regalos Emitidos
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {coinGifts.length} registros auditados
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-medium uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Fecha</th>
                    <th className="py-2.5 px-3">Destinatario</th>
                    <th className="py-2.5 px-3">Monedas/Usuario</th>
                    <th className="py-2.5 px-3">Beneficiarios</th>
                    <th className="py-2.5 px-3">Total Repartido</th>
                    <th className="py-2.5 px-3">Motivo</th>
                    <th className="py-2.5 px-3">Hash E2EE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono-numbers">
                  {coinGifts.map(gift => (
                    <tr key={gift.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                        {new Date(gift.timestamp).toLocaleDateString()} {new Date(gift.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-200 whitespace-nowrap">
                        {gift.targetLabel}
                      </td>
                      <td className="py-3 px-3 text-amber-400 font-bold whitespace-nowrap">
                        +{gift.amountCoins} mo
                      </td>
                      <td className="py-3 px-3 text-cyan-300 font-bold whitespace-nowrap">
                        {gift.recipientsCount.toLocaleString()} usuarios
                      </td>
                      <td className="py-3 px-3 text-emerald-400 font-bold whitespace-nowrap">
                        {gift.totalCoinsDistributed.toLocaleString()} mo
                      </td>
                      <td className="py-3 px-3 text-slate-300 font-sans text-xs max-w-xs truncate">
                        {gift.reason}
                      </td>
                      <td className="py-3 px-3 text-[10px] text-slate-500 font-mono">
                        {gift.txHash.slice(0, 12)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB: HAPPY HOUR & PAYOUT MULTIPLIERS */}
      {activeTab === 'happy_hour' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Master Switch & Live Banner */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-100 font-display flex items-center gap-2">
                    <Flame className="w-5 h-5 text-amber-400" />
                    Panel de Horas Locas (Happy Hour & Multiplicadores de Ganancias)
                  </h2>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                    happyHourCampaign.isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {happyHourCampaign.isActive ? '🔥 ACTIVO EN VIVO' : 'PAUSADO'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                  Configura campañas para que los jugadores ganen más monedas según multiplicadores asignados por sección de juego (Ruleta, Blackjack, Póker, Arena) o por grupos de jugadores (VIPs, Nuevos o Todos).
                </p>
              </div>

              {/* Master Switch Toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleHappyHour()}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg active:scale-95 flex items-center gap-2 ${
                    happyHourCampaign.isActive
                      ? 'bg-rose-500 hover:bg-rose-400 text-slate-950'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  }`}
                >
                  <Flame className="w-4 h-4" />
                  <span>{happyHourCampaign.isActive ? 'Pausar Hora Loca' : 'Encender Hora Loca'}</span>
                </button>
              </div>
            </div>

            {/* Live Campaign Status Bar */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/50 via-slate-950 to-slate-950 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0">
                  <Flame className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="text-xs font-black text-amber-300 font-display flex items-center gap-2">
                    <span>{happyHourCampaign.title}</span>
                    <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] font-black font-mono">
                      {happyHourCampaign.multiplier}x Multiplicador
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Aplica a: <strong className="text-cyan-300">{happyHourCampaign.gameSection === 'ALL_GAMES' ? 'Todos los Juegos' : happyHourCampaign.gameSection}</strong> · Para: <strong className="text-emerald-300">{happyHourCampaign.targetGroup === 'ALL_PLAYERS' ? 'Todos los Jugadores' : happyHourCampaign.targetGroup}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-start sm:self-auto text-xs font-mono text-amber-300 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>
                  {happyHourCampaign.isActive
                    ? happyHourCampaign.durationMinutes > 0
                      ? `${Math.max(0, Math.floor((happyHourCampaign.expiresAt - Date.now()) / 60000))} minutos restantes`
                      : 'Modo Permanente Activo'
                    : 'Campaña Pausada'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Zap className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-slate-200">
                Plantillas Rápidas de Horas Locas (1 Clic)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  title: '⚡ Frenesí Global 2.0x',
                  multiplier: 2.0,
                  gameSection: 'ALL_GAMES' as const,
                  targetGroup: 'ALL_PLAYERS' as const,
                  durationMinutes: 120,
                  desc: '2.0x en todos los juegos durante 2 horas'
                },
                {
                  title: '🎰 Festival Ruleta Dorada 2.5x',
                  multiplier: 2.5,
                  gameSection: 'ROULETTE' as const,
                  targetGroup: 'ALL_PLAYERS' as const,
                  durationMinutes: 60,
                  desc: '2.5x en Ruleta Europea durante 1 hora'
                },
                {
                  title: '🃏 Noche VIP Blackjack 1.75x',
                  multiplier: 1.75,
                  gameSection: 'BLACKJACK' as const,
                  targetGroup: 'VIP_PLAYERS' as const,
                  durationMinutes: 240,
                  desc: '1.75x para Jugadores Nivel > 10 (4h)'
                },
                {
                  title: '⚔️ Coliseo Brutal Arena 3.0x',
                  multiplier: 3.0,
                  gameSection: 'ARENA' as const,
                  targetGroup: 'ALL_PLAYERS' as const,
                  durationMinutes: 30,
                  desc: '3.0x en recompensas de Arena por 30m'
                }
              ].map(preset => (
                <button
                  key={preset.title}
                  type="button"
                  onClick={() => handleApplyPresetHappyHour(preset)}
                  className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/60 text-left transition-all group space-y-2 hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 group-hover:text-amber-300 transition-colors">
                      {preset.title}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">
                      {preset.multiplier}x
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    {preset.desc}
                  </p>
                  <div className="text-[10px] text-amber-400 font-bold pt-1">
                    Activar Preset →
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Detailed Configuration Form */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 font-display flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-400" />
                Personalizar Parámetros de la Hora Loca
              </h3>
              {hhSavedAlert && (
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4" />
                  ¡Configuración guardada y en vigor!
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Campaign Title & Multiplier */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                    Título de la Campaña:
                  </label>
                  <input
                    type="text"
                    value={hhTitle}
                    onChange={e => setHhTitle(e.target.value)}
                    placeholder="ejemplo: 🔥 Hora Loca Nocturna 2.0x"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 font-semibold focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                    Multiplicador de Ganancias:
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-2">
                    {[1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 5.0].map(mult => (
                      <button
                        key={mult}
                        type="button"
                        onClick={() => {
                          setHhMultiplier(mult);
                          soundFx.playClick();
                        }}
                        className={`py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                          hhMultiplier === mult
                            ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                            : 'bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        {mult}x
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Al ganar una apuesta o partida, el premio bruto se incrementa en un <strong className="text-amber-400">+{Math.round((hhMultiplier - 1) * 100)}%</strong>.
                  </p>
                </div>

                {/* Duration */}
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                    Duración del Evento:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { min: 30, label: '30 min' },
                      { min: 60, label: '1 hora' },
                      { min: 120, label: '2 horas' },
                      { min: 240, label: '4 horas' },
                      { min: 1440, label: '24 horas' },
                      { min: 0, label: 'Permanente' }
                    ].map(dur => (
                      <button
                        key={dur.min}
                        type="button"
                        onClick={() => {
                          setHhDurationMinutes(dur.min);
                          soundFx.playClick();
                        }}
                        className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                          hhDurationMinutes === dur.min
                            ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                            : 'bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        {dur.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Game Section & Target Player Group */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                    Sección de Juegos Aplicable:
                  </label>
                  <div className="space-y-2">
                    {[
                      { id: 'ALL_GAMES' as const, label: 'Todos los Juegos de Casino & Arena', icon: '🎰' },
                      { id: 'ROULETTE' as const, label: 'Ruleta Europea Real', icon: '🎡' },
                      { id: 'BLACKJACK' as const, label: 'Blackjack 21 Las Vegas', icon: '🃏' },
                      { id: 'POKER' as const, label: 'Póker 5-Card Draw', icon: '♠️' },
                      { id: 'ARENA' as const, label: 'Arena de Batalla Cibernética', icon: '⚔️' }
                    ].map(sec => (
                      <label
                        key={sec.id}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          hhGameSection === sec.id
                            ? 'bg-amber-500/10 border-amber-500 text-amber-200'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="gameSection"
                          checked={hhGameSection === sec.id}
                          onChange={() => setHhGameSection(sec.id)}
                          className="accent-amber-500"
                        />
                        <span className="text-base">{sec.icon}</span>
                        <span className="text-xs font-semibold text-slate-200">{sec.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                    Grupo de Jugadores Destinatarios:
                  </label>
                  <div className="space-y-2">
                    {[
                      { id: 'ALL_PLAYERS' as const, label: 'Todos los Jugadores (Sin restricción)' },
                      { id: 'VIP_PLAYERS' as const, label: 'Solo Jugadores VIP (Nivel > 10)' },
                      { id: 'NEW_PLAYERS' as const, label: 'Solo Jugadores Nuevos (Niveles 1 a 5)' },
                      { id: 'ONLINE_ONLY' as const, label: 'Solo Jugadores Conectados en Línea' }
                    ].map(grp => (
                      <label
                        key={grp.id}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          hhTargetGroup === grp.id
                            ? 'bg-cyan-500/10 border-cyan-500 text-cyan-200'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="targetGroup"
                          checked={hhTargetGroup === grp.id}
                          onChange={() => setHhTargetGroup(grp.id)}
                          className="accent-cyan-500"
                        />
                        <span className="text-xs font-semibold text-slate-200">{grp.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* Save Action */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleSaveHappyHour}
                className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-transform active:scale-95"
              >
                Guardar Configuración y Activar para Jugadores
              </button>
            </div>
          </div>

        </div>
      )}

      {/* TAB: REDEMPTIONS (VALIDADOR 30% + ESPERA DE AUTORIZACIÓN MANUAL) */}
      {activeTab === 'redemptions' && (() => {
        const selectedUser = redeemableUsers.find(
          u => u.email.toLowerCase() === wdPlayerEmail.trim().toLowerCase()
        );
        const parsedReqCoins = Math.max(0, Math.floor(Number(wdRequestedCoins) || 0));
        const previewBalance = selectedUser?.coinsBalance ?? 0;
        const previewMax30 = selectedUser?.maxAllowed30PctCoins ?? Math.floor(previewBalance * 0.30);
        const willAutoClamp = parsedReqCoins > previewMax30 && previewMax30 > 0;
        const previewFinalCoins = willAutoClamp ? previewMax30 : Math.min(parsedReqCoins, previewMax30);

        const filteredRedemptions = redemptionRequests.filter(req => {
          if (redemptionStatusFilter === 'AWAITING') {
            return req.awaitingAuthorization || req.status === 'PENDING_APPROVAL';
          }
          if (redemptionStatusFilter === 'APPROVED') return req.status === 'APPROVED';
          if (redemptionStatusFilter === 'REJECTED') return req.status === 'REJECTED';
          return true;
        });

        const isGoogleOwnerConnected =
          Boolean(firebaseUser?.emailVerified) &&
          firebaseUser?.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();

        return (
          <div className="space-y-6">
            {/* Motor de Validación Automática 30% + Creación en Espera de Autorización */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-amber-500/30 space-y-5 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-100 font-display flex items-center gap-2">
                      <Lock className="w-5 h-5 text-amber-400" />
                      Validador Automático de Retiros (Límite 30% + Espera de Autorización)
                    </h2>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      Tope Auto 30% Activo
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        isGoogleOwnerConnected
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {isGoogleOwnerConnected
                        ? 'SQLite + Firestore Sincronizado'
                        : 'SQLite Activo (Conecta Google en Bóveda para Firestore)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
                    Cualquier solicitud de salida ingresada se valida contra el balance total del usuario en la base de datos. Si excede el{' '}
                    <strong className="text-amber-300">30% permitido</strong>, el sistema la{' '}
                    <strong className="text-emerald-300">limita automáticamente al 30%</strong> y la registra con el campo{' '}
                    <code className="text-cyan-300 bg-slate-950 px-1.5 py-0.5 rounded">awaiting_authorization = TRUE</code> requiriendo acción manual tuya ({OWNER_EMAIL}).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void refreshRedemptionsFromServer()}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 shrink-0 border border-slate-700"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Actualizar Saldos BD
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1.5">
                    Usuario / Cliente en Base de Datos
                  </label>
                  {redeemableUsers.length > 0 ? (
                    <select
                      value={wdPlayerEmail}
                      onChange={e => setWdPlayerEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                    >
                      {redeemableUsers.map(u => (
                        <option key={u.id} value={u.email}>
                          {u.email} ({u.role}) — Balance: {u.coinsBalance.toLocaleString()} mo | Máx 30%: {u.maxAllowed30PctCoins.toLocaleString()} mo {!u.isActive ? '[INACTIVO]' : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="email"
                      value={wdPlayerEmail}
                      onChange={e => setWdPlayerEmail(e.target.value)}
                      placeholder="tester01@vm.aethervault.local"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                    />
                  )}
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1.5">
                    Monto Solicitado (Monedas)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={wdRequestedCoins}
                    onChange={e => setWdRequestedCoins(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-mono text-amber-300 font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1.5">
                    Método de Salida
                  </label>
                  <select
                    value={wdDestType}
                    onChange={e =>
                      setWdDestType(
                        e.target.value as 'crypto_usdt' | 'crypto_monero' | 'crypto_btc' | 'paypal' | 'bank_wire'
                      )
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                  >
                    <option value="crypto_usdt">USDT (TRC-20)</option>
                    <option value="crypto_btc">Bitcoin (BTC)</option>
                    <option value="crypto_monero">Monero (XMR)</option>
                    <option value="paypal">PayPal Business</option>
                    <option value="bank_wire">Transferencia Bancaria</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="md:col-span-2">
                  <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1.5">
                    Dirección / Cuenta Destino del Cliente
                  </label>
                  <input
                    type="text"
                    value={wdDestAddress}
                    onChange={e => setWdDestAddress(e.target.value)}
                    placeholder="ej. TX89... o correo PayPal"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <button
                  type="button"
                  disabled={isValidatingWd || !wdPlayerEmail.trim() || parsedReqCoins <= 0 || !wdDestAddress.trim()}
                  onClick={async () => {
                    setIsValidatingWd(true);
                    setWdValidatorResult(null);
                    const res = await validateAndCreateAdminRedemption({
                      playerEmail: wdPlayerEmail,
                      playerName: selectedUser?.displayName,
                      requestedCoins: parsedReqCoins,
                      destinationType: wdDestType,
                      destinationAddress: wdDestAddress
                    });
                    setWdValidatorResult({ ok: res.ok, message: res.message });
                    setIsValidatingWd(false);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-xs shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {isValidatingWd ? 'Validando en BD...' : 'Validar 30% y Crear en Espera'}
                </button>
              </div>

              {/* Previsualización en tiempo real del recorte automático al 30% */}
              {selectedUser && (
                <div
                  className={`p-3.5 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    willAutoClamp
                      ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                      : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="font-bold flex items-center gap-2">
                      {willAutoClamp ? (
                        <>
                          <AlertCircle className="w-4 h-4 text-amber-400" />
                          <span>
                            Recorte Automático Activo: {parsedReqCoins.toLocaleString()} mo excede el 30% → se limitará a{' '}
                            <strong className="text-amber-300">{previewMax30.toLocaleString()} monedas</strong>
                          </span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>
                            Dentro del límite del 30%: saldrán{' '}
                            <strong className="text-emerald-300">{previewFinalCoins.toLocaleString()} monedas</strong> con campo{' '}
                            <code>Espera de Autorización = SÍ</code>
                          </span>
                        </>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono-numbers">
                      Balance Total: {previewBalance.toLocaleString()} mo · Límite 30%: {previewMax30.toLocaleString()} mo · Neto 80% estimado: $
                      {(previewFinalCoins * 0.8 * (1 - redemptionFeeRate / 100)).toFixed(2)} USD
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-[10px] font-bold uppercase tracking-wider text-cyan-300 shrink-0">
                    Requiere Acción Manual de {OWNER_EMAIL}
                  </span>
                </div>
              )}

              {wdValidatorResult && (
                <div
                  className={`p-3 rounded-xl border text-xs font-semibold ${
                    wdValidatorResult.ok
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {wdValidatorResult.message}
                </div>
              )}
            </div>

            {/* Cola de Espera de Autorización */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-100 font-display flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-amber-400" />
                      Cola de Autorización de Canjes de Monedas
                    </h2>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      Solo Propietario ({OWNER_EMAIL})
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      Espera de Autorización: {pendingRedemptionsCount}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                    Los clientes están limitados al <strong className="text-amber-300">30% de su balance total</strong> y cada solicitud nace en{' '}
                    <strong className="text-cyan-300">Espera de Autorización (SÍ)</strong> hasta que tú ({OWNER_EMAIL}) la apruebes o rechaces manualmente en la base de datos.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 font-mono-numbers shrink-0">
                  Total Comisiones {redemptionFeeRate}% Recaudadas:{' '}
                  <strong className="text-slate-100 text-sm">${vaultEconomics.withdrawalFeesCollected.toFixed(2)} USD</strong>
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    { id: 'ALL' as const, label: `Todas (${redemptionRequests.length})` },
                    { id: 'AWAITING' as const, label: `En Espera de Autorización (${pendingRedemptionsCount})` },
                    {
                      id: 'APPROVED' as const,
                      label: `Autorizadas (${redemptionRequests.filter(r => r.status === 'APPROVED').length})`
                    },
                    {
                      id: 'REJECTED' as const,
                      label: `Rechazadas (${redemptionRequests.filter(r => r.status === 'REJECTED').length})`
                    }
                  ] as const
                ).map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setRedemptionStatusFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                      redemptionStatusFilter === tab.id
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Redemptions Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono-numbers divide-y divide-slate-800">
                  <thead>
                    <tr className="text-slate-400 text-[10px] uppercase">
                      <th className="py-3 px-3">ID / Fecha / Sync</th>
                      <th className="py-3 px-3">Jugador</th>
                      <th className="py-3 px-3">Validación 30% Balance</th>
                      <th className="py-3 px-3 text-amber-400 font-bold">20% Bóveda</th>
                      <th className="py-3 px-3 text-emerald-400 font-bold">80% Pago Neto</th>
                      <th className="py-3 px-3">Destino</th>
                      <th className="py-3 px-3 text-cyan-300 font-bold">Espera de Autorización</th>
                      <th className="py-3 px-3">Estado</th>
                      <th className="py-3 px-3 text-right">Acción Manual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filteredRedemptions.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-500">
                          No hay solicitudes de retiro en esta categoría.
                        </td>
                      </tr>
                    ) : (
                      filteredRedemptions.map(req => {
                        const isAwaiting = req.awaitingAuthorization || req.status === 'PENDING_APPROVAL';
                        const pctOfBalance =
                          req.balanceBeforeCoins && req.balanceBeforeCoins > 0
                            ? Math.round((req.amountCoins / req.balanceBeforeCoins) * 1000) / 10
                            : null;
                        const exceedsCapSafety =
                          typeof req.balanceBeforeCoins === 'number' &&
                          req.balanceBeforeCoins > 0 &&
                          req.amountCoins > Math.floor(req.balanceBeforeCoins * 0.3);

                        return (
                          <tr key={req.id} className="hover:bg-slate-950/40 transition-colors">
                            <td className="py-3 px-3">
                              <div className="font-mono text-slate-200">{req.id}</div>
                              <div className="text-[10px] text-slate-500">
                                {new Date(req.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                                {new Date(req.timestamp).toLocaleDateString()}
                              </div>
                              {req.firestoreSynced ? (
                                <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                  Firestore OK
                                </span>
                              ) : isAwaiting && isGoogleOwnerConnected ? (
                                <button
                                  type="button"
                                  onClick={() => void syncRedemptionToFirestore(req)}
                                  className="mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30"
                                >
                                  Subir a Firestore
                                </button>
                              ) : (
                                <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-400">
                                  SQLite Local
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-3">
                              <div className="font-semibold text-slate-200">{req.playerName}</div>
                              <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{req.playerEmail}</div>
                            </td>

                            <td className="py-3 px-3">
                              <div className="font-bold text-amber-300">{req.amountCoins.toLocaleString()} monedas</div>
                              {typeof req.balanceBeforeCoins === 'number' && req.balanceBeforeCoins > 0 && (
                                <div className="text-[10px] text-slate-400">
                                  {pctOfBalance}% de {req.balanceBeforeCoins.toLocaleString()} mo (Tope: {(req.maxAllowed30PctCoins ?? Math.floor(req.balanceBeforeCoins * 0.3)).toLocaleString()})
                                </div>
                              )}
                              {req.cappedAutomatically && (
                                <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  LIMITADO AUTO 30% (de {(req.requestedOriginalCoins ?? req.amountCoins).toLocaleString()} mo)
                                </span>
                              )}
                              {exceedsCapSafety && (
                                <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                  ALERTA: EXCEDE 30%
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-3 font-bold text-amber-400 bg-amber-500/5">
                              +${req.feeUSD.toFixed(2)} USD
                            </td>

                            <td className="py-3 px-3 font-bold text-emerald-400">
                              <div>${req.netUSD.toFixed(2)} USD</div>
                              <div className="text-[10px] text-slate-500 font-normal">Bruto ${req.grossUSD.toFixed(2)}</div>
                            </td>

                            <td className="py-3 px-3">
                              <div className="uppercase text-[10px] text-slate-400 font-bold">{req.destinationType}</div>
                              <div className="font-mono text-[11px] text-slate-300 truncate max-w-[120px]" title={req.destinationAddress}>
                                {req.destinationAddress}
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              {isAwaiting ? (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                    <Clock className="w-3 h-3" />
                                    SÍ (ESPERA ACCIÓN)
                                  </span>
                                  <div className="text-[10px] text-slate-400">Requiere: {OWNER_EMAIL}</div>
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                    NO (RESUELTA)
                                  </span>
                                  <div className="text-[10px] text-slate-500">
                                    Por: {req.authorizedByEmail || OWNER_EMAIL}
                                  </div>
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-3 space-y-1">
                              {req.status === 'PENDING_APPROVAL' && (
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  PENDIENTE
                                </span>
                              )}
                              {req.status === 'APPROVED' && (
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                                  AUTORIZADO
                                </span>
                              )}
                              {req.status === 'REJECTED' && (
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                                  RECHAZADO
                                </span>
                              )}
                              {req.payoutStatus && (
                                <div className="font-mono text-[10px] text-cyan-300">
                                  {req.payoutStatus}
                                </div>
                              )}
                              {req.externalPayoutId && (
                                <div className="font-mono text-[9px] text-slate-400 truncate max-w-[130px]" title={req.externalPayoutId}>
                                  Ref: {req.externalPayoutId}
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-3 text-right">
                              {isAwaiting ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    disabled={exceedsCapSafety}
                                    onClick={async () => {
                                      await approveRedemptionRequest(req.id);
                                    }}
                                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow transition-transform active:scale-95 disabled:opacity-40"
                                    title="Autorizar manualmente y liberar pago (desactiva Espera de Autorización)"
                                  >
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    Autorizar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await rejectRedemptionRequest(req.id, 'Rechazado manualmente por trabajofino52@gmail.com');
                                    }}
                                    className="px-2 py-1.5 bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 rounded-lg text-xs font-bold transition-colors"
                                    title="Rechazar manualmente y reembolsar monedas"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-500 italic">
                                  Revisado {req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString() : ''}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB: VAULT SPLIT ECONOMICS (70% BÓVEDA / 30% PREMIOS) */}
      {activeTab === 'vault_split' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-100 font-display flex items-center gap-2">
                <PieChart className="w-5 h-5 text-amber-400" />
                Matemática de Rentabilidad: {vaultRetentionRate}% Bóveda + {redemptionFeeRate}% Comisión de Retiro
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Por cada 100% apostado en la plataforma, el {vaultRetentionRate}% queda retenido permanentemente en la Bóveda del Dueño. Solo el {playerPrizeRate}% entra al fondo de premios disponible para repartir entre jugadores ganadores, sumado al {redemptionFeeRate}% automático cobrado en cada retiro.
              </p>
            </div>

            {/* Split Visualization Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-amber-400 flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-amber-500 inline-block" />
                  {vaultRetentionRate}% Bóveda del Dueño (Retención de Casa)
                </span>
                <span className="text-cyan-400 flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-cyan-500 inline-block" />
                  {playerPrizeRate}% Fondo de Premios (Distribuible)
                </span>
              </div>
              <div className="h-6 w-full rounded-xl bg-slate-950 overflow-hidden flex p-1 border border-slate-800 gap-1">
                <div
                  className="bg-gradient-to-r from-amber-600 to-amber-400 rounded-lg flex items-center justify-center text-[11px] font-black text-slate-950 transition-all duration-300"
                  style={{ width: `${vaultRetentionRate}%` }}
                >
                  {vaultRetentionRate}% BÓVEDA
                </div>
                <div
                  className="bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-lg flex items-center justify-center text-[11px] font-black text-slate-950 transition-all duration-300"
                  style={{ width: `${playerPrizeRate}%` }}
                >
                  {playerPrizeRate}% PREMIOS
                </div>
              </div>
            </div>

            {/* Interactive Dynamic Margin Sliders for the Owner */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Ajuste Dinámico de Porcentajes del Dueño
                  </span>
                </div>
                <span className="text-[10px] text-amber-400 font-mono bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded">
                  Control Exclusivo {OWNER_EMAIL}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Retention Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">Margen Retención Bóveda:</span>
                    <span className="font-mono font-bold text-amber-400 text-sm">{sliderRetention}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="90"
                    step="1"
                    value={sliderRetention}
                    onChange={e => setSliderRetention(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>50% (Competitivo)</span>
                    <span>70% (Predeterminado)</span>
                    <span>90% (Máximo Margen)</span>
                  </div>
                </div>

                {/* Fee Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">Comisión Retiro PayPal/USDT:</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">{sliderFee}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="35"
                    step="1"
                    value={sliderFee}
                    onChange={e => setSliderFee(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>5% (Mínimo)</span>
                    <span>20% (Estándar Bóveda)</span>
                    <span>35% (Premium)</span>
                  </div>
                </div>

                {/* P2P Transfer Fee Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">Comisión Transferencia P2P:</span>
                    <span className="font-mono font-bold text-cyan-400 text-sm">{sliderTransferFee}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    step="1"
                    value={sliderTransferFee}
                    onChange={e => setSliderTransferFee(Number(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>0% (Gratis)</span>
                    <span>5% (Estándar Casino)</span>
                    <span>25% (Máximo)</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">
                  Fondo premios: <strong className="text-cyan-400">{100 - sliderRetention}%</strong> · Retiro: <strong className="text-emerald-400">{sliderFee}%</strong> · P2P: <strong className="text-cyan-300">{sliderTransferFee}%</strong>.
                </span>
                <button
                  onClick={handleSaveMargins}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{marginsSaved ? '¡Márgenes Actualizados en Servidor!' : 'Guardar Nuevos Márgenes'}</span>
                </button>
              </div>
            </div>

            {/* Detailed Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-500/30 space-y-2">
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  1. Retención en Bóveda ({vaultRetentionRate}%)
                </div>
                <div className="text-2xl font-black text-slate-100 font-mono tabular-nums">
                  {vaultEconomics.houseVaultShare.toLocaleString()} <span className="text-xs text-amber-400">monedas</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Equivale a un estimado de <strong>${(vaultEconomics.houseVaultShare * 0.8).toLocaleString()} USD</strong> en ganancias brutas directas acumuladas en tu tesorería.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 space-y-2">
                <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  2. Reserva para Premios ({playerPrizeRate}%)
                </div>
                <div className="text-2xl font-black text-slate-100 font-mono tabular-nums">
                  {vaultEconomics.playerPrizeReserve.toLocaleString()} <span className="text-xs text-cyan-400">monedas</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Tope máximo que el algoritmo asigna a la ruleta, póker y blackjack para recompensas a jugadores con rachas ganadoras.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  3. Tarifa de Retiro ({redemptionFeeRate}%)
                </div>
                <div className="text-2xl font-black text-emerald-400 font-mono tabular-nums">
                  ${vaultEconomics.withdrawalFeesCollected.toFixed(2)} USD
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Cobradas de forma automática cuando un jugador canjea monedas por PayPal o USDT previa autorización.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-cyan-500/30 space-y-2">
                <div className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                  4. Comisión P2P ({transferFeeRate}%)
                </div>
                <div className="text-2xl font-black text-cyan-300 font-mono tabular-nums">
                  {transferFeeRate}% <span className="text-xs text-slate-400">por envío</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Deducida automáticamente en cada transferencia de monedas entre jugadores en vivo antes de acreditar al receptor.
                </p>
              </div>
            </div>

            {/* Summary Formula */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2">
              <div className="font-semibold text-slate-200">
                Fórmula de Ganancia Neta Total de la Bóveda:
              </div>
              <div className="font-mono text-amber-300 bg-slate-900 p-3 rounded-xl border border-slate-800/80">
                Beneficio = (Recargas Tier 1-10) + ({vaultRetentionRate}% Volumen Apostado) + ({redemptionFeeRate}% Comisión Retiro) + ({transferFeeRate}% Comisión P2P) + (Ascensión Nivel 11-100)
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB: SERVER TELEMETRY DEBIAN 13 & LIVE PLAYERS */}
      {activeTab === 'server_telemetry' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-100 font-display flex items-center gap-2">
                  <Server className="w-5 h-5 text-emerald-400" />
                  Monitor del Servidor en Vivo & Jugadores
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Recursos en tiempo real del nodo de alta disponibilidad ejecutando NGINX, Node.js y WebSocket Daemon
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Servidor Cloud E2EE OK
                </span>
              </div>
            </div>

            {/* Hardware Resources Gauges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    CPU Load (4 Cores)
                  </span>
                  <span className="font-mono text-cyan-300 font-bold">{serverMetrics.cpuPercent}%</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                  <div className="bg-cyan-500 h-2 rounded-full" style={{ width: `${serverMetrics.cpuPercent}%` }} />
                </div>
                <div className="text-[10px] text-slate-500 truncate">{serverMetrics.cpuModel}</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-amber-400" />
                    Memoria RAM
                  </span>
                  <span className="font-mono text-amber-300 font-bold">
                    {serverMetrics.ramUsedGB}GB / {serverMetrics.ramTotalGB}GB
                  </span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                  <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${(serverMetrics.ramUsedGB / serverMetrics.ramTotalGB) * 100}%` }} />
                </div>
                <div className="text-[10px] text-slate-500">Uso: 36.2% (Node + PostgreSQL + Redis Cache)</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4 text-emerald-400" />
                    Disco SSD NVMe
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {serverMetrics.diskUsedGB}GB / {serverMetrics.diskTotalGB}GB
                  </span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${(serverMetrics.diskUsedGB / serverMetrics.diskTotalGB) * 100}%` }} />
                </div>
                <div className="text-[10px] text-slate-500">101.8 GB libres para registros de auditoría</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-purple-400" />
                    Red & Latencia
                  </span>
                  <span className="font-mono text-purple-300 font-bold">{serverMetrics.pingMs} ms</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">NGINX:</span>
                  <span className="text-emerald-400 font-bold">ACTIVO SSL</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">PM2 Daemon:</span>
                  <span className="text-emerald-400 font-bold">ONLINE (Cluster)</span>
                </div>
              </div>

            </div>

            {/* Players Breakdown: Online, Offline, Total */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  Métricas Globales de Jugadores
                </h3>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    En Línea: {onlinePlayersCount}
                  </span>
                  <span className="text-slate-400 font-bold">
                    Desconectados: {offlinePlayersCount}
                  </span>
                  <span className="text-amber-400 font-bold">
                    Total Registrados: {totalPlayersCount}
                  </span>
                </div>
              </div>

              {/* Live Player Sessions Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono-numbers divide-y divide-slate-800/80">
                  <thead>
                    <tr className="text-slate-500 text-[10px] uppercase">
                      <th className="py-2.5 px-3">Jugador / ID</th>
                      <th className="py-2.5 px-3">Nivel (1-100)</th>
                      <th className="py-2.5 px-3">Saldo de Monedas</th>
                      <th className="py-2.5 px-3">Estado</th>
                      <th className="py-2.5 px-3">País / Región</th>
                      <th className="py-2.5 px-3">Dispositivo</th>
                      <th className="py-2.5 px-3 text-right">Última Actividad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-slate-300">
                    {playerSessions.map(player => (
                      <tr key={player.id} className="hover:bg-slate-900/60 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                            {player.name}
                            {player.email === OWNER_EMAIL && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                DUEÑO
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500">{player.email}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-300 font-bold">
                            Nv. {player.level}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-amber-400">
                          {player.coins.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3">
                          {player.status === 'ONLINE' ? (
                            <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                              ONLINE
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500">OFFLINE</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">{player.country}</td>
                        <td className="py-2.5 px-3 text-slate-400">{player.device}</td>
                        <td className="py-2.5 px-3 text-right text-slate-500 text-[11px]">
                          Hace {Math.round((Date.now() - player.lastActive) / 1000)}s
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 1: HOW PAYMENTS WORK EXPLANATION */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-lg font-bold text-slate-100 font-display flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              ¿Dónde cae el dinero que pagan los usuarios?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300 leading-relaxed">
              
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                <div className="font-bold text-amber-400 flex items-center gap-1.5 text-sm">
                  <Coins className="w-4 h-4" />
                  1. Criptoactivos (USDT / USDC)
                </div>
                <p>
                  Los pagos realizados en USDT o USDC (Tron TRC-20, Ethereum ERC-20, Polygon) caen directamente en tu billetera privada configurada en la pestaña <strong className="text-slate-100">"Configurar Cuentas de Cobro"</strong>.
                </p>
                <div className="text-[11px] text-slate-400">
                  Sin intermediarios bancarios ni comisiones de terceros.
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                <div className="font-bold text-cyan-400 flex items-center gap-1.5 text-sm">
                  <CreditCard className="w-4 h-4" />
                  2. Tarjetas Internacionales (Stripe)
                </div>
                <p>
                  Los pagos con tarjeta Visa, Mastercard o American Express se liquidan a través de tu cuenta de comerciante Stripe vinculada y se transfieren a tu cuenta bancaria.
                </p>
                <div className="text-[11px] text-slate-400">
                  Liquidación estándar en 24-48 horas hábiles.
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                <div className="font-bold text-emerald-400 flex items-center gap-1.5 text-sm">
                  <Building2 className="w-4 h-4" />
                  3. Transferencias Bancarias (SWIFT / SEPA)
                </div>
                <p>
                  Para compras de paquetes de alta denominación (hasta 10,000 monedas), los usuarios reciben tus datos IBAN y código SWIFT/BIC para transferencias directas a tu banco.
                </p>
                <div className="text-[11px] text-slate-400">
                  Depósito directo en tu cuenta comercial.
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DESTINATIONS CONFIG & USDT PURCHASE ORDERS */}
      {activeTab === 'destinations' && (
        <div className="space-y-6">
          <form onSubmit={handleSaveDestinations} className="space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-100 font-display">
                    Destinos de Cobro USDT & Bóveda del Administrador
                  </h2>
                  <p className="text-xs text-slate-400">
                    Configura tus billeteras USDT donde caen los pagos de compra de monedas de los jugadores (guardadas con cifrado AES-256-GCM en el servidor).
                  </p>
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSaved ? '¡Guardado en Bóveda!' : 'Guardar y Activar Bóvedas USDT'}</span>
                </button>
              </div>

              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    Enrutamiento Automático de Todas las Compras a Cuenta USDT
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Cuando está activo, tanto pagos directos cripto como compras por tarjeta/PayPal/banco se liquidan contablemente hacia tu cuenta USDT configurada.
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
                    Cuentas Cripto Receptoras (USDT / Bitcoin BTC)
                  </h3>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300 font-medium">
                      Canal Principal de Liquidación en la Bóveda
                    </label>
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
                    <label className="text-xs text-slate-300 font-medium">
                      Dirección USDT (Red TRC-20 Tron - Bajas Comisiones)
                    </label>
                    <input
                      type="text"
                      value={trc20}
                      onChange={e => setTrc20(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs focus:outline-none focus:border-amber-500"
                      placeholder="TRX..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300 font-medium">
                      Dirección USDT / USDC (Red ERC-20 Ethereum)
                    </label>
                    <input
                      type="text"
                      value={erc20}
                      onChange={e => setErc20(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs focus:outline-none focus:border-amber-500"
                      placeholder="0x..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300 font-medium">
                      Dirección USDT (Red BEP-20 BNB Smart Chain)
                    </label>
                    <input
                      type="text"
                      value={bep20}
                      onChange={e => setBep20(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs focus:outline-none focus:border-amber-500"
                      placeholder="0x..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300 font-medium">
                      Dirección Bitcoin (BTC Native SegWit / BTCPay)
                    </label>
                    <input
                      type="text"
                      value={btcAddress}
                      onChange={e => setBtcAddress(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-amber-200 font-mono text-xs focus:outline-none focus:border-amber-500"
                      placeholder="bc1q..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300 font-medium">
                      Binance Pay Merchant ID (Opcional — solo cuentas Merchant)
                    </label>
                    <input
                      type="text"
                      value={binancePayId}
                      onChange={e => setBinancePayId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs focus:outline-none focus:border-amber-500"
                      placeholder="Solo ID comercial verificado (evitar usar Binance personal directo)"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" />
                    PayPal, Pasarela de Tarjetas & Cuentas Bancarias
                  </h3>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300 font-medium">
                      Pasarela de Tarjeta Crédito / Débito → Crypto / Bóveda
                    </label>
                    <select
                      value={cardGatewayProvider}
                      onChange={e => setCardGatewayProvider(e.target.value as CardGatewayProvider)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 font-bold text-xs focus:outline-none focus:border-cyan-500"
                    >
                      <option value="NOWPAYMENTS_CARD_TO_CRYPTO">NOWPayments / Banxa (Tarjeta Visa/MC → USDT/BTC directo)</option>
                      <option value="BTCPAY_SERVER">BTCPay Server (Autoalojado en VPS Debian 13, 0% comisión)</option>
                      <option value="MOONPAY_ONRAMP">MoonPay / Transak (On-Ramp Fiat → Wallet sin retenciones)</option>
                      <option value="PAYPAL_BUSINESS">PayPal Business Checkout (Créditos Digitales)</option>
                      <option value="STRIPE_DIGITAL">Stripe Merchant (Solo Entidad Registrada)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300 font-medium">
                      Nombre de la Bóveda / Comerciante
                    </label>
                    <input
                      type="text"
                      value={merchant}
                      onChange={e => setMerchant(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs text-slate-300 font-medium">
                        Correo Electrónico PayPal
                      </label>
                      <input
                        type="email"
                        value={paypal}
                        onChange={e => setPaypal(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500"
                        placeholder="pagos@tuempresa.com"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-300 font-medium">
                        Tipo Cuenta
                      </label>
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
                    <label className="text-xs text-slate-300 font-medium">
                      IBAN Bancario Internacional & Código SWIFT/BIC
                    </label>
                    <input
                      type="text"
                      value={iban}
                      onChange={e => setIban(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500"
                      placeholder="ES..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300 font-medium">
                      Nombre del Titular de la Cuenta
                    </label>
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
                      <div className="text-[11px] text-slate-400">Habilita tester01..tester10 y captura continua de logs QA</div>
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

              {/* Advisory Panel: Anti-Freeze & Virtual Visa/Mastercard Guide */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-2.5 text-xs">
                <div className="font-bold text-amber-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Recomendación de Pasarelas Anti-Congelamiento & Tarjeta Virtual Visa/Mastercard
                </div>
                <ul className="space-y-1.5 text-slate-300 text-[11px] leading-relaxed list-disc pl-4">
                  <li>
                    <strong>Binance Personal:</strong> NO conectes tu Binance personal directamente como checkout comercial del juego (Binance detecta depósitos de terceros y puede congelar cuentas personales). Úsalo solo como cartera final receptora desde una pasarela o solicita <em>Binance Pay Merchant</em>.
                  </li>
                  <li>
                    <strong>PayPal Business vs Personal:</strong> Nunca uses PayPal Personal para cobros comerciales (congelamiento casi inmediato). <strong>PayPal Business</strong> es superior, pero restringe juegos de azar; mantenlo solo como respaldo para paquetes digitales y retira saldos rápido.
                  </li>
                  <li>
                    <strong>Mejor Ruta Sin Congelamientos (BTC / USDT + Tarjetas):</strong> Usa <strong>BTCPay Server</strong> (instalable en tu mismo VPS Debian 13, 0% comisión y custodia propia) junto con un procesador fiat-a-crypto (<strong>NOWPayments / MoonPay / Transak</strong>) para que los clientes paguen con Visa/Mastercard y a ti te caiga liquidado directamente en <strong>USDT / BTC</strong>.
                  </li>
                  <li>
                    <strong>Tarjeta Virtual Visa / Mastercard:</strong> Una vez recibas tus fondos en USDT/BTC (o fiat empresarial), puedes usar emisores regulados compatibles con tu país como <strong>RedotPay, Bybit Card, BitPay Card o Wise Business</strong> para gastar con tarjeta virtual Visa/Mastercard.
                  </li>
                </ul>
              </div>
            </div>
          </form>

          {/* Live USDT Incoming Purchase Orders Ledger */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-100 font-display flex items-center gap-2">
                  <Coins className="w-4 h-4 text-emerald-400" />
                  <span>Órdenes de Compra & Depósitos Enrutados a tu Cuenta USDT</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Registro persistente en servidor con bloqueo anti-reutilización de TXID (SHA-256 unique digest).
                </p>
              </div>
              {authToken && (
                <button
                  type="button"
                  onClick={fetchUsdtOrders}
                  disabled={isLoadingUsdtOrders}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition self-start"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsdtOrders ? 'animate-spin' : ''}`} />
                  <span>Refrescar Órdenes</span>
                </button>
              )}
            </div>

            {!authToken ? (
              <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 text-xs text-amber-200">
                Inicia sesión o emite tu Token Seguro en la pestaña <strong>Seguridad App & BD</strong> para inspeccionar y auditar las órdenes USDT del servidor.
              </div>
            ) : usdtOrders.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
                Aún no hay órdenes de compra USDT registradas en la base de datos. Compra un paquete en la Tienda para probar el flujo completo.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase tracking-wider">
                      <th className="py-2.5 px-3">Orden</th>
                      <th className="py-2.5 px-3">Usuario</th>
                      <th className="py-2.5 px-3">Paquete / Monedas</th>
                      <th className="py-2.5 px-3">Red / Wallet Destino</th>
                      <th className="py-2.5 px-3">TXID (Descifrado)</th>
                      <th className="py-2.5 px-3">Estado</th>
                      <th className="py-2.5 px-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono-numbers">
                    {usdtOrders.map(ord => (
                      <tr key={ord.id} className="hover:bg-slate-900/60">
                        <td className="py-2.5 px-3 text-slate-300 font-mono">
                          #{ord.id.slice(-6)}
                        </td>
                        <td className="py-2.5 px-3 text-cyan-300 truncate max-w-[140px]">
                          {ord.userEmail}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-emerald-400">${ord.priceUSD} USD</div>
                          <div className="text-[10px] text-amber-300">+{ord.coinsAmount.toLocaleString()} mo</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            USDT {ord.usdtNetwork}
                          </span>
                          <div className="text-[10px] text-slate-400 font-mono truncate max-w-[130px] mt-0.5">
                            {ord.destinationUsdtWallet}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[10px] text-slate-300 truncate max-w-[140px]" title={ord.txHash || ''}>
                          {ord.txHash || 'Pendiente TX'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              ord.status === 'VERIFIED_SETTLED'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : ord.status === 'REJECTED'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            }`}
                          >
                            {ord.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          {ord.status === 'PENDING_TX' && (
                            <div className="inline-flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleReviewUsdtOrder(ord.id, 'VERIFIED_SETTLED')}
                                className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold"
                              >
                                Aprobar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReviewUsdtOrder(ord.id, 'REJECTED')}
                                className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold"
                              >
                                Rechazar
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: WITHDRAWAL FORM */}
      {activeTab === 'withdraw' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-100 font-display">
                Retirar Beneficios de la Bóveda Principal
              </h2>
              <p className="text-xs text-slate-400">
                Transfiere tu saldo acumulado directamente a tu billetera cripto o cuenta bancaria registrada.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">
                    Monto en USD a Retirar
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      value={withdrawAmount}
                      onChange={e => setWithdrawAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-amber-300 font-mono-numbers font-bold text-lg focus:outline-none focus:border-amber-500"
                      placeholder="500"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Disponible: ${availableBalanceUSD.toLocaleString()} USD</span>
                    <button
                      type="button"
                      onClick={() => setWithdrawAmount(availableBalanceUSD.toString())}
                      className="text-amber-400 font-bold hover:underline"
                    >
                      Retirar Todo (Max)
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">
                    Método de Recepción
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'crypto_usdt' as const, label: 'USDT TRC20', icon: Coins },
                      { id: 'bank_wire' as const, label: 'Banco SWIFT', icon: Building2 },
                      { id: 'paypal' as const, label: 'PayPal', icon: CreditCard }
                    ].map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setWithdrawMethod(m.id)}
                        className={`p-3 rounded-xl border text-xs flex flex-col items-center gap-1.5 transition-all ${
                          withdrawMethod === m.id
                            ? 'bg-amber-500/10 border-amber-500 text-amber-300 font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <m.icon className="w-4 h-4" />
                        <span>{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleExecuteWithdrawal}
                  disabled={isProcessingWd || availableBalanceUSD <= 0}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isProcessingWd ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Liquidando Retiro E2EE...</span>
                    </>
                  ) : (
                    <>
                      <ArrowUpRight className="w-4 h-4 stroke-[3]" />
                      <span>Transferir Fondos a mi Destino</span>
                    </>
                  )}
                </button>
              </div>

              {/* Summary Card */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                <div className="font-semibold text-slate-200 uppercase tracking-wider text-[11px] pb-2 border-b border-slate-800">
                  Resumen de Liquidación
                </div>
                <div className="flex items-center justify-between text-slate-400 font-mono-numbers">
                  <span>Monto de Retiro:</span>
                  <span className="text-slate-100 font-bold">${withdrawAmount || 0} USD</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 font-mono-numbers">
                  <span>Comisión de Transferencia:</span>
                  <span className="text-emerald-400 font-bold">$0.00 USD (Cubierta)</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 font-mono-numbers">
                  <span>Saldo Restante Disponible:</span>
                  <span className="text-amber-400 font-bold">
                    ${Math.max(0, availableBalanceUSD - (parseFloat(withdrawAmount) || 0)).toLocaleString()} USD
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
                  🔒 Cada retiro genera un comprobante criptográfico SHA-256 verificado en la cadena inmutable para respaldar tu contabilidad.
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT LEDGER */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-slate-100 font-display">
                  Libro Contable de Ventas & Retiros del Dueño
                </h2>
                <p className="text-xs text-slate-400">
                  Registro inmutable de todas las recargas de jugadores y extracciones realizadas
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow flex items-center gap-1.5 transition-transform active:scale-95"
                  title="Descargar libro de contabilidad completo en formato CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar CSV Oficial</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 flex items-center gap-1.5 transition-transform active:scale-95"
                  title="Descargar registro técnico JSON con verificación SHA-256"
                >
                  <Lock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Auditoría JSON E2EE</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Retiros del Administrador
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono-numbers divide-y divide-slate-800">
                  <thead>
                    <tr className="text-slate-400 text-[10px] uppercase">
                      <th className="py-2">ID</th>
                      <th className="py-2">Fecha</th>
                      <th className="py-2">Monto USD</th>
                      <th className="py-2">Método</th>
                      <th className="py-2">Destino</th>
                      <th className="py-2">Estado</th>
                      <th className="py-2">Hash TX</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {adminWithdrawals.map(wd => (
                      <tr key={wd.id} className="hover:bg-slate-950/40">
                        <td className="py-2.5 font-mono text-slate-400">{wd.id}</td>
                        <td className="py-2.5 text-slate-400">{new Date(wd.timestamp).toLocaleDateString()}</td>
                        <td className="py-2.5 font-bold text-emerald-400">${wd.amountUSD.toLocaleString()} USD</td>
                        <td className="py-2.5 uppercase text-slate-300">{wd.destinationType}</td>
                        <td className="py-2.5 truncate max-w-[140px] text-slate-400">{wd.destinationAddress}</td>
                        <td className="py-2.5 text-emerald-400">PROCESADO</td>
                        <td className="py-2.5 font-mono text-[10px] text-slate-500">{wd.txHash.slice(0, 14)}...</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB: SUPPORT TICKETS CONTROL DASHBOARD */}
      {activeTab === 'support_tickets' && (() => {
        const countByStatus = {
          ABIERTO: supportTickets.filter(t => t.status === 'ABIERTO').length,
          EN_REVISION: supportTickets.filter(t => t.status === 'EN_REVISION').length,
          RESPONDIDO: supportTickets.filter(t => t.status === 'RESPONDIDO').length,
          RESUELTO: supportTickets.filter(t => t.status === 'RESUELTO').length,
          REEMBOLSO_PROCESADO: supportTickets.filter(t => t.status === 'REEMBOLSO_PROCESADO').length
        };

        const statusBadgeMap: Record<TicketStatus, { label: string; className: string }> = {
          ABIERTO: { label: 'Abierto', className: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
          EN_REVISION: { label: 'En Revisión', className: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
          RESPONDIDO: { label: 'Respondido', className: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
          RESUELTO: { label: 'Resuelto', className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
          REEMBOLSO_PROCESADO: { label: 'Reembolso Procesado', className: 'bg-purple-500/20 text-purple-300 border-purple-500/40' }
        };

        const filteredTickets = supportTickets.filter(t => {
          const matchesFilter = ticketStatusFilter === 'ALL' || t.status === ticketStatusFilter;
          const q = ticketSearchQuery.trim().toLowerCase();
          const matchesSearch =
            !q ||
            t.id.toLowerCase().includes(q) ||
            t.userEmail.toLowerCase().includes(q) ||
            t.userName.toLowerCase().includes(q) ||
            t.subject.toLowerCase().includes(q) ||
            (t.paymentTxHash && t.paymentTxHash.toLowerCase().includes(q));
          return matchesFilter && matchesSearch;
        });

        const activeTicket =
          filteredTickets.find(t => t.id === selectedAdminTicketId) ||
          supportTickets.find(t => t.id === selectedAdminTicketId) ||
          (filteredTickets.length > 0 ? filteredTickets[0] : null);

        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header & KPI Metrics Strip */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-xl font-bold text-slate-100 font-display flex items-center gap-2">
                    <LifeBuoy className="w-5 h-5 text-amber-400" />
                    Tablero de Control Administrativo: Tickets de Soporte
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Supervisa todos los tickets recibidos, audita reclamos de pagos y actualiza estados a <strong>En Revisión</strong>, <strong>Resuelto</strong> o <strong>Reembolso Procesado</strong>.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold">
                    {openTicketsCount} Activos / Sin Cerrar
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono">
                    Total Recibidos: {supportTickets.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const headers = ['ID', 'Fecha', 'Usuario', 'Email', 'Categoria', 'Prioridad', 'Estado', 'Asunto', 'Monedas', 'HashTX'];
                      const rows = supportTickets.map(t => [
                        t.id,
                        new Date(t.updatedAt).toISOString(),
                        `"${t.userName.replace(/"/g, '""')}"`,
                        t.userEmail,
                        t.category,
                        t.priority,
                        t.status,
                        `"${t.subject.replace(/"/g, '""')}"`,
                        t.paymentAmountCoins || 0,
                        t.paymentTxHash || ''
                      ]);
                      const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                      const link = document.createElement('a');
                      link.setAttribute('href', encodeURI(csv));
                      link.setAttribute('download', `tickets_soporte_${new Date().toISOString().slice(0, 10)}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      soundFx.playCoinChime();
                      addNotification('Reporte CSV Descargado', 'Listado completo de tickets y estados exportado correctamente.', 'success');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold flex items-center gap-1.5 transition"
                    title="Exportar reporte completo de tickets de soporte en CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exportar CSV</span>
                  </button>
                </div>
              </div>

              {/* 5 Status KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Recibidos</span>
                  <div className="text-lg font-bold text-slate-100 font-mono-numbers">{supportTickets.length}</div>
                </div>
                <div className="p-3 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-0.5">
                  <span className="text-[10px] text-amber-300 uppercase tracking-wider block">Abiertos</span>
                  <div className="text-lg font-bold text-amber-400 font-mono-numbers">{countByStatus.ABIERTO}</div>
                </div>
                <div className="p-3 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-0.5">
                  <span className="text-[10px] text-cyan-300 uppercase tracking-wider block">En Revisión</span>
                  <div className="text-lg font-bold text-cyan-400 font-mono-numbers">{countByStatus.EN_REVISION}</div>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-0.5">
                  <span className="text-[10px] text-emerald-300 uppercase tracking-wider block">Resueltos</span>
                  <div className="text-lg font-bold text-emerald-400 font-mono-numbers">{countByStatus.RESUELTO}</div>
                </div>
                <div className="p-3 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-0.5">
                  <span className="text-[10px] text-purple-300 uppercase tracking-wider block">Reembolso Procesado</span>
                  <div className="text-lg font-bold text-purple-300 font-mono-numbers">{countByStatus.REEMBOLSO_PROCESADO}</div>
                </div>
              </div>

              {/* Filter Tabs & Search Input */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: 'ALL' as const, label: `Todos (${supportTickets.length})` },
                      { id: 'ABIERTO' as const, label: `Abiertos (${countByStatus.ABIERTO})` },
                      { id: 'EN_REVISION' as const, label: `En Revisión (${countByStatus.EN_REVISION})` },
                      { id: 'RESPONDIDO' as const, label: `Respondidos (${countByStatus.RESPONDIDO})` },
                      { id: 'RESUELTO' as const, label: `Resueltos (${countByStatus.RESUELTO})` },
                      { id: 'REEMBOLSO_PROCESADO' as const, label: `Reembolso Procesado (${countByStatus.REEMBOLSO_PROCESADO})` }
                    ] as const
                  ).map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        setTicketStatusFilter(f.id);
                        soundFx.playClick();
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                        ticketStatusFilter === f.id
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="relative w-full lg:w-72">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={ticketSearchQuery}
                    onChange={e => setTicketSearchQuery(e.target.value)}
                    placeholder="Buscar por usuario, ID, asunto o TXID..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Received Tickets Control Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase tracking-wider bg-slate-950/90">
                      <th className="py-3 px-4">Ticket / Fecha</th>
                      <th className="py-3 px-4">Usuario</th>
                      <th className="py-3 px-4">Asunto / Categoría</th>
                      <th className="py-3 px-4">Monto / Ref TX</th>
                      <th className="py-3 px-4">Estado Actual</th>
                      <th className="py-3 px-4 text-right">Cambiar Estado Rápido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {filteredTickets.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-slate-500 text-xs">
                          No se encontraron tickets con los filtros actuales.
                        </td>
                      </tr>
                    ) : (
                      filteredTickets.map(tkt => {
                        const isSelected = activeTicket?.id === tkt.id;
                        const badge = statusBadgeMap[tkt.status] || statusBadgeMap.ABIERTO;
                        return (
                          <tr
                            key={tkt.id}
                            onClick={() => {
                              setSelectedAdminTicketId(tkt.id);
                              if (tkt.paymentAmountCoins) {
                                setCreditCoinsInput(String(tkt.paymentAmountCoins));
                              } else {
                                setCreditCoinsInput('0');
                              }
                              soundFx.playClick();
                            }}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-amber-500/10' : 'hover:bg-slate-900/70'
                            }`}
                          >
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="font-mono font-bold text-slate-200">#{tkt.id.slice(-6)}</div>
                              <div className="text-[10px] text-slate-500">
                                {new Date(tkt.updatedAt).toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-cyan-300 truncate max-w-[160px]">{tkt.userName}</div>
                              <div className="text-[10px] text-slate-400 font-mono truncate max-w-[160px]">{tkt.userEmail}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-100 truncate max-w-[230px]">{tkt.subject}</div>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                                <span className="text-slate-400">{tkt.category}</span>
                                <span
                                  className={`font-bold px-1.5 py-0.2 rounded ${
                                    tkt.priority === 'URGENTE'
                                      ? 'bg-rose-500/20 text-rose-300'
                                      : tkt.priority === 'ALTA'
                                      ? 'bg-amber-500/20 text-amber-300'
                                      : 'bg-slate-800 text-slate-300'
                                  }`}
                                >
                                  {tkt.priority}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              {tkt.paymentAmountCoins ? (
                                <div className="text-emerald-400 font-mono font-bold">
                                  {tkt.paymentAmountCoins.toLocaleString()} mo (${(tkt.paymentAmountCoins * 0.8).toFixed(0)} USD)
                                </div>
                              ) : (
                                <span className="text-slate-500">—</span>
                              )}
                              {tkt.paymentTxHash && (
                                <div className="text-[10px] font-mono text-slate-400 truncate max-w-[130px]">
                                  {tkt.paymentTxHash}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${badge.className}`}>
                                {badge.label}
                              </span>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap text-right" onClick={e => e.stopPropagation()}>
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={tkt.status === 'EN_REVISION'}
                                  onClick={() => updateSupportTicketStatus(tkt.id, 'EN_REVISION')}
                                  title="Cambiar estado a En Revisión"
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                                    tkt.status === 'EN_REVISION'
                                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 opacity-60 cursor-default'
                                      : 'bg-slate-900 hover:bg-cyan-950/60 text-cyan-300 border-slate-700 hover:border-cyan-500/50'
                                  }`}
                                >
                                  En Revisión
                                </button>
                                <button
                                  type="button"
                                  disabled={tkt.status === 'RESUELTO'}
                                  onClick={() => updateSupportTicketStatus(tkt.id, 'RESUELTO')}
                                  title="Cambiar estado a Resuelto"
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                                    tkt.status === 'RESUELTO'
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 opacity-60 cursor-default'
                                      : 'bg-slate-900 hover:bg-emerald-950/60 text-emerald-300 border-slate-700 hover:border-emerald-500/50'
                                  }`}
                                >
                                  Resuelto
                                </button>
                                <button
                                  type="button"
                                  disabled={tkt.status === 'REEMBOLSO_PROCESADO'}
                                  onClick={() =>
                                    updateSupportTicketStatus(
                                      tkt.id,
                                      'REEMBOLSO_PROCESADO',
                                      undefined,
                                      tkt.paymentAmountCoins
                                    )
                                  }
                                  title="Marcar como Reembolso Procesado"
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                                    tkt.status === 'REEMBOLSO_PROCESADO'
                                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 opacity-60 cursor-default'
                                      : 'bg-slate-900 hover:bg-purple-950/60 text-purple-300 border-slate-700 hover:border-purple-500/50'
                                  }`}
                                >
                                  Reembolso Procesado
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Selected Ticket Inspector & Full Status Action Console */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                {activeTicket ? (
                  <div className="space-y-4">
                    {/* Header Details & Current Badge */}
                    <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <span>{activeTicket.subject}</span>
                          <span className="text-xs font-mono text-slate-500">#{activeTicket.id.slice(-6)}</span>
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-1">
                          <span>Usuario: <strong className="text-cyan-300">{activeTicket.userEmail}</strong></span>
                          <span>Categoría: <strong className="text-slate-300">{activeTicket.category}</strong></span>
                          {activeTicket.paymentGateway && (
                            <span>Pasarela: <strong className="text-amber-300">{activeTicket.paymentGateway}</strong></span>
                          )}
                          {activeTicket.paymentAmountCoins && (
                            <span>Monto Reclamado: <strong className="text-emerald-400">{activeTicket.paymentAmountCoins.toLocaleString()} mo (${(activeTicket.paymentAmountCoins * 0.8).toFixed(2)} USD)</strong></span>
                          )}
                        </div>
                        {activeTicket.paymentTxHash && (
                          <div className="mt-1.5 text-[11px] font-mono bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg text-slate-300 inline-block">
                            TX Hash / Ref: {activeTicket.paymentTxHash}
                          </div>
                        )}
                      </div>
                      <span
                        className={`self-start px-3 py-1 rounded-full text-xs font-bold border ${
                          (statusBadgeMap[activeTicket.status] || statusBadgeMap.ABIERTO).className
                        }`}
                      >
                        {(statusBadgeMap[activeTicket.status] || statusBadgeMap.ABIERTO).label}
                      </span>
                    </div>

                    {/* Messages Thread */}
                    <div className="space-y-3 max-h-[240px] overflow-y-auto pr-2">
                      {activeTicket.messages.map(msg => (
                        <div
                          key={msg.id}
                          className={`p-3 rounded-xl border text-xs ${
                            msg.isAdmin
                              ? 'bg-amber-950/20 border-amber-500/30 ml-6'
                              : 'bg-slate-900 border-slate-800 mr-6'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={`font-bold ${msg.isAdmin ? 'text-amber-300' : 'text-cyan-300'}`}>
                              {msg.senderName} {msg.isAdmin && '👑 (Admin)'}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(msg.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-slate-200 whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      ))}
                    </div>

                    {/* Reply Box + 1-Click Canned Replies + Direct Status Management Console */}
                    <div className="space-y-4 pt-3 border-t border-slate-800">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mr-1">
                          Respuestas Rápidas:
                        </span>
                        {[
                          { label: '🔍 Validando Hash USDT', text: 'Estamos validando tu Hash TXID en la red Tron TRC-20. En unos minutos recibirás la actualización.' },
                          { label: '✅ Depósito Acreditado', text: 'Tu depósito ha sido confirmado y las monedas ya se encuentran acreditadas en tu cuenta.' },
                          { label: '💸 Reembolso Emitido', text: 'Hemos procesado el reembolso correspondiente al método de pago original. El caso queda actualizado.' },
                          { label: '🛡️ Cuenta Activada', text: 'Tu cuenta real ha quedado verificada y activada tras la confirmación de tu depósito.' }
                        ].map((tpl, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setAdminReplyText(tpl.text);
                              soundFx.playClick();
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-[10px] text-slate-300 hover:text-amber-300 transition"
                          >
                            {tpl.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Escribir respuesta oficial al usuario..."
                          value={adminReplyText}
                          onChange={e => setAdminReplyText(e.target.value)}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!adminReplyText.trim()) return;
                            replyToTicket(activeTicket.id, adminReplyText.trim(), true);
                            setAdminReplyText('');
                            soundFx.playClick();
                          }}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Responder
                        </button>
                      </div>

                      {/* Status Control & Refund/Resolution Console */}
                      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                        <div className="text-xs font-bold text-slate-200 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-amber-400" />
                            <span>Cambiar Estado del Ticket & Procesar Reembolso / Acreditación</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Ticket #{activeTicket.id.slice(-6)}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] text-slate-400 block mb-1">
                              Monedas a Acreditar / Reembolsar (0 = solo actualizar estado)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={creditCoinsInput}
                              onChange={e => setCreditCoinsInput(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-400"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-400 block mb-1">
                              Nota Administrativa / Motivo del Cambio de Estado
                            </label>
                            <input
                              type="text"
                              placeholder="Ej: Validado en blockchain / Reembolso emitido a tarjeta"
                              value={resolutionNotesInput}
                              onChange={e => setResolutionNotesInput(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                            />
                          </div>
                        </div>

                        {/* 3 Requested Status Action Buttons + Reopen */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              updateSupportTicketStatus(
                                activeTicket.id,
                                'EN_REVISION',
                                resolutionNotesInput.trim() || undefined
                              );
                              setResolutionNotesInput('');
                            }}
                            className={`py-2.5 px-3 rounded-xl font-bold text-xs border flex items-center justify-center gap-1.5 transition ${
                              activeTicket.status === 'EN_REVISION'
                                ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200'
                                : 'bg-cyan-950/40 hover:bg-cyan-900/50 border-cyan-500/40 text-cyan-300'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>En Revisión</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const amt = parseInt(creditCoinsInput, 10) || 0;
                              if (amt > 0) {
                                resolveSupportTicket(
                                  activeTicket.id,
                                  amt,
                                  resolutionNotesInput.trim() || undefined
                                );
                              } else {
                                updateSupportTicketStatus(
                                  activeTicket.id,
                                  'RESUELTO',
                                  resolutionNotesInput.trim() || undefined
                                );
                              }
                              setCreditCoinsInput('0');
                              setResolutionNotesInput('');
                            }}
                            className={`py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition ${
                              activeTicket.status === 'RESUELTO'
                                ? 'bg-emerald-500 text-slate-950 shadow-lg'
                                : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 text-slate-950 shadow'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Resuelto</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const amt = parseInt(creditCoinsInput, 10) || 0;
                              updateSupportTicketStatus(
                                activeTicket.id,
                                'REEMBOLSO_PROCESADO',
                                resolutionNotesInput.trim() || undefined,
                                amt > 0 ? amt : undefined
                              );
                              setCreditCoinsInput('0');
                              setResolutionNotesInput('');
                            }}
                            className={`py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition ${
                              activeTicket.status === 'REEMBOLSO_PROCESADO'
                                ? 'bg-purple-500 text-white shadow-lg'
                                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white shadow'
                            }`}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reembolso Procesado</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              updateSupportTicketStatus(
                                activeTicket.id,
                                'ABIERTO',
                                resolutionNotesInput.trim() || 'Ticket reabierto para seguimiento adicional.'
                              );
                              setResolutionNotesInput('');
                            }}
                            className="py-2.5 px-3 rounded-xl font-semibold text-xs bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center gap-1.5 transition"
                          >
                            <span>Reabrir Ticket</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs py-16">
                    <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
                    <span>Selecciona un ticket de la tabla superior para ver su historial y gestionar su estado.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB: VM QA EXPERIENCE LOGS & 10 TESTERS SANDBOX */}
      {activeTab === 'vm_qa_logs' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="p-6 rounded-3xl bg-slate-900 border border-cyan-500/30 space-y-5 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-slate-100 font-display flex items-center gap-2">
                  <Activity className="w-5 h-5 text-cyan-400" />
                  <span>Bitácora de Experiencia VM & 10 Testers Simultáneos</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                  Registra cada partida, pago, fallo de JavaScript o reporte de tus 10 testers en máquina virtual. Exporta el reporte completo para depurar cualquier inconveniente antes de subir al VPS.
                </p>
              </div>
              {authToken && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchVmExperienceLogs}
                    disabled={isLoadingVmLogs}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingVmLogs ? 'animate-spin' : ''}`} />
                    <span>Refrescar</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportVmReport}
                    className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar Reporte (.json)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearVmLogs}
                    className="px-3 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 border border-rose-500/40 text-rose-200 text-xs font-bold"
                  >
                    Limpiar Logs
                  </button>
                </div>
              )}
            </div>

            {!authToken ? (
              <div className="p-5 rounded-2xl bg-slate-950 border border-amber-500/30 text-xs text-amber-200">
                Inicia sesión con tu clave de propietario en <strong>Seguridad App & BD</strong> o desde el botón de sesión para administrar los 10 testers y descargar los logs del servidor.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Cupo Testers VM</span>
                    <div className="text-lg font-black text-cyan-300 font-mono-numbers">
                      {vmLogsSummary.activeTestersCount} / {vmLogsSummary.maxVmTesters}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Experiencias Guardadas</span>
                    <div className="text-lg font-black text-emerald-400 font-mono-numbers">{vmLogsSummary.totalLogs}</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Errores Capturados</span>
                    <div className="text-lg font-black text-rose-400 font-mono-numbers">{vmLogsSummary.errorsCount}</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Reportes de Fallos</span>
                    <div className="text-lg font-black text-amber-400 font-mono-numbers">{vmLogsSummary.bugReportsCount}</div>
                  </div>
                </div>

                {/* 10 VM Tester Accounts Grid */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      10 Cuentas Aisladas para Pruebas en Máquina Virtual (Clave: vmtest2026)
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                    {vmTesters.map(tester => (
                      <div
                        key={tester.id}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-cyan-200 truncate">
                            {tester.email.split('@')[0]}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            {tester.isActive ? 'ACTIVO' : 'INACTIVO'}
                          </span>
                        </div>
                        <div className="text-[11px] text-amber-300 font-mono-numbers">
                          {tester.coinsBalance.toLocaleString()} mo ($5,000)
                        </div>
                        <button
                          type="button"
                          onClick={() => handleResetVmTester(tester.email)}
                          className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-200 transition"
                        >
                          Reiniciar Saldo QA
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Filter Bar */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                  {(['ALL', 'ERROR', 'BUG_REPORT', 'WARN', 'INFO'] as const).map(sev => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setVmLogSeverityFilter(sev)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        vmLogSeverityFilter === sev
                          ? 'bg-cyan-500 text-slate-950'
                          : 'bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {sev === 'ALL' ? 'Todos los Eventos' : sev}
                    </button>
                  ))}
                </div>

                {/* Experience Logs Table */}
                <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/70">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase tracking-wider">
                        <th className="py-2.5 px-3">Hora</th>
                        <th className="py-2.5 px-3">Usuario</th>
                        <th className="py-2.5 px-3">Módulo / Juego</th>
                        <th className="py-2.5 px-3">Severidad</th>
                        <th className="py-2.5 px-3">Experiencia / Detalle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {vmLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-500">
                            Sin registros todavía. Conecta a cualquiera de tus 10 testers o juega una partida para ver los logs en tiempo real.
                          </td>
                        </tr>
                      ) : (
                        vmLogs.map(item => (
                          <tr key={item.id} className="hover:bg-slate-900/60">
                            <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap font-mono text-[11px]">
                              {new Date(item.timestamp).toLocaleTimeString()}
                            </td>
                            <td className="py-2.5 px-3 text-cyan-300 font-mono truncate max-w-[140px]">
                              {item.userEmail}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono">
                                {item.gameName} ({item.category})
                              </span>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                  item.severity === 'ERROR'
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                    : item.severity === 'BUG_REPORT'
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    : item.severity === 'WARN'
                                    ? 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30'
                                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                }`}
                              >
                                {item.severity}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-200 max-w-md">
                              <div className="font-medium">{item.summary}</div>
                              {item.detailsJson && item.detailsJson !== '{}' && (
                                <div className="text-[10px] font-mono text-slate-400 truncate max-w-md" title={item.detailsJson}>
                                  {item.detailsJson}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB: APP & DATABASE SECURITY HARDENING */}
      {activeTab === 'security_hardening' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="p-6 rounded-3xl bg-slate-900 border border-emerald-500/30 space-y-5 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-100 font-display flex items-center gap-2">
                    <Lock className="w-5 h-5 text-emerald-400" />
                    Seguridad Blindada: Aplicación & Base de Datos
                  </h2>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    Producción Activa
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                  Monitoreo en vivo de las capas criptográficas del backend Express + SQLite WAL (AES-256-GCM en reposo, hashing scrypt con salt aleatorio, tokens HMAC-SHA256, anti-fuerza bruta y auditoría encadenada).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {authToken && (
                  <>
                    <button
                      type="button"
                      onClick={fetchSecurityStatus}
                      disabled={isLoadingSecurity}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSecurity ? 'animate-spin' : ''}`} />
                      <span>Actualizar Estado</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRunIntegrityAudit}
                      disabled={isVerifyingIntegrity}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-slate-950 text-xs font-black shadow-lg flex items-center gap-1.5 transition active:scale-95 disabled:opacity-60"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>{isVerifyingIntegrity ? 'Auditando SHA-256...' : 'Auditar Integridad Criptográfica de BD'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {!authToken ? (
              <div className="p-6 rounded-2xl bg-slate-950/90 border border-amber-500/40 space-y-4">
                <div className="flex items-start gap-3">
                  <KeyRound className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-amber-300">
                      Autenticación Criptográfica de Servidor Requerida
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Para consultar los registros inmutables de auditoría y ejecutar la verificación SHA-256 en el servidor, valida tu Clave Maestra de Propietario ({OWNER_EMAIL}) y obtén un token firmado HMAC-SHA256.
                    </p>
                  </div>
                </div>
                <form
                  onSubmit={async e => {
                    e.preventDefault();
                    if (!serverMasterKeyInput.trim()) return;
                    const ok = await loginOwnerWithKey(serverMasterKeyInput.trim());
                    if (ok) {
                      setServerMasterKeyInput('');
                    }
                  }}
                  className="flex flex-col sm:flex-row gap-2 max-w-xl"
                >
                  <input
                    type="password"
                    value={serverMasterKeyInput}
                    onChange={e => setServerMasterKeyInput(e.target.value)}
                    placeholder="Ingresa la Clave Maestra del Propietario..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-amber-400 font-mono"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition"
                  >
                    Emitir Token Seguro
                  </button>
                </form>
              </div>
            ) : (
              <>
                {securityError && (
                  <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs text-rose-200 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{securityError}</span>
                  </div>
                )}

                {/* Integrity, WAF, CSRF & Rate Limiter KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Integridad SQLite</span>
                    <div className={`text-base font-black font-mono ${securityStatus?.integrity.sqliteOk ? 'text-emerald-400' : 'text-amber-300'}`}>
                      {securityStatus ? (securityStatus.integrity.sqliteOk ? 'PRAGMA OK' : 'ALERTA') : '—'}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Cadena SHA-256</span>
                    <div className={`text-base font-black font-mono ${securityStatus?.integrity.chainValid ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {securityStatus ? (securityStatus.integrity.chainValid ? 'ÍNTEGRA' : 'ALTERADA') : '—'}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Score Vulnerabilidades</span>
                    <div className="text-base font-black text-emerald-400 font-mono-numbers">
                      {securityStatus?.vulnerabilityScan ? `${securityStatus.vulnerabilityScan.scorePercent}%` : '—'}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Bloqueos WAF / CSRF</span>
                    <div className="text-base font-black text-cyan-300 font-mono-numbers">
                      {(securityStatus?.rateStats.wafBlockedCount ?? 0) + (securityStatus?.rateStats.csrfBlockedCount ?? 0)}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Cuentas Bloqueadas</span>
                    <div className="text-base font-black text-amber-400 font-mono-numbers">
                      {securityStatus?.integrity.lockedAccountsCount ?? 0}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">IPs Bloqueadas (Rate)</span>
                    <div className="text-base font-black text-purple-300 font-mono-numbers">
                      {securityStatus?.rateStats.blockedRequestsCount ?? 0}
                    </div>
                  </div>
                </div>

                {/* Live Vulnerability Self-Scan Checklist (VM -> VPS) */}
                {securityStatus?.vulnerabilityScan && (
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-100">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>Escáner de Vulnerabilidades App & Servidor</span>
                      </div>
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                        Entorno: {securityStatus.vulnerabilityScan.environmentMode === 'VM_SANDBOX' ? 'PRUEBAS VIRTUAL / DEV' : 'VPS PRODUCCIÓN'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {securityStatus.vulnerabilityScan.checks.map(chk => (
                        <div
                          key={chk.id}
                          className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                            chk.status === 'PASS'
                              ? 'bg-emerald-950/20 border-emerald-500/30'
                              : 'bg-amber-950/20 border-amber-500/40'
                          }`}
                        >
                          {chk.status === 'PASS' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <div className="font-bold text-slate-200">{chk.name}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{chk.detail}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hardening Layers Matrix */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    {
                      title: 'Cifrado en Reposo (Campo)',
                      value: securityStatus?.hardening.encryptionAtRest || 'AES-256-GCM',
                      desc: 'Hashes TXID y destinos sensibles cifrados antes de persistir en disco con IV aleatorio y AuthTag.',
                      icon: Database
                    },
                    {
                      title: 'Hashing de Contraseñas',
                      value: securityStatus?.hardening.passwordHashing || 'scrypt + Salt 128-bit',
                      desc: 'Derivación resistente a fuerza bruta en GPU/ASIC y comparación constant-time (timingSafeEqual).',
                      icon: KeyRound
                    },
                    {
                      title: 'Sesiones & Cookies Seguras',
                      value: securityStatus?.hardening.sessionTokens || 'HMAC-SHA256 + HttpOnly',
                      desc: 'Tokens firmados verificados en cada ruta administrativa y cookies HttpOnly SameSite=Lax.',
                      icon: ShieldCheck
                    },
                    {
                      title: 'WAF Anti-SQLi / XSS / CSRF',
                      value: securityStatus?.hardening.sqlInjectionProtection || 'Prepared SQL + WAF Sensor',
                      desc: 'Detección de inyección SQL/XSS, Path Traversal, bloqueo TRACE/TRACK y validación Origin CSRF.',
                      icon: Lock
                    },
                    {
                      title: 'Rate Limiter & Anti-Replay',
                      value: securityStatus?.hardening.rateLimiter || 'Ventana Deslizante + Índice Único',
                      desc: 'Bloqueo 15 min tras 5 fallos, límite estricto por IP e índice UNIQUE contra doble gasto TXID USDT.',
                      icon: ShieldAlert
                    },
                    {
                      title: 'Motor de Base de Datos',
                      value: securityStatus?.hardening.databaseEngine || 'SQLite WAL + PostgreSQL 17 RLS',
                      desc: `Tamaño actual de bóveda local: ${securityStatus?.integrity.dbSizeKB ?? 0} KB (secure_delete = ON).`,
                      icon: Server
                    }
                  ].map((layer, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <layer.icon className="w-4 h-4 text-emerald-400" />
                          {layer.title}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                          ACTIVO
                        </span>
                      </div>
                      <div className="text-xs font-mono text-amber-300 font-bold">{layer.value}</div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{layer.desc}</p>
                    </div>
                  ))}
                </div>

                {/* Tamper-Evident SHA-256 Audit Logs Table */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <History className="w-4 h-4 text-cyan-400" />
                      <span>Registro de Auditoría Inmutable (Cadena Hash SHA-256)</span>
                    </h3>
                    <span className="text-[11px] font-mono text-slate-400">
                      Últimos {securityStatus?.auditLogs.length ?? 0} eventos criptográficos
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/70">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase tracking-wider bg-slate-950">
                          <th className="py-2.5 px-3">Seq</th>
                          <th className="py-2.5 px-3">Fecha / Hora</th>
                          <th className="py-2.5 px-3">Actor</th>
                          <th className="py-2.5 px-3">IP Origen</th>
                          <th className="py-2.5 px-3">Acción / Severidad</th>
                          <th className="py-2.5 px-3">Detalles</th>
                          <th className="py-2.5 px-3">Hash Encadenado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono-numbers">
                        {(securityStatus?.auditLogs || []).map(log => (
                          <tr key={log.id} className="hover:bg-slate-900/60 transition-colors">
                            <td className="py-2.5 px-3 font-mono text-slate-500">#{log.seq}</td>
                            <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap text-[11px]">
                              {new Date(log.timestamp).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              })}
                            </td>
                            <td className="py-2.5 px-3 text-cyan-300 font-semibold truncate max-w-[150px]">
                              {log.actor_email}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">{log.ip_address}</td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded border mr-1.5 ${
                                  log.severity === 'CRITICAL'
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                    : log.severity === 'WARN'
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                }`}
                              >
                                {log.severity}
                              </span>
                              <span className="font-mono text-slate-200 text-[11px]">{log.action}</span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-300 font-sans max-w-xs truncate" title={log.details}>
                              {log.details}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[10px] text-emerald-400/90" title={log.row_hash}>
                              {log.row_hash.slice(0, 14)}...
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB: EXCLUSIVE VAULT CONFIG PANEL (APIS + WITHDRAWAL ACCOUNTS) */}
      {activeTab === 'vault_apis' && <VaultConfigPanel />}

      {/* TAB: FULL AUDIT TRAIL (FINANCIAL + API CONFIG + AUTHORIZATION) */}
      {activeTab === 'audit_trail' && <AuditTrail />}

      {/* TAB: EXECUTIVE SUMMARY, CONVERSATION HISTORY & EMAIL DELIVERY */}
      {activeTab === 'executive_summary' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="p-6 rounded-3xl bg-slate-900 border border-cyan-500/30 space-y-5 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-slate-100 font-display flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-400" />
                  Resumen Ejecutivo Completo + Historial de Conversación
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Generado directamente desde la base de datos SQLite para descarga local o envío directo al correo del propietario (<strong>{OWNER_EMAIL}</strong>).
                </p>
              </div>
              {authToken && (
                <button
                  type="button"
                  onClick={fetchFullSummary}
                  disabled={isLoadingFullSummary}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition self-start"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFullSummary ? 'animate-spin' : ''}`} />
                  <span>Actualizar Reporte</span>
                </button>
              )}
            </div>

            {!authToken ? (
              <div className="p-6 rounded-2xl bg-slate-950/90 border border-amber-500/40 space-y-4">
                <p className="text-xs text-slate-300">
                  Valida tu Clave Maestra de Propietario ({OWNER_EMAIL}) para generar el resumen consolidado con métricas en vivo e historial completo.
                </p>
                <form
                  onSubmit={async e => {
                    e.preventDefault();
                    if (!serverMasterKeyInput.trim()) return;
                    const ok = await loginOwnerWithKey(serverMasterKeyInput.trim());
                    if (ok) setServerMasterKeyInput('');
                  }}
                  className="flex flex-col sm:flex-row gap-2 max-w-xl"
                >
                  <input
                    type="password"
                    value={serverMasterKeyInput}
                    onChange={e => setServerMasterKeyInput(e.target.value)}
                    placeholder="Ingresa la Clave Maestra del Propietario..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-amber-400 font-mono"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition"
                  >
                    Generar Resumen
                  </button>
                </form>
              </div>
            ) : !fullSummary ? (
              <div className="p-8 text-center text-xs text-slate-400">Cargando resumen consolidado desde el servidor...</div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase block">Órdenes Totales</span>
                    <div className="text-lg font-bold text-slate-100 font-mono-numbers">{fullSummary.metrics.totalOrders}</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-emerald-500/30 space-y-0.5">
                    <span className="text-[10px] text-emerald-300 uppercase block">Liquidadas</span>
                    <div className="text-lg font-bold text-emerald-400 font-mono-numbers">{fullSummary.metrics.settledOrders}</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-amber-500/30 space-y-0.5">
                    <span className="text-[10px] text-amber-300 uppercase block">Volumen Liquidado</span>
                    <div className="text-lg font-bold text-amber-400 font-mono-numbers">${fullSummary.metrics.settledVolumeUSD.toFixed(2)}</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-cyan-500/30 space-y-0.5">
                    <span className="text-[10px] text-cyan-300 uppercase block">Testers VM</span>
                    <div className="text-lg font-bold text-cyan-300 font-mono-numbers">{fullSummary.metrics.vmTestersCount} / 10</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-emerald-500/30 space-y-0.5">
                    <span className="text-[10px] text-emerald-300 uppercase block">Score Seguridad</span>
                    <div className="text-lg font-bold text-emerald-400 font-mono-numbers">{fullSummary.metrics.securityScore}%</div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-950/90 border border-slate-800">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const blob = new Blob([fullSummary.markdownReport], { type: 'text/markdown;charset=utf-8' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `aethervault-resumen-completo-${new Date().toISOString().slice(0, 10)}.md`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        soundFx.playCoinChime();
                        addNotification('Resumen Descargado', 'Documento Markdown con el resumen e historial completo descargado.', 'success');
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Descargar Resumen (.md)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(fullSummary.markdownReport);
                        soundFx.playClick();
                        addNotification('Resumen Copiado', 'Todo el resumen y el historial de conversación copiados al portapapeles.', 'info');
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Todo</span>
                    </button>
                  </div>

                  {/* Google Sign-In & Direct Gmail Send Controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    {!isGmailConnected ? (
                      <button
                        type="button"
                        onClick={handleConnectGmail}
                        disabled={isConnectingGmail}
                        className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white hover:bg-slate-100 text-slate-900 font-medium text-xs shadow border border-slate-300 transition active:scale-95 disabled:opacity-60"
                      >
                        <svg width="16" height="16" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                        </svg>
                        <span>{isConnectingGmail ? 'Conectando...' : 'Sign in with Google'}</span>
                      </button>
                    ) : (
                      <>
                        <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-emerald-950/50 border border-emerald-500/30 text-emerald-300">
                          Gmail: {gmailUserEmail || OWNER_EMAIL}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowGmailConfirmModal(true)}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-white font-black text-xs flex items-center gap-1.5 shadow-lg transition active:scale-95"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Enviar a {OWNER_EMAIL}</span>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await logoutGmail();
                            setIsGmailConnected(false);
                            setGmailUserEmail(null);
                          }}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700"
                        >
                          Desconectar
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {gmailSendFeedback && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                      gmailSendFeedback.ok
                        ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                        : 'bg-rose-950/50 border-rose-500/40 text-rose-200'
                    }`}
                  >
                    {gmailSendFeedback.ok ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{gmailSendFeedback.message}</span>
                  </div>
                )}

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 max-h-[460px] overflow-y-auto">
                  <pre className="text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed">
                    {fullSummary.markdownReport}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Explicit Confirmation Modal Before Sending Email via Gmail */}
      {showGmailConfirmModal && fullSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-cyan-500/40 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30">
                  <Mail className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Confirmar Envío de Resumen por Gmail</h3>
                  <p className="text-[11px] text-slate-400">Esta acción enviará un correo real desde tu cuenta autorizada.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGmailConfirmModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400">Destinatario:</span>
                <span className="font-mono font-bold text-emerald-300">{OWNER_EMAIL}</span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-400 shrink-0">Asunto:</span>
                <span className="font-medium text-slate-200 text-right">{fullSummary.subject}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400">Contenido incluido:</span>
                <span className="text-cyan-300 font-semibold">Resumen Completo + Historial (10 pasos)</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              ¿Deseas enviar ahora el resumen ejecutivo completo junto con el historial cronológico de la conversación y métricas de bóveda a <strong>{OWNER_EMAIL}</strong>?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowGmailConfirmModal(false)}
                disabled={isSendingEmail}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSendGmail}
                disabled={isSendingEmail}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-white text-xs font-black flex items-center gap-1.5 shadow-lg disabled:opacity-60"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingEmail ? 'Enviando correo...' : 'Confirmar y Enviar Correo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
