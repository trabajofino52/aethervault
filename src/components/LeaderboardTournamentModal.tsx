import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { LeaderboardEntry } from '../types';
import {
  Trophy,
  Medal,
  Crown,
  X,
  Coins,
  ShieldCheck,
  Flame,
  Search,
  Sparkles,
  Users,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import { soundFx } from '../utils/audio';

export const LeaderboardTournamentModal: React.FC = () => {
  const {
    isLeaderboardModalOpen,
    setIsLeaderboardModalOpen,
    character,
    vaultEconomics,
    coins
  } = useGame();

  const [filterTab, setFilterTab] = useState<'tournament' | 'top100'>('tournament');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isLeaderboardModalOpen) return null;

  // Mock global leaderboard records up to top tier players
  const BASE_LEADERBOARD: LeaderboardEntry[] = [
    {
      rank: 1,
      name: 'Marco HighRoller',
      avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80',
      level: 94,
      title: 'Soberano Arcano Legendario',
      coinsWon: 128500,
      vipTier: 'Grandmaster'
    },
    {
      rank: 2,
      name: 'Alexander Rex',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      level: 88,
      title: 'Soberano Arcano Legendario',
      coinsWon: 94200,
      vipTier: 'Grandmaster'
    },
    {
      rank: 3,
      name: 'Sofia Crypto',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      level: 79,
      title: 'Gran Comandante Titánico',
      coinsWon: 67800,
      vipTier: 'Diamond'
    },
    {
      rank: 4,
      name: 'Carlos VIP',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      level: 72,
      title: 'Gran Comandante Titánico',
      coinsWon: 52100,
      vipTier: 'Diamond'
    },
    {
      rank: 5,
      name: 'Elena Pro',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      level: 65,
      title: 'Gran Comandante Titánico',
      coinsWon: 41900,
      vipTier: 'Emerald'
    },
    {
      rank: 6,
      name: 'David CyberKnight',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      level: 58,
      title: 'Gran Comandante Titánico',
      coinsWon: 34500,
      vipTier: 'Emerald'
    },
    {
      rank: 7,
      name: 'Valeria Neo',
      avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
      level: 49,
      title: 'Maestro Ciber-Guardián',
      coinsWon: 27800,
      vipTier: 'Platinum'
    },
    {
      rank: 8,
      name: 'Lucas Quantum',
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
      level: 43,
      title: 'Maestro Ciber-Guardián',
      coinsWon: 21400,
      vipTier: 'Platinum'
    },
    {
      rank: 9,
      name: 'Niko_99',
      avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
      level: 38,
      title: 'Maestro Ciber-Guardián',
      coinsWon: 16900,
      vipTier: 'Gold'
    },
    {
      rank: 10,
      name: 'Aria Eclipse',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      level: 32,
      title: 'Maestro Ciber-Guardián',
      coinsWon: 12400,
      vipTier: 'Gold'
    }
  ];

  // User entry
  const userEntry: LeaderboardEntry = {
    rank: 14,
    name: `${character.name} (Tú)`,
    avatar: character.avatarUrl,
    level: character.level,
    title: character.title,
    coinsWon: character.totalWon || 450,
    vipTier: character.level >= 80 ? 'Grandmaster' : character.level >= 50 ? 'Diamond' : character.level >= 25 ? 'Emerald' : 'Platinum',
    isCurrentUser: true
  };

  const fullList = [...BASE_LEADERBOARD, userEntry].sort((a, b) => b.coinsWon - a.coinsWon);
  // Re-rank
  const rankedList = fullList.map((item, idx) => ({ ...item, rank: idx + 1 }));

  const filteredList = rankedList.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Tournament prize pool is mathematically fed by 30% of wagers
  const tournamentPrizePoolCoins = Math.max(15000, vaultEconomics.playerPrizeReserve);
  const firstPrize = Math.round(tournamentPrizePoolCoins * 0.5);
  const secondPrize = Math.round(tournamentPrizePoolCoins * 0.3);
  const thirdPrize = Math.round(tournamentPrizePoolCoins * 0.2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Top Header */}
        <div className="p-6 bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Trophy className="w-6 h-6 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-100 font-display">
                  Ranking Global & Torneo High Roller
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded border border-amber-500/40">
                  Niveles 1-100
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pozo de premios financiado por el 30% de reserva de apuestas de la plataforma
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setIsLeaderboardModalOpen(false);
              soundFx.playClick();
            }}
            className="p-2 text-slate-400 hover:text-slate-100 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-2 gap-2">
          <button
            onClick={() => {
              setFilterTab('tournament');
              soundFx.playClick();
            }}
            className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              filterTab === 'tournament'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Crown className="w-4 h-4" />
            <span>Torneo Semanal (Pozo 30% Reserva)</span>
          </button>

          <button
            onClick={() => {
              setFilterTab('top100');
              soundFx.playClick();
            }}
            className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              filterTab === 'top100'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Tabla de Clasificación Top 100</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* TAB 1: TOURNAMENT SHOWCASE */}
          {filterTab === 'tournament' && (
            <div className="space-y-6">
              
              {/* Prize Pool Hero Card */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-950/60 via-slate-950 to-slate-900 border border-amber-500/40 relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                      <Sparkles className="w-4 h-4" />
                      <span>Gran Premio Semanal Garantizado</span>
                    </div>
                    <div className="text-3xl sm:text-4xl font-black text-slate-100 font-mono-numbers flex items-center gap-2">
                      <Coins className="w-8 h-8 text-amber-400" />
                      <span>{tournamentPrizePoolCoins.toLocaleString()}</span>
                      <span className="text-lg text-amber-400 font-sans">Monedas Aether</span>
                    </div>
                    <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                      El fondo de premios crece en tiempo real con cada jugada en Ruleta, Blackjack y Póker gracias al 30% destinado automáticamente por la arquitectura financiera.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-center space-y-1 shrink-0">
                    <div className="text-[10px] text-slate-400 uppercase font-medium flex items-center justify-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Cierre de Torneo</span>
                    </div>
                    <div className="text-lg font-bold font-mono text-amber-300">
                      2d 18h 40m
                    </div>
                    <div className="text-[10px] text-emerald-400 font-mono">
                      Reparto Automático
                    </div>
                  </div>
                </div>

                {/* Podium Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t border-slate-800/80 mt-6">
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-center space-y-1">
                    <div className="text-2xl">🥇</div>
                    <div className="text-xs font-bold text-amber-300">1° Lugar (50%)</div>
                    <div className="text-lg font-black font-mono-numbers text-slate-100">
                      +{firstPrize.toLocaleString()} mo
                    </div>
                    <div className="text-[10px] text-slate-400">Marco HighRoller (Lv.94)</div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-1">
                    <div className="text-2xl">🥈</div>
                    <div className="text-xs font-bold text-slate-300">2° Lugar (30%)</div>
                    <div className="text-lg font-black font-mono-numbers text-slate-100">
                      +{secondPrize.toLocaleString()} mo
                    </div>
                    <div className="text-[10px] text-slate-400">Alexander Rex (Lv.88)</div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-1">
                    <div className="text-2xl">🥉</div>
                    <div className="text-xs font-bold text-slate-300">3° Lugar (20%)</div>
                    <div className="text-lg font-black font-mono-numbers text-slate-100">
                      +{thirdPrize.toLocaleString()} mo
                    </div>
                    <div className="text-[10px] text-slate-400">Sofia Crypto (Lv.79)</div>
                  </div>
                </div>

              </div>

              {/* Your Standing Card */}
              <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/50 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-amber-400 bg-slate-950">
                    <img src={character.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                      <span>Tu Posición: #{userEntry.rank}</span>
                      <span className="text-[10px] text-cyan-300 font-mono bg-cyan-950 px-1.5 rounded">
                        Nivel {character.level}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {character.name} · {character.title}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-amber-300 font-mono-numbers">
                    +{userEntry.coinsWon.toLocaleString()} mo
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {character.victories} victorias en casino
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: TOP 100 LEADERBOARD */}
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar jugador por nombre o título..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans divide-y divide-slate-800">
                <thead>
                  <tr className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                    <th className="py-2.5 px-3">Rango</th>
                    <th className="py-2.5 px-3">Jugador & Título</th>
                    <th className="py-2.5 px-3 text-center">Nivel</th>
                    <th className="py-2.5 px-3 text-center">VIP Tier</th>
                    <th className="py-2.5 px-3 text-right">Monedas Ganadas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono-numbers">
                  {filteredList.map(item => (
                    <tr
                      key={item.name}
                      className={`hover:bg-slate-950/60 transition-colors ${
                        item.isCurrentUser ? 'bg-cyan-950/30 border-l-2 border-cyan-400 font-bold' : ''
                      }`}
                    >
                      <td className="py-3 px-3">
                        {item.rank === 1 ? (
                          <span className="text-lg">🥇</span>
                        ) : item.rank === 2 ? (
                          <span className="text-lg">🥈</span>
                        ) : item.rank === 3 ? (
                          <span className="text-lg">🥉</span>
                        ) : (
                          <span className="font-bold text-slate-400 text-xs">#{item.rank}</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={item.avatar}
                            alt={item.name}
                            className="w-7 h-7 rounded-full object-cover border border-slate-700 shrink-0"
                          />
                          <div className="min-w-0 font-sans">
                            <div className="text-xs font-bold text-slate-200 truncate flex items-center gap-1">
                              <span>{item.name}</span>
                              {item.isCurrentUser && <span className="text-[10px] text-cyan-400">★</span>}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">{item.title}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-200">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[11px]">
                          Lv. {item.level}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-sans bg-amber-500/10 text-amber-300 border border-amber-500/30">
                          {item.vipTier}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-amber-400">
                        +{item.coinsWon.toLocaleString()} mo
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
