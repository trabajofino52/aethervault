import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { TOP_50_CASINO_GAMES } from '../data/top50CasinoGames';
import { CasinoGameItem, CasinoCategory } from '../types';
import {
  Sparkles,
  Search,
  Star,
  Play,
  RotateCcw,
  Flame,
  Clock,
  ShieldCheck,
  TrendingUp,
  SlidersHorizontal,
  X,
  Volume2,
  Trophy,
  Coins,
  CheckCircle2,
  Bomb,
  Gem,
  Award,
  Zap
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import confetti from 'canvas-confetti';

export const Top50CasinoHub: React.FC = () => {
  const {
    coins,
    executeBet,
    addNotification,
    setActiveTab,
    isHappyHourActiveForGame,
    setIsProvablyFairModalOpen
  } = useGame();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [selectedProvider, setSelectedProvider] = useState<string>('Todos');
  const [sortBy, setSortBy] = useState<'popularity' | 'rtp' | 'multiplier' | 'alpha'>('popularity');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('aethervault_top50_favs');
      return saved ? JSON.parse(saved) : ['gates_of_olympus', 'sweet_bonanza', 'aviator_crash', 'classic_blackjack_vip'];
    } catch {
      return [];
    }
  });

  // Modal Game Player State
  const [activeGame, setActiveGame] = useState<CasinoGameItem | null>(null);

  // Slot Engine State
  const [slotBet, setSlotBet] = useState(10);
  const [isSpinningSlot, setIsSpinningSlot] = useState(false);
  const [slotReels, setSlotReels] = useState<string[]>(['⚡', '👑', '💎', '🍇', '⚡']);
  const [slotLastWin, setSlotLastWin] = useState<number | null>(null);
  const [isTurboSlot, setIsTurboSlot] = useState(false);
  const [autoSpinsCount, setAutoSpinsCount] = useState(0);

  // Crash Engine State
  const [crashBet, setCrashBet] = useState(25);
  const [isCrashRunning, setIsCrashRunning] = useState(false);
  const [crashMultiplier, setCrashMultiplier] = useState(1.0);
  const [hasCashedOut, setHasCashedOut] = useState(false);
  const [crashCrashedAt, setCrashCrashedAt] = useState<number | null>(null);
  const crashIntervalRef = useRef<number | null>(null);

  // Mines Engine State
  const [minesBet, setMinesBet] = useState(10);
  const [minesCount, setMinesCount] = useState(3);
  const [minesGrid, setMinesGrid] = useState<Array<{ id: number; revealed: boolean; isMine: boolean }>>([]);
  const [isMinesGameActive, setIsMinesGameActive] = useState(false);
  const [minesCurrentMultiplier, setMinesCurrentMultiplier] = useState(1.0);

  // Dice Engine State
  const [diceBet, setDiceBet] = useState(20);
  const [diceTarget, setDiceTarget] = useState(50);
  const [diceRollResult, setDiceRollResult] = useState<number | null>(null);
  const [isRollingDice, setIsRollingDice] = useState(false);

  // Baccarat Engine State
  const [baccaratBet, setBaccaratBet] = useState(20);
  const [baccaratChoice, setBaccaratChoice] = useState<'PLAYER' | 'BANKER' | 'TIE'>('PLAYER');
  const [baccaratResult, setBaccaratResult] = useState<{
    playerScore: number;
    bankerScore: number;
    winner: 'PLAYER' | 'BANKER' | 'TIE';
    playerCards: string[];
    bankerCards: string[];
  } | null>(null);

  // Check Happy Hour
  const hh = isHappyHourActiveForGame('Top50Casino');

  // Toggle favorite
  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
      try {
        localStorage.setItem('aethervault_top50_favs', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
    soundFx.playClick();
  };

  // Extract distinct providers
  const providers = ['Todos', ...Array.from(new Set(TOP_50_CASINO_GAMES.map(g => g.provider)))];

  // Categories list
  const categories: string[] = [
    'Todos',
    'Slots',
    'Crash & Crypto',
    'Ruleta',
    'Blackjack',
    'Póker & Cartas',
    'En Vivo & Shows',
    'Dados & Baccarat'
  ];

  // Filtering & Sorting
  const filteredGames = TOP_50_CASINO_GAMES.filter(game => {
    const matchesSearch =
      game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'Todos' || game.category === selectedCategory;
    const matchesProvider = selectedProvider === 'Todos' || game.provider === selectedProvider;
    const matchesFavorite = !showFavoritesOnly || favorites.includes(game.id);

    return matchesSearch && matchesCategory && matchesProvider && matchesFavorite;
  }).sort((a, b) => {
    if (sortBy === 'rtp') return b.rtp - a.rtp;
    if (sortBy === 'alpha') return a.title.localeCompare(b.title);
    if (sortBy === 'multiplier') {
      const getNum = (s: string) => {
        const cleaned = s.replace(/[^0-9]/g, '');
        return cleaned ? parseInt(cleaned, 10) : 0;
      };
      return getNum(b.maxMultiplier) - getNum(a.maxMultiplier);
    }
    // popularity / default: featured first then default order
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return 0;
  });

  // Launch Game Handler
  const handleLaunchGame = (game: CasinoGameItem) => {
    soundFx.playClick();
    if (game.interactiveEngine === 'roulette') {
      setActiveTab('roulette');
      return;
    }
    if (game.interactiveEngine === 'blackjack') {
      setActiveTab('blackjack');
      return;
    }
    if (game.interactiveEngine === 'poker') {
      setActiveTab('poker');
      return;
    }
    if (game.interactiveEngine === 'arena') {
      setActiveTab('arena');
      return;
    }

    // Otherwise launch embedded interactive engine modal
    setActiveGame(game);
    setSlotLastWin(null);
    setCrashCrashedAt(null);
    setIsCrashRunning(false);
    setIsMinesGameActive(false);
    setDiceRollResult(null);
    setBaccaratResult(null);
  };

  // ==========================================
  // Slot Machine Engine (Supports Turbo & Auto-play)
  // ==========================================
  const handleSpinSlot = async (overrideRemaining?: number) => {
    if (coins < slotBet || isSpinningSlot || !activeGame) {
      setAutoSpinsCount(0);
      return;
    }
    setIsSpinningSlot(true);
    soundFx.playRouletteTick();

    const remaining = overrideRemaining !== undefined ? overrideRemaining : autoSpinsCount;

    if (isTurboSlot) {
      await finishSlotSpin(remaining);
      return;
    }

    const symbolsPool = ['⚡', '👑', '💎', '🍇', '🔔', '🍒', '7️⃣', '🍭'];
    let iterations = 0;
    const spinInterval = setInterval(() => {
      setSlotReels([
        symbolsPool[Math.floor(Math.random() * symbolsPool.length)],
        symbolsPool[Math.floor(Math.random() * symbolsPool.length)],
        symbolsPool[Math.floor(Math.random() * symbolsPool.length)],
        symbolsPool[Math.floor(Math.random() * symbolsPool.length)],
        symbolsPool[Math.floor(Math.random() * symbolsPool.length)]
      ]);
      iterations++;
      if (iterations >= 6) {
        clearInterval(spinInterval);
        finishSlotSpin(remaining);
      }
    }, 70);
  };

  const finishSlotSpin = async (remainingSpins: number = 0) => {
    if (!activeGame) return;
    const symbolsPool = ['⚡', '👑', '💎', '🍇', '🔔', '🍒', '7️⃣', '🍭'];
    const randomPick = () => symbolsPool[Math.floor(Math.random() * symbolsPool.length)];

    // 40% probability of matching 3+
    const isWin = Math.random() < 0.42;
    let finalSymbols: string[];
    let winMultiplier = 0;

    if (isWin) {
      const matchSymbol = randomPick();
      const matchCount = Math.random() < 0.2 ? 5 : Math.random() < 0.4 ? 4 : 3;
      finalSymbols = Array(5).fill('').map((_, idx) => (idx < matchCount ? matchSymbol : randomPick()));
      finalSymbols = finalSymbols.sort(() => 0.5 - Math.random());
      winMultiplier = matchCount === 5 ? 15 : matchCount === 4 ? 6 : 2.5;
    } else {
      finalSymbols = [randomPick(), randomPick(), randomPick(), randomPick(), randomPick()];
      winMultiplier = 0;
    }

    setSlotReels(finalSymbols);
    const winAmount = Math.floor(slotBet * winMultiplier);
    setSlotLastWin(winAmount);
    setIsSpinningSlot(false);

    await executeBet(
      'Top50Casino',
      slotBet,
      winAmount,
      `${activeGame.title}: ${winAmount > 0 ? `Ganador ${winMultiplier}x (${finalSymbols.join(' ')})` : 'Tirada sin premio'}`
    );

    if (winAmount > 0) {
      soundFx.playWinFanfare();
      confetti({ particleCount: 70, spread: 60 });
      addNotification(
        `¡Premio en ${activeGame.title}!`,
        `Has ganado +${winAmount} monedas en tu tirada.`,
        'reward',
        winAmount
      );
    }

    // Auto-spin trigger for next round
    if (remainingSpins > 1) {
      setAutoSpinsCount(remainingSpins - 1);
      setTimeout(() => {
        handleSpinSlot(remainingSpins - 1);
      }, isTurboSlot ? 250 : 650);
    } else {
      setAutoSpinsCount(0);
    }
  };

  // ==========================================
  // Crash Engine
  // ==========================================
  const startCrashRound = () => {
    if (coins < crashBet || isCrashRunning) return;
    setIsCrashRunning(true);
    setHasCashedOut(false);
    setCrashCrashedAt(null);
    setCrashMultiplier(1.0);
    soundFx.playClick();

    // Predetermined crash point between 1.05 and 15.00x
    const crashPoint = +(1.05 + Math.random() * Math.random() * 12).toFixed(2);

    let current = 1.0;
    const startTime = Date.now();

    crashIntervalRef.current = window.setInterval(() => {
      const elapsedSec = (Date.now() - startTime) / 1000;
      current = +(1.0 + Math.pow(elapsedSec, 1.45) * 0.45).toFixed(2);

      if (current >= crashPoint) {
        // Crashed!
        if (crashIntervalRef.current) clearInterval(crashIntervalRef.current);
        setIsCrashRunning(false);
        setCrashCrashedAt(crashPoint);
        soundFx.playClick();

        // If user didn't cash out, bet is lost
        executeBet('Top50Casino', crashBet, 0, `Aviator/Crash explotó en ${crashPoint}x`);
      } else {
        setCrashMultiplier(current);
      }
    }, 80);
  };

  const cashOutCrash = async () => {
    if (!isCrashRunning || hasCashedOut || !activeGame) return;
    if (crashIntervalRef.current) clearInterval(crashIntervalRef.current);
    setHasCashedOut(true);
    setIsCrashRunning(false);

    const winAmount = Math.floor(crashBet * crashMultiplier);
    await executeBet(
      'Top50Casino',
      crashBet,
      winAmount,
      `${activeGame.title}: Retiro exitoso a ${crashMultiplier}x (+${winAmount} mo)`
    );

    soundFx.playWinFanfare();
    confetti({ particleCount: 80, spread: 65 });
    addNotification(
      `¡Retiro Exitoso en ${activeGame.title}!`,
      `¡Cobraste a tiempo en ${crashMultiplier}x! Ganancia: +${winAmount} monedas.`,
      'reward',
      winAmount
    );
  };

  // Clean crash interval on unmount
  useEffect(() => {
    return () => {
      if (crashIntervalRef.current) clearInterval(crashIntervalRef.current);
    };
  }, []);

  // ==========================================
  // Mines Engine
  // ==========================================
  const startMinesGame = () => {
    if (coins < minesBet) return;
    soundFx.playClick();

    // Generate 25 tiles with minesCount random mines
    const indices = Array.from({ length: 25 }, (_, i) => i).sort(() => 0.5 - Math.random());
    const mineIndices = new Set(indices.slice(0, minesCount));

    const newGrid = Array.from({ length: 25 }, (_, id) => ({
      id,
      revealed: false,
      isMine: mineIndices.has(id)
    }));

    setMinesGrid(newGrid);
    setIsMinesGameActive(true);
    setMinesCurrentMultiplier(1.0);
  };

  const handleTileClick = (id: number) => {
    if (!isMinesGameActive) return;
    const tile = minesGrid[id];
    if (tile.revealed) return;

    soundFx.playCoinChime();
    const updatedGrid = minesGrid.map(t => (t.id === id ? { ...t, revealed: true } : t));
    setMinesGrid(updatedGrid);

    if (tile.isMine) {
      // Hit a mine!
      setIsMinesGameActive(false);
      // Reveal all mines
      setMinesGrid(updatedGrid.map(t => (t.isMine ? { ...t, revealed: true } : t)));
      soundFx.playClick();
      executeBet('Top50Casino', minesBet, 0, 'Minas: Explotó al destapar la mina');
      addNotification('¡Mina Detonada!', 'Has topado una mina y perdiste tu apuesta.', 'info');
    } else {
      // Uncovered a gem! Increase multiplier
      const nextMult = +(minesCurrentMultiplier * (1 + (minesCount / 18))).toFixed(2);
      setMinesCurrentMultiplier(nextMult);
    }
  };

  const cashOutMines = async () => {
    if (!isMinesGameActive) return;
    setIsMinesGameActive(false);
    const winAmount = Math.floor(minesBet * minesCurrentMultiplier);

    await executeBet(
      'Top50Casino',
      minesBet,
      winAmount,
      `Minas Cuánticas: Retiro exitoso a ${minesCurrentMultiplier}x`
    );

    soundFx.playWinFanfare();
    confetti({ particleCount: 75, spread: 60 });
    addNotification('¡Retiro en Minas!', `Cobraste a ${minesCurrentMultiplier}x ganando +${winAmount} monedas.`, 'reward', winAmount);
  };

  // ==========================================
  // Dice Engine
  // ==========================================
  const handleRollDice = async () => {
    if (coins < diceBet || isRollingDice || !activeGame) return;
    setIsRollingDice(true);
    soundFx.playClick();

    setTimeout(async () => {
      const outcome = Math.floor(Math.random() * 100) + 1; // 1-100
      setDiceRollResult(outcome);
      setIsRollingDice(false);

      const won = outcome < diceTarget;
      const multiplier = +(98 / diceTarget).toFixed(2);
      const winAmount = won ? Math.floor(diceBet * multiplier) : 0;

      await executeBet(
        'Top50Casino',
        diceBet,
        winAmount,
        `Dados Cripto: Salió ${outcome} (Objetivo: < ${diceTarget}) - ${won ? `Ganador ${multiplier}x` : 'No premiado'}`
      );

      if (won) {
        soundFx.playWinFanfare();
        confetti({ particleCount: 65, spread: 50 });
      }
    }, 450);
  };

  // ==========================================
  // Baccarat Engine
  // ==========================================
  const handlePlayBaccarat = async () => {
    if (coins < baccaratBet || !activeGame) return;
    soundFx.playClick();

    const randomCardVal = () => Math.floor(Math.random() * 10);
    const cardLabels = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const pickLabel = () => cardLabels[Math.floor(Math.random() * cardLabels.length)];

    const pCard1 = randomCardVal();
    const pCard2 = randomCardVal();
    const bCard1 = randomCardVal();
    const bCard2 = randomCardVal();

    const pScore = (pCard1 + pCard2) % 10;
    const bScore = (bCard1 + bCard2) % 10;

    const winner: 'PLAYER' | 'BANKER' | 'TIE' =
      pScore > bScore ? 'PLAYER' : bScore > pScore ? 'BANKER' : 'TIE';

    const resultObj = {
      playerScore: pScore,
      bankerScore: bScore,
      winner,
      playerCards: [pickLabel(), pickLabel()],
      bankerCards: [pickLabel(), pickLabel()]
    };
    setBaccaratResult(resultObj);

    const isWin = baccaratChoice === winner;
    let winAmount = 0;
    if (isWin) {
      if (winner === 'TIE') {
        winAmount = Math.floor(baccaratBet * 9); // 8:1 payout + bet
      } else {
        winAmount = Math.floor(baccaratBet * 1.95);
      }
    }

    await executeBet(
      'Top50Casino',
      baccaratBet,
      winAmount,
      `Baccarat: Punto ${pScore} vs Banca ${bScore} (${winner}) - Tu apuesta: ${baccaratChoice}`
    );

    if (isWin) {
      soundFx.playWinFanfare();
      confetti({ particleCount: 70, spread: 60 });
      addNotification('¡Mano Ganada en Baccarat!', `Acertaste la mano con ${winAmount} monedas ganadas.`, 'reward', winAmount);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Top Hero Showcase */}
      <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-950 border border-indigo-500/40 p-6 sm:p-8 shadow-2xl overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
                🎰 Catálogo Oficial de Casino Online
              </span>
              <span className="text-xs text-cyan-400 font-mono flex items-center gap-1 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded">
                <ShieldCheck className="w-3.5 h-3.5" />
                Cifrado Provably-Fair SHA-256
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-100 font-display">
              Los 50 Mejores Juegos de Casino Online
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Disfruta la colección legendaria de los títulos más jugados del planeta de <strong className="text-amber-400">Pragmatic Play, Evolution, Spribe, NetEnt, Nolimit City, Hacksaw Gaming y Play'n GO</strong>. Cada tirada cuenta con prueba criptográfica en tiempo real y bonificación de Suerte de tu Héroe.
            </p>
          </div>

          {/* Quick Metrics Badge */}
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-indigo-500/40 shrink-0 shadow-lg space-y-1">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Tus Monedas Aether
            </div>
            <div className="text-2xl font-black text-amber-400 font-mono-numbers flex items-center gap-1.5">
              <Coins className="w-5 h-5 text-amber-400" />
              <span>{coins.toLocaleString()}</span>
            </div>
            <div className="text-[10px] text-emerald-400 font-mono">
              ✓ 50 Juegos Listos para Jugar
            </div>
          </div>
        </div>

        {/* Happy Hour Live Alert if active */}
        {hh.active && (
          <div className="mt-5 p-3 rounded-2xl bg-amber-950/60 border border-amber-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200">
            <div className="flex items-center gap-2.5">
              <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>
                <strong>¡HORA LOCA EN CURSO!</strong> Todas las ganancias en los 50 juegos tienen un multiplicador automático de <span className="text-amber-400 font-bold font-mono">{hh.multiplier}x</span>.
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-amber-300 text-[11px]">
              <Clock className="w-3.5 h-3.5" />
              <span>{hh.remainingSeconds >= 900000 ? 'Permanente' : `${Math.floor(hh.remainingSeconds / 60)}m restantes`}</span>
            </div>
          </div>
        )}
      </div>

      {/* Filter, Search & Sorting Controls */}
      <div className="space-y-4">
        
        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold scrollbar-none">
          {categories.map(cat => {
            const count = cat === 'Todos' ? 50 : TOP_50_CASINO_GAMES.filter(g => g.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  soundFx.playClick();
                }}
                className={`py-2 px-3.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  selectedCategory === cat ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Secondary Filter Bar: Search, Provider, Sorting & Favorites */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg text-xs">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar entre los 50 juegos por nombre, proveedor o temática..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-amber-400 placeholder:text-slate-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            
            {/* Provider Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px]">Proveedor:</span>
              <select
                value={selectedProvider}
                onChange={e => setSelectedProvider(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
              >
                {providers.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Sort Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px]">Ordenar por:</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
              >
                <option value="popularity">Destacados & Popularidad</option>
                <option value="rtp">Mayor Retorno (RTP)</option>
                <option value="multiplier">Mayor Multiplicador Máximo</option>
                <option value="alpha">Alfabético (A-Z)</option>
              </select>
            </div>

            {/* Favorites Toggle */}
            <button
              onClick={() => {
                setShowFavoritesOnly(!showFavoritesOnly);
                soundFx.playClick();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
                showFavoritesOnly
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                  : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${showFavoritesOnly ? 'fill-amber-400 text-amber-400' : ''}`} />
              <span>Favoritos ({favorites.length})</span>
            </button>

          </div>
        </div>

      </div>

      {/* Showing count indicator */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>Mostrando <strong>{filteredGames.length}</strong> de 50 juegos</span>
        <span className="text-slate-500 font-mono">Modo Real: Monedas Aether y Prueba Criptográfica</span>
      </div>

      {/* 50 Games Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredGames.map((game, idx) => {
          const isFav = favorites.includes(game.id);
          return (
            <div
              key={game.id}
              onClick={() => handleLaunchGame(game)}
              className="group cursor-pointer rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-amber-500/70 p-4 shadow-xl hover:shadow-2xl hover:shadow-amber-500/10 transition-all hover:-translate-y-1 relative flex flex-col justify-between overflow-hidden"
            >
              {/* Card Header: Icon, Provider & Favorite Star */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${game.colorGradient} flex items-center justify-center text-2xl shadow-lg group-hover:scale-105 transition-transform shrink-0`}>
                    {game.iconEmoji}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-slate-950/80 border border-slate-800 text-slate-300">
                      {game.provider}
                    </span>
                    <button
                      type="button"
                      onClick={e => toggleFavorite(game.id, e)}
                      title={isFav ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                      className="p-1 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-amber-400 transition-colors"
                    >
                      <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Title & Category */}
                <div className="mt-3 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-slate-100 group-hover:text-amber-300 transition-colors truncate">
                      {game.title}
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {game.description}
                  </p>
                </div>
              </div>

              {/* Badges Strip & Action */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2.5">
                <div className="grid grid-cols-3 gap-1 text-center font-mono-numbers">
                  <div className="p-1 rounded bg-slate-950/60 border border-slate-800/60">
                    <span className="text-[9px] text-slate-500 block uppercase">RTP</span>
                    <span className="text-[11px] font-bold text-emerald-400">{game.rtp}%</span>
                  </div>
                  <div className="p-1 rounded bg-slate-950/60 border border-slate-800/60">
                    <span className="text-[9px] text-slate-500 block uppercase">Volatilidad</span>
                    <span className="text-[10px] font-bold text-amber-400">{game.volatility}</span>
                  </div>
                  <div className="p-1 rounded bg-slate-950/60 border border-slate-800/60">
                    <span className="text-[9px] text-slate-500 block uppercase">Máximo</span>
                    <span className="text-[10px] font-bold text-cyan-300 truncate block">{game.maxMultiplier}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="w-full py-2 bg-slate-950 hover:bg-amber-500 group-hover:bg-amber-500 text-slate-300 group-hover:text-slate-950 font-bold text-xs rounded-xl border border-slate-800 group-hover:border-amber-400 transition-all flex items-center justify-center gap-1.5 shadow"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Jugar Ahora</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* MODAL: EMBEDDED INTERACTIVE GAME LAUNCHER FOR 50 GAMES */}
      {/* ========================================================= */}
      {activeGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${activeGame.colorGradient} flex items-center justify-center text-2xl shadow`}>
                  {activeGame.iconEmoji}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-slate-100 font-display">
                      {activeGame.title}
                    </h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {activeGame.provider}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>RTP: <strong className="text-emerald-400">{activeGame.rtp}%</strong></span>
                    <span>·</span>
                    <span>Multiplicador: <strong className="text-cyan-300">{activeGame.maxMultiplier}</strong></span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveGame(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1. SLOT MACHINE ENGINE */}
            {activeGame.interactiveEngine === 'slot_engine' && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 border border-amber-500/40 text-center space-y-4 shadow-inner">
                  <div className="flex justify-center items-center gap-3 text-4xl sm:text-5xl py-4 bg-slate-950 rounded-2xl border border-slate-800 shadow-xl">
                    {slotReels.map((symbol, i) => (
                      <div
                        key={i}
                        className={`w-14 h-16 sm:w-16 sm:h-20 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center transform transition-transform ${
                          isSpinningSlot ? 'scale-110 blur-[1px]' : 'scale-100'
                        }`}
                      >
                        {symbol}
                      </div>
                    ))}
                  </div>

                  {slotLastWin !== null && (
                    <div className="text-sm font-bold font-mono">
                      {slotLastWin > 0 ? (
                        <span className="text-emerald-400 animate-pulse">
                          🎉 ¡Ganaste +{slotLastWin} monedas en esta tirada!
                        </span>
                      ) : (
                        <span className="text-slate-400">Tirada completada. ¡Sigue probando!</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Advanced Slot Controls: Turbo, Auto-Play, Bet & Spin */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                    {/* Bet Selectors */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 font-medium">Apuesta:</span>
                      {[5, 10, 25, 50, 100].map(bet => (
                        <button
                          key={bet}
                          onClick={() => {
                            setSlotBet(bet);
                            soundFx.playClick();
                          }}
                          disabled={isSpinningSlot || autoSpinsCount > 0}
                          className={`px-2.5 py-1 rounded-lg font-bold font-mono transition-all ${
                            slotBet === bet
                              ? 'bg-amber-500 text-slate-950 shadow'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          } disabled:opacity-50`}
                        >
                          {bet} mo
                        </button>
                      ))}
                    </div>

                    {/* Turbo Mode & Auto-Play Options */}
                    <div className="flex items-center gap-2">
                      {/* Turbo Mode */}
                      <button
                        onClick={() => {
                          setIsTurboSlot(prev => !prev);
                          soundFx.playClick();
                        }}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all ${
                          isTurboSlot
                            ? 'bg-purple-600 text-white shadow shadow-purple-500/30'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                        title="Giro Turbo ultrarrápido sin demora de animación"
                      >
                        <Zap className={`w-3.5 h-3.5 ${isTurboSlot ? 'fill-yellow-300 text-yellow-300' : ''}`} />
                        <span>Turbo {isTurboSlot ? 'ON' : 'OFF'}</span>
                      </button>

                      {/* Auto Play Selector */}
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500 text-[11px]">Auto:</span>
                        {[10, 25].map(cnt => (
                          <button
                            key={cnt}
                            onClick={() => {
                              if (autoSpinsCount > 0) {
                                setAutoSpinsCount(0);
                              } else {
                                setAutoSpinsCount(cnt);
                                handleSpinSlot(cnt);
                              }
                              soundFx.playClick();
                            }}
                            disabled={isSpinningSlot && autoSpinsCount === 0}
                            className={`px-2 py-1 rounded-lg font-mono font-bold text-[11px] transition-all ${
                              autoSpinsCount > 0
                                ? 'bg-amber-500 text-slate-950 animate-pulse'
                                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {autoSpinsCount > 0 ? `Stop (${autoSpinsCount})` : `${cnt}x`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                    <button
                      onClick={() => setIsProvablyFairModalOpen(true)}
                      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Auditar Semilla Criptográfica SHA-256</span>
                    </button>

                    <button
                      onClick={() => handleSpinSlot()}
                      disabled={isSpinningSlot || coins < slotBet}
                      className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/20 transition-transform active:scale-95 disabled:opacity-50"
                    >
                      {isSpinningSlot ? 'Girando Rodillos...' : `Girar Rodillos (${slotBet} mo)`}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. CRASH ENGINE (AVIATOR) */}
            {activeGame.interactiveEngine === 'crash_engine' && (
              <div className="space-y-6">
                <div className="p-8 rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-red-500/40 text-center space-y-3 relative overflow-hidden min-h-[180px] flex flex-col items-center justify-center">
                  <div className="text-5xl sm:text-6xl font-black font-mono-numbers text-slate-100 tracking-tight">
                    {crashMultiplier.toFixed(2)}x
                  </div>
                  
                  {isCrashRunning && (
                    <div className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>Avión en Vuelo · Retira antes de la detonación</span>
                    </div>
                  )}

                  {crashCrashedAt && (
                    <div className="text-xs font-bold text-rose-400 font-mono">
                      💥 ¡Explotó en {crashCrashedAt}x!
                    </div>
                  )}

                  {hasCashedOut && (
                    <div className="text-xs font-bold text-emerald-400 font-mono">
                      ✓ ¡Retiraste con éxito a {crashMultiplier.toFixed(2)}x!
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Apuesta:</span>
                    {[10, 25, 50, 100].map(bet => (
                      <button
                        key={bet}
                        onClick={() => setCrashBet(bet)}
                        disabled={isCrashRunning}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono ${
                          crashBet === bet ? 'bg-red-500 text-white shadow' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {bet} mo
                      </button>
                    ))}
                  </div>

                  {isCrashRunning ? (
                    <button
                      onClick={cashOutCrash}
                      disabled={hasCashedOut}
                      className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-slate-950 font-black text-sm uppercase tracking-wider rounded-xl shadow-lg transition-transform active:scale-95"
                    >
                      Cobrar Ganancia ({Math.floor(crashBet * crashMultiplier)} mo)
                    </button>
                  ) : (
                    <button
                      onClick={startCrashRound}
                      disabled={coins < crashBet}
                      className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-lg transition-transform active:scale-95"
                    >
                      Despegar Avión ({crashBet} mo)
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 3. MINES ENGINE */}
            {activeGame.interactiveEngine === 'mines_engine' && (
              <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-slate-950 border border-violet-500/40 space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-300 px-2">
                    <span>Minas en Campo: <strong className="text-rose-400">{minesCount}</strong></span>
                    <span>Multiplicador Actual: <strong className="text-emerald-400 font-mono text-sm">{minesCurrentMultiplier}x</strong></span>
                  </div>

                  <div className="grid grid-cols-5 gap-2 max-w-sm mx-auto">
                    {minesGrid.length > 0 ? (
                      minesGrid.map(tile => (
                        <button
                          key={tile.id}
                          disabled={!isMinesGameActive || tile.revealed}
                          onClick={() => handleTileClick(tile.id)}
                          className={`h-12 rounded-xl flex items-center justify-center text-lg font-bold transition-transform active:scale-90 ${
                            tile.revealed
                              ? tile.isMine
                                ? 'bg-rose-950/80 border border-rose-500 text-rose-300'
                                : 'bg-emerald-950/80 border border-emerald-500 text-emerald-300'
                              : 'bg-slate-900 border border-slate-700 hover:border-violet-500 text-slate-600'
                          }`}
                        >
                          {tile.revealed ? (tile.isMine ? '💣' : '💎') : '?'}
                        </button>
                      ))
                    ) : (
                      Array.from({ length: 25 }, (_, i) => (
                        <div key={i} className="h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-700">
                          ?
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Minas:</span>
                    {[3, 5, 10].map(m => (
                      <button
                        key={m}
                        disabled={isMinesGameActive}
                        onClick={() => setMinesCount(m)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono ${
                          minesCount === m ? 'bg-violet-500 text-white shadow' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>

                  {isMinesGameActive ? (
                    <button
                      onClick={cashOutMines}
                      className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 font-black text-sm uppercase rounded-xl shadow-lg"
                    >
                      Cobrar ({Math.floor(minesBet * minesCurrentMultiplier)} mo)
                    </button>
                  ) : (
                    <button
                      onClick={startMinesGame}
                      disabled={coins < minesBet}
                      className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-black text-sm uppercase rounded-xl shadow-lg"
                    >
                      Iniciar Minas ({minesBet} mo)
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 4. DICE ENGINE */}
            {activeGame.interactiveEngine === 'dice_engine' && (
              <div className="space-y-6">
                <div className="p-8 rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-emerald-500/40 text-center space-y-4">
                  <div className="text-5xl font-black font-mono-numbers text-emerald-400">
                    {diceRollResult !== null ? diceRollResult : '??'}
                  </div>
                  <div className="text-xs text-slate-400">
                    Regla: Para ganar, la tirada aleatoria (1-100) debe ser <strong>menor que {diceTarget}</strong>.
                  </div>
                  
                  {/* Target Slider */}
                  <div className="max-w-md mx-auto space-y-2">
                    <input
                      type="range"
                      min="5"
                      max="95"
                      value={diceTarget}
                      onChange={e => setDiceTarget(Number(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-xs font-mono text-slate-400">
                      <span>Probabilidad: {diceTarget}%</span>
                      <span>Multiplicador: {(98 / diceTarget).toFixed(2)}x</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleRollDice}
                    disabled={isRollingDice || coins < diceBet}
                    className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-slate-950 font-black text-sm uppercase tracking-wider rounded-xl shadow-lg"
                  >
                    {isRollingDice ? 'Tirando Dado...' : `Tirar Dado (${diceBet} mo)`}
                  </button>
                </div>
              </div>
            )}

            {/* 5. BACCARAT ENGINE */}
            {activeGame.interactiveEngine === 'baccarat_engine' && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-xs font-bold text-cyan-400 block">PUNTO (JUGADOR)</span>
                      <div className="text-3xl font-black text-slate-100 font-mono">
                        {baccaratResult ? baccaratResult.playerScore : '-'}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {baccaratResult ? baccaratResult.playerCards.join(' · ') : 'Cartas'}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-xs font-bold text-rose-400 block">BANCA (CRUPIER)</span>
                      <div className="text-3xl font-black text-slate-100 font-mono">
                        {baccaratResult ? baccaratResult.bankerScore : '-'}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {baccaratResult ? baccaratResult.bankerCards.join(' · ') : 'Cartas'}
                      </div>
                    </div>
                  </div>

                  {baccaratResult && (
                    <div className="text-center text-xs font-bold text-amber-400">
                      Resultado: Ganó {baccaratResult.winner}
                    </div>
                  )}

                  {/* Choice Selector */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'PLAYER' as const, label: 'Punto (1:1)' },
                      { id: 'TIE' as const, label: 'Empate (8:1)' },
                      { id: 'BANKER' as const, label: 'Banca (1:1)' }
                    ].map(choice => (
                      <button
                        key={choice.id}
                        onClick={() => setBaccaratChoice(choice.id)}
                        className={`py-2 rounded-xl text-xs font-bold ${
                          baccaratChoice === choice.id ? 'bg-amber-500 text-slate-950 shadow' : 'bg-slate-900 text-slate-400'
                        }`}
                      >
                        {choice.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handlePlayBaccarat}
                    disabled={coins < baccaratBet}
                    className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-sm uppercase rounded-xl shadow-lg"
                  >
                    Repartir Mano ({baccaratBet} mo)
                  </button>
                </div>
              </div>
            )}

            {/* Footer with E2EE Provably Fair verification */}
            <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-800 font-mono">
              <button
                type="button"
                onClick={() => setIsProvablyFairModalOpen(true)}
                className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Auditar Cadena SHA-256</span>
              </button>
              <span>Saldo: <strong className="text-amber-400">{coins} monedas</strong></span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
