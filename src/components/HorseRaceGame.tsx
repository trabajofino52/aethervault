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

interface HorseRunner {
  lane: number;
  name: string;
  jockey: string;
  silkHex: string;
  odds: number;
  placeOdds: number;
  stamina: number;
  form: string;
}

interface AnimalBet {
  lane: number;
  betType: 'WIN' | 'SHOW';
  amount: number;
}

const HORSE_ROSTER: HorseRunner[] = [
  { lane: 1, name: 'Centella Real', jockey: 'L. Mendoza', silkHex: '#e11d48', odds: 2.4, placeOdds: 1.3, stamina: 96, form: '1-1-2' },
  { lane: 2, name: 'Duque de Oro', jockey: 'R. Castellanos', silkHex: '#d97706', odds: 3.1, placeOdds: 1.5, stamina: 93, form: '2-1-1' },
  { lane: 3, name: 'Tormenta Verde', jockey: 'J. Rosario', silkHex: '#16a34a', odds: 3.8, placeOdds: 1.7, stamina: 90, form: '1-3-2' },
  { lane: 4, name: 'Relámpago Azul', jockey: 'I. Ortiz', silkHex: '#2563eb', odds: 4.6, placeOdds: 2.0, stamina: 88, form: '3-2-1' },
  { lane: 5, name: 'Soberano Negro', jockey: 'F. Prat', silkHex: '#7c3aed', odds: 5.8, placeOdds: 2.4, stamina: 85, form: '2-4-3' },
  { lane: 6, name: 'Flecha Turquesa', jockey: 'M. Franco', silkHex: '#0891b2', odds: 7.2, placeOdds: 2.9, stamina: 82, form: '4-2-2' },
  { lane: 7, name: 'Huracán Carmesí', jockey: 'T. Gaffalione', silkHex: '#ea580c', odds: 9.0, placeOdds: 3.5, stamina: 79, form: '3-5-2' },
  { lane: 8, name: 'Príncipe Platino', jockey: 'K. Carmouche', silkHex: '#4f46e5', odds: 11.5, placeOdds: 4.3, stamina: 77, form: '5-3-4' },
  { lane: 9, name: 'Halcón Salvaje', jockey: 'J. Alvarado', silkHex: '#059669', odds: 15.0, placeOdds: 5.6, stamina: 74, form: '6-4-3' },
  { lane: 10, name: 'Barón de Ébano', jockey: 'E. Zayas', silkHex: '#be185d', odds: 20.0, placeOdds: 7.2, stamina: 71, form: '7-5-6' }
];

const CHIP_VALUES = [10, 25, 50, 100, 250, 500];

const HorseJockeyIcon: React.FC<{ silkColor: string }> = ({ silkColor }) => (
  <svg viewBox="0 0 64 36" className="w-10 h-6 shrink-0 drop-shadow-md" aria-hidden="true">
    {/* Thoroughbred silhouette */}
    <path
      d="M8 21 L15 16 L34 15 L44 9 L50 5 L55 8 L51 14 L46 18 L47 29 L43 29 L41 21 L22 22 L16 30 L12 30 L17 21 L10 25 Z"
      fill="#b45309"
    />
    {/* Jockey silk & cap */}
    <path d="M27 8 L35 9 L36 16 L26 16 Z" fill={silkColor} />
    <circle cx="33" cy="6" r="3" fill={silkColor} />
  </svg>
);

export const HorseRaceGame: React.FC = () => {
  const { coins, executeBet, addNotification, character, setIsProvablyFairModalOpen } = useGame();

  const [selectedChip, setSelectedChip] = useState<number>(25);
  const [betMode, setBetMode] = useState<'WIN' | 'SHOW'>('WIN');
  const [bets, setBets] = useState<AnimalBet[]>([]);
  const [isRacing, setIsRacing] = useState(false);
  const [progressByLane, setProgressByLane] = useState<number[]>(() => Array(10).fill(0));
  const [podium, setPodium] = useState<number[]>([]);
  const [lastWinAmount, setLastWinAmount] = useState<number | null>(null);
  const [raceNumber, setRaceNumber] = useState(501);
  const [liveCall, setLiveCall] = useState<string>('10 Purasangres en el partidor oficial (1,000m Césped)');

  const rafRef = useRef<number | null>(null);
  const settledRef = useRef<boolean>(false);
  const totalBetAmount = bets.reduce((acc, b) => acc + b.amount, 0);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const placeHorseBet = (lane: number) => {
    if (isRacing) return;
    if (coins < totalBetAmount + selectedChip) {
      addNotification('Fondos Insuficientes', 'Recarga monedas en la tienda para añadir más apuestas.', 'info');
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

  const removeHorseBet = (lane: number, type: 'WIN' | 'SHOW') => {
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
      addNotification('Saldo Insuficiente', 'No tienes suficientes monedas para duplicar tus boletos.', 'info');
      return;
    }
    soundFx.playCoinChime();
    setBets(prev => prev.map(b => ({ ...b, amount: b.amount * 2 })));
  };

  const resetRace = () => {
    if (isRacing) return;
    setProgressByLane(Array(10).fill(0));
    setPodium([]);
    setLastWinAmount(null);
    setLiveCall('10 Purasangres en el partidor oficial (1,000m Césped)');
    setRaceNumber(n => n + 1);
    soundFx.playClick();
  };

  const startRace = () => {
    if (isRacing || bets.length === 0) return;
    if (coins < totalBetAmount) {
      addNotification('Saldo Insuficiente', 'Saldo insuficiente para iniciar la carrera.', 'info');
      return;
    }

    setIsRacing(true);
    setPodium([]);
    setLastWinAmount(null);
    setProgressByLane(Array(10).fill(0));
    settledRef.current = false;
    soundFx.playRouletteTick();

    const paceProfiles = HORSE_ROSTER.map(horse => {
      const base = 0.0128 + (1 / horse.odds) * 0.0048 + Math.random() * 0.0042;
      const stridePhase = Math.random() * Math.PI * 2;
      const finalSprint = 0.85 + (horse.stamina / 100) * 0.25 + Math.random() * 0.25;
      return { base, stridePhase, finalSprint };
    });

    const positions = Array(10).fill(0);
    const finishOrder: number[] = [];
    let lastTime = performance.now();
    let lastSound = 0;

    const animate = (now: number) => {
      const dt = Math.min(48, now - lastTime);
      lastTime = now;

      for (let i = 0; i < 10; i++) {
        if (positions[i] >= 100) continue;
        const p = paceProfiles[i];
        const norm = positions[i] / 100;
        const wave = 1 + 0.14 * Math.sin(norm * 8 + p.stridePhase);
        const kick = norm > 0.7 ? p.finalSprint : 1;
        const jitter = 0.9 + Math.random() * 0.22;
        positions[i] = Math.min(100, positions[i] + p.base * dt * wave * kick * jitter);
        if (positions[i] >= 100 && !finishOrder.includes(i + 1)) {
          finishOrder.push(i + 1);
        }
      }

      setProgressByLane([...positions]);

      const ranked = positions
        .map((pos, idx) => ({ lane: idx + 1, pos }))
        .sort((a, b) => b.pos - a.pos);
      const firstHorse = HORSE_ROSTER[ranked[0].lane - 1];
      const secondHorse = HORSE_ROSTER[ranked[1].lane - 1];
      setLiveCall(
        `Cabeza de carrera: #${firstHorse.lane} ${firstHorse.name} · Escolta #${secondHorse.lane} ${secondHorse.name}`
      );

      if (now - lastSound > 450 && finishOrder.length < 10) {
        soundFx.playRouletteTick();
        lastSound = now;
      }

      if (finishOrder.length < 10) {
        rafRef.current = requestAnimationFrame(animate);
      } else if (!settledRef.current) {
        settledRef.current = true;
        setIsRacing(false);
        setPodium(finishOrder);
        void settleRace(finishOrder);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  };

  const settleRace = async (order: number[]) => {
    const winnerLane = order[0];
    const top3 = new Set(order.slice(0, 3));

    let totalWin = 0;
    bets.forEach(b => {
      const horse = HORSE_ROSTER[b.lane - 1];
      if (!horse) return;
      if (b.betType === 'WIN' && b.lane === winnerLane) {
        totalWin += Math.round(b.amount * horse.odds);
      } else if (b.betType === 'SHOW' && top3.has(b.lane)) {
        totalWin += Math.round(b.amount * horse.placeOdds);
      }
    });

    setLastWinAmount(totalWin);
    const h1 = HORSE_ROSTER[order[0] - 1];
    const h2 = HORSE_ROSTER[order[1] - 1];
    const h3 = HORSE_ROSTER[order[2] - 1];
    const outcomeDesc = `Clásico #${raceNumber}: 1° #${h1.lane} ${h1.name}, 2° #${h2.lane} ${h2.name}, 3° #${h3.lane} ${h3.name}`;

    await executeBet('Horses', totalBetAmount, totalWin, outcomeDesc);

    if (totalWin > 0) {
      addNotification(
        '¡Premio en Hipódromo VIP!',
        `Ganó #${h1.lane} ${h1.name} (${h1.jockey}). Cobraste +${totalWin} monedas.`,
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
          <span className="text-xs uppercase tracking-widest text-emerald-400 font-semibold">
            Hipódromo Real Césped · 10 Purasangres
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-display">
            Carrera de Caballos (10 Purasangres)
          </h1>
          <p className="text-xs text-slate-400">
            Elige entre 10 caballos y jinetes · Ganador (1°) hasta 20.0x o Podio Top 3 · Suerte +{Math.round(character.skills.luck * 1.5)}% · SHA-256
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
      <CasinoTableBar gameTitle="Carrera de Caballos (10 Purasangres)" userBetAmount={totalBetAmount} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: 10-Lane Turf Hippodrome */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
          <div className="relative h-28 rounded-xl overflow-hidden border border-slate-800 bg-emerald-950/60">
            <img
              src="/src/assets/images/horse_racing_banner_1795576242629.jpg"
              alt="Hipódromo Nocturno de Caballos Purasangre"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover opacity-55"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/75 to-transparent" />
            <div className="absolute inset-0 p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono font-bold tabular-nums">
                  CLÁSICO #{raceNumber} · 1,000M CÉSPED
                </span>
                <span className="text-[11px] font-mono text-amber-300 font-semibold">
                  {isRacing ? 'GALOPE EN VIVO' : podium.length > 0 ? 'PODIO OFICIAL' : 'VENTANILLA ABIERTA'}
                </span>
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-100 truncate">
                {liveCall}
              </div>
            </div>
          </div>

          {/* 10 Turf Lanes */}
          <div className="space-y-1.5 bg-emerald-950/25 p-3 rounded-xl border border-emerald-800/40">
            <div className="flex items-center justify-between text-[10px] font-mono text-emerald-300/80 pb-1 border-b border-emerald-800/40 tabular-nums">
              <span>PARTIDOR (0m)</span>
              <span>500m</span>
              <span className="flex items-center gap-1 text-amber-400 font-bold">
                <Flag className="w-3 h-3" />
                DISCO FINAL (1,000m)
              </span>
            </div>

            {HORSE_ROSTER.map((horse, idx) => {
              const pct = progressByLane[idx] || 0;
              const rank = podium.indexOf(horse.lane) + 1;
              const { winBet, showBet } = getLaneBetSummary(horse.lane);
              const hasBet = winBet + showBet > 0;

              return (
                <div
                  key={horse.lane}
                  className={`relative h-9 rounded-lg flex items-center px-2 overflow-hidden border ${
                    rank === 1
                      ? 'bg-amber-950/45 border-amber-500/60'
                      : hasBet
                      ? 'bg-emerald-950/50 border-emerald-400/50'
                      : 'bg-slate-950/75 border-slate-800/80'
                  }`}
                >
                  <div className="w-6 h-6 rounded flex items-center justify-center text-[11px] font-black text-white font-mono shrink-0 z-10 mr-2"
                    style={{ backgroundColor: horse.silkHex }}
                  >
                    {horse.lane}
                  </div>

                  <div className="relative flex-1 h-full flex items-center">
                    <div
                      className="flex items-center gap-1.5 will-change-transform"
                      style={{
                        transform: `translateX(${(pct / 100) * 84}%)`,
                        transition: isRacing ? 'none' : 'transform 200ms ease-out'
                      }}
                    >
                      <HorseJockeyIcon silkColor={horse.silkHex} />
                      <span className="text-[11px] font-semibold text-slate-200 hidden sm:inline whitespace-nowrap">
                        {horse.name}
                      </span>
                    </div>
                  </div>

                  <div className="z-10 shrink-0 pl-2 font-mono text-[11px] tabular-nums">
                    {rank > 0 && rank <= 3 ? (
                      <span
                        className={`px-1.5 py-0.5 rounded font-black ${
                          rank === 1
                            ? 'bg-amber-400 text-slate-950'
                            : rank === 2
                            ? 'bg-slate-300 text-slate-950'
                            : 'bg-amber-700 text-white'
                        }`}
                      >
                        {rank}°
                      </span>
                    ) : (
                      <span className="text-emerald-300">{horse.odds.toFixed(1)}x</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {podium.length >= 3 && (
            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <Trophy className="w-4 h-4" />
                  <span>Resultado Oficial Clásico #{raceNumber}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-200 tabular-nums">
                  {podium.slice(0, 3).map((lane, i) => {
                    const h = HORSE_ROSTER[lane - 1];
                    return (
                      <span key={lane} className="flex items-center gap-1.5">
                        <strong className="text-amber-300">{i + 1}°</strong>
                        <span
                          className="w-4 h-4 rounded inline-flex items-center justify-center text-[10px] font-bold text-white"
                          style={{ backgroundColor: h.silkHex }}
                        >
                          {h.lane}
                        </span>
                        <span>{h.name}</span>
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

        {/* Right: 10 Horses Betting Slip */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
          <div className="space-y-3 pb-3 border-b border-slate-800">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase text-slate-400">Tipo de Boleto</span>
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
                      ? 'bg-emerald-500 text-slate-950'
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
                        ? 'bg-emerald-400 text-slate-950 border-white shadow'
                        : 'bg-slate-800 text-slate-200 border-slate-700 hover:border-emerald-400/60'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5 max-h-[370px] overflow-y-auto pr-1">
            {HORSE_ROSTER.map(horse => {
              const { winBet, showBet } = getLaneBetSummary(horse.lane);
              const activeOdds = betMode === 'WIN' ? horse.odds : horse.placeOdds;
              return (
                <div
                  key={horse.lane}
                  className={`flex items-center justify-between gap-2 p-2 rounded-xl border transition-colors ${
                    winBet + showBet > 0
                      ? 'bg-slate-950 border-emerald-500/50'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white font-mono shrink-0"
                      style={{ backgroundColor: horse.silkHex }}
                    >
                      #{horse.lane}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-100 truncate">{horse.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono tabular-nums truncate">
                        Jinete: {horse.jockey} · Últ: {horse.form}
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
                            onClick={() => removeHorseBet(horse.lane, 'WIN')}
                            title="Quitar apuesta Ganador"
                            className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold tabular-nums hover:bg-rose-500/20 hover:text-rose-300"
                          >
                            1°:{winBet} ×
                          </button>
                        )}
                        {showBet > 0 && (
                          <button
                            type="button"
                            disabled={isRacing}
                            onClick={() => removeHorseBet(horse.lane, 'SHOW')}
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
                      onClick={() => placeHorseBet(horse.lane)}
                      className="min-h-[36px] px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-emerald-300 border border-slate-700 hover:border-emerald-400 font-mono font-extrabold text-xs tabular-nums transition-colors whitespace-nowrap disabled:opacity-50"
                    >
                      +{selectedChip} ({activeOdds.toFixed(1)}x)
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-400" />
                Total Apostado ({bets.length} boletos):
              </span>
              <span className="font-black text-emerald-300 font-mono tabular-nums">
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
                onClick={resetRace}
                className="min-h-[40px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reiniciar</span>
              </button>
            </div>

            <button
              type="button"
              disabled={isRacing || bets.length === 0}
              onClick={startRace}
              className="w-full min-h-[46px] py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 transition-transform active:scale-95 disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>{isRacing ? 'Carrera en Curso...' : 'Lanzar Carrera de Caballos'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
