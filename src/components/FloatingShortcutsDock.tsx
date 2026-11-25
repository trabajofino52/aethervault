import React from 'react';
import { useGame } from '../context/GameContext';
import {
  Trophy,
  Share2,
  Flame,
  MessageSquare,
  LifeBuoy,
  ArrowLeftRight
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
    isHappyHourActiveForGame,
    setIsSupportPanelOpen,
    setIsTransferModalOpen,
    isOwner,
    playerVisibility,
    addNotification
  } = useGame();

  const hh = isHappyHourActiveForGame('Roulette');
  const multiplierLabel = hh.active ? `${hh.multiplier}x Activo` : '2x Activo';

  return (
    <aside
      aria-label="Acceso rápido"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-950/95 backdrop-blur-md border border-slate-800 shadow-2xl shadow-black/80 max-w-[96vw] overflow-x-auto"
    >
      {/* Optional: Top 50 Casino (Only visible to Owner or if Admin explicitly enabled it) */}
      {(isOwner || playerVisibility.showTop50Casino) && (
        <button
          onClick={() => {
            setActiveTab('top_50_casino');
            soundFx.playClick();
          }}
          className="flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 whitespace-nowrap transition-transform active:scale-95"
        >
          <span>🎰</span>
          <span>Top 50</span>
        </button>
      )}

      {/* 1. Always Visible: 🎰 Rueda 24h */}
      <button
        onClick={() => {
          setIsDailyBonusModalOpen(true);
          soundFx.playClick();
        }}
        title="Rueda Diaria 24h & Misiones"
        className="flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-bold whitespace-nowrap transition-transform active:scale-95"
      >
        <span>🎰</span>
        <span>Rueda 24h</span>
      </button>

      {/* 2. Always Visible: Torneo 30% */}
      <button
        onClick={() => {
          setIsLeaderboardModalOpen(true);
          soundFx.playClick();
        }}
        title="Ranking Top 100 & Torneo 30%"
        className="flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 hover:border-cyan-500/40 text-xs font-semibold whitespace-nowrap transition-transform active:scale-95"
      >
        <Trophy className="w-3.5 h-3.5 text-cyan-400" />
        <span>Torneo 30%</span>
      </button>

      {/* 3. Always Visible: Afiliados 5% */}
      <button
        onClick={() => {
          setIsReferralModalOpen(true);
          soundFx.playClick();
        }}
        title="Afiliados 5% & Cupones VIP"
        className="flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-cyan-500/40 text-xs font-semibold whitespace-nowrap transition-transform active:scale-95"
      >
        <Share2 className="w-3.5 h-3.5 text-cyan-400" />
        <span>Afiliados 5%</span>
      </button>

      {/* 4. Always Visible: Chat */}
      <button
        onClick={() => {
          setIsChatWidgetOpen(!isChatWidgetOpen);
          soundFx.playClick();
        }}
        title="Chat Multijugador en Vivo"
        className={`flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition-transform active:scale-95 ${
          isChatWidgetOpen
            ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow'
            : 'bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-cyan-300 border-slate-800 hover:border-cyan-500/40'
        }`}
      >
        <MessageSquare className="w-3.5 h-3.5" />
        <span>Chat</span>
      </button>

      {/* 5. Always Visible: Transferir / Cambio */}
      <button
        onClick={() => {
          setIsTransferModalOpen(true);
          soundFx.playClick();
        }}
        title="Transferencias P2P, Conversor USD/USDT y Retiros PayPal/USDT"
        className="flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-300 hover:text-emerald-200 border border-slate-800 hover:border-emerald-500/40 text-xs font-semibold whitespace-nowrap transition-transform active:scale-95"
      >
        <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-400" />
        <span>Transferir / Cambio</span>
      </button>

      {/* 6. Always Visible: Soporte */}
      <button
        onClick={() => {
          setIsSupportPanelOpen(true);
          soundFx.playClick();
        }}
        title="Soporte, Tickets, Contraseña y Pagos"
        className="flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-amber-200 border border-slate-800 hover:border-amber-500/40 text-xs font-semibold whitespace-nowrap transition-transform active:scale-95"
      >
        <LifeBuoy className="w-3.5 h-3.5 text-amber-400" />
        <span>Soporte</span>
      </button>

      {/* 7. Always Visible: 2x Activo */}
      <button
        type="button"
        onClick={() => {
          soundFx.playClick();
          addNotification(
            'Multiplicador Hora Loca',
            hh.active
              ? `¡Multiplicador ${hh.multiplier}x activo en tus ganancias de casino!`
              : 'Bono multiplicador 2x de Hora Loca disponible en mesas seleccionadas.',
            'reward'
          );
        }}
        title="Multiplicador de Ganancias 2x Activo"
        className="flex items-center gap-1 min-h-[40px] px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-mono font-bold tabular-nums whitespace-nowrap hover:bg-amber-500/30 transition-colors"
      >
        <Flame className="w-3.5 h-3.5 text-amber-400" />
        <span>{multiplierLabel}</span>
      </button>
    </aside>
  );
};
