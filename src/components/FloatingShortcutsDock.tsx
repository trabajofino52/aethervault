import React from 'react';
import { useGame } from '../context/GameContext';
import {
  Gift,
  Trophy,
  Share2,
  Flame,
  MessageSquare,
  Sparkles,
  Play
} from 'lucide-react';
import { soundFx } from '../utils/audio';

export const FloatingShortcutsDock: React.FC = () => {
  const {
    setIsDailyBonusModalOpen,
    setIsLeaderboardModalOpen,
    setIsReferralModalOpen,
    setIsChatWidgetOpen,
    isChatWidgetOpen,
    setActiveTab,
    isHappyHourActiveForGame
  } = useGame();

  const hh = isHappyHourActiveForGame('Roulette');

  return (
    <aside aria-label="Acceso rápido" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-slate-800 shadow-2xl shadow-black/80 max-w-[95vw] overflow-x-auto">
      
      {/* 1. Top 50 Casino Shortcut */}
      <button
        onClick={() => {
          setActiveTab('top_50_casino');
          soundFx.playClick();
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 whitespace-nowrap transition-transform active:scale-95"
      >
        <span>🎰</span>
        <span>Top 50 Casino</span>
      </button>

      {/* 2. Rueda Diaria 24h & Misiones */}
      <button
        onClick={() => {
          setIsDailyBonusModalOpen(true);
          soundFx.playClick();
        }}
        title="Rueda Diaria & Misiones"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 text-xs font-semibold whitespace-nowrap transition-transform active:scale-95"
      >
        <Gift className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Rueda 24h</span>
      </button>

      {/* 3. Ranking & Torneo Semanal */}
      <button
        onClick={() => {
          setIsLeaderboardModalOpen(true);
          soundFx.playClick();
        }}
        title="Ranking Top 100 & Torneo"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/40 text-xs font-semibold whitespace-nowrap transition-transform active:scale-95"
      >
        <Trophy className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Torneo 30%</span>
      </button>

      {/* 4. Afiliados 5% & Promo Codes */}
      <button
        onClick={() => {
          setIsReferralModalOpen(true);
          soundFx.playClick();
        }}
        title="Afiliados 5% & Cupones VIP"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold whitespace-nowrap transition-transform active:scale-95"
      >
        <Share2 className="w-3.5 h-3.5 text-cyan-400" />
        <span className="hidden sm:inline">Afiliados 5%</span>
      </button>

      {/* 5. Chat en Vivo */}
      <button
        onClick={() => {
          setIsChatWidgetOpen(!isChatWidgetOpen);
          soundFx.playClick();
        }}
        title="Chat Multijugador en Vivo"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition-transform active:scale-95 ${
          isChatWidgetOpen
            ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow'
            : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border-slate-800 hover:border-cyan-500/40'
        }`}
      >
        <MessageSquare className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Chat</span>
      </button>

      {/* 6. Active Happy Hour Multiplier Badge */}
      {hh.active && (
        <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-mono font-bold whitespace-nowrap animate-pulse">
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>{hh.multiplier}x Activo</span>
        </div>
      )}

    </aside>
  );
};
