import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { CasinoTableBar } from './CasinoTableBar';
import {
  ShieldCheck,
  Coins,
  Play,
  RotateCcw,
  Trash2,
  Trophy,
  Sparkles,
  Flag
} from 'lucide-react';
import { soundFx } from '../utils/audio';

interface GreyhoundRunner {
  lane: number;
  name: string;
  silkHex: string;
  odds: number;
  placeOdds: number;
  speedRating: number;
  form: string;
}

interface AnimalBet {
  lane: number;
  betType: 'WIN' | 'SHOW';
  amount: number;
}

const GREYHOUND_ROSTER: GreyhoundRunner[] = [
  { lane: 1, name: 'Rayo Plateado', silkHex: '#ef4444', odds: 2.5, placeOdds: 1.4, speedRating: 95, form: '1-2-1' },
  { lane: 2, name: 'Sombra Veloz', silkHex: '#3b82f6', odds: 3.2, placeOdds: 1.6, speedRating: 91, form: '2-1-3' },
  { lane: 3, name: 'Cometa Azul', silkHex: '#22c55e', odds: 4.0, placeOdds: 1.8, speedRating: 88, form: '3-2-1' },
  { lane: 4, name: 'Trueno Ámbar', silkHex: '#f59e0b', odds: 4.8, placeOdds: 2.1, speedRating: 86, form: '2-4-2' },
  { lane: 5, name: 'Furia Carmesí', silkHex: '#a855f7', odds: 5.5, placeOdds: 2.3, speedRating: 84, form: '4-1-4' },
  { lane: 6, name: 'Viento Norte', silkHex: '#06b6d4', odds: 6.5, placeOdds: 2.7, speedRating: 82, form: '3-3-2' },
  { lane: 7, name: 'Galgo Imperial', silkHex: '#f43f5e', odds: 8.0, placeOdds: 3.2, speedRating: 79, form: '5-2-3' },
  { lane: 8, name: 'Eclipse Negro', silkHex: '#6366f1', odds: 10.5, placeOdds: 4.1, speedRating: 76, form: '4-5-2' },
  { lane: 9, name: 'Chispa Turbo', silkHex: '#14b8a6', odds: 13.5, placeOdds: 5.2, speedRating: 73, form: '6-3-5' },
  { lane: 10, name: 'Relámpago Dorado', silkHex: '#eab308', odds: 18.0, placeOdds: 6.8, speedRating: 70, form: '7-4-6' }
];

const CHIP_VALUES = [10, 25, 50, 100, 250, 500];

const GreyhoundIcon: React.FC<{ color: string; running: boolean }> = ({ color, running }) => (
  <svg
    viewBox="0 0 64 32"
    className={`w-10 h-5 shrink-0 drop-shadow-md ${running ? 'transition-transform' : ''}`}
    aria-hidden="true"
  >
    <path
      d="M10 18 L18 13 L35 12 L44 9 L51 6 L56 9 L52 13 L46 15 L44 21 L49 28 L45 28 L40 20 L25 20 L18 28 L14 28 L19 19 L11 23 L7 21 Z"
      fill="#e2e8f0"
    />
    <path d="M22 13 L37 12 L36 19 L21 19 Z" fill={color} />
  </svg>
);

export const GreyhoundRaceGame: React.FC = () => {
  const { coins, executeBet, addNotification, character, setIsProvablyFairModalOpen } = useGame();

  const [selectedChip, setSelectedChip] = useState<number>(25);
  const [betMode, setBetMode] = useState<'WIN' | 'SHOW'>('WIN');
  const [bets, setBets] = useState<AnimalBet[]>([]);
  const [isRacing, setIsRacing] = useState(false);
  const [progressByLane, setProgressByLane] = useState<number[]>(() => Array(10).fill(0));
  const [podium, setPodium] = useState<number[]>([]);
  const [lastWinAmount, setLastWinAmount] = useState<number | null>(null);
  const [raceNumber, setRaceNumber] = useState(101);
  const [liveLeaderText, setLiveLeaderText] = useState<string>('Galgos listos en las jaulas de salida (500m)');

  const rafRef = useRef<number | null>(null);
  const finishHandledRef = useRef<boolean>(false);

  const totalBetAmount = bets.reduce((acc, b) => acc + b.amount, 0);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const placeAnimalBet = (lane: number) => {
    if (isRacing) return;
    if (coins < totalBetAmount + selectedChip) {
      addNotification('Fondos Insuficientes', 'Recarga monedas en la tienda para apostar en más galgos.', 'info');
      soundFx.playClick();
      return;
    }
    soundFx.playCoinChime();
    setBets(prev => {
      const idx = prev.findIndex(b => b.lane === lane && b.betType === betMode);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], amount: next[idx].amount + selectedChip };
        return next;
      }
      return [...prev, { lane, betType: betMode, amount: selectedChip }];
    });
  };

  const removeAnimalBet = (lane: number, type: 'WIN' | 'SHOW') => {
    if (isRacing) return;
    soundFx.playClick();
    setBets(prev => prev.filter(b => !(b.lane === lane && b.betType === type)));
  };

  const clearBets = () => {
    if (isRacing) return;
    setBets([]);
    soundFx.playClick();
  };

  const doubleBets = () => {
    if (isRacing || bets.length === 0) return;
    if (coins < totalBetAmount * 2) {
      addNotification('Saldo Insuficiente', 'No tienes suficientes monedas para duplicar los boletos.', 'info');
      return;
    }
    soundFx.playCoinChime();
    setBets(prev => prev.map(b => ({ ...b, amount: b.amount * 2 })));
  };

  const resetTrack = () => {
    if (isRacing) return;
    setProgressByLane(Array(10).fill(0));
    setPodium([]);
    setLastWinAmount(null);
    setLiveLeaderText('Galgos listos en las jaulas de salida (500m)');
    setRaceNumber(n => n + 1);
    soundFx.playClick();
  };

  const startRace = () => {
    if (isRacing || bets.length === 0) return;
    if (coins < totalBetAmount) {
      addNotification('Saldo Insuficiente', 'No tienes suficientes monedas para confirmar esta carrera.', 'info');
      return;
    }

    setIsRacing(true);
    setPodium([]);
    setLastWinAmount(null);
    setProgressByLane(Array(10).fill(0));
    finishHandledRef.current = false;
    soundFx.playRouletteTick();

    // Generate weighted athletic pace profile for each of the 10 greyhounds
    // Slightly higher inverse-odds stamina weight + natural variance so underdogs can upset
    const speeds = GREYHOUND_ROSTER.map(dog => {
      const base = 0.0145 + (1 / dog.odds) * 0.0055 + Math.random() * 0.0045;
      const surgePhase = Math.random() * Math.PI * 2;
      const lateKick = 0.85 + Math.random() * 0.35;
      return { lane: dog.lane, base, surgePhase, lateKick };
    });

    const positions = Array(10).fill(0);
    const finishedOrder: number[] = [];
    let lastTime = performance.now();
    let lastTickSound = 0;

    const step = (now: number) => {
      const dt = Math.min(48, now - lastTime);
      lastTime = now;

      for (let i = 0; i < 10; i++) {
        if (positions[i] >= 100) continue;
        const p = speeds[i];
        const progressNorm = positions[i] / 100;
        const surge = 1 + 0.16 * Math.sin(progressNorm * 7 + p.surgePhase);
        const kick = progressNorm > 0.65 ? p.lateKick : 1;
        const microNoise = 0.9 + Math.random() * 0.22;
        positions[i] = Math.min(100, positions[i] + p.base * dt * surge * kick * microNoise);
        if (positions[i] >= 100 && !finishedOrder.includes(i + 1)) {
          finishedOrder.push(i + 1);
        }
      }

      setProgressByLane([...positions]);

      // Update live leader telemetry
      const ranked = positions
        .map((pos, idx) => ({ lane: idx + 1, pos }))
        .sort((a, b) => b.pos - a.pos);
      const leaderDog = GREYHOUND_ROSTER[ranked[0].lane - 1];
      const secondDog = GREYHOUND_ROSTER[ranked[1].lane - 1];
      setLiveLeaderText(
        `En punta: #${leaderDog.lane} ${leaderDog.name} · 2° #${secondDog.lane} ${secondDog.name}`
      );

      if (now - lastTickSound > 420 && finishedOrder.length < 10) {
        soundFx.playRouletteTick();
        lastTickSound = now;
      }

      if (finishedOrder.length < 10) {
        rafRef.current = requestAnimationFrame(step);
      } else if (!finishHandledRef.current) {
        finishHandledRef.current = true;
        setIsRacing(false);
        setPodium(finishedOrder);
        void settleRace(finishedOrder);
      }
    };

    rafRef.current = requestAnimationFrame(step);
  };

  const settleRace = async (order: number[]) => {
    const first = order[0];
    const top3 = new Set(order.slice(0, 3));

    let totalWin = 0;
    bets.forEach(b => {
      const dog = GREYHOUND_ROSTER[b.lane - 1];
      if (!dog) return;
      if (b.betType === 'WIN' && b.lane === first) {
        totalWin += Math.round(b.amount * dog.odds);
      } else if (b.betType === 'SHOW' && top3.has(b.lane)) {
        totalWin += Math.round(b.amount * dog.placeOdds);
      }
    });

    setLastWinAmount(totalWin);
    const winDog = GREYHOUND_ROSTER[first - 1];
    const secDog = GREYHOUND_ROSTER[order[1] - 1];
    const thirdDog = GREYHOUND_ROSTER[order[2] - 1];
    const outcomeDesc = `Carrera #${raceNumber}: 1° #${winDog.lane} ${winDog.name}, 2° #${secDog.lane} ${secDog.name}, 3° #${thirdDog.lane} ${thirdDog.name}`;

    await executeBet('Greyhounds', totalBetAmount, totalWin, outcomeDesc);

    if (totalWin > 0) {
      addNotification(
        '¡Premio en Carrera de Perros!',
        `Ganó #${winDog.lane} ${winDog.name}. Cobraste +${totalWin} monedas.`,
        'reward',
        totalWin
      );
    }
  };

  const getLaneBetSummary = (lane: number) => {
    const winBet = bets.find(b => b.lane === lane && b.betType === 'WIN')?.amount || 0;
    const showBet = bets.find(b => b.lane === lane && b.betType === 'SHOW')?.amount || 0;
    return { winBet, showBet };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs uppercase tracking-widest text-amber-400 font-semibold">
            Canódromo Nocturno · 10 Galgos Numerados
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-display">
            Carrera de Perros (10 Galgos)
          </h1>
          <p className="text-xs text-slate-400">
            Apuesta al Ganador (1°) o Podio (Top 3) entre 10 galgos · Bono de Suerte +{Math.round(character.skills.luck * 1.5)}% · SHA-256 Provably-Fair
          </p>
        </div>

        <button
          onClick={() => setIsProvablyFairModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] bg-slate-900 border border-slate-700/80 hover:border-emerald-500/60 rounded-xl text-xs text-emerald-400 transition-colors self-start sm:self-auto whitespace-nowrap"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Auditoría E2EE</span>
        </button>
      </div>

      {/* Mode & Live Economy Bar */}
      <CasinoTableBar gameTitle="Carrera de Perros (10 Galgos)" userBetAmount={totalBetAmount} />

      {/* Track + Roster Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Live 10-Lane Race Track (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
          {/* Stadium Header Image + Telemetry Strip */}
          <div className="relative h-28 rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
            <img
              src="/src/assets/images/greyhound_racing_banner_1795576242836.jpg"
              alt="Pista Nocturna de Galgos"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover opacity-55"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/75 to-transparent" />
            <div className="absolute inset-0 p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-mono font-bold tabular-nums">
                  CARRERA #{raceNumber} · 500M
                </span>
                <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                  {isRacing ? 'CARRERA EN CURSO' : podium.length > 0 ? 'FOTO FINISH OFICIAL' : 'APUESTAS ABIERTAS'}
                </span>
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-100 truncate">
                {liveLeaderText}
              </div>
            </div>
          </div>

          {/* 10 Animated Lanes */}
          <div className="space-y-1.5 bg-slate-950/90 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pb-1 border-b border-slate-800/80 tabular-nums">
              <span>SALIDA (0m)</span>
              <span>250m</span>
              <span className="flex items-center gap-1 text-amber-400 font-bold">
                <Flag className="w-3 h-3" />
                META (500m)
              </span>
            </div>

            {GREYHOUND_ROSTER.map((dog, idx) => {
              const pct = progressByLane[idx] || 0;
              const finishRank = podium.indexOf(dog.lane) + 1;
              const { winBet, showBet } = getLaneBetSummary(dog.lane);
              const hasBet = winBet + showBet > 0;

              return (
                <div
                  key={dog.lane}
                  className={`relative h-9 rounded-lg flex items-center px-2 overflow-hidden border ${
                    finishRank === 1
                      ? 'bg-amber-950/40 border-amber-500/60'
                      : hasBet
                      ? 'bg-slate-900 border-cyan-500/40'
                      : 'bg-slate-900/60 border-slate-800/80'
                  }`}
                >
                  {/* Track Dirt Stripes & Finish Line */}
                  <div className="absolute right-7 top-0 bottom-0 w-1 bg-repeating-linear-gradient opacity-50 bg-amber-400/50" />

                  {/* Lane Tag */}
                  <div
                    className="w-6 h-6 rounded flex items-center justify-center text-[11px] font-black text-white font-mono shrink-0 z-10 mr-2"
                    style={{ backgroundColor: dog.silkHex }}
                  >
                    {dog.lane}
                  </div>

                  {/* Runner Track Space */}
                  <div className="relative flex-1 h-full flex items-center">
                    <div
                      className="flex items-center gap-1.5 will-change-transform"
                      style={{
                        transform: `translateX(${(pct / 100) * 84}%)`,
                        transition: isRacing ? 'none' : 'transform 200ms ease-out'
                      }}
                    >
                      <GreyhoundIcon color={dog.silkHex} running={isRacing} />
                      <span className="text-[11px] font-semibold text-slate-300 hidden sm:inline whitespace-nowrap">
                        {dog.name}
                      </span>
                    </div>
                  </div>

                  {/* Rank or Odds Right Telemetry */}
                  <div className="z-10 shrink-0 pl-2 font-mono text-[11px] tabular-nums">
                    {finishRank > 0 && finishRank <= 3 ? (
                      <span
                        className={`px-1.5 py-0.5 rounded font-black ${
                          finishRank === 1
                            ? 'bg-amber-400 text-slate-950'
                            : finishRank === 2
                            ? 'bg-slate-300 text-slate-950'
                            : 'bg-amber-700 text-white'
                        }`}
                      >
                        {finishRank}°
                      </span>
                    ) : (
                      <span className="text-slate-400">{dog.odds.toFixed(1)}x</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Photo Finish Result Card */}
          {podium.length >= 3 && (
            <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <Trophy className="w-4 h-4" />
                  <span>Podio Oficial Carrera #{raceNumber}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-200 tabular-nums">
                  {podium.slice(0, 3).map((lane, i) => {
                    const dog = GREYHOUND_ROSTER[lane - 1];
                    return (
                      <span key={lane} className="flex items-center gap-1.5">
                        <strong className="text-amber-300">{i + 1}°</strong>
                        <span
                          className="w-4 h-4 rounded inline-flex items-center justify-center text-[10px] font-bold text-white"
                          style={{ backgroundColor: dog.silkHex }}
                        >
                          {dog.lane}
                        </span>
                        <span>{dog.name}</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="text-right shrink-0">
                {lastWinAmount !== null && lastWinAmount > 0 ? (
                  <div className="text-sm font-black text-emerald-400 font-mono tabular-nums">
                    ¡Ganaste +{lastWinAmount.toLocaleString()} mo!
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 font-mono">Sin premio esta carrera</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Betting Slip & 10 Dogs Selection Grid (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
          {/* Chip & Bet Type Controls */}
          <div className="space-y-3 pb-3 border-b border-slate-800">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase text-slate-400">Tipo de Apuesta</span>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  disabled={isRacing}
                  onClick={() => {
                    setBetMode('WIN');
                    soundFx.playClick();
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-bold whitespace-nowrap transition-colors ${
                    betMode === 'WIN'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Ganador (1°)
                </button>
                <button
                  type="button"
                  disabled={isRacing}
                  onClick={() => {
                    setBetMode('SHOW');
                    soundFx.playClick();
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-bold whitespace-nowrap transition-colors ${
                    betMode === 'SHOW'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Podio (Top 3)
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase text-slate-400 shrink-0">Ficha:</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {CHIP_VALUES.map(val => (
                  <button
                    key={val}
                    type="button"
                    disabled={isRacing}
                    onClick={() => {
                      setSelectedChip(val);
                      soundFx.playClick();
                    }}
                    className={`min-w-[40px] h-9 px-2 rounded-lg font-extrabold text-xs font-mono tabular-nums border transition-all ${
                      selectedChip === val
                        ? 'bg-amber-400 text-slate-950 border-white shadow'
                        : 'bg-slate-800 text-slate-200 border-slate-700 hover:border-amber-400/60'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 10 Greyhounds Selectable List */}
          <div className="space-y-1.5 max-h-[370px] overflow-y-auto pr-1">
            {GREYHOUND_ROSTER.map(dog => {
              const { winBet, showBet } = getLaneBetSummary(dog.lane);
              const activeOdds = betMode === 'WIN' ? dog.odds : dog.placeOdds;
              return (
                <div
                  key={dog.lane}
                  className={`flex items-center justify-between gap-2 p-2 rounded-xl border transition-colors ${
                    winBet + showBet > 0
                      ? 'bg-slate-950 border-amber-500/50'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white font-mono shrink-0"
                      style={{ backgroundColor: dog.silkHex }}
                    >
                      #{dog.lane}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-100 truncate">{dog.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono tabular-nums">
                        Vel {dog.speedRating} · Últ: {dog.form}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {(winBet > 0 || showBet > 0) && (
                      <div className="flex items-center gap-1">
                        {winBet > 0 && (
                          <button
                            type="button"
                            disabled={isRacing}
                            onClick={() => removeAnimalBet(dog.lane, 'WIN')}
                            title="Quitar apuesta Ganador"
                            className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[10px] font-bold tabular-nums hover:bg-rose-500/20 hover:text-rose-300"
                          >
                            1°:{winBet} ×
                          </button>
                        )}
                        {showBet > 0 && (
                          <button
                            type="button"
                            disabled={isRacing}
                            onClick={() => removeAnimalBet(dog.lane, 'SHOW')}
                            title="Quitar apuesta Podio"
                            className="px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] font-bold tabular-nums hover:bg-rose-500/20 hover:text-rose-300"
                          >
                            Top3:{showBet} ×
                          </button>
                        )}
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={isRacing}
                      onClick={() => placeAnimalBet(dog.lane)}
                      className="min-h-[36px] px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-amber-300 border border-slate-700 hover:border-amber-400 font-mono font-extrabold text-xs tabular-nums transition-colors whitespace-nowrap disabled:opacity-50"
                    >
                      +{selectedChip} ({activeOdds.toFixed(1)}x)
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-400" />
                Total Apostado ({bets.length} boletos):
              </span>
              <span className="font-black text-amber-300 font-mono tabular-nums">
                {totalBetAmount.toLocaleString()} mo
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={isRacing || bets.length === 0}
                onClick={clearBets}
                className="min-h-[40px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpiar</span>
              </button>
              <button
                type="button"
                disabled={isRacing || bets.length === 0}
                onClick={doubleBets}
                className="min-h-[40px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Duplicar 2x</span>
              </button>
              <button
                type="button"
                disabled={isRacing}
                onClick={resetTrack}
                className="min-h-[40px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reiniciar</span>
              </button>
            </div>

            <button
              type="button"
              disabled={isRacing || bets.length === 0}
              onClick={startRace}
              className="w-full min-h-[46px] py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 transition-transform active:scale-95 disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>{isRacing ? 'Carrera en Vivo...' : 'Lanzar Carrera de Perros'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
