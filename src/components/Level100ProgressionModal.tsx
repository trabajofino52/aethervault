import React from 'react';
import { useGame } from '../context/GameContext';
import {
  Sparkles,
  Trophy,
  Shield,
  Coins,
  ArrowRight,
  CheckCircle2,
  Lock,
  X,
  Zap,
  Award
} from 'lucide-react';
import { soundFx } from '../utils/audio';

export const Level100ProgressionModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose
}) => {
  const { character, coins, unlockNextHeroLevel, addNotification } = useGame();

  if (!isOpen) return null;

  const currentLevel = character.level;
  const nextLevel = currentLevel + 1;
  const isCapped = currentLevel >= 100;

  // Cost: Levels 11-50 = $50 USD (60 coins) | Levels 51-100 = $100 USD (120 coins)
  const costUSD = nextLevel <= 50 ? 50 : 100;
  const costCoins = nextLevel <= 50 ? 60 : 120;
  const canAfford = coins >= costCoins;

  const handleUnlock = async () => {
    if (isCapped || !canAfford) return;
    const ok = await unlockNextHeroLevel(costCoins, costUSD);
    if (ok) {
      soundFx.playWinFanfare();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 font-display">
                Ascensión de Niveles (Hasta Nivel 100)
              </h3>
              <p className="text-xs text-slate-400">
                Desbloquea niveles con $50 USD (Nv 11-50) o $100 USD (Nv 51-100)
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

        {/* Current Level Status */}
        <div className="py-4 space-y-4">
          
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Nivel Actual de Personaje
              </span>
              <div className="text-2xl font-black text-amber-400 font-mono-numbers mt-0.5">
                Nivel {currentLevel} <span className="text-xs font-normal text-slate-400">/ 100</span>
              </div>
              <div className="text-xs text-slate-300 font-medium">{character.title}</div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Saldo en Cartera
              </span>
              <div className="text-lg font-bold text-emerald-400 font-mono-numbers flex items-center gap-1 justify-end">
                <Coins className="w-4 h-4 text-amber-400" />
                {coins.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Pricing Rule Info Banner */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className={`p-3 rounded-xl border ${
              nextLevel <= 50 ? 'bg-amber-500/10 border-amber-500/50 text-amber-200' : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}>
              <div className="font-bold flex items-center gap-1.5">
                <span>Niveles 11 al 50</span>
                {nextLevel <= 50 && <span className="text-[10px] bg-amber-400 text-slate-950 px-1 rounded font-black">ACTUAL</span>}
              </div>
              <div className="text-base font-extrabold font-mono-numbers mt-1">$50 USD</div>
              <div className="text-[11px] text-slate-400">(o 60 monedas de ganancias)</div>
            </div>

            <div className={`p-3 rounded-xl border ${
              nextLevel > 50 && nextLevel <= 100 ? 'bg-amber-500/10 border-amber-500/50 text-amber-200' : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}>
              <div className="font-bold flex items-center gap-1.5">
                <span>Niveles 51 al 100</span>
                {nextLevel > 50 && <span className="text-[10px] bg-amber-400 text-slate-950 px-1 rounded font-black">ACTUAL</span>}
              </div>
              <div className="text-base font-extrabold font-mono-numbers mt-1">$100 USD</div>
              <div className="text-[11px] text-slate-400">(o 120 monedas de ganancias)</div>
            </div>
          </div>

          {/* Next Level Perks */}
          {!isCapped ? (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
              <span className="font-semibold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Recompensas al desbloquear Nivel {nextLevel}
              </span>
              <ul className="space-y-1.5 text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>+1 Punto de bonificación automática en todas las 5 habilidades</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Incremento del límite de apuesta máxima en mesas VIP</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Aura de prestigio para torneos multijugador</span>
                </li>
              </ul>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/60 text-center space-y-1">
              <div className="text-amber-300 font-bold text-sm">👑 ¡Has alcanzado el Nivel Máximo 100!</div>
              <p className="text-xs text-amber-200/80">Estatus: Emperador Cósmico Supremo de AetherVault.</p>
            </div>
          )}

          {/* Action button */}
          {!isCapped && (
            <div className="pt-2">
              <button
                onClick={handleUnlock}
                disabled={!canAfford}
                className={`w-full py-3.5 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
                  canAfford
                    ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 text-slate-950 shadow-xl shadow-amber-500/20'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>
                  Desbloquear Nivel {nextLevel} por ${costUSD} USD ({costCoins} Monedas)
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
              {!canAfford && (
                <p className="text-[10px] text-rose-400 text-center mt-2">
                  Necesitas {costCoins} monedas para ascender al siguiente nivel. Adquiere monedas o gana en el casino.
                </p>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
