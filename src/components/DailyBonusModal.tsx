import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import {
  Sparkles,
  Gift,
  CheckCircle2,
  Clock,
  Coins,
  ChevronRight,
  X,
  Target,
  Trophy,
  Flame,
  Zap,
  ArrowRight
} from 'lucide-react';
import { soundFx } from '../utils/audio';

const WHEEL_PRIZES = [
  { label: '15 Monedas', value: 15, color: '#3b82f6', textColor: '#ffffff' },
  { label: '30 Monedas', value: 30, color: '#8b5cf6', textColor: '#ffffff' },
  { label: '50 Monedas', value: 50, color: '#06b6d4', textColor: '#ffffff' },
  { label: '100 Monedas', value: 100, color: '#f59e0b', textColor: '#0f172a' },
  { label: '25 Monedas', value: 25, color: '#10b981', textColor: '#ffffff' },
  { label: '500 JACKPOT', value: 500, color: '#ec4899', textColor: '#ffffff' },
  { label: '40 Monedas', value: 40, color: '#6366f1', textColor: '#ffffff' },
  { label: '250 Monedas', value: 250, color: '#eab308', textColor: '#0f172a' }
];

export const DailyBonusModal: React.FC = () => {
  const {
    isDailyBonusModalOpen,
    setIsDailyBonusModalOpen,
    lastDailySpinTime,
    claimDailySpinReward,
    dailyQuests,
    claimQuestReward,
    coins
  } = useGame();

  const [activeTab, setActiveTab] = useState<'wheel' | 'quests'>('wheel');
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [wonPrize, setWonPrize] = useState<{ label: string; value: number } | null>(null);

  // 24 hour cooldown check
  const now = Date.now();
  const cooldownPeriodMs = 24 * 60 * 60 * 1000;
  const timeSinceLastSpin = now - lastDailySpinTime;
  const canSpin = timeSinceLastSpin >= cooldownPeriodMs || lastDailySpinTime === 0;

  // Countdown string
  const msRemaining = Math.max(0, cooldownPeriodMs - timeSinceLastSpin);
  const hoursRemaining = Math.floor(msRemaining / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));
  const secondsRemaining = Math.floor((msRemaining % (1000 * 60)) / 1000);

  if (!isDailyBonusModalOpen) return null;

  const handleSpin = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setWonPrize(null);
    soundFx.playRouletteTick();

    // Pick a random prize
    const prizeIndex = Math.floor(Math.random() * WHEEL_PRIZES.length);
    const selectedPrize = WHEEL_PRIZES[prizeIndex];

    // Compute rotation: multiple full rotations + offset for the selected wedge
    const sliceAngle = 360 / WHEEL_PRIZES.length;
    const extraSpins = 5 * 360; // 5 full revolutions
    // Arrow is at top (270 degrees in trigonometric terms or 0 at top depending on orientation)
    // Wedge center: (prizeIndex * sliceAngle) + (sliceAngle / 2)
    const targetWedgeAngle = 360 - (prizeIndex * sliceAngle + sliceAngle / 2);
    const finalAngle = rotationAngle + extraSpins + (targetWedgeAngle - (rotationAngle % 360));

    setRotationAngle(finalAngle);

    setTimeout(() => {
      setIsSpinning(false);
      setWonPrize(selectedPrize);
      claimDailySpinReward(selectedPrize.value, selectedPrize.label);
    }, 4500);
  };

  const completedQuestsCount = dailyQuests.filter(q => q.completed).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Top Header */}
        <div className="p-5 bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[9px] flex items-center justify-center">
                <Gift className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 font-display flex items-center gap-2">
                <span>Premios Diarios & Misiones Aether</span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded border border-amber-500/40">
                  Cada 24 Horas
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Gira la rueda de la fortuna gratis o completa misiones para reclamar monedas directas
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setIsDailyBonusModalOpen(false);
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
              setActiveTab('wheel');
              soundFx.playClick();
            }}
            className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'wheel'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Rueda de la Fortuna Diaria</span>
            {canSpin && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('quests');
              soundFx.playClick();
            }}
            className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'quests'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Misiones Diarias ({completedQuestsCount}/{dailyQuests.length})</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* TAB 1: LUCKY WHEEL */}
          {activeTab === 'wheel' && (
            <div className="flex flex-col items-center justify-center space-y-6">
              
              {/* Wheel Container */}
              <div className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center">
                
                {/* Pointer at the top */}
                <div className="absolute top-0 z-30 transform -translate-y-2">
                  <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[22px] border-t-amber-400 drop-shadow-[0_2px_8px_rgba(251,191,36,0.8)]" />
                </div>

                {/* SVG Wheel */}
                <svg
                  viewBox="0 0 300 300"
                  className="w-full h-full drop-shadow-2xl transition-transform ease-out"
                  style={{
                    transform: `rotate(${rotationAngle}deg)`,
                    transitionDuration: isSpinning ? '4500ms' : '0ms',
                    transitionTimingFunction: 'cubic-bezier(0.15, 0.9, 0.2, 1)'
                  }}
                >
                  <circle cx="150" cy="150" r="148" fill="#0f172a" stroke="#f59e0b" strokeWidth="4" />
                  
                  {WHEEL_PRIZES.map((prize, idx) => {
                    const sliceAngle = 360 / WHEEL_PRIZES.length;
                    const startAngle = idx * sliceAngle;
                    const endAngle = startAngle + sliceAngle;

                    const radStart = (startAngle - 90) * (Math.PI / 180);
                    const radEnd = (endAngle - 90) * (Math.PI / 180);

                    const x1 = 150 + 144 * Math.cos(radStart);
                    const y1 = 150 + 144 * Math.sin(radStart);
                    const x2 = 150 + 144 * Math.cos(radEnd);
                    const y2 = 150 + 144 * Math.sin(radEnd);

                    const path = `M 150 150 L ${x1} ${y1} A 144 144 0 0 1 ${x2} ${y2} Z`;

                    // Text rotation
                    const textAngle = startAngle + sliceAngle / 2;
                    const textRad = (textAngle - 90) * (Math.PI / 180);
                    const tx = 150 + 95 * Math.cos(textRad);
                    const ty = 150 + 95 * Math.sin(textRad);

                    return (
                      <g key={idx}>
                        <path d={path} fill={prize.color} stroke="#0f172a" strokeWidth="2" opacity="0.9" />
                        <text
                          x={tx}
                          y={ty}
                          fill={prize.textColor}
                          fontSize="11"
                          fontWeight="bold"
                          textAnchor="middle"
                          dominantBaseline="central"
                          transform={`rotate(${textAngle + 90}, ${tx}, ${ty})`}
                        >
                          {prize.label}
                        </text>
                      </g>
                    );
                  })}

                  {/* Center Hub */}
                  <circle cx="150" cy="150" r="30" fill="#0f172a" stroke="#f59e0b" strokeWidth="4" />
                  <circle cx="150" cy="150" r="16" fill="#f59e0b" />
                </svg>

              </div>

              {/* Status & CTA */}
              <div className="w-full max-w-sm text-center space-y-3">
                {wonPrize && (
                  <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/50 text-amber-300 font-bold text-sm animate-in zoom-in-95">
                    🎉 ¡Felicidades! Has ganado {wonPrize.label} (+{wonPrize.value} monedas)
                  </div>
                )}

                {canSpin ? (
                  <button
                    onClick={handleSpin}
                    disabled={isSpinning}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 text-slate-950 font-extrabold text-sm rounded-2xl shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4 fill-slate-950" />
                    <span>{isSpinning ? '¡Girando la Fortuna...!' : 'GIRAR RUEDA GRATIS'}</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center justify-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>
                        Próximo giro gratis en:{' '}
                        <strong className="text-amber-300 font-mono">
                          {hoursRemaining}h {minutesRemaining}m {secondsRemaining}s
                        </strong>
                      </span>
                    </div>
                    {/* Instant testing trigger */}
                    <button
                      onClick={handleSpin}
                      disabled={isSpinning}
                      className="text-[11px] text-slate-500 hover:text-amber-400 underline"
                    >
                      (Modo Demo: Girar de nuevo sin esperar 24h)
                    </button>
                  </div>
                )}

                <div className="text-[11px] text-slate-500">
                  💡 Los premios se depositan al instante en tu cartera de monedas Aether.
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: DAILY QUESTS */}
          {activeTab === 'quests' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                <span>Completa tareas de casino o héroe para acumular monedas gratis.</span>
                <span className="font-mono text-cyan-400 font-bold">
                  {completedQuestsCount} de {dailyQuests.length} Listas
                </span>
              </div>

              <div className="space-y-3">
                {dailyQuests.map(quest => {
                  const progressPct = Math.min(100, Math.round((quest.currentCount / quest.targetCount) * 100));

                  return (
                    <div
                      key={quest.id}
                      className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-200">{quest.title}</span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                            +{quest.rewardCoins} Monedas
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{quest.description}</p>

                        {/* Progress Bar */}
                        <div className="space-y-1 pt-1 max-w-xs">
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                            <span>Progreso</span>
                            <span>{quest.currentCount} / {quest.targetCount}</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                quest.completed ? 'bg-emerald-400' : 'bg-cyan-500'
                              }`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Claim Button */}
                      <div className="shrink-0 self-end sm:self-center">
                        {quest.claimed ? (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Reclamado</span>
                          </div>
                        ) : quest.completed ? (
                          <button
                            onClick={() => claimQuestReward(quest.id)}
                            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1.5"
                          >
                            <Gift className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Reclamar +{quest.rewardCoins}</span>
                          </button>
                        ) : (
                          <div className="text-xs text-slate-500 font-medium px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
                            En progreso ({progressPct}%)
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
