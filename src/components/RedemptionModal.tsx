import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import {
  Coins,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  X,
  Lock,
  Clock,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { soundFx } from '../utils/audio';

export const RedemptionModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose
}) => {
  const { coins, requestPlayerRedemption, userEmail } = useGame();

  const [amountCoins, setAmountCoins] = useState<string>('100');
  const [destType, setDestType] = useState<'crypto_usdt' | 'paypal' | 'bank_wire'>('crypto_usdt');
  const [destAddress, setDestAddress] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const parsedCoins = parseInt(amountCoins, 10) || 0;
  // Valuation: 1 coin = $0.80 USD
  const grossUSD = parsedCoins * 0.8;
  const fee20PercentUSD = grossUSD * 0.2; // 20% fee to Owner's Vault
  const net80PercentUSD = grossUSD * 0.8; // 80% to player

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedCoins <= 0 || parsedCoins > coins) return;
    if (!destAddress.trim()) return;

    setIsSubmitting(true);
    setTimeout(async () => {
      await requestPlayerRedemption(parsedCoins, destType, destAddress.trim());
      setIsSubmitting(false);
      setIsSuccess(true);
      soundFx.playCoinChime();
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 2500);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 font-display">
                Canje de Monedas a Dinero Real
              </h3>
              <p className="text-xs text-slate-400">
                Retiro sujeto a aprobación del Administrador
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-950 border border-emerald-500 flex items-center justify-center text-emerald-400 shadow-xl animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-emerald-400 font-display">
              ¡Solicitud de Canje Enviada!
            </h4>
            <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
              Tu solicitud de retiro por <strong>${net80PercentUSD.toFixed(2)} USD</strong> (descontando el 20% de comisión para la Bóveda) ha sido registrada.
            </p>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-amber-300 flex items-center justify-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Pendiente de autorización por <strong>trabajofino52@gmail.com</strong></span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleRequest} className="py-4 space-y-4">
            
            {/* Coins input */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <label className="text-slate-400 uppercase text-[10px] font-semibold">
                  Cantidad de Monedas a Canjear
                </label>
                <span className="text-slate-400">
                  Disponible: <strong className="text-amber-400 font-mono-numbers">{coins.toLocaleString()} monedas</strong>
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="25"
                  max={coins}
                  value={amountCoins}
                  onChange={e => setAmountCoins(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 font-mono text-base font-bold text-slate-100 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={() => setAmountCoins(coins.toString())}
                  className="absolute right-2 top-2 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 text-[10px] font-bold"
                >
                  MÁXIMO
                </button>
              </div>
            </div>

            {/* Economics breakdown: 20% fee */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-400 font-mono-numbers">
                <span>Valor Bruto Estimado:</span>
                <span className="text-slate-200 font-bold">${grossUSD.toFixed(2)} USD</span>
              </div>
              <div className="flex items-center justify-between text-rose-400 font-mono-numbers">
                <span className="flex items-center gap-1">
                  <span>Comisión Automática del 20%:</span>
                  <span className="text-[10px] text-slate-500 font-sans">(Va a Bóveda del Dueño)</span>
                </span>
                <span className="font-bold">-${fee20PercentUSD.toFixed(2)} USD</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-sm font-bold text-emerald-400 font-mono-numbers">
                <span>Monto Neto que Recibirás (80%):</span>
                <span className="text-base">${net80PercentUSD.toFixed(2)} USD</span>
              </div>
            </div>

            {/* Payment rail selector */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">
                Método de Recepción de Fondos
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'crypto_usdt' as const, label: 'USDT (TRC20)' },
                    { id: 'paypal' as const, label: 'PayPal' },
                    { id: 'bank_wire' as const, label: 'Banco (IBAN)' }
                  ] as const
                ).map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setDestType(m.id)}
                    className={`p-2 rounded-lg border text-xs font-semibold text-center transition-colors ${
                      destType === m.id
                        ? 'bg-slate-800 border-amber-400 text-amber-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Destination address input */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">
                {destType === 'crypto_usdt'
                  ? 'Tu Dirección de Billetera USDT (TRC-20)'
                  : destType === 'paypal'
                  ? 'Tu Correo de Cuenta PayPal'
                  : 'Tu Código IBAN / Número de Cuenta Bancaria'}
              </label>
              <input
                type="text"
                required
                value={destAddress}
                onChange={e => setDestAddress(e.target.value)}
                placeholder={
                  destType === 'crypto_usdt'
                    ? 'ej. TRX...'
                    : destType === 'paypal'
                    ? 'ej. tu-email@paypal.com'
                    : 'ej. ES76 2100...'
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-xs text-slate-200 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-[11px] text-amber-200/90 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Regla de Seguridad:</strong> Únicamente el Administrador (<strong>trabajofino52@gmail.com</strong>) tiene la potestad de autorizar y liberar el pago. Se cobrará en automático el 20% de comisión directo a la Bóveda.
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || parsedCoins <= 0 || parsedCoins > coins || !destAddress.trim()}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Enviando Solicitud al Administrador...</span>
              ) : (
                <>
                  <span>Solicitar Canje (${net80PercentUSD.toFixed(2)} USD Netos)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </form>
        )}

      </div>
    </div>
  );
};
