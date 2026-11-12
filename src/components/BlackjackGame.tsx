import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { Card } from '../types';
import {
  RotateCcw,
  Coins,
  ShieldCheck,
  Check,
  Plus,
  Hand,
  Trophy,
  Sparkles
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
  // Shuffle Fisher-Yates
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function calculateHandScore(cards: Card[]): { score: number; isSoft: boolean; isBlackjack: boolean } {
  let score = 0;
  let aces = 0;

  for (const card of cards) {
    if (card.value === 1) {
      aces += 1;
      score += 11;
    } else if (card.value >= 10) {
      score += 10;
    } else {
      score += card.value;
    }
  }

  while (score > 21 && aces > 0) {
    score -= 10;
    aces -= 1;
  }

  const isBlackjack = cards.length === 2 && score === 21;
  return { score, isSoft: aces > 0, isBlackjack };
}

const CHIP_VALUES = [5, 25, 100, 250, 500];

export const BlackjackGame: React.FC = () => {
  const { coins, executeBet, addNotification, character, setIsProvablyFairModalOpen } = useGame();

  const [deck, setDeck] = useState<Card[]>(createDeck());
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [betAmount, setBetAmount] = useState(25);
  const [selectedChip, setSelectedChip] = useState(25);
  const [gameState, setGameState] = useState<'BETTING' | 'PLAYER_TURN' | 'DEALER_TURN' | 'RESOLVED'>('BETTING');
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [winPayout, setWinPayout] = useState<number>(0);

  const playerScore = calculateHandScore(playerHand);
  const dealerScore = calculateHandScore(dealerHand);

  // Deal starting hands
  const startDeal = async () => {
    if (coins < betAmount) {
      addNotification('Fondos Insuficientes', 'Recarga más monedas para apostar en el Blackjack.', 'info');
      return;
    }

    soundFx.playCardDeal();
    const newDeck = createDeck();
    const p1 = newDeck.pop()!;
    const d1 = newDeck.pop()!;
    const p2 = newDeck.pop()!;
    const d2 = newDeck.pop()!;

    const initialPlayer = [p1, p2];
    const initialDealer = [d1, d2];

    setDeck(newDeck);
    setPlayerHand(initialPlayer);
    setDealerHand(initialDealer);
    setGameResult(null);
    setWinPayout(0);

    const initialPScore = calculateHandScore(initialPlayer);
    const initialDScore = calculateHandScore(initialDealer);

    if (initialPScore.isBlackjack) {
      // Natural Blackjack
      if (initialDScore.isBlackjack) {
        setGameState('RESOLVED');
        setGameResult('Empate (Push) - Ambos tienen Blackjack');
        setWinPayout(betAmount);
        await executeBet('Blackjack', betAmount, betAmount, 'Empate Push');
      } else {
        const payout = Math.floor(betAmount * 2.5);
        setGameState('RESOLVED');
        setGameResult('¡Blackjack Natural! Pago 3:2');
        setWinPayout(payout);
        await executeBet('Blackjack', betAmount, payout, 'Blackjack Natural');
        addNotification('¡Blackjack!', `¡Mano perfecta de 21! Ganaste ${payout} monedas.`, 'reward', payout);
      }
    } else {
      setGameState('PLAYER_TURN');
    }
  };

  const hit = () => {
    if (gameState !== 'PLAYER_TURN') return;
    soundFx.playCardDeal();

    const newDeck = [...deck];
    const card = newDeck.pop()!;
    const updatedHand = [...playerHand, card];

    setDeck(newDeck);
    setPlayerHand(updatedHand);

    const score = calculateHandScore(updatedHand);
    if (score.score > 21) {
      // Player busts
      setGameState('RESOLVED');
      setGameResult('Te has pasado (Bust). Gana la casa.');
      executeBet('Blackjack', betAmount, 0, `Bust con ${score.score}`);
    } else if (score.score === 21) {
      // Auto stand on 21
      stand(updatedHand);
    }
  };

  const stand = (currentPHand = playerHand) => {
    if (gameState !== 'PLAYER_TURN') return;
    setGameState('DEALER_TURN');
    soundFx.playCardDeal();

    // Dealer AI: Hits until 17 or higher
    let currentDeck = [...deck];
    let currentDHand = [...dealerHand];

    const dealerPlay = () => {
      let dScore = calculateHandScore(currentDHand);
      if (dScore.score < 17) {
        soundFx.playCardDeal();
        const nextCard = currentDeck.pop()!;
        currentDHand = [...currentDHand, nextCard];
        setDealerHand(currentDHand);
        setDeck(currentDeck);
        setTimeout(dealerPlay, 600);
      } else {
        resolveGame(currentPHand, currentDHand);
      }
    };

    setTimeout(dealerPlay, 500);
  };

  const doubleDown = () => {
    if (gameState !== 'PLAYER_TURN' || playerHand.length !== 2) return;
    if (coins < betAmount * 2) {
      addNotification('Fondos Insuficientes', 'No tienes saldo para doblar la apuesta.', 'info');
      return;
    }

    const newBet = betAmount * 2;
    setBetAmount(newBet);
    soundFx.playCardDeal();

    const newDeck = [...deck];
    const card = newDeck.pop()!;
    const updatedHand = [...playerHand, card];

    setDeck(newDeck);
    setPlayerHand(updatedHand);

    const score = calculateHandScore(updatedHand);
    if (score.score > 21) {
      setGameState('RESOLVED');
      setGameResult('Te has pasado tras doblar (Bust).');
      executeBet('Blackjack', newBet, 0, `Doble abajo bust con ${score.score}`);
    } else {
      stand(updatedHand);
    }
  };

  const resolveGame = async (pHand: Card[], dHand: Card[]) => {
    const pScore = calculateHandScore(pHand).score;
    const dScore = calculateHandScore(dHand).score;

    setGameState('RESOLVED');

    if (dScore > 21) {
      const payout = betAmount * 2;
      setGameResult('¡El crupier se pasa (Dealer Bust)! Has ganado.');
      setWinPayout(payout);
      await executeBet('Blackjack', betAmount, payout, `Victoria: Crupier se pasa con ${dScore}`);
      addNotification('¡Victoria en Blackjack!', `El crupier se pasó con ${dScore}. Ganaste +${payout} monedas.`, 'reward', payout);
    } else if (pScore > dScore) {
      const payout = betAmount * 2;
      setGameResult(`¡Victoria! Tu ${pScore} supera al ${dScore} del crupier.`);
      setWinPayout(payout);
      await executeBet('Blackjack', betAmount, payout, `Victoria ${pScore} vs ${dScore}`);
      addNotification('¡Victoria en Blackjack!', `Superaste a la casa (${pScore} vs ${dScore}). +${payout} monedas.`, 'reward', payout);
    } else if (pScore < dScore) {
      setGameResult(`Gana la casa: ${dScore} contra tu ${pScore}.`);
      await executeBet('Blackjack', betAmount, 0, `Derrota ${pScore} vs ${dScore}`);
    } else {
      setGameResult(`Empate (Push): Ambos con ${pScore}. Se devuelve la apuesta.`);
      setWinPayout(betAmount);
      await executeBet('Blackjack', betAmount, betAmount, `Empate ${pScore}`);
    }
  };

  const renderCard = (card: Card, hidden = false) => {
    if (hidden) {
      return (
        <div className="w-16 h-24 sm:w-20 sm:h-28 rounded-xl bg-gradient-to-tr from-amber-900 to-amber-700 border-2 border-amber-400/80 shadow-xl flex items-center justify-center transform -rotate-2">
          <div className="w-12 h-20 sm:w-16 sm:h-24 rounded-lg border border-amber-300/40 flex items-center justify-center">
            <span className="text-amber-200 font-extrabold text-xs">AETHER</span>
          </div>
        </div>
      );
    }

    const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
    const suitSymbol = {
      spades: '♠',
      hearts: '♥',
      diamonds: '♦',
      clubs: '♣'
    }[card.suit];

    return (
      <div className="w-16 h-24 sm:w-20 sm:h-28 rounded-xl bg-white border border-slate-300 shadow-xl flex flex-col justify-between p-2 transform hover:-translate-y-1 transition-transform">
        <div className={`text-xs sm:text-sm font-bold font-mono ${isRed ? 'text-rose-600' : 'text-slate-900'}`}>
          {card.label}
          <span className="ml-0.5">{suitSymbol}</span>
        </div>
        <div className={`text-2xl sm:text-3xl self-center font-bold ${isRed ? 'text-rose-600' : 'text-slate-900'}`}>
          {suitSymbol}
        </div>
        <div className={`text-xs sm:text-sm font-bold font-mono self-end rotate-180 ${isRed ? 'text-rose-600' : 'text-slate-900'}`}>
          {card.label}
          <span className="ml-0.5">{suitSymbol}</span>
        </div>
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
              Mesa VIP Cifrada E2EE
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-display">
            Blackjack 21 Profesional
          </h1>
          <p className="text-xs text-slate-400">
            Reglas de Las Vegas · Pago 3:2 en Blackjack natural · Provably-Fair SHA-256
          </p>
        </div>

        <button
          onClick={() => setIsProvablyFairModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-emerald-400 self-start"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Verificar Semillas E2EE</span>
        </button>
      </div>

      {/* Solo vs Live Multiplayer & 70/30 Guarantee Bar */}
      <CasinoTableBar gameTitle="Blackjack 21" userBetAmount={betAmount} />

      {/* Blackjack Felt Table */}
      <div className="relative rounded-3xl bg-gradient-to-b from-emerald-950/90 via-emerald-900/60 to-slate-950 border-4 border-amber-900/80 shadow-2xl p-6 sm:p-10 min-h-[460px] flex flex-col justify-between overflow-hidden">
        
        {/* Felt Watermark Text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
          <span className="text-7xl font-extrabold text-white font-display tracking-widest">
            BLACKJACK 21
          </span>
        </div>

        {/* Dealer Area */}
        <div className="flex flex-col items-center space-y-2 relative z-10">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-200">
            <span>Crupier de la Bóveda</span>
            {gameState !== 'BETTING' && (
              <span className="font-mono-numbers px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-amber-300">
                Puntaje: {gameState === 'PLAYER_TURN' ? '?' : dealerScore.score}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 min-h-[112px]">
            {dealerHand.map((card, i) => (
              <React.Fragment key={i}>
                {renderCard(card, i === 1 && gameState === 'PLAYER_TURN')}
              </React.Fragment>
            ))}
            {dealerHand.length === 0 && (
              <div className="w-20 h-28 border-2 border-dashed border-emerald-700/50 rounded-xl flex items-center justify-center text-emerald-600/60 text-xs">
                Mesa
              </div>
            )}
          </div>
        </div>

        {/* Table Felt Center Banner (Outcome status) */}
        <div className="my-4 text-center relative z-10">
          {gameResult ? (
            <div className="inline-block p-3 rounded-2xl bg-slate-950/90 border border-amber-500/60 shadow-xl animate-in zoom-in-95">
              <div className="text-sm font-bold text-slate-100">{gameResult}</div>
              {winPayout > 0 && (
                <div className="text-base font-extrabold text-emerald-400 font-mono-numbers mt-0.5">
                  +{winPayout} Monedas Acreditadas
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-emerald-300/80 font-mono">
              {gameState === 'BETTING' ? 'Selecciona tu apuesta y presiona Repartir' : 'Tu turno de acción'}
            </div>
          )}
        </div>

        {/* Player Area */}
        <div className="flex flex-col items-center space-y-3 relative z-10">
          <div className="flex items-center gap-3 min-h-[112px]">
            {playerHand.map((card, i) => (
              <React.Fragment key={i}>
                {renderCard(card, false)}
              </React.Fragment>
            ))}
            {playerHand.length === 0 && (
              <div className="w-20 h-28 border-2 border-dashed border-emerald-700/50 rounded-xl flex items-center justify-center text-emerald-600/60 text-xs">
                Tu Mano
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-200">
            <span>Tu Mano ({character.name})</span>
            {playerHand.length > 0 && (
              <span className="font-mono-numbers px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-amber-300 font-bold">
                Puntos: {playerScore.score}
              </span>
            )}
          </div>
        </div>

        {/* Action Controls & Bet Configuration */}
        <div className="pt-4 border-t border-emerald-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
          
          {/* Chip and Bet Adjuster */}
          {gameState === 'BETTING' ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-200 font-medium">Fichas:</span>
              <div className="flex items-center gap-1.5">
                {CHIP_VALUES.map(v => (
                  <button
                    key={v}
                    onClick={() => {
                      setBetAmount(v);
                      soundFx.playClick();
                    }}
                    className={`w-9 h-9 rounded-full font-bold text-xs font-mono-numbers border-2 flex items-center justify-center transition-all ${
                      betAmount === v
                        ? 'bg-amber-400 text-slate-950 border-white scale-110 shadow-lg'
                        : 'bg-emerald-950 text-emerald-200 border-emerald-700 hover:border-emerald-500'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs text-emerald-300 font-mono-numbers">
              Apuesta en mesa: <span className="font-bold text-amber-400">{betAmount} Monedas</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {gameState === 'BETTING' && (
              <button
                onClick={startDeal}
                className="px-8 py-3 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 text-slate-950 font-extrabold text-sm rounded-xl shadow-xl active:scale-95 transition-all"
              >
                REPARTIR CARTAS
              </button>
            )}

            {gameState === 'PLAYER_TURN' && (
              <>
                <button
                  onClick={hit}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 font-bold text-xs rounded-xl shadow flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>Pedir (Hit)</span>
                </button>

                <button
                  onClick={() => stand()}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 font-bold text-xs rounded-xl shadow flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <Hand className="w-4 h-4 text-amber-400" />
                  <span>Plantarse (Stand)</span>
                </button>

                {playerHand.length === 2 && (
                  <button
                    onClick={doubleDown}
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 text-white font-bold text-xs rounded-xl shadow active:scale-95 transition-all"
                  >
                    Doblar (Double)
                  </button>
                )}
              </>
            )}

            {gameState === 'RESOLVED' && (
              <button
                onClick={() => {
                  setGameState('BETTING');
                  setPlayerHand([]);
                  setDealerHand([]);
                  setGameResult(null);
                }}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg active:scale-95 transition-all flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Nueva Mano</span>
              </button>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
