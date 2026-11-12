import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { Users, Bot, ShieldCheck, Sparkles, Radio, Trophy, Coins, MessageSquare, Flame, Clock } from 'lucide-react';
import { soundFx } from '../utils/audio';

interface CasinoTableBarProps {
  gameTitle: string;
  userBetAmount: number;
}

export const CasinoTableBar: React.FC<CasinoTableBarProps> = ({ gameTitle, userBetAmount }) => {
  const {
    gameMode,
    setGameMode,
    character,
    vaultEconomics,
    vaultRetentionRate,
    playerPrizeRate,
    isChatWidgetOpen,
    setIsChatWidgetOpen,
    sendChatMessage,
    isHappyHourActiveForGame
  } = useGame();

  const gameKey = gameTitle.toLowerCase().includes('ruleta')
    ? 'Roulette'
    : gameTitle.toLowerCase().includes('blackjack')
    ? 'Blackjack'
    : gameTitle.toLowerCase().includes('póker') || gameTitle.toLowerCase().includes('poker')
    ? 'Poker'
    : 'Arena';

  const hh = isHappyHourActiveForGame(gameKey);

  const [tableEvents, setTableEvents] = useState<string[]>([
    'Carlos VIP apostó 25 monedas al Rojo',
    'Sofia Crypto duplicó su apuesta en la mesa',
    'Marco HighRoller ganó +200 monedas con Blackjack',
    'Elena Pro ingresó a la sala multijugador'
  ]);

  useEffect(() => {
    if (gameMode !== 'MULTIPLAYER_LIVE') return;
    const interval = setInterval(() => {
      const players = ['Carlos VIP', 'Sofia Crypto', 'Marco HighRoller', 'Elena Pro', 'Niko_99'];
      const actions = [
        'hizo una apuesta de 50 monedas',
        'obtuvo un premio de +75 monedas',
        'activó un multiplicador de Suerte',
        'se plantó con 20',
        'apostó 100 monedas a números pares'
      ];
      const randomPlayer = players[Math.floor(Math.random() * players.length)];
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      setTableEvents(prev => [`${randomPlayer} ${randomAction}`, ...prev.slice(0, 3)]);
    }, 9000);
    return () => clearInterval(interval);
  }, [gameMode]);

  return (
    <div className="space-y-3">
      {/* Happy Hour Live Multiplier Banner */}
      {hh.active && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/90 via-amber-900/40 to-slate-950 border border-amber-500/50 shadow-xl shadow-amber-500/10 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0 shadow">
              <Flame className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-amber-300 font-display uppercase tracking-wide">
                  {hh.title || 'Hora Loca de Casino'}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[10px] font-black uppercase font-mono shadow">
                  +{Math.round((hh.multiplier - 1) * 100)}% Extra ({hh.multiplier}x)
                </span>
              </div>
              <p className="text-[11px] text-amber-200/90 mt-0.5">
                ¡El Administrador activó <strong>{hh.multiplier}x</strong> en ganancias para {hh.gameSection === 'ALL_GAMES' ? 'todos los juegos' : gameTitle}!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-mono text-amber-300 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-amber-500/40 shrink-0">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {hh.remainingSeconds >= 900000
                ? 'Activo Permanente'
                : `${Math.floor(hh.remainingSeconds / 60)}m ${hh.remainingSeconds % 60}s restantes`}
            </span>
          </div>
        </div>
      )}

      {/* Mode Switcher & 70/30 Guarantee Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900 border border-slate-800">
        
        {/* Toggle Mode */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => {
              setGameMode('SOLO_AI');
              soundFx.playClick();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              gameMode === 'SOLO_AI'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>vs Máquina (IA)</span>
          </button>

          <button
            onClick={() => {
              setGameMode('MULTIPLAYER_LIVE');
              soundFx.playClick();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              gameMode === 'MULTIPLAYER_LIVE'
                ? 'bg-cyan-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span className="flex items-center gap-1">
              <span>Multijugador en Vivo</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </span>
          </button>
        </div>

        {/* Dynamic Margin Guarantee Badge & Chat Button */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono-numbers flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Bóveda {vaultRetentionRate}% Retención · {playerPrizeRate}% Fondo Premios</span>
          </div>
          
          <button
            onClick={() => {
              setIsChatWidgetOpen(!isChatWidgetOpen);
              soundFx.playClick();
            }}
            className={`px-3 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-colors ${
              isChatWidgetOpen
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow'
                : 'bg-slate-950 border-slate-700 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat en Vivo</span>
          </button>
        </div>

      </div>

      {/* Live Table Seating (Shown when MULTIPLAYER_LIVE is selected) */}
      {gameMode === 'MULTIPLAYER_LIVE' && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-cyan-500/30 space-y-3 shadow-lg">
          <div className="flex flex-wrap items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2 text-cyan-300 font-bold">
              <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>Mesa en Vivo #{gameTitle} (4 Jugadores Conectados)</span>
            </div>
            
            {/* Quick in-table reactions */}
            <div className="flex items-center gap-1">
              {['🔥', '🎉', '💎', '🍀'].map((emoji, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    sendChatMessage(`${emoji} Jugada de ${character.name}`);
                  }}
                  title="Enviar reacción rápida a la mesa"
                  className="w-7 h-7 rounded-lg bg-slate-900 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/40 text-xs flex items-center justify-center transition-transform active:scale-90"
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="text-[11px] text-slate-400 font-mono">
              E2EE Sala: <strong className="text-emerald-400">0x7F2a...ROOM1</strong>
            </div>
          </div>

          {/* Seats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            
            {/* Seat 1 */}
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-400 flex items-center justify-center text-xs font-bold text-white shadow">
                CV
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-200 truncate">Carlos VIP</div>
                <div className="text-[10px] text-cyan-400 font-mono flex items-center gap-1">
                  <Coins className="w-3 h-3 text-amber-400" />
                  <span>25 mo</span>
                </div>
              </div>
            </div>

            {/* Seat 2 */}
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-pink-400 flex items-center justify-center text-xs font-bold text-white shadow">
                SC
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-200 truncate">Sofia Crypto</div>
                <div className="text-[10px] text-cyan-400 font-mono flex items-center gap-1">
                  <Coins className="w-3 h-3 text-amber-400" />
                  <span>10 mo</span>
                </div>
              </div>
            </div>

            {/* Seat 3 (Current User) */}
            <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/50 flex items-center gap-2.5 shadow-md">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-amber-400 bg-slate-950">
                <img src={character.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-amber-300 truncate">Tú ({character.name})</div>
                <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 font-bold">
                  <Coins className="w-3 h-3 text-amber-400" />
                  <span>{userBetAmount > 0 ? `${userBetAmount} mo` : 'Sin apuesta'}</span>
                </div>
              </div>
            </div>

            {/* Seat 4 */}
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 to-yellow-400 flex items-center justify-center text-xs font-bold text-slate-950 shadow">
                MH
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-200 truncate">Marco HighRoller</div>
                <div className="text-[10px] text-cyan-400 font-mono flex items-center gap-1">
                  <Coins className="w-3 h-3 text-amber-400" />
                  <span>100 mo</span>
                </div>
              </div>
            </div>

          </div>

          {/* Ticker of live actions */}
          <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1 font-mono overflow-hidden">
            <span className="text-cyan-400 font-bold shrink-0">Última Jugada:</span>
            <span className="truncate text-slate-300">{tableEvents[0]}</span>
          </div>

        </div>
      )}
    </div>
  );
};
