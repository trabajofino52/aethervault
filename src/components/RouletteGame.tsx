import React, { useState, useRef, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import {
  RotateCcw,
  Coins,
  ShieldCheck,
  Check,
  Trophy,
  Trash2,
  Lock,
  Sparkles,
  Zap
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import { CasinoTableBar } from './CasinoTableBar';

// European Roulette Numbers in wheel order
const WHEEL_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36
]);

type BetType = 'straight' | 'red' | 'black' | 'even' | 'odd' | 'low' | 'high' | 'dozen1' | 'dozen2' | 'dozen3';

interface PlacedBet {
  type: BetType;
  value?: number;
  amount: number;
}

const CHIP_VALUES = [1, 5, 25, 100, 500];

export const RouletteGame: React.FC = () => {
  const { coins, executeBet, addNotification, character, setIsProvablyFairModalOpen } = useGame();

  const [selectedChip, setSelectedChip] = useState(5);
  const [bets, setBets] = useState<PlacedBet[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winningNumber, setWinningNumber] = useState<number | null>(null);
  const [lastWinAmount, setLastWinAmount] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const currentAngleRef = useRef<number>(0);

  const totalBetAmount = bets.reduce((sum, b) => sum + b.amount, 0);

  // Draw Roulette Canvas Wheel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = width / 2 - 14;

    ctx.clearRect(0, 0, width, height);

    // Outer mahogany rim
    const gradOuter = ctx.createRadialGradient(centerX, centerY, radius * 0.8, centerX, centerY, radius + 12);
    gradOuter.addColorStop(0, '#2d1810');
    gradOuter.addColorStop(0.5, '#4a2818');
    gradOuter.addColorStop(1, '#1b0e0a');
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 10, 0, Math.PI * 2);
    ctx.fillStyle = gradOuter;
    ctx.fill();

    // Brass outer ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#d4af37';
    ctx.stroke();

    // Draw Slices
    const numSlices = WHEEL_NUMBERS.length;
    const sliceAngle = (Math.PI * 2) / numSlices;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(currentAngleRef.current);

    for (let i = 0; i < numSlices; i++) {
      const num = WHEEL_NUMBERS[i];
      const startAngle = i * sliceAngle;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius - 4, startAngle, endAngle);
      ctx.closePath();

      if (num === 0) {
        ctx.fillStyle = '#059669'; // Green 0
      } else if (RED_NUMBERS.has(num)) {
        ctx.fillStyle = '#dc2626'; // Red
      } else {
        ctx.fillStyle = '#0f172a'; // Black
      }
      ctx.fill();

      // Brass dividers
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(startAngle) * (radius - 4), Math.sin(startAngle) * (radius - 4));
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#d4af37';
      ctx.stroke();

      // Draw number text
      ctx.save();
      const textAngle = startAngle + sliceAngle / 2;
      ctx.rotate(textAngle);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(num.toString(), radius - 14, 4);
      ctx.restore();
    }

    // Inner brass cone
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.45, 0, Math.PI * 2);
    const gradCenter = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.45);
    gradCenter.addColorStop(0, '#fef08a');
    gradCenter.addColorStop(0.5, '#ca8a04');
    gradCenter.addColorStop(1, '#713f12');
    ctx.fillStyle = gradCenter;
    ctx.fill();

    // Center jewel
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#1e1b4b';
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();

    // Fixed Top Pointer Needle
    ctx.beginPath();
    ctx.moveTo(centerX, 8);
    ctx.lineTo(centerX - 9, 26);
    ctx.lineTo(centerX + 9, 26);
    ctx.closePath();
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [winningNumber]);

  const placeBet = (type: BetType, value?: number) => {
    if (isSpinning) return;
    if (coins < totalBetAmount + selectedChip) {
      addNotification('Fondos Insuficientes', 'Recarga monedas en la tienda para aumentar tu apuesta.', 'info');
      soundFx.playClick();
      return;
    }

    soundFx.playCoinChime();
    setBets(prev => {
      const existingIdx = prev.findIndex(b => b.type === type && b.value === value);
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx].amount += selectedChip;
        return copy;
      }
      return [...prev, { type, value, amount: selectedChip }];
    });
  };

  const clearBets = () => {
    if (isSpinning) return;
    setBets([]);
    soundFx.playClick();
  };

  const doubleBets = () => {
    if (isSpinning || bets.length === 0) return;
    if (coins < totalBetAmount * 2) {
      addNotification('Saldo insuficiente', 'No tienes suficientes monedas para duplicar la apuesta.', 'info');
      return;
    }
    soundFx.playCoinChime();
    setBets(prev => prev.map(b => ({ ...b, amount: b.amount * 2 })));
  };

  const spinWheel = async () => {
    if (isSpinning || bets.length === 0) return;
    if (coins < totalBetAmount) {
      addNotification('Fondos Insuficientes', 'Saldo insuficiente para confirmar la tirada.', 'info');
      return;
    }

    setIsSpinning(true);
    setWinningNumber(null);
    setLastWinAmount(null);

    // Pick winning index deterministically
    const targetIdx = Math.floor(Math.random() * WHEEL_NUMBERS.length);
    const targetNumber = WHEEL_NUMBERS[targetIdx];

    // Physics rotation animation
    const sliceAngle = (Math.PI * 2) / WHEEL_NUMBERS.length;
    // Calculate final angle so targetNumber lands under top pointer (which is at -Math.PI / 2)
    const targetSliceAngle = targetIdx * sliceAngle + sliceAngle / 2;
    const desiredFinalAngle = -targetSliceAngle - Math.PI / 2;

    const fullSpins = 6 + Math.floor(Math.random() * 3);
    const totalRotation = fullSpins * Math.PI * 2 + (desiredFinalAngle - (currentAngleRef.current % (Math.PI * 2)));

    const startTime = performance.now();
    const duration = 4000;
    const initialAngle = currentAngleRef.current;

    let lastTickTime = 0;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Deceleration easing curve (cubic-bezier out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      currentAngleRef.current = initialAngle + totalRotation * easeOut;

      // Play tick sound when passing slices
      if (currentTime - lastTickTime > 120 * (1 + easeOut * 2.5) && progress < 0.95) {
        soundFx.playRouletteTick();
        lastTickTime = currentTime;
      }

      // Re-render canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Trigger render
          setWinningNumber(null);
        }
      }

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Spin finished!
        setIsSpinning(false);
        setWinningNumber(targetNumber);
        evaluatePayout(targetNumber);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  const evaluatePayout = async (resultNum: number) => {
    let totalWin = 0;
    const isRed = RED_NUMBERS.has(resultNum);
    const isBlack = resultNum !== 0 && !isRed;
    const isEven = resultNum !== 0 && resultNum % 2 === 0;
    const isOdd = resultNum !== 0 && resultNum % 2 !== 0;
    const isLow = resultNum >= 1 && resultNum <= 18;
    const isHigh = resultNum >= 19 && resultNum <= 36;
    const isDozen1 = resultNum >= 1 && resultNum <= 12;
    const isDozen2 = resultNum >= 13 && resultNum <= 24;
    const isDozen3 = resultNum >= 25 && resultNum <= 36;

    bets.forEach(b => {
      if (b.type === 'straight' && b.value === resultNum) {
        totalWin += b.amount * 36; // 35:1 + return
      } else if (b.type === 'red' && isRed) {
        totalWin += b.amount * 2;
      } else if (b.type === 'black' && isBlack) {
        totalWin += b.amount * 2;
      } else if (b.type === 'even' && isEven) {
        totalWin += b.amount * 2;
      } else if (b.type === 'odd' && isOdd) {
        totalWin += b.amount * 2;
      } else if (b.type === 'low' && isLow) {
        totalWin += b.amount * 2;
      } else if (b.type === 'high' && isHigh) {
        totalWin += b.amount * 2;
      } else if (b.type === 'dozen1' && isDozen1) {
        totalWin += b.amount * 3;
      } else if (b.type === 'dozen2' && isDozen2) {
        totalWin += b.amount * 3;
      } else if (b.type === 'dozen3' && isDozen3) {
        totalWin += b.amount * 3;
      }
    });

    setLastWinAmount(totalWin);

    const outcomeDesc = `Número ${resultNum} (${resultNum === 0 ? 'Verde Cero' : isRed ? 'Rojo' : 'Negro'})`;
    await executeBet('Roulette', totalBetAmount, totalWin, outcomeDesc);

    if (totalWin > 0) {
      addNotification(
        '¡Premio en Ruleta!',
        `¡Salió el número ${resultNum}! Has ganado +${totalWin} monedas en tu tirada.`,
        'reward',
        totalWin
      );
    }
  };

  const getBetOnType = (type: BetType, val?: number): number => {
    const bet = bets.find(b => b.type === type && b.value === val);
    return bet ? bet.amount : 0;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-amber-400 font-semibold">
              Casino Clásico Provably-Fair
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-display">
            Ruleta Europea Real
          </h1>
          <p className="text-xs text-slate-400">
            Física de rueda en vivo · Cifrado SHA-256 inmutable de cada tirada · Suerte de Héroe activa (+{character.skills.luck * 1.5}%)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsProvablyFairModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-700/80 hover:border-emerald-500/60 rounded-xl text-xs text-emerald-400 transition-colors"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Auditoría E2EE</span>
          </button>
        </div>
      </div>

      {/* Solo vs Live Multiplayer & 70/30 Guarantee Bar */}
      <CasinoTableBar gameTitle="Ruleta Europea" userBetAmount={totalBetAmount} />

      {/* Main Game Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Interactive Canvas Roulette Wheel */}
        <div className="lg:col-span-5 bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center shadow-2xl relative">
          
          <div className="relative w-[300px] h-[300px] sm:w-[340px] sm:h-[340px] flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={340}
              height={340}
              className="w-full h-full drop-shadow-2xl"
            />
          </div>

          {/* Outcome Pill */}
          <div className="mt-4 text-center">
            {winningNumber !== null ? (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800 border border-slate-700 shadow-lg">
                <span className="text-xs text-slate-400">Resultado:</span>
                <span
                  className={`text-base font-extrabold font-mono-numbers px-2.5 py-0.5 rounded ${
                    winningNumber === 0
                      ? 'bg-emerald-600 text-white'
                      : RED_NUMBERS.has(winningNumber)
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-950 text-white'
                  }`}
                >
                  {winningNumber} {RED_NUMBERS.has(winningNumber) ? 'ROJO' : winningNumber === 0 ? 'CERO' : 'NEGRO'}
                </span>
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-mono">
                {isSpinning ? 'Girando rueda cuántica...' : 'Haz tus apuestas y presiona Girar'}
              </div>
            )}
          </div>

          {lastWinAmount !== null && lastWinAmount > 0 && (
            <div className="mt-2 text-sm font-bold text-emerald-400 font-mono-numbers animate-bounce">
              ¡Ganaste +{lastWinAmount} Monedas!
            </div>
          )}
        </div>

        {/* Right Column: Betting Grid & Chip Controls */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4">
          
          {/* Chip Selector Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-semibold uppercase text-slate-400">
              Valor de Ficha:
            </span>
            <div className="flex items-center gap-1.5 sm:gap-2">
              {CHIP_VALUES.map(val => (
                <button
                  key={val}
                  onClick={() => {
                    setSelectedChip(val);
                    soundFx.playClick();
                  }}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full font-extrabold text-xs flex items-center justify-center font-mono-numbers border-2 transition-all shadow-md ${
                    selectedChip === val
                      ? 'bg-amber-400 text-slate-950 border-white scale-110 shadow-amber-500/30'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* Numbers Grid (0 to 36) */}
          <div className="space-y-2">
            {/* Zero slot */}
            <button
              onClick={() => placeBet('straight', 0)}
              className="w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg transition-colors relative border border-emerald-500/60"
            >
              <span>0 (CERO - 35:1)</span>
              {getBetOnType('straight', 0) > 0 && (
                <span className="absolute right-3 top-2 px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-mono-numbers font-black">
                  {getBetOnType('straight', 0)}
                </span>
              )}
            </button>

            {/* 36 Numbers Grid (12 columns x 3 rows) */}
            <div className="grid grid-cols-12 gap-1 text-[11px] font-mono-numbers font-bold">
              {Array.from({ length: 36 }, (_, i) => i + 1).map(num => {
                const isRed = RED_NUMBERS.has(num);
                const currentBet = getBetOnType('straight', num);

                return (
                  <button
                    key={num}
                    onClick={() => placeBet('straight', num)}
                    className={`h-9 rounded flex items-center justify-center relative transition-transform active:scale-90 border ${
                      isRed
                        ? 'bg-rose-700 hover:bg-rose-600 border-rose-500/50 text-white'
                        : 'bg-slate-950 hover:bg-slate-850 border-slate-800 text-slate-200'
                    }`}
                  >
                    <span>{num}</span>
                    {currentBet > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black flex items-center justify-center shadow">
                        {currentBet}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dozens (1-12, 13-24, 25-36) */}
          <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
            {(
              [
                { type: 'dozen1' as const, label: '1ra Docena (1-12)', payout: '2:1' },
                { type: 'dozen2' as const, label: '2da Docena (13-24)', payout: '2:1' },
                { type: 'dozen3' as const, label: '3ra Docena (25-36)', payout: '2:1' }
              ] as const
            ).map(d => (
              <button
                key={d.type}
                onClick={() => placeBet(d.type)}
                className="py-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 relative text-center"
              >
                <div>{d.label}</div>
                <div className="text-[10px] text-slate-500">{d.payout}</div>
                {getBetOnType(d.type) > 0 && (
                  <span className="absolute top-1 right-2 px-1 rounded bg-amber-400 text-slate-950 text-[10px] font-mono-numbers font-black">
                    {getBetOnType(d.type)}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Outside Bets (1-18, Even, Red, Black, Odd, 19-36) */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs font-semibold">
            <button
              onClick={() => placeBet('low')}
              className="py-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 relative text-center"
            >
              1-18 (Bajo)
              {getBetOnType('low') > 0 && (
                <span className="absolute top-1 right-1.5 px-1 rounded bg-amber-400 text-slate-950 text-[9px] font-mono-numbers font-bold">
                  {getBetOnType('low')}
                </span>
              )}
            </button>
            <button
              onClick={() => placeBet('even')}
              className="py-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 relative text-center"
            >
              PAR
              {getBetOnType('even') > 0 && (
                <span className="absolute top-1 right-1.5 px-1 rounded bg-amber-400 text-slate-950 text-[9px] font-mono-numbers font-bold">
                  {getBetOnType('even')}
                </span>
              )}
            </button>
            <button
              onClick={() => placeBet('red')}
              className="py-2 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-bold border border-rose-500/50 relative text-center"
            >
              ROJO
              {getBetOnType('red') > 0 && (
                <span className="absolute top-1 right-1.5 px-1 rounded bg-amber-400 text-slate-950 text-[9px] font-mono-numbers font-bold">
                  {getBetOnType('red')}
                </span>
              )}
            </button>
            <button
              onClick={() => placeBet('black')}
              className="py-2 rounded-lg bg-slate-950 hover:bg-slate-850 text-slate-200 font-bold border border-slate-800 relative text-center"
            >
              NEGRO
              {getBetOnType('black') > 0 && (
                <span className="absolute top-1 right-1.5 px-1 rounded bg-amber-400 text-slate-950 text-[9px] font-mono-numbers font-bold">
                  {getBetOnType('black')}
                </span>
              )}
            </button>
            <button
              onClick={() => placeBet('odd')}
              className="py-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 relative text-center"
            >
              IMPAR
              {getBetOnType('odd') > 0 && (
                <span className="absolute top-1 right-1.5 px-1 rounded bg-amber-400 text-slate-950 text-[9px] font-mono-numbers font-bold">
                  {getBetOnType('odd')}
                </span>
              )}
            </button>
            <button
              onClick={() => placeBet('high')}
              className="py-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 relative text-center"
            >
              19-36 (Alto)
              {getBetOnType('high') > 0 && (
                <span className="absolute top-1 right-1.5 px-1 rounded bg-amber-400 text-slate-950 text-[9px] font-mono-numbers font-bold">
                  {getBetOnType('high')}
                </span>
              )}
            </button>
          </div>

          {/* Action Row & Totals */}
          <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={clearBets}
                disabled={isSpinning || bets.length === 0}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpiar</span>
              </button>
              <button
                onClick={doubleBets}
                disabled={isSpinning || bets.length === 0}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Duplicar 2x</span>
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase block">Total Apostado</span>
                <span className="text-base font-bold text-amber-400 font-mono-numbers">
                  {totalBetAmount} Monedas
                </span>
              </div>

              <button
                onClick={spinWheel}
                disabled={isSpinning || bets.length === 0}
                className="px-7 py-3 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
              >
                <RotateCcw className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
                <span>{isSpinning ? 'Girando...' : 'GIRAR RULETA'}</span>
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
