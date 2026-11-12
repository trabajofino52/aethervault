import React from 'react';
import { useGame } from '../context/GameContext';
import { Bell, CheckCircle2, ShieldCheck, Trophy, Info, X } from 'lucide-react';

export const PushNotificationToast: React.FC = () => {
  const { activeToast, dismissToast } = useGame();

  if (!activeToast) return null;

  const renderIcon = () => {
    switch (activeToast.type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
      case 'security':
        return <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0" />;
      case 'reward':
        return <Trophy className="w-5 h-5 text-amber-400 shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-blue-400 shrink-0" />;
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full transition-all animate-in fade-in slide-in-from-top-3 duration-300">
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-4 shadow-2xl shadow-black/80 flex items-start gap-3 relative overflow-hidden">
        {/* Glowing top line accent */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 via-emerald-400 to-cyan-400" />
        
        <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/60 mt-0.5">
          {renderIcon()}
        </div>

        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
              <Bell className="w-3 h-3 text-amber-400" />
              Notificación Push
            </span>
            <span className="text-xs text-slate-500 font-mono-numbers">Ahora</span>
          </div>
          <h4 className="text-sm font-semibold text-slate-100 mt-0.5 truncate">
            {activeToast.title}
          </h4>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed break-words">
            {activeToast.message}
          </p>
          {activeToast.amount !== undefined && (
            <div className="mt-2 text-xs font-semibold text-emerald-400 font-mono-numbers">
              + {activeToast.amount} Monedas Aether Acreditadas
            </div>
          )}
        </div>

        <button
          onClick={dismissToast}
          aria-label="Cerrar notificación"
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-100 p-1 rounded-md hover:bg-slate-800/60 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
