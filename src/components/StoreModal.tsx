import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { COIN_TIERS, PAYMENT_METHODS } from '../data/coinTiers';
import { CoinPackageTier, CoinPurchaseOrder, PaymentMethodType, UsdtNetwork } from '../types';
import {
  Coins,
  ShieldCheck,
  Check,
  X,
  CreditCard,
  QrCode,
  Fingerprint,
  Sparkles,
  Zap,
  Lock,
  ArrowRight,
  RefreshCw,
  Copy,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Activity,
  UserPlus
} from 'lucide-react';
import { soundFx } from '../utils/audio';

export const StoreModal: React.FC = () => {
  const {
    isStoreOpen,
    setIsStoreOpen,
    selectedStoreTier,
    setSelectedStoreTier,
    createLiveGatewayInvoice,
    settleCoinPurchaseWithUsdt,
    biometrics,
    setIsBiometricModalOpen,
    payoutConfig,
    gatewayAvailability,
    userEmail,
    authToken,
    openAuthModal,
    setIsSupportPanelOpen,
    capturePayPalOrder
  } = useGame();

  const [activeTier, setActiveTier] = useState<CoinPackageTier | null>(selectedStoreTier || COIN_TIERS[3]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('crypto_usdt');
  const [usdtNetwork, setUsdtNetwork] = useState<UsdtNetwork>('TRC20');
  const [cryptoGateway, setCryptoGateway] = useState<'DIRECT_USDT' | 'BTCPAY_SERVER' | 'NOWPAYMENTS' | 'COINGATE'>('BTCPAY_SERVER');
  const [cardOnRamp, setCardOnRamp] = useState<'NOWPAYMENTS_FIAT' | 'MOONPAY' | 'TRANSAK' | 'BANXA'>(
    gatewayAvailability.activeOnRamp || 'MOONPAY'
  );
  const [usdtTxHash, setUsdtTxHash] = useState<string>('');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'MXN' | 'USDT'>('USDT');
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [liveOrder, setLiveOrder] = useState<CoinPurchaseOrder | null>(null);
  const [liveCheckoutUrl, setLiveCheckoutUrl] = useState<string | null>(null);
  const [gatewayNotice, setGatewayNotice] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isBiometricScanning, setIsBiometricScanning] = useState(false);
  const [biometricScanSuccess, setBiometricScanSuccess] = useState(false);
  const [copiedCrypto, setCopiedCrypto] = useState(false);
  const [isCapturingPayPal, setIsCapturingPayPal] = useState(false);
  const [paypalCaptureStatus, setPaypalCaptureStatus] = useState<{ ok: boolean; message: string } | null>(null);

  // Card form state
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8892');
  const [cardExp, setCardExp] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('842');

  if (!isStoreOpen) return null;

  const isVmTester = userEmail.toLowerCase().endsWith('@vm.aethervault.local');
  const isGuestUnregistered = !authToken || userEmail.toLowerCase() === 'jugador_anonimo@aethervault.com';

  const currencyRates: Record<string, { symbol: string; rate: number }> = {
    USD: { symbol: '$', rate: 1.0 },
    EUR: { symbol: '€', rate: 0.92 },
    MXN: { symbol: '$', rate: 17.5 },
    USDT: { symbol: '₮', rate: 1.0 }
  };

  const currentRate = currencyRates[currency];
  const convertedPrice = activeTier ? (activeTier.priceUSD * currentRate.rate).toFixed(currency === 'MXN' ? 0 : 2) : '0';

  const activeUsdtWallet =
    usdtNetwork === 'ERC20'
      ? payoutConfig.usdtErc20Address
      : usdtNetwork === 'BEP20'
      ? payoutConfig.usdtBep20Address || payoutConfig.usdtErc20Address
      : payoutConfig.usdtTrc20Address || 'TRX7xQ8z99E10vP44aZ88yQw3901bLkVaether';

  const resolvedGatewayProvider =
    selectedMethod === 'crypto_usdt'
      ? cryptoGateway
      : selectedMethod === 'credit_card' || selectedMethod === 'apple_google_pay'
      ? cardOnRamp
      : selectedMethod === 'paypal'
      ? 'PAYPAL_BUSINESS'
      : 'BANK_WIRE';

  const handleSelectTier = (tier: CoinPackageTier) => {
    setActiveTier(tier);
    setSelectedStoreTier(tier);
    setCheckoutError(null);
    setLiveOrder(null);
    setLiveCheckoutUrl(null);
    setGatewayNotice(null);
    soundFx.playClick();
  };

  const handleGenerateVmTestTxid = () => {
    const randHex = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('').toUpperCase();
    const prefix =
      selectedMethod === 'crypto_usdt' && cryptoGateway === 'BTCPAY_SERVER'
        ? 'BTCPAY'
        : selectedMethod === 'credit_card'
        ? 'ONRAMP'
        : 'VM-TEST';
    setUsdtTxHash(`${prefix}-${Date.now().toString(36).toUpperCase()}-${randHex}`);
    setCheckoutError(null);
    soundFx.playClick();
  };

  const handleGenerateGatewayInvoice = async () => {
    if (!activeTier) return;
    setIsGeneratingInvoice(true);
    setCheckoutError(null);
    const res = await createLiveGatewayInvoice({
      tier: activeTier,
      paymentMethod: selectedMethod,
      usdtNetwork,
      gatewayProvider: resolvedGatewayProvider
    });
    setIsGeneratingInvoice(false);
    if (!res.ok || !res.order) {
      setCheckoutError(res.error || 'No se pudo crear la factura en la pasarela.');
      return;
    }
    setLiveOrder(res.order);
    setLiveCheckoutUrl(res.checkoutUrl || null);
    setGatewayNotice(res.gatewayNotice || null);
    setPaypalCaptureStatus(null);
    if (!usdtTxHash.trim() && isVmTester) {
      setUsdtTxHash(`INV-${res.order.gatewayInvoiceId || res.order.id.slice(-8)}`);
    }
    soundFx.playCoinChime();
  };

  const handleCapturePayPalOrder = async () => {
    if (!liveOrder?.gatewayInvoiceId) return;
    setIsCapturingPayPal(true);
    setPaypalCaptureStatus(null);
    setCheckoutError(null);
    const res = await capturePayPalOrder(liveOrder.gatewayInvoiceId, liveOrder.id);
    setIsCapturingPayPal(false);
    setPaypalCaptureStatus({ ok: res.ok, message: res.message });
    if (res.ok) {
      soundFx.playCoinChime();
      setTimeout(() => {
        setLiveOrder(null);
        setLiveCheckoutUrl(null);
        setGatewayNotice(null);
        setPaypalCaptureStatus(null);
        setIsStoreOpen(false);
      }, 1800);
    }
  };

  const handleStartCheckout = async () => {
    if (!activeTier) return;
    setCheckoutError(null);

    if (isGuestUnregistered) {
      setCheckoutError('Registra tu correo electrónico o inicia sesión para acreditar monedas directamente a tu cuenta.');
      soundFx.playClick();
      return;
    }

    if (selectedMethod === 'crypto_usdt' && !usdtTxHash.trim()) {
      setCheckoutError('Ingresa el TXID / Hash o pulsa "Generar Factura" / "TXID Prueba (VM)" para validar el pago.');
      soundFx.playClick();
      return;
    }

    const requiresBiometrics =
      biometrics.enabled &&
      (!biometrics.requireForHighValue || activeTier.priceUSD >= biometrics.highValueThresholdUSD);

    if (requiresBiometrics) {
      setIsBiometricScanning(true);
      soundFx.playBiometricScan();

      setTimeout(async () => {
        soundFx.playBiometricSuccess();
        setBiometricScanSuccess(true);
        setTimeout(async () => {
          setIsBiometricScanning(false);
          await finalizePurchase(true);
        }, 650);
      }, 950);
    } else {
      await finalizePurchase(false);
    }
  };

  const finalizePurchase = async (biometricDone: boolean) => {
    if (!activeTier) return;
    setIsProcessing(true);
    setCheckoutError(null);

    const res = await settleCoinPurchaseWithUsdt({
      tier: activeTier,
      paymentMethod: selectedMethod,
      usdtNetwork,
      txHash: usdtTxHash,
      biometricVerified: biometricDone,
      existingOrderId: liveOrder?.id,
      gatewayProvider: resolvedGatewayProvider
    });

    setIsProcessing(false);
    setBiometricScanSuccess(false);

    if (!res.ok) {
      setCheckoutError(res.error || 'No se pudo verificar el depósito.');
      return;
    }

    setUsdtTxHash('');
    setLiveOrder(null);
    setLiveCheckoutUrl(null);
    setGatewayNotice(null);
    setIsStoreOpen(false);
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(activeUsdtWallet);
    setCopiedCrypto(true);
    setTimeout(() => setCopiedCrypto(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/90 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Coins className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-slate-100 font-display">
                  Tienda Virtual & Recargas en Vivo
                </h3>
                <span className="text-xs text-amber-400 font-mono-numbers">10 Niveles</span>
                {isVmTester ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    Flujo Real Tester VM ({userEmail.split('@')[0]})
                  </span>
                ) : !isGuestUnregistered ? (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">
                    Cuenta: {userEmail}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/40">
                    Requiere Registro por Correo
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                BTCPay Server, NOWPayments, CoinGate, On-Ramps Visa/MC y liquidación directa a tu bóveda USDT
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-800/80 rounded-lg p-1 border border-slate-700/60 text-xs font-mono-numbers">
              {(['USD', 'EUR', 'MXN', 'USDT'] as const).map(curr => (
                <button
                  key={curr}
                  onClick={() => setCurrency(curr)}
                  className={`px-2 py-1 rounded transition-colors ${
                    currency === curr ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsStoreOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
          {/* Left Column: 10 Tiers Catalog */}
          <div className="lg:col-span-7 p-4 sm:p-6 overflow-y-auto space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Selecciona tu Paquete de Monedas (Nivel 1 - 10)
              </span>
              <span className="text-xs text-slate-400">Liquidación Verificada en SQL</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {COIN_TIERS.map(tier => {
                const isSelected = activeTier?.level === tier.level;
                const priceFormatted = (tier.priceUSD * currentRate.rate).toFixed(currency === 'MXN' ? 0 : 2);
                const costPerCoin = (tier.priceUSD / tier.coins).toFixed(2);

                return (
                  <button
                    key={tier.level}
                    onClick={() => handleSelectTier(tier)}
                    className={`relative p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-slate-800/90 border-amber-400/90 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/50'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold font-mono-numbers px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                          {tier.badge}
                        </span>
                        {tier.bonusPercent > 0 && (
                          <span className="text-[11px] font-semibold text-emerald-400 font-mono-numbers">
                            +{tier.bonusPercent}% Bono
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-slate-100 font-mono-numbers">
                          {currentRate.symbol}{priceFormatted}
                        </span>
                      </div>
                    </div>

                    <div className="my-2 flex items-baseline gap-1.5">
                      <Coins className="w-4 h-4 text-amber-400 shrink-0 self-center" />
                      <span className="text-xl font-extrabold text-amber-300 font-mono-numbers">
                        {tier.coins.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-400">monedas</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                      <span>{costPerCoin} USD / moneda</span>
                      <span className={isSelected ? 'text-amber-400 font-semibold' : 'text-slate-500'}>
                        {isSelected ? '✓ Seleccionado' : 'Elegir'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {activeTier && (
              <div className="mt-4 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1.5">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Beneficios del {activeTier.name} (Nivel {activeTier.level})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-slate-400">
                  {activeTier.features.map((feat, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Integrated Payment Gateway & Live Transaction Pipeline */}
          <div className="lg:col-span-5 p-4 sm:p-6 bg-slate-950/40 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  Pasarela Internacional Segura
                </span>
                <span className="text-[11px] text-emerald-400 font-mono-numbers">
                  Tarjeta Virtual: {gatewayAvailability.preferredVirtualCard}
                </span>
              </div>

              {/* Payment Method Selector */}
              <div className="mt-3 space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
                  Método de Pago
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  {PAYMENT_METHODS.map(method => (
                    <button
                      key={method.id}
                      onClick={() => {
                        setSelectedMethod(method.id);
                        setLiveOrder(null);
                        setLiveCheckoutUrl(null);
                        setGatewayNotice(null);
                        soundFx.playClick();
                      }}
                      className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between transition-colors ${
                        selectedMethod === method.id
                          ? 'bg-slate-800/90 border-amber-400/80 text-slate-100'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <CreditCard className="w-4 h-4 text-amber-400 shrink-0" />
                        <div>
                          <div className="text-xs font-semibold text-slate-200">{method.name}</div>
                          <div className="text-[10px] text-slate-500">{method.provider}</div>
                        </div>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono-numbers">
                        {method.processingFee}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Credit Card -> Fiat-to-Crypto On-Ramp (No Freeze) */}
              {selectedMethod === 'credit_card' && (
                <div className="mt-3 p-3.5 rounded-xl bg-slate-900 border border-cyan-500/30 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-cyan-300">
                      On-Ramp Visa/MC → USDT/BTC (Sin Congelamientos)
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">Auto-Liquidación</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        { id: 'MOONPAY' as const, label: 'MoonPay' },
                        { id: 'TRANSAK' as const, label: 'Transak' },
                        { id: 'BANXA' as const, label: 'Banxa' },
                        { id: 'NOWPAYMENTS_FIAT' as const, label: 'NOWPayments Fiat' }
                      ] as const
                    ).map(ramp => (
                      <button
                        key={ramp.id}
                        type="button"
                        onClick={() => {
                          setCardOnRamp(ramp.id);
                          soundFx.playClick();
                        }}
                        className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition ${
                          cardOnRamp === ramp.id
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {ramp.label}
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase">Tarjeta de Prueba / Cliente (Visa/Mastercard)</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={e => setCardNumber(e.target.value)}
                      className="w-full mt-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase">Vencimiento</label>
                      <input
                        type="text"
                        value={cardExp}
                        onChange={e => setCardExp(e.target.value)}
                        className="w-full mt-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase">CVC / CVV</label>
                      <input
                        type="password"
                        value={cardCvv}
                        onChange={e => setCardCvv(e.target.value)}
                        className="w-full mt-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Crypto Gateways: BTCPay Server / NOWPayments / CoinGate / Direct USDT */}
              {selectedMethod === 'crypto_usdt' && (
                <div className="mt-3 p-3.5 rounded-xl bg-slate-900 border border-emerald-500/30 space-y-3 text-xs">
                  <div className="flex items-center justify-between text-slate-200">
                    <span className="text-[11px] font-bold flex items-center gap-1.5 text-emerald-300">
                      <QrCode className="w-3.5 h-3.5" />
                      Pasarela Crypto & Bóveda USDT / BTC
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono-numbers">
                      ${activeTier?.priceUSD || 0} USD
                    </span>
                  </div>

                  {/* Gateway Engine Selector */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        { id: 'BTCPAY_SERVER' as const, label: 'BTCPay Server (0%)', live: gatewayAvailability.btcpayConfigured },
                        { id: 'NOWPAYMENTS' as const, label: 'NOWPayments', live: gatewayAvailability.nowpaymentsConfigured },
                        { id: 'COINGATE' as const, label: 'CoinGate', live: gatewayAvailability.coingateConfigured },
                        { id: 'DIRECT_USDT' as const, label: 'Wallet USDT Directa', live: true }
                      ] as const
                    ).map(gw => (
                      <button
                        key={gw.id}
                        type="button"
                        onClick={() => {
                          setCryptoGateway(gw.id);
                          soundFx.playClick();
                        }}
                        className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition flex items-center justify-between ${
                          cryptoGateway === gw.id
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span className="truncate">{gw.label}</span>
                        {gw.id !== 'DIRECT_USDT' && (
                          <span className={`w-1.5 h-1.5 rounded-sm shrink-0 ml-1 ${gw.live ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Network Selector */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: 'TRC20' as const, label: 'TRC-20 (Tron)' },
                        { id: 'ERC20' as const, label: 'ERC-20 (ETH)' },
                        { id: 'BEP20' as const, label: 'BEP-20 (BSC)' }
                      ] as const
                    ).map(net => (
                      <button
                        key={net.id}
                        type="button"
                        onClick={() => {
                          setUsdtNetwork(net.id);
                          soundFx.playClick();
                        }}
                        className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition ${
                          usdtNetwork === net.id
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {net.label}
                      </button>
                    ))}
                  </div>

                  {/* Authoritative Destination Wallet */}
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between font-mono text-[10px] text-amber-300">
                    <span className="truncate mr-2">{activeUsdtWallet}</span>
                    <button
                      type="button"
                      onClick={copyAddress}
                      className="p-1 text-slate-400 hover:text-amber-400 shrink-0"
                      title="Copiar billetera USDT"
                    >
                      {copiedCrypto ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* TXID Verification Input + Helper */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-slate-300 font-semibold uppercase tracking-wider">
                        TXID / Hash o Referencia Factura:
                      </label>
                      <button
                        type="button"
                        onClick={handleGenerateVmTestTxid}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 underline underline-offset-2 font-mono"
                      >
                        Generar TXID Prueba (VM)
                      </button>
                    </div>
                    <input
                      type="text"
                      value={usdtTxHash}
                      onChange={e => {
                        setUsdtTxHash(e.target.value);
                        setCheckoutError(null);
                      }}
                      placeholder="Pega el TXID real o genera uno de prueba VM..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-[11px] text-emerald-300 focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>
              )}

              {selectedMethod === 'paypal' && (
                <div className="mt-3 p-3.5 rounded-xl bg-slate-900 border border-cyan-500/30 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-200 font-bold">
                      PayPal {payoutConfig.paypalMode || 'BUSINESS'} REST API v2
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                        gatewayAvailability.paypalConfigured
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {gatewayAvailability.paypalConfigured
                        ? `CONECTADO (${(gatewayAvailability.paypalEnvironment || 'sandbox').toUpperCase()})`
                        : 'MODO PRUEBA VM'}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Liquidación hacia comerciante: <span className="text-amber-400 font-mono">{payoutConfig.paypalEmail}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 leading-relaxed">
                    Pulsa <strong className="text-amber-300">Crear Factura (PAYPAL_BUSINESS)</strong> abajo para generar la orden oficial Orders v2 con enlace de pago PayPal o capturar directamente en entorno VM.
                  </div>
                </div>
              )}

              {selectedMethod === 'apple_google_pay' && (
                <div className="mt-3 p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1">
                  <div className="text-slate-300 font-semibold">Billetera 1-Toque vía On-Ramp ({cardOnRamp})</div>
                  <div className="text-slate-400 text-[11px]">
                    Apple Pay / Google Pay liquidado automáticamente en USDT a tu bóveda.
                  </div>
                </div>
              )}

              {selectedMethod === 'bank_wire' && (
                <div className="mt-3 p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1">
                  <div className="text-slate-300 font-semibold">Transferencia SWIFT / SEPA Internacional</div>
                  <div className="text-slate-400 text-[11px]">
                    Cuenta Receptora: <span className="text-amber-400 font-mono">{payoutConfig.bankIbanSwift}</span>
                  </div>
                </div>
              )}

              {/* Registration / Session prompt if guest OR Live Transaction Flow Generator */}
              {isGuestUnregistered ? (
                <div className="mt-3 p-3.5 rounded-xl bg-emerald-950/35 border border-emerald-500/40 space-y-2.5 text-xs">
                  <div className="flex items-start gap-2">
                    <UserPlus className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-emerald-300">
                        Registra tu correo para comprar monedas
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed mt-0.5">
                        Las monedas se acreditan de forma permanente en tu cuenta personal para conservar tu saldo entre sesiones.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playClick();
                        setIsStoreOpen(false);
                        openAuthModal('REGISTER');
                      }}
                      className="min-h-[40px] px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Registrar Correo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playClick();
                        setIsStoreOpen(false);
                        openAuthModal('LOGIN');
                      }}
                      className="min-h-[40px] px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs border border-slate-700 transition"
                    >
                      Ya tengo cuenta
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 p-3 rounded-xl bg-slate-900/90 border border-amber-500/30 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5" />
                      Paso 1: Generar Factura en Pasarela
                    </span>
                    <button
                      type="button"
                      onClick={handleGenerateGatewayInvoice}
                      disabled={isGeneratingInvoice || !activeTier}
                      className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[10px] transition disabled:opacity-50"
                    >
                      {isGeneratingInvoice ? 'Creando...' : `Crear Factura (${resolvedGatewayProvider})`}
                    </button>
                  </div>

                  {liveOrder && (
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Orden DB: <strong className="text-slate-200 font-mono">#{liveOrder.id.slice(-8)}</strong></span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px]">
                          {liveOrder.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">{gatewayNotice}</div>
                      {liveCheckoutUrl && (
                        <a
                          href={liveCheckoutUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-300 hover:text-cyan-200 underline"
                        >
                          <span>Abrir Link de Pago Oficial ({liveOrder.gatewayProvider})</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {liveOrder.gatewayProvider === 'PAYPAL_BUSINESS' && liveOrder.gatewayInvoiceId && (
                        <div className="pt-1 space-y-1.5">
                          <button
                            type="button"
                            onClick={handleCapturePayPalOrder}
                            disabled={isCapturingPayPal}
                            className="w-full py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[11px] flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>
                              {isCapturingPayPal
                                ? 'Capturando Pago PayPal...'
                                : 'Capturar y Acreditar Pago PayPal'}
                            </span>
                          </button>
                          {paypalCaptureStatus && (
                            <div
                              className={`text-[10px] font-semibold ${
                                paypalCaptureStatus.ok ? 'text-emerald-300' : 'text-rose-300'
                              }`}
                            >
                              {paypalCaptureStatus.message}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {checkoutError && (
                <div className="mt-3 p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/50 text-[11px] text-rose-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{checkoutError}</span>
                </div>
              )}

              {/* Biometric Shield notice */}
              <div className="mt-3 p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-800/50 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Fingerprint className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div>
                    <div className="text-cyan-200 font-medium text-[11px]">
                      {biometrics.enabled ? 'Autenticación Biométrica Activa' : 'Biometría Desactivada'}
                    </div>
                    <div className="text-[10px] text-cyan-400/80">
                      Protege compras mayores a $100 USD
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsBiometricModalOpen(true)}
                  className="text-[10px] text-cyan-300 hover:text-cyan-100 underline underline-offset-2"
                >
                  Configurar
                </button>
              </div>
            </div>

            {/* Order Summary & Submit Button */}
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Subtotal ({activeTier?.coins} monedas)</span>
                <span className="font-mono-numbers text-slate-200">{currentRate.symbol}{convertedPrice}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Liquidación Directa a Bóveda</span>
                <span className="font-mono-numbers text-emerald-400">{resolvedGatewayProvider} → USDT</span>
              </div>
              <div className="flex items-center justify-between text-sm font-bold text-slate-100 pt-1 border-t border-slate-800/60">
                <span>Total a Pagar</span>
                <span className="text-base text-amber-400 font-mono-numbers">
                  {currentRate.symbol}{convertedPrice} {currency}
                </span>
              </div>

              {isBiometricScanning ? (
                <div className="p-3 rounded-xl bg-slate-900 border border-cyan-500/80 text-center animate-pulse">
                  <Fingerprint className="w-8 h-8 text-cyan-400 mx-auto animate-bounce" />
                  <div className="text-xs font-semibold text-cyan-200 mt-1">
                    {biometricScanSuccess ? '¡Identidad Biométrica Verificada!' : 'Escaneando Touch ID / Face ID...'}
                  </div>
                  <div className="text-[10px] text-cyan-400/70 font-mono">
                    Verificando firma criptográfica en Secure Enclave
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleStartCheckout}
                  disabled={isProcessing || !activeTier}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Liquidando Transacción E2EE...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-slate-950" />
                      <span>{liveOrder ? `Confirmar Pago & Acreditar +${activeTier?.coins} mo` : `Pagar y Acreditar ${activeTier?.coins} Monedas`}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}

              <div className="flex flex-col items-center gap-1.5 text-center">
                <p className="text-[10px] text-slate-500">
                  Paso 2: Confirmación TXID Anti-Replay + Acreditación inmediata en BD y Libro de Bóveda
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsStoreOpen(false);
                    setIsSupportPanelOpen(true);
                    soundFx.playClick();
                  }}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 underline underline-offset-2 font-medium"
                >
                  ¿Ya pagaste y no ves tus monedas? Verifica tu TXID en Soporte →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
