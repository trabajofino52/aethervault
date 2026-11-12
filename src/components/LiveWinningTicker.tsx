import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, ShieldCheck, Flame, Pause, Play, ExternalLink } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { soundFx } from '../utils/audio';

interface WinningEvent {
  id: string;
  player: string;
  flag: string;
  gameTitle: string;
  gameId: string;
  multiplier: number;
  betCoins: number;
  wonCoins: number;
  wonUSD: number;
  timestamp: string;
  isBigWin: boolean;
}

const INITIAL_WINS: WinningEvent[] = [
  {
    id: 'win_1',
    player: 'Elena_VIP',
    flag: '🇪🇸',
    gameTitle: 'Gates of Olympus 1000',
    gameId: 'gates_of_olympus_1000',
    multiplier: 125.4,
    betCoins: 50,
    wonCoins: 6270,
    wonUSD: 5016,
    timestamp: 'Hace 12s',
    isBigWin: true
  },
  {
    id: 'win_2',
    player: 'Carlos_Crypto',
    flag: '🇲🇽',
    gameTitle: 'Aviator',
    gameId: 'aviator_spribe',
    multiplier: 24.8,
    betCoins: 100,
    wonCoins: 2480,
    wonUSD: 1984,
    timestamp: 'Hace 28s',
    isBigWin: false
  },
  {
    id: 'win_3',
    player: 'Marco_Roll',
    flag: '🇨🇴',
    gameTitle: 'Sweet Bonanza 1000',
    gameId: 'sweet_bonanza_1000',
    multiplier: 312.0,
    betCoins: 30,
    wonCoins: 9360,
    wonUSD: 7488,
    timestamp: 'Hace 45s',
    isBigWin: true
  },
  {
    id: 'win_4',
    player: 'Sofia_Whale',
    flag: '🇦🇷',
    gameTitle: 'Crazy Time',
    gameId: 'crazy_time',
    multiplier: 50.0,
    betCoins: 80,
    wonCoins: 4000,
    wonUSD: 3200,
    timestamp: 'Hace 1m',
    isBigWin: true
  },
  {
    id: 'win_5',
    player: 'Kenji_Slot',
    flag: '🇯🇵',
    gameTitle: 'Wanted Dead or a Wild',
    gameId: 'wanted_dead_or_wild',
    multiplier: 540.2,
    betCoins: 25,
    wonCoins: 13505,
    wonUSD: 10804,
    timestamp: 'Hace 2m',
    isBigWin: true
  },
  {
    id: 'win_6',
    player: 'Lucas_Strike',
    flag: '🇧🇷',
    gameTitle: 'Big Bass Splash',
    gameId: 'big_bass_splash',
    multiplier: 18.5,
    betCoins: 40,
    wonCoins: 740,
    wonUSD: 592,
    timestamp: 'Hace 2m',
    isBigWin: false
  },
  {
    id: 'win_7',
    player: 'Goku_Fan77',
    flag: '🇨🇱',
    gameTitle: 'Sugar Rush 1000',
    gameId: 'sugar_rush_1000',
    multiplier: 88.0,
    betCoins: 60,
    wonCoins: 5280,
    wonUSD: 4224,
    timestamp: 'Hace 3m',
    isBigWin: true
  }
];

const RANDOM_GAMES = [
  { id: 'gates_of_olympus_1000', title: 'Gates of Olympus 1000' },
  { id: 'aviator_spribe', title: 'Aviator' },
  { id: 'sweet_bonanza_1000', title: 'Sweet Bonanza 1000' },
  { id: 'wanted_dead_or_wild', title: 'Wanted Dead or a Wild' },
  { id: 'tombstone_rip', title: 'Tombstone RIP' },
  { id: 'razor_returns', title: 'Razor Returns' },
  { id: 'lightning_roulette', title: 'Lightning Roulette' },
  { id: 'spaceman', title: 'Spaceman' },
  { id: 'book_of_dead', title: 'Book of Dead' },
  { id: 'crazy_time', title: 'Crazy Time' }
];

const RANDOM_PLAYERS = [
  { name: 'Dave_Stake', flag: '🇺🇸' },
  { name: 'Mateo_VIP', flag: '🇨🇴' },
  { name: 'Camila_Ace', flag: '🇨🇱' },
  { name: 'Hans_Pro', flag: '🇩🇪' },
  { name: 'Valeria_Gold', flag: '🇲🇽' },
  { name: 'Liam_Crypto', flag: '🇬🇧' },
  { name: 'Thiago_Winner', flag: '🇧🇷' },
  { name: 'Andres_King', flag: '🇵🇪' }
];

export const LiveWinningTicker: React.FC = () => {
  const { setActiveTab } = useGame();
  const [wins, setWins] = useState<WinningEvent[]>(INITIAL_WINS);
  const [isPaused, setIsPaused] = useState(false);
  const [filterHighMultiplier, setFilterHighMultiplier] = useState(false);

  // Periodic injection of realistic wins from other players
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      const randGame = RANDOM_GAMES[Math.floor(Math.random() * RANDOM_GAMES.length)];
      const randPlayer = RANDOM_PLAYERS[Math.floor(Math.random() * RANDOM_PLAYERS.length)];
      const isBig = Math.random() > 0.65;
      const multiplier = isBig
        ? +(Math.random() * 400 + 50).toFixed(1)
        : +(Math.random() * 25 + 3.5).toFixed(1);
      const betCoins = [10, 20, 25, 50, 100][Math.floor(Math.random() * 5)];
      const wonCoins = Math.floor(betCoins * multiplier);
      const wonUSD = Math.round(wonCoins * 0.8); // 1,000 monedas = $800 USD

      const newWin: WinningEvent = {
        id: 'win_' + Date.now(),
        player: randPlayer.name,
        flag: randPlayer.flag,
        gameTitle: randGame.title,
        gameId: randGame.id,
        multiplier,
        betCoins,
        wonCoins,
        wonUSD,
        timestamp: 'Ahora',
        isBigWin: multiplier >= 50
      };

      setWins(prev => [newWin, ...prev.slice(0, 14)]);
    }, 7500);

    return () => clearInterval(interval);
  }, [isPaused]);

  const displayWins = filterHighMultiplier
    ? wins.filter(w => w.multiplier >= 50)
    : wins;

  return (
    <div className="w-full bg-slate-950/90 border-y border-amber-500/20 backdrop-blur-md px-2 sm:px-4 py-1.5 flex items-center justify-between gap-3 text-xs overflow-hidden select-none">
      {/* Live Indicator Badge */}
      <div className="flex items-center gap-2 shrink-0 pr-3 border-r border-slate-800">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <div className="flex items-center gap-1">
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-bold text-[11px] tracking-wider uppercase text-amber-300">
            Premios en Vivo
          </span>
        </div>
      </div>

      {/* Marquee ticker container with subtle overflow gradient */}
      <div className="relative flex-1 overflow-hidden">
        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar scroll-smooth py-0.5">
          {displayWins.map((win, idx) => (
            <div
              key={win.id + idx}
              onClick={() => {
                setActiveTab('top_50_casino');
                soundFx.playClick();
              }}
              className={`flex items-center gap-2 shrink-0 px-2.5 py-1 rounded-lg border cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                win.isBigWin
                  ? 'bg-gradient-to-r from-amber-950/60 to-purple-950/60 border-amber-500/50 shadow-sm shadow-amber-500/20'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
              title={`Clic para jugar ${win.gameTitle} en el Top 50 Casino`}
            >
              <span className="text-sm">{win.flag}</span>
              <span className="font-medium text-slate-300 font-mono-numbers">
                {win.player}
              </span>
              <span className="text-slate-500 text-[10px] hidden md:inline">en</span>
              <span className="text-amber-200/90 font-medium truncate max-w-[130px] hidden sm:inline">
                {win.gameTitle}
              </span>
              <span
                className={`font-black font-mono-numbers px-1.5 py-0.5 rounded text-[11px] ${
                  win.isBigWin
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {win.multiplier}x
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-amber-400 font-bold font-mono-numbers">
                  +{win.wonCoins.toLocaleString()} mo
                </span>
                <span className="text-[10px] text-emerald-400/80 font-mono-numbers hidden lg:inline">
                  (${win.wonUSD.toLocaleString()} USD)
                </span>
              </div>
              <span title="Verificado Provably-Fair SHA-256">
                <ShieldCheck className="w-3 h-3 text-emerald-400/60 shrink-0" />
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Controls */}
      <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-slate-800">
        <button
          onClick={() => {
            setFilterHighMultiplier(prev => !prev);
            soundFx.playClick();
          }}
          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all whitespace-nowrap ${
            filterHighMultiplier
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
          }`}
          title="Filtrar solo pagos mayores a 50x"
        >
          {filterHighMultiplier ? '🔥 >50x Solo' : 'Todos'}
        </button>

        <button
          onClick={() => {
            setIsPaused(prev => !prev);
            soundFx.playClick();
          }}
          className="p-1 rounded bg-slate-800/80 text-slate-400 hover:text-slate-200 transition-colors"
          title={isPaused ? 'Reanudar ticker' : 'Pausar ticker'}
        >
          {isPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
};
