import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { COIN_TIERS, PAYMENT_METHODS } from '../data/coinTiers';
import { CoinPackageTier, PaymentMethodType } from '../types';
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
  CheckCircle2
} from 'lucide-react';
import { soundFx } from '../utils/audio';

export const StoreModal: React.FC = () => {
  const {
    isStoreOpen,
    setIsStoreOpen,
    selectedStoreTier,
    setSelectedStoreTier,
    rechargeCoins,
    biometrics,
    setIsBiometricModalOpen,
    payoutConfig,
    setIsSupportPanelOpen
  } = useGame();

  const [activeTier, setActiveTier] = useState<CoinPackageTier | null>(selectedStoreTier || COIN_TIERS[3]); // Default tier 4
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('crypto_usdt');
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'MXN' | 'USDT'>('USD');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isBiometricScanning, setIsBiometricScanning] = useState(false);
  const [biometricScanSuccess, setBiometricScanSuccess] = useState(false);
  const [copiedCrypto, setCopiedCrypto] = useState(false);

  // Card form state
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8892');
  const [cardHolder, setCardHolder] = useState('CYBER OPERATOR');
  const [cardExp, setCardExp] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('842');

  if (!isStoreOpen) return null;

  const currencyRates: Record<string, { symbol: string; rate: number }> = {
    USD: { symbol: '$', rate: 1.0 },
    EUR: { symbol: '€', rate: 0.92 },
    MXN: { symbol: '$', rate: 17.5 },
    USDT: { symbol: '₮', rate: 1.0 }
  };

  const currentRate = currencyRates[currency];
  const convertedPrice = activeTier ? (activeTier.priceUSD * currentRate.rate).toFixed(currency === 'MXN' ? 0 : 2) : '0';

  const handleSelectTier = (tier: CoinPackageTier) => {
    setActiveTier(tier);
    setSelectedStoreTier(tier);
    soundFx.playClick();
  };

  const handleStartCheckout = async () => {
    if (!activeTier) return;

    // Check if biometric authentication is enabled or required for high value
    const requiresBiometrics = biometrics.enabled && (
      !biometrics.requireForHighValue || activeTier.priceUSD >= biometrics.highValueThresholdUSD
    );

    if (requiresBiometrics) {
      setIsBiometricScanning(true);
      soundFx.playBiometricScan();

      // Simulate biometric sensor capture
      setTimeout(async () => {
        soundFx.playBiometricSuccess();
        setBiometricScanSuccess(true);
        setTimeout(async () => {
          setIsBiometricScanning(false);
          await finalizePurchase(true);
        }, 800);
      }, 1400);
    } else {
      await finalizePurchase(false);
    }
  };

  const finalizePurchase = async (biometricDone: boolean) => {
    if (!activeTier) return;
    setIsProcessing(true);

    // Simulate high-speed international payment gateway settlement
    setTimeout(async () => {
      await rechargeCoins(activeTier, selectedMethod, biometricDone);
      setIsProcessing(false);
      setBiometricScanSuccess(false);
      setIsStoreOpen(false);
    }, 900);
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(payoutConfig.usdtTrc20Address || 'TRX7xQ8z99E10vP44aZ88yQw3901bLkVaether');
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
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-100 font-display">
                  Tienda Virtual de Monedas Aether
                </h3>
                <span className="text-xs text-amber-400 font-mono-numbers">10 Niveles</span>
              </div>
              <p className="text-xs text-slate-400">
                Acreditación instantánea sin límite · Costo escalonado de $10 a $1,000 USD
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Currency selector */}
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

        {/* Content Split: 10 Tiers Selector (Left/Main) & Integrated Payment Gateway (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
          
          {/* Left Column: 10 Tiers Catalog */}
          <div className="lg:col-span-7 p-4 sm:p-6 overflow-y-auto space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Selecciona tu Paquete de Monedas (Nivel 1 - 10)
              </span>
              <span className="text-xs text-slate-400">
                Entrega Digital Inmediata
              </span>
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
                    {/* Top Row */}
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

                    {/* Middle: Coin count */}
                    <div className="my-2 flex items-baseline gap-1.5">
                      <Coins className="w-4 h-4 text-amber-400 shrink-0 self-center" />
                      <span className="text-xl font-extrabold text-amber-300 font-mono-numbers">
                        {tier.coins.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-400">monedas</span>
                    </div>

                    {/* Footer features */}
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

            {/* Selected Tier Highlights */}
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

          {/* Right Column: Integrated International Payment Gateway */}
          <div className="lg:col-span-5 p-4 sm:p-6 bg-slate-950/40 flex flex-col justify-between space-y-4">
            
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  Pasarela Internacional Segura
                </span>
                <span className="text-[11px] text-emerald-400 font-mono-numbers">
                  SSL 256-Bit
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

              {/* Conditional Method Form */}
              {selectedMethod === 'credit_card' && (
                <div className="mt-3 p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase">Número de Tarjeta</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={e => setCardNumber(e.target.value)}
                      className="w-full mt-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase">Vencimiento</label>
                      <input
                        type="text"
                        value={cardExp}
                        onChange={e => setCardExp(e.target.value)}
                        className="w-full mt-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase">CVC / CVV</label>
                      <input
                        type="password"
                        value={cardCvv}
                        onChange={e => setCardCvv(e.target.value)}
                        className="w-full mt-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                </div>
              )}

              {selectedMethod === 'crypto_usdt' && (
                <div className="mt-3 p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-[11px] font-semibold">Depósito USDT (Tether)</span>
                    <span className="text-[10px] text-amber-400 font-mono-numbers">TRC-20 / ERC-20</span>
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800/80 flex items-center justify-between font-mono text-[10px] text-slate-300">
                    <span className="truncate mr-2">{payoutConfig.usdtTrc20Address}</span>
                    <button
                      onClick={copyAddress}
                      className="p-1 text-slate-400 hover:text-amber-400 shrink-0"
                      title="Copiar billetera"
                    >
                      {copiedCrypto ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Aprobación automática hacia la Bóveda del Comerciante ({payoutConfig.merchantName}).
                  </p>
                </div>
              )}

              {selectedMethod === 'paypal' && (
                <div className="mt-3 p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1">
                  <div className="text-slate-300 font-semibold">PayPal One-Touch Checkout</div>
                  <div className="text-slate-400 text-[11px]">
                    Liquidación directa al comerciante: <span className="text-amber-400 font-mono">{payoutConfig.paypalEmail}</span>
                  </div>
                </div>
              )}

              {selectedMethod === 'apple_google_pay' && (
                <div className="mt-3 p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1">
                  <div className="text-slate-300 font-semibold">Billetera de 1-Toque Biométrica</div>
                  <div className="text-slate-400 text-[11px]">
                    Autentica directamente mediante huella o escaneo facial con Apple Pay / Google Wallet.
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
                <span>Comisión de Pasarela</span>
                <span className="font-mono-numbers text-emerald-400">$0.00 (Gratis)</span>
              </div>
              <div className="flex items-center justify-between text-sm font-bold text-slate-100 pt-1 border-t border-slate-800/60">
                <span>Total a Pagar</span>
                <span className="text-base text-amber-400 font-mono-numbers">
                  {currentRate.symbol}{convertedPrice} {currency}
                </span>
              </div>

              {/* Biometric Scan Modal in progress */}
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
                      <span>Comprar {activeTier?.coins} Monedas Instantáneas</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}

              <div className="flex flex-col items-center gap-1.5 text-center">
                <p className="text-[10px] text-slate-500">
                  Reflejo inmediato en balance · Garantía de entrega digital sin límites
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
