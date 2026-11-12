import React, { useState } from 'react';
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
  Award
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import { CoinGiftRecord, HappyHourGameSection, HappyHourTargetGroup } from '../types';

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
    approveRedemptionRequest,
    rejectRedemptionRequest,
    vaultEconomics,
    vaultRetentionRate,
    playerPrizeRate,
    redemptionFeeRate,
    updateVaultMargins,
    provablyFairHistory,
    serverMetrics,
    playerSessions,
    totalPlayersCount,
    onlinePlayersCount,
    offlinePlayersCount,
    userEmail,
    isOwner,
    coins,
    coinGifts,
    sendCoinsGift,
    adminAdjustUserCoins,
    happyHourCampaign,
    updateHappyHourCampaign,
    toggleHappyHour
  } = useGame();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'currency_control' | 'happy_hour' | 'redemptions' | 'vault_split' | 'server_telemetry' | 'destinations' | 'withdraw' | 'audit'
  >('redemptions');

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
  const [paypal, setPaypal] = useState(payoutConfig.paypalEmail);
  const [iban, setIban] = useState(payoutConfig.bankIbanSwift);
  const [holder, setHolder] = useState(payoutConfig.bankAccountHolder);
  const [merchant, setMerchant] = useState(payoutConfig.merchantName);
  const [isSaved, setIsSaved] = useState(false);

  // Dynamic Margins Local State
  const [sliderRetention, setSliderRetention] = useState(vaultRetentionRate);
  const [sliderFee, setSliderFee] = useState(redemptionFeeRate);
  const [marginsSaved, setMarginsSaved] = useState(false);

  // Withdrawal form state
  const [withdrawAmount, setWithdrawAmount] = useState<string>('500');
  const [withdrawMethod, setWithdrawMethod] = useState<'crypto_usdt' | 'bank_wire' | 'paypal'>('crypto_usdt');
  const [isProcessingWd, setIsProcessingWd] = useState(false);

  const pendingRedemptionsCount = redemptionRequests.filter(r => r.status === 'PENDING_APPROVAL').length;

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
    updateVaultMargins(sliderRetention, sliderFee);
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
      paypalEmail: paypal,
      bankIbanSwift: iban,
      bankAccountHolder: holder,
      merchantName: merchant
    });
    setIsSaved(true);
    addNotification(
      'Bóvedas de Cobro Actualizadas',
      'Tus destinos para recibir los pagos de clientes han sido guardados con cifrado E2EE.',
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
              Gestión centralizada de fondos: autorización exclusiva de canjes de jugadores con 20% de comisión automática retenida para la bóveda, reserva 70/30 de apuestas y telemetría de Debian 13.
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
            { id: 'vault_split' as const, label: 'Economía 70% Bóveda / 30% Premios' },
            { id: 'server_telemetry' as const, label: 'Telemetría Servidor Debian 13 & Jugadores' },
            { id: 'destinations' as const, label: 'Configurar Bóvedas de Cobro' },
            { id: 'withdraw' as const, label: 'Retirar Fondos a Billetera' },
            { id: 'audit' as const, label: 'Libro Contable' },
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

      {/* TAB: REDEMPTIONS (AUTORIZACIÓN DE CANJES DE JUGADORES) */}
      {activeTab === 'redemptions' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-100 font-display flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-amber-400" />
                    Cola de Autorización de Canjes de Monedas
                  </h2>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Solo Administrador
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                  Cuando un jugador solicita canjear sus monedas por dinero real, se descuenta de su cuenta y pasa a esta cola.
                  Al autorizarlo, se deduce en automático un <strong className="text-amber-400">20% de comisión que va directamente a tu Bóveda</strong>, y se transfiere el 80% neto al jugador.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 font-mono-numbers shrink-0">
                Total Comisiones 20% Recaudadas: <strong className="text-slate-100 text-sm">${vaultEconomics.withdrawalFeesCollected.toFixed(2)} USD</strong>
              </div>
            </div>

            {/* Redemptions Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono-numbers divide-y divide-slate-800">
                <thead>
                  <tr className="text-slate-400 text-[10px] uppercase">
                    <th className="py-3 px-3">ID / Fecha</th>
                    <th className="py-3 px-3">Jugador</th>
                    <th className="py-3 px-3">Monedas Solicitadas</th>
                    <th className="py-3 px-3">Bruto ($0.80/mo)</th>
                    <th className="py-3 px-3 text-amber-400 font-bold">20% Bóveda Dueño</th>
                    <th className="py-3 px-3 text-emerald-400 font-bold">80% Pago Neto</th>
                    <th className="py-3 px-3">Destino</th>
                    <th className="py-3 px-3">Estado</th>
                    <th className="py-3 px-3 text-right">Acción Autorizadora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {redemptionRequests.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500">
                        No hay solicitudes de canje pendientes en este momento.
                      </td>
                    </tr>
                  ) : (
                    redemptionRequests.map(req => (
                      <tr key={req.id} className="hover:bg-slate-950/40 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-mono text-slate-200">{req.id}</div>
                          <div className="text-[10px] text-slate-500">
                            {new Date(req.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(req.timestamp).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-200">{req.playerName}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{req.playerEmail}</div>
                        </td>
                        <td className="py-3 px-3 font-bold text-amber-300">
                          {req.amountCoins.toLocaleString()} monedas
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          ${req.grossUSD.toFixed(2)} USD
                        </td>
                        <td className="py-3 px-3 font-bold text-amber-400 bg-amber-500/5">
                          +${req.feeUSD.toFixed(2)} USD
                        </td>
                        <td className="py-3 px-3 font-bold text-emerald-400">
                          ${req.netUSD.toFixed(2)} USD
                        </td>
                        <td className="py-3 px-3">
                          <div className="uppercase text-[10px] text-slate-400 font-bold">{req.destinationType}</div>
                          <div className="font-mono text-[11px] text-slate-300 truncate max-w-[120px]" title={req.destinationAddress}>
                            {req.destinationAddress}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {req.status === 'PENDING_APPROVAL' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              PENDIENTE
                            </span>
                          )}
                          {req.status === 'APPROVED' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                              AUTORIZADO
                            </span>
                          )}
                          {req.status === 'REJECTED' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                              RECHAZADO
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {req.status === 'PENDING_APPROVAL' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={async () => {
                                  await approveRedemptionRequest(req.id);
                                }}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow transition-transform active:scale-95"
                                title="Autorizar canje y retener 20% para la bóveda"
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                Autorizar
                              </button>
                              <button
                                onClick={async () => {
                                  await rejectRedemptionRequest(req.id, 'Verificación de fondos no superada');
                                }}
                                className="px-2 py-1.5 bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 rounded-lg text-xs font-bold transition-colors"
                                title="Rechazar y reembolsar monedas"
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <span className="text-slate-300 font-medium">Comisión Automática Retiro Canjes:</span>
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
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">
                  Fondo de premios auto-calculado: <strong className="text-cyan-400">{100 - sliderRetention}%</strong> de apuestas.
                </span>
                <button
                  onClick={handleSaveMargins}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{marginsSaved ? '¡Márgenes Actualizados!' : 'Guardar Nuevos Márgenes'}</span>
                </button>
              </div>
            </div>

            {/* Detailed Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-500/30 space-y-2">
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  1. Retención en Bóveda ({vaultRetentionRate}%)
                </div>
                <div className="text-2xl font-black text-slate-100 font-mono-numbers">
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
                <div className="text-2xl font-black text-slate-100 font-mono-numbers">
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
                <div className="text-2xl font-black text-emerald-400 font-mono-numbers">
                  ${vaultEconomics.withdrawalFeesCollected.toFixed(2)} USD
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Cobradas de forma automática cuando un jugador canjea monedas por dinero fiat o cripto previa autorización.
                </p>
              </div>
            </div>

            {/* Summary Formula */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2">
              <div className="font-semibold text-slate-200">
                Fórmula de Ganancia Neta Total de la Bóveda:
              </div>
              <div className="font-mono text-amber-300 bg-slate-900 p-3 rounded-xl border border-slate-800/80">
                Beneficio = (Recargas de Monedas Tier 1-10) + ({vaultRetentionRate}% Volumen Apostado) + ({redemptionFeeRate}% Comisión de Cada Canje) + (Pagos Ascensión Nivel 11-100)
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
                  Monitor del Servidor Debian 13 (Trixie) & Jugadores
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Recursos en tiempo real del VPS Linux dedicado ejecutando NGINX, Node.js y WebSocket Daemon
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Debian 13 Kernel 6.12 OK
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

      {/* TAB 2: DESTINATIONS CONFIG */}
      {activeTab === 'destinations' && (
        <form onSubmit={handleSaveDestinations} className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-100 font-display">
                  Destinos de Cobro del Administrador
                </h2>
                <p className="text-xs text-slate-400">
                  Configura tus cuentas bancarias y billeteras de criptomonedas donde se reciben los fondos de los jugadores.
                </p>
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow transition-all active:scale-95 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSaved ? '¡Guardado con Éxito!' : 'Guardar y Activar Bóvedas'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4" />
                  Billeteras Cripto para Cobros (USDT / USDC)
                </h3>

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
                    Dirección USDT / USDC (Red ERC-20 / Polygon)
                  </label>
                  <input
                    type="text"
                    value={erc20}
                    onChange={e => setErc20(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs focus:outline-none focus:border-amber-500"
                    placeholder="0x..."
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  Cuentas Fiat (Bancos & PayPal)
                </h3>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">
                    Correo Electrónico de PayPal Comercial
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
              </div>

            </div>
          </div>
        </form>
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

    </div>
  );
};
