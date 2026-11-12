import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Card } from '../types';
import {
  RotateCcw,
  Coins,
  ShieldCheck,
  Check,
  Lock,
  Sparkles,
  Trophy
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import { CasinoTableBar } from './CasinoTableBar';

const SUITS: ('spades' | 'hearts' | 'diamonds' | 'clubs')[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS = [
  { value: 1, label: 'A' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5' },
  { value: 6, label: '6' },
  { value: 7, label: '7' },
  { value: 8, label: '8' },
  { value: 9, label: '9' },
  { value: 10, label: '10' },
  { value: 11, label: 'J' },
  { value: 12, label: 'Q' },
  { value: 13, label: 'K' }
];

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, value: rank.value, label: rank.label });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

interface HandEvaluation {
  name: string;
  multiplier: number;
}

function evaluatePokerHand(cards: Card[]): HandEvaluation {
  if (cards.length !== 5) return { name: 'Mano Incompleta', multiplier: 0 };

  const values = cards.map(c => (c.value === 1 ? 14 : c.value)).sort((a, b) => a - b);
  const suits = cards.map(c => c.suit);

  const isFlush = suits.every(s => s === suits[0]);

  // Check straight
  let isStraight = false;
  if (
    values[4] - values[3] === 1 &&
    values[3] - values[2] === 1 &&
    values[2] - values[1] === 1 &&
    values[1] - values[0] === 1
  ) {
    isStraight = true;
  }
  // Low Ace straight: A-2-3-4-5
  if (!isStraight && values[0] === 2 && values[1] === 3 && values[2] === 4 && values[3] === 5 && values[4] === 14) {
    isStraight = true;
  }

  // Value counts
  const countMap: Record<number, number> = {};
  values.forEach(v => {
    countMap[v] = (countMap[v] || 0) + 1;
  });
  const counts = Object.values(countMap).sort((a, b) => b - a);

  // Royal Flush
  if (isFlush && isStraight && values[0] === 10 && values[4] === 14) {
    return { name: 'Escalera Real (Royal Flush)', multiplier: 800 };
  }
  // Straight Flush
  if (isFlush && isStraight) {
    return { name: 'Escalera de Color (Straight Flush)', multiplier: 50 };
  }
  // Four of a Kind
  if (counts[0] === 4) {
    return { name: 'Póker (4 of a Kind)', multiplier: 25 };
  }
  // Full House
  if (counts[0] === 3 && counts[1] === 2) {
    return { name: 'Full House', multiplier: 9 };
  }
  // Flush
  if (isFlush) {
    return { name: 'Color (Flush)', multiplier: 6 };
  }
  // Straight
  if (isStraight) {
    return { name: 'Escalera (Straight)', multiplier: 4 };
  }
  // Three of a Kind
  if (counts[0] === 3) {
    return { name: 'Trío (3 of a Kind)', multiplier: 3 };
  }
  // Two Pair
  if (counts[0] === 2 && counts[1] === 2) {
    return { name: 'Doble Pareja (Two Pair)', multiplier: 2 };
  }
  // Jacks or Better
  if (counts[0] === 2) {
    // Check if pair is J, Q, K, or A
    const pairValue = Number(Object.keys(countMap).find(k => countMap[Number(k)] === 2));
    if (pairValue >= 11) {
      return { name: 'Jacks o Mejor (Pair of J+)', multiplier: 1 };
    }
  }

  return { name: 'Carta Alta (Sin Premio)', multiplier: 0 };
}

const PAYTABLE = [
  { hand: 'Escalera Real', mult: '800x' },
  { hand: 'Escalera de Color', mult: '50x' },
  { hand: 'Póker (4 Iguales)', mult: '25x' },
  { hand: 'Full House', mult: '9x' },
  { hand: 'Color (Flush)', mult: '6x' },
  { hand: 'Escalera (Straight)', mult: '4x' },
  { hand: 'Trío', mult: '3x' },
  { hand: 'Doble Pareja', mult: '2x' },
  { hand: 'Jacks o Mejor', mult: '1x' }
];

export const PokerGame: React.FC = () => {
  const { coins, executeBet, addNotification, character, setIsProvablyFairModalOpen } = useGame();

  const [deck, setDeck] = useState<Card[]>(createDeck());
  const [hand, setHand] = useState<Card[]>([]);
  const [heldCards, setHeldCards] = useState<boolean[]>([false, false, false, false, false]);
  const [betAmount, setBetAmount] = useState(20);
  const [stage, setStage] = useState<'BETTING' | 'HOLD_SELECTION' | 'RESOLVED'>('BETTING');
  const [evaluation, setEvaluation] = useState<HandEvaluation | null>(null);
  const [winPayout, setWinPayout] = useState<number>(0);

  const startPokerDeal = () => {
    if (coins < betAmount) {
      addNotification('Fondos Insuficientes', 'Recarga monedas en la tienda para jugar Póker.', 'info');
      return;
    }

    soundFx.playCardDeal();
    const newDeck = createDeck();
    const initialHand = [
      newDeck.pop()!,
      newDeck.pop()!,
      newDeck.pop()!,
      newDeck.pop()!,
      newDeck.pop()!
    ];

    setDeck(newDeck);
    setHand(initialHand);
    setHeldCards([false, false, false, false, false]);
    setEvaluation(null);
    setWinPayout(0);
    setStage('HOLD_SELECTION');
  };

  const toggleHold = (index: number) => {
    if (stage !== 'HOLD_SELECTION') return;
    soundFx.playClick();
    setHeldCards(prev => {
      const copy = [...prev];
      copy[index] = !copy[index];
      return copy;
    });
  };

  const drawCards = async () => {
    if (stage !== 'HOLD_SELECTION') return;
    soundFx.playCardDeal();

    const currentDeck = [...deck];
    const newHand = hand.map((card, idx) => {
      if (heldCards[idx]) {
        return card;
      }
      return currentDeck.pop()!;
    });

    setDeck(currentDeck);
    setHand(newHand);
    setStage('RESOLVED');

    const evalResult = evaluatePokerHand(newHand);
    setEvaluation(evalResult);

    const totalWin = evalResult.multiplier > 0 ? betAmount * (evalResult.multiplier + 1) : 0;
    setWinPayout(totalWin);

    await executeBet('Poker', betAmount, totalWin, `${evalResult.name} (${evalResult.multiplier}x)`);

    if (totalWin > 0) {
      addNotification(
        '¡Mano Ganadora de Póker!',
        `Conseguiste ${evalResult.name}. Recibes +${totalWin} monedas.`,
        'reward',
        totalWin
      );
    }
  };

  const renderCard = (card: Card, index: number) => {
    const isHeld = heldCards[index];
    const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
    const suitSymbol = {
      spades: '♠',
      hearts: '♥',
      diamonds: '♦',
      clubs: '♣'
    }[card.suit];

    return (
      <div
        key={index}
        onClick={() => toggleHold(index)}
        className={`relative flex flex-col items-center cursor-pointer select-none transition-all ${
          stage === 'HOLD_SELECTION' ? 'hover:-translate-y-2' : ''
        }`}
      >
        {/* Card Body */}
        <div
          className={`w-16 h-26 sm:w-24 sm:h-36 rounded-xl bg-white border shadow-2xl flex flex-col justify-between p-2.5 transition-all ${
            isHeld && stage === 'HOLD_SELECTION'
              ? 'ring-4 ring-amber-400 border-amber-400'
              : 'border-slate-300'
          }`}
        >
          <div className={`text-xs sm:text-base font-bold font-mono ${isRed ? 'text-rose-600' : 'text-slate-900'}`}>
            {card.label}
            <span className="ml-1">{suitSymbol}</span>
          </div>

          <div className={`text-3xl sm:text-4xl self-center font-bold ${isRed ? 'text-rose-600' : 'text-slate-900'}`}>
            {suitSymbol}
          </div>

          <div className={`text-xs sm:text-base font-bold font-mono self-end rotate-180 ${isRed ? 'text-rose-600' : 'text-slate-900'}`}>
            {card.label}
            <span className="ml-1">{suitSymbol}</span>
          </div>
        </div>

        {/* Hold Badge */}
        {stage === 'HOLD_SELECTION' && (
          <div
            className={`mt-2 px-3 py-1 rounded-md text-[11px] font-extrabold uppercase tracking-wider transition-all ${
              isHeld
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 scale-105'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {isHeld ? 'MANTENIDO' : 'CAMBIAR'}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-amber-400 font-semibold">
              Video Póker Jacks or Better
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-display">
            Póker Criptográfico 5-Card Draw
          </h1>
          <p className="text-xs text-slate-400">
            Elige qué cartas retener y roba para formar la mejor combinación ganadora
          </p>
        </div>

        <button
          onClick={() => setIsProvablyFairModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-emerald-400 self-start"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Provably Fair E2EE</span>
        </button>
      </div>

      {/* Solo vs Live Multiplayer & 70/30 Guarantee Bar */}
      <CasinoTableBar gameTitle="Póker 5-Card Draw" userBetAmount={betAmount} />

      {/* Paytable Strip */}
      <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-x-auto">
        <div className="flex items-center justify-between gap-4 text-xs font-mono-numbers min-w-[600px]">
          {PAYTABLE.map(p => (
            <div key={p.hand} className="text-center px-2 py-1 rounded bg-slate-950 border border-slate-800/80">
              <div className="text-[10px] text-slate-400 uppercase truncate">{p.hand}</div>
              <div className="font-bold text-amber-400">{p.mult}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Video Poker Table */}
      <div className="rounded-3xl bg-gradient-to-b from-blue-950/80 via-slate-900 to-slate-950 border-4 border-slate-700/80 shadow-2xl p-6 sm:p-10 min-h-[420px] flex flex-col justify-between">
        
        {/* Status / Outcome Banner */}
        <div className="text-center min-h-[48px] flex items-center justify-center">
          {evaluation ? (
            <div className="inline-block p-3 rounded-2xl bg-slate-950 border border-amber-500/60 shadow-xl">
              <div className="text-base font-extrabold text-slate-100 font-display">
                {evaluation.name}
              </div>
              {winPayout > 0 && (
                <div className="text-sm font-bold text-emerald-400 font-mono-numbers mt-0.5">
                  +{winPayout} Monedas Ganadas
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-400 font-mono">
              {stage === 'BETTING'
                ? 'Ajusta tu apuesta y haz clic en Repartir'
                : 'Haz clic en las cartas que deseas MANTENER, luego presiona Robar'}
            </div>
          )}
        </div>

        {/* 5 Cards Row */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 my-6">
          {hand.length === 5 ? (
            hand.map((card, i) => renderCard(card, i))
          ) : (
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="w-16 h-26 sm:w-24 sm:h-36 rounded-xl border-2 border-dashed border-slate-700 bg-slate-950/40 flex items-center justify-center text-slate-600 text-xs font-mono"
              >
                Carta {i + 1}
              </div>
            ))
          )}
        </div>

        {/* Controls Bar */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Bet settings */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 uppercase font-semibold">Apuesta:</span>
            {[10, 20, 50, 100].map(v => (
              <button
                key={v}
                disabled={stage === 'HOLD_SELECTION'}
                onClick={() => {
                  setBetAmount(v);
                  soundFx.playClick();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono-numbers font-bold border transition-colors ${
                  betAmount === v
                    ? 'bg-amber-400 text-slate-950 border-white'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 disabled:opacity-40'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-2">
            {stage === 'BETTING' && (
              <button
                onClick={startPokerDeal}
                className="px-8 py-3 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 text-slate-950 font-extrabold text-sm rounded-xl shadow-xl active:scale-95 transition-all"
              >
                REPARTIR MANO
              </button>
            )}

            {stage === 'HOLD_SELECTION' && (
              <button
                onClick={drawCards}
                className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-slate-950 font-extrabold text-sm rounded-xl shadow-xl active:scale-95 transition-all"
              >
                ROBAR CARTAS
              </button>
            )}

            {stage === 'RESOLVED' && (
              <button
                onClick={() => {
                  setStage('BETTING');
                  setHand([]);
                  setEvaluation(null);
                }}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg active:scale-95 transition-all flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Nueva Partida</span>
              </button>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
