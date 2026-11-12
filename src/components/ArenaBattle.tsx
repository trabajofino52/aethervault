import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import {
  Swords,
  Shield,
  Zap,
  Sparkles,
  Trophy,
  Coins,
  Heart,
  RefreshCw,
  Flame,
  Award
} from 'lucide-react';
import { soundFx } from '../utils/audio';

interface Enemy {
  name: string;
  level: number;
  maxHp: number;
  hp: number;
  attack: number;
  rewardCoins: number;
  color: string;
}

const ENEMIES: Enemy[] = [
  {
    name: 'Dron Centinela de Bóveda',
    level: 2,
    maxHp: 120,
    hp: 120,
    attack: 16,
    rewardCoins: 25,
    color: 'from-blue-600 to-slate-900'
  },
  {
    name: 'Gladiador Cripto-Cibernético',
    level: 6,
    maxHp: 260,
    hp: 260,
    attack: 32,
    rewardCoins: 60,
    color: 'from-amber-600 to-slate-900'
  },
  {
    name: 'Leviatán del Vacío Cuántico',
    level: 12,
    maxHp: 550,
    hp: 550,
    attack: 65,
    rewardCoins: 160,
    color: 'from-rose-700 to-purple-950'
  }
];

export const ArenaBattle: React.FC = () => {
  const { character, coins, executeBet, addNotification, isHappyHourActiveForGame } = useGame();
  const hh = isHappyHourActiveForGame('Arena');

  const [selectedEnemyIdx, setSelectedEnemyIdx] = useState(0);
  const currentEnemyTemplate = ENEMIES[selectedEnemyIdx];

  const maxHeroHp = 100 + character.skills.defense * 25;
  const [heroHp, setHeroHp] = useState(maxHeroHp);
  const [enemyHp, setEnemyHp] = useState(currentEnemyTemplate.maxHp);
  const [heroEnergy, setHeroEnergy] = useState(character.skills.energy * 20);
  const maxHeroEnergy = character.skills.energy * 20;

  const [battleState, setBattleState] = useState<'IDLE' | 'BATTLING' | 'HERO_WON' | 'HERO_LOST'>('IDLE');
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [isActing, setIsActing] = useState(false);

  // Sync when enemy changes or skills improve
  useEffect(() => {
    setHeroHp(100 + character.skills.defense * 25);
    setHeroEnergy(character.skills.energy * 20);
    setEnemyHp(currentEnemyTemplate.maxHp);
    setBattleState('IDLE');
    setCombatLog([`Seleccionado oponente: ${currentEnemyTemplate.name}. ¡Presiona "Comenzar Duelo" para iniciar!`]);
  }, [selectedEnemyIdx, character.skills]);

  const startBattle = () => {
    setHeroHp(maxHeroHp);
    setHeroEnergy(maxHeroEnergy);
    setEnemyHp(currentEnemyTemplate.maxHp);
    setBattleState('BATTLING');
    setCombatLog([`¡Comienza el duelo contra ${currentEnemyTemplate.name}!`]);
    soundFx.playCardDeal();
  };

  const handleHeroAttack = (type: 'BASIC' | 'SPECIAL') => {
    if (battleState !== 'BATTLING' || isActing) return;

    if (type === 'SPECIAL' && heroEnergy < 25) {
      soundFx.playClick();
      setCombatLog(prev => ['Energía insuficiente para Golpe Cuántico.', ...prev]);
      return;
    }

    setIsActing(true);

    // Hero turn
    let damage = Math.floor(20 + character.skills.attack * 10 + Math.random() * 12);
    let isCritical = false;

    // Luck check for critical hit (Luck skill gives +3% crit per point)
    const critChance = 0.10 + character.skills.luck * 0.04;
    if (Math.random() < critChance) {
      isCritical = true;
      damage = Math.floor(damage * 2.2);
    }

    if (type === 'SPECIAL') {
      damage = Math.floor(damage * 1.8);
      setHeroEnergy(prev => Math.max(0, prev - 25));
    } else {
      setHeroEnergy(prev => Math.min(maxHeroEnergy, prev + 8));
    }

    soundFx.playClick();
    const newEnemyHp = Math.max(0, enemyHp - damage);
    setEnemyHp(newEnemyHp);

    const attackLog = `${character.name} usó ${type === 'SPECIAL' ? '⚡ GOLPE CUÁNTICO' : '⚔️ ATAQUE'} causando ${damage} de daño${isCritical ? ' ¡GOLPE CRÍTICO!' : ''}!`;

    if (newEnemyHp <= 0) {
      // Victory!
      setBattleState('HERO_WON');
      setIsActing(false);
      setCombatLog(prev => [
        `🏆 ¡VICTORIA! Has derrotado a ${currentEnemyTemplate.name}. Recompensa: +${currentEnemyTemplate.rewardCoins} Monedas Aether!`,
        attackLog,
        ...prev
      ]);

      executeBet('Arena', 0, currentEnemyTemplate.rewardCoins, `Victoria contra ${currentEnemyTemplate.name}`);
      addNotification('Victoria en la Arena', `¡Derrotaste a ${currentEnemyTemplate.name}! +${currentEnemyTemplate.rewardCoins} monedas acreditadas.`, 'reward', currentEnemyTemplate.rewardCoins);
      return;
    }

    setCombatLog(prev => [attackLog, ...prev]);

    // Enemy counter-attack after brief delay
    setTimeout(() => {
      // Agility check for dodging
      const dodgeChance = 0.05 + character.skills.agility * 0.03;
      if (Math.random() < dodgeChance) {
        setCombatLog(prev => [`🛡️ ¡Tu agilidad te permitió esquivar el ataque de ${currentEnemyTemplate.name}!`, ...prev]);
        setIsActing(false);
        return;
      }

      // Damage mitigated by Defense skill
      const mitigation = Math.min(character.skills.defense * 2.5, currentEnemyTemplate.attack * 0.6);
      const enemyDmg = Math.max(5, Math.floor(currentEnemyTemplate.attack - mitigation + (Math.random() * 8 - 4)));
      const newHeroHp = Math.max(0, heroHp - enemyDmg);
      setHeroHp(newHeroHp);

      const enemyLog = `💥 ${currentEnemyTemplate.name} contraataca infligiendo ${enemyDmg} de daño.`;

      if (newHeroHp <= 0) {
        setBattleState('HERO_LOST');
        soundFx.playClick();
        setCombatLog(prev => [
          `💀 Derrota táctica. Mejora tu Defensa y Ataque en el menú de Héroe para volver a intentarlo.`,
          enemyLog,
          ...prev
        ]);
      } else {
        setCombatLog(prev => [enemyLog, ...prev]);
      }

      setIsActing(false);
    }, 700);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-amber-400 font-semibold">
              Pruebas de Combate Táctico
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-display">
            Arena de Batalla de Héroes
          </h1>
          <p className="text-xs text-slate-400">
            Pon a prueba tus habilidades mejoradas contra guardianes cibernéticos y gana recompensas en monedas
          </p>
        </div>

        {/* Enemy Tier Selector */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl">
          {ENEMIES.map((enemy, idx) => (
            <button
              key={enemy.name}
              onClick={() => {
                setSelectedEnemyIdx(idx);
                soundFx.playClick();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                selectedEnemyIdx === idx
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Nv. {enemy.level} · {enemy.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Happy Hour Active Alert in Arena */}
      {hh.active && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/90 via-yellow-950/60 to-slate-950 border border-amber-500/50 shadow-xl shadow-amber-500/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0">
              <Flame className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-amber-300 font-display uppercase tracking-wide">
                  {hh.title || 'Hora Loca de Batalla'}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[10px] font-black uppercase font-mono">
                  {hh.multiplier}x Recompensa
                </span>
              </div>
              <p className="text-[11px] text-amber-200/90 mt-0.5">
                ¡Vence a los gladiadores ahora para recibir hasta <strong>{hh.multiplier}x</strong> monedas por victoria!
              </p>
            </div>
          </div>
          <div className="text-xs font-mono text-amber-300 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-amber-500/40 shrink-0">
            {hh.remainingSeconds >= 900000
              ? 'Multiplicador Activo'
              : `${Math.floor(hh.remainingSeconds / 60)}m ${hh.remainingSeconds % 60}s restantes`}
          </div>
        </div>
      )}

      {/* Battle Stage Arena */}
      <div className="relative rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/80 p-6 shadow-2xl overflow-hidden min-h-[420px] flex flex-col justify-between">
        
        {/* Top: Combatants HUD */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          
          {/* Player Combatant Box */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl overflow-hidden border border-amber-400/80 shrink-0">
                <img
                  src={character.avatarUrl}
                  alt={character.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-100 text-sm truncate">{character.name}</span>
                  <span className="text-xs font-bold text-amber-400 font-mono-numbers">Nv. {character.level}</span>
                </div>
                <div className="text-[11px] text-slate-400">{character.title}</div>
              </div>
            </div>

            {/* Health Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono-numbers">
                <span className="text-slate-400 flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                  Salud (HP)
                </span>
                <span className="text-slate-200 font-bold">{heroHp} / {maxHeroHp}</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-emerald-500 transition-all duration-300"
                  style={{ width: `${Math.max(0, Math.min(100, (heroHp / maxHeroHp) * 100))}%` }}
                />
              </div>
            </div>

            {/* Energy Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono-numbers">
                <span className="text-slate-400 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  Energía Cuántica
                </span>
                <span className="text-slate-200 font-bold">{heroEnergy} / {maxHeroEnergy}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-300"
                  style={{ width: `${Math.max(0, Math.min(100, (heroEnergy / maxHeroEnergy) * 100))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Enemy Combatant Box */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider block">
                  Oponente Hostil
                </span>
                <h3 className="font-bold text-slate-100 text-base">{currentEnemyTemplate.name}</h3>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-amber-400 font-mono-numbers">
                  +{currentEnemyTemplate.rewardCoins} Monedas
                </span>
                <div className="text-[10px] text-slate-400">Recompensa</div>
              </div>
            </div>

            {/* Enemy Health Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono-numbers">
                <span className="text-slate-400 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  Salud Enemiga
                </span>
                <span className="text-slate-200 font-bold">{enemyHp} / {currentEnemyTemplate.maxHp}</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-rose-600 transition-all duration-300"
                  style={{ width: `${Math.max(0, Math.min(100, (enemyHp / currentEnemyTemplate.maxHp) * 100))}%` }}
                />
              </div>
            </div>

            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Poder Ofensivo Enemigo: {currentEnemyTemplate.attack} pts</span>
              <span>Nivel de Desafío: {currentEnemyTemplate.level}</span>
            </div>
          </div>

        </div>

        {/* Center: Action Controls */}
        <div className="py-6 flex flex-col items-center justify-center gap-4 relative z-10">
          {battleState === 'IDLE' && (
            <button
              onClick={startBattle}
              className="px-8 py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-sm rounded-xl shadow-xl shadow-amber-500/20 flex items-center gap-2 transform hover:scale-105 active:scale-95 transition-all"
            >
              <Swords className="w-5 h-5" />
              <span>Comenzar Duelo en la Arena</span>
            </button>
          )}

          {battleState === 'BATTLING' && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => handleHeroAttack('BASIC')}
                disabled={isActing}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 font-bold text-xs rounded-xl shadow flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
              >
                <Swords className="w-4 h-4 text-rose-400" />
                <span>Ataque Rápido (+Energía)</span>
              </button>

              <button
                onClick={() => handleHeroAttack('SPECIAL')}
                disabled={isActing || heroEnergy < 25}
                className={`px-6 py-3 font-bold text-xs rounded-xl shadow flex items-center gap-2 active:scale-95 transition-all ${
                  heroEnergy >= 25 && !isActing
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-cyan-500/20'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>Golpe Cuántico (25 Energía)</span>
              </button>
            </div>
          )}

          {(battleState === 'HERO_WON' || battleState === 'HERO_LOST') && (
            <div className="text-center space-y-3">
              <div
                className={`text-lg font-extrabold ${
                  battleState === 'HERO_WON' ? 'text-amber-400' : 'text-rose-400'
                }`}
              >
                {battleState === 'HERO_WON' ? '¡VICTORIA TRIUNFAL!' : 'COMBATE FINALIZADO'}
              </div>
              <button
                onClick={startBattle}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 mx-auto"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Volver a Luchar</span>
              </button>
            </div>
          )}
        </div>

        {/* Bottom: Combat Log Terminal */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-400 max-h-32 overflow-y-auto space-y-1">
          {combatLog.map((log, i) => (
            <div key={i} className="leading-relaxed">
              <span className="text-slate-600 mr-2">›</span>
              {log}
            </div>
          ))}
        </div>

      </div>

    </div>
  );
};
