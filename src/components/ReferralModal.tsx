import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import {
  Share2,
  Copy,
  Check,
  Gift,
  Coins,
  Users,
  Percent,
  Sparkles,
  Ticket,
  X,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { soundFx } from '../utils/audio';

export const ReferralModal: React.FC = () => {
  const {
    isReferralModalOpen,
    setIsReferralModalOpen,
    character,
    redeemPromoCode,
    addNotification
  } = useGame();

  const [copied, setCopied] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [promoResult, setPromoResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isReferralModalOpen) return null;

  const referralCode = `AETHER-${character.name.toUpperCase().replace(/\s+/g, '_').slice(0, 8)}-VIP`;
  const referralLink = `https://aethervault.io/?ref=${referralCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    soundFx.playCoinChime();
    addNotification('Enlace Copiado', 'Tu enlace de afiliado ha sido copiado al portapapeles.', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRedeem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoInput.trim()) return;
    const res = redeemPromoCode(promoInput);
    setPromoResult(res);
    if (res.success) {
      setPromoInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Top Header */}
        <div className="p-6 bg-gradient-to-r from-cyan-950/80 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-400 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Share2 className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-100 font-display">
                  Programa de Afiliados & Códigos VIP
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/40">
                  5% Comisión Vitalicia
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Gana monedas y dinero fiat invitando a otros jugadores a la plataforma
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setIsReferralModalOpen(false);
              soundFx.playClick();
            }}
            className="p-2 text-slate-400 hover:text-slate-100 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Main Referral Link Card */}
          <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Tu Enlace de Afiliado Exclusivo</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Comparte tu enlace. Cada invitado recibe 50 monedas y tú ganas el 5% de todas sus recargas.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-xl self-start sm:self-auto">
                +50 Monedas de Bienvenida
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={referralLink}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-mono text-xs focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow flex items-center gap-1.5 transition-transform active:scale-95 whitespace-nowrap"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? '¡Copiado!' : 'Copiar Enlace'}</span>
              </button>
            </div>
          </div>

          {/* Stats Metrics 3-Col */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  Jugadores Invitados
                </span>
              </div>
              <div className="text-2xl font-black text-slate-100 font-mono-numbers">
                14
              </div>
              <div className="text-[10px] text-emerald-400 font-mono">
                8 activos hoy
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  Comisiones Ganadas
                </span>
              </div>
              <div className="text-2xl font-black text-amber-300 font-mono-numbers">
                +850 mo
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                ~$680.00 USD equivalentes
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-emerald-400" />
                  Nivel de Embajador
                </span>
              </div>
              <div className="text-lg font-bold text-cyan-400">
                Oro VIP (5%)
              </div>
              <div className="text-[10px] text-slate-400">
                Próximo nivel: Platino (7%)
              </div>
            </div>
          </div>

          {/* Promo Code Redemption Section */}
          <div className="p-6 rounded-3xl bg-slate-950/80 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  Canjear Código Promocional o Cupón de Bono
                </h3>
                <p className="text-xs text-slate-400">
                  Ingresa un código de creador, evento o promoción para acreditar monedas gratuitas.
                </p>
              </div>
            </div>

            <form onSubmit={handleRedeem} className="flex flex-col sm:flex-row items-stretch gap-2">
              <input
                type="text"
                value={promoInput}
                onChange={e => setPromoInput(e.target.value)}
                placeholder="Ej. AETHER2026, DUENO70, VIPLUCKY, DEBIAN13"
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 uppercase tracking-wider font-mono focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                disabled={!promoInput.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow disabled:opacity-40 transition-all active:scale-95"
              >
                Canjear Código
              </button>
            </form>

            {promoResult && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold ${
                  promoResult.success
                    ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
                }`}
              >
                {promoResult.message}
              </div>
            )}

            {/* Hint of codes */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 pt-1">
              <span>Códigos activos de cortesía:</span>
              <button
                type="button"
                onClick={() => setPromoInput('AETHER2026')}
                className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-amber-400 hover:border-amber-500/50"
              >
                AETHER2026 (+100 mo)
              </button>
              <button
                type="button"
                onClick={() => setPromoInput('DUENO70')}
                className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-cyan-400 hover:border-cyan-500/50"
              >
                DUENO70 (+200 mo)
              </button>
              <button
                type="button"
                onClick={() => setPromoInput('VIPLUCKY')}
                className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-emerald-400 hover:border-emerald-500/50"
              >
                VIPLUCKY (+50 mo)
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
