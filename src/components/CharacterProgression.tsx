import React from 'react';
import { useGame } from '../context/GameContext';
import { CharacterSkills } from '../types';
import {
  Sword,
  Shield,
  Sparkles,
  Zap,
  BatteryCharging,
  Trophy,
  Coins,
  ArrowUpCircle,
  Swords,
  ChevronRight,
  Award
} from 'lucide-react';
import { soundFx } from '../utils/audio';

export const CharacterProgression: React.FC = () => {
  const {
    character,
    coins,
    upgradeSkill,
    getSkillUpgradeCost,
    setActiveTab,
    setIsStoreOpen,
    setIsLevelModalOpen,
    setIsRedemptionModalOpen
  } = useGame();

  const skillsConfig: {
    key: keyof CharacterSkills;
    name: string;
    description: string;
    gamePerk: string;
    icon: React.ReactNode;
    color: string;
  }[] = [
    {
      key: 'attack',
      name: 'Poder de Ataque',
      description: 'Potencia el daño infligido en la Arena de Batalla.',
      gamePerk: 'Incrementa daño base +15% por nivel.',
      icon: <Sword className="w-5 h-5 text-rose-400" />,
      color: 'from-rose-500/20 to-rose-600/10 border-rose-500/30'
    },
    {
      key: 'defense',
      name: 'Escudo Cuántico',
      description: 'Absorbe impactos enemigos y protege activos.',
      gamePerk: 'Otorga reducción de daño en Arena y reembolsos de cortesía.',
      icon: <Shield className="w-5 h-5 text-blue-400" />,
      color: 'from-blue-500/20 to-blue-600/10 border-blue-500/30'
    },
    {
      key: 'luck',
      name: 'Fortuna Cibernética',
      description: 'Incrementa la probabilidad de críticos y premios.',
      gamePerk: 'Bonifica pagos de Ruleta, Blackjack y Póker con hasta +25% extra.',
      icon: <Sparkles className="w-5 h-5 text-amber-400" />,
      color: 'from-amber-500/20 to-amber-600/10 border-amber-500/30'
    },
    {
      key: 'agility',
      name: 'Agilidad de Reflejos',
      description: 'Velocidad de reacción táctica y evasión.',
      gamePerk: 'Evasión de golpes críticos y primer turno prioritario.',
      icon: <Zap className="w-5 h-5 text-emerald-400" />,
      color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30'
    },
    {
      key: 'energy',
      name: 'Núcleo de Energía',
      description: 'Capacidad de estamina para combos y turnos especiales.',
      gamePerk: 'Desbloquea habilidades definitivas en combates de rango.',
      icon: <BatteryCharging className="w-5 h-5 text-purple-400" />,
      color: 'from-purple-500/20 to-purple-600/10 border-purple-500/30'
    }
  ];

  const totalSkillPoints = Object.values(character.skills).reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Hero Header Card */}
      <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-850 border border-slate-700/80 p-6 sm:p-8 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-8 relative z-10">
          
          {/* Avatar frame */}
          <div className="relative shrink-0">
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl overflow-hidden border-2 border-amber-400/80 shadow-2xl shadow-amber-500/20 bg-slate-950">
              <img
                src={character.avatarUrl}
                alt="Retrato de Héroe Cibernético"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-2 -right-2 px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-extrabold text-xs shadow-lg font-mono-numbers">
              Nv. {character.level}
            </div>
          </div>

          {/* Profile details */}
          <div className="flex-1 text-center md:text-left space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <span className="text-xs uppercase tracking-widest text-amber-400 font-semibold">
                    {character.title}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-xs text-slate-400 font-mono-numbers">
                    {totalSkillPoints} Pts Totales
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-display mt-0.5">
                  {character.name}
                </h1>
              </div>

              {/* Arena CTA */}
              <button
                onClick={() => {
                  setActiveTab('arena');
                  soundFx.playClick();
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs rounded-xl shadow-lg transition-transform active:scale-95"
              >
                <Swords className="w-4 h-4" />
                <span>Entrar a la Arena de Batalla</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Mejora las 5 habilidades tácticas de tu héroe utilizando tus Monedas Aether. Cada nivel amplifica tu rendimiento en combates y activa bonificadores de fortuna en la mesa de Ruleta, Blackjack y Póker.
            </p>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Victorias en Arena</div>
                <div className="text-base font-bold text-slate-100 font-mono-numbers mt-0.5">
                  {character.victories}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Manos & Giros Jugados</div>
                <div className="text-base font-bold text-slate-100 font-mono-numbers mt-0.5">
                  {character.totalBets}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Monedas Ganadas</div>
                <div className="text-base font-bold text-amber-400 font-mono-numbers mt-0.5">
                  {character.totalWon.toLocaleString()}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Saldo Disponible</div>
                <div className="text-base font-bold text-emerald-400 font-mono-numbers mt-0.5 flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  {coins.toLocaleString()}
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Level 100 Ascension & Cashout CTA Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Level 11-100 Progression Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/50 via-slate-900 to-slate-950 border border-amber-500/40 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-extrabold text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Ascensión de Niveles 11 a 100
              </span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300">
                Nivel Actual: {character.level}/100
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-100">
              Desbloquea Poder Cósmico Más Allá del Nivel 10
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Ascendiendo con tus ganancias: <strong className="text-amber-300">$50 USD (60 monedas)</strong> para niveles 11–50, o <strong className="text-amber-300">$100 USD (120 monedas)</strong> para niveles 51–100. Desbloquea títulos legendarios y multiplicadores.
            </p>
          </div>
          <button
            onClick={() => {
              setIsLevelModalOpen(true);
              soundFx.playClick();
            }}
            className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ascender al Nivel {character.level + 1} ($50 / $100 USD)</span>
          </button>
        </div>

        {/* Redemption / Cashout Request Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/40 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-extrabold text-emerald-400 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-emerald-400" />
                Canjear Monedas por Dinero Real
              </span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                20% Fee Bóveda
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-100">
              Solicitud de Retiro a Cripto USDT o Banco
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Convierte tus monedas ganadas en USD reales ($0.80/moneda). Se deduce automáticamente un <strong className="text-amber-300">20% de comisión para la Bóveda del Dueño</strong>, y el 80% restante es transferido previa autorización exclusiva del administrador.
            </p>
          </div>
          <button
            onClick={() => {
              setIsRedemptionModalOpen(true);
              soundFx.playClick();
            }}
            className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Solicitar Canje de Monedas</span>
          </button>
        </div>

      </div>

      {/* Skills Upgrade Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-slate-100 font-display">
              Mejora Progresiva de Habilidades
            </h2>
            <p className="text-xs text-slate-400">
              Invierte monedas para potenciar atributos y desbloquear multiplicadores VIP
            </p>
          </div>

          <button
            onClick={() => {
              setIsStoreOpen(true);
              soundFx.playClick();
            }}
            className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-semibold self-start"
          >
            <Coins className="w-4 h-4" />
            <span>Comprar más Monedas en la Tienda</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 5 Skills Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skillsConfig.map(s => {
            const currentLevel = character.skills[s.key];
            const cost = getSkillUpgradeCost(s.key);
            const canAfford = coins >= cost;

            return (
              <div
                key={s.key}
                className={`p-5 rounded-2xl bg-gradient-to-b ${s.color} bg-slate-900 border transition-all hover:border-slate-600 flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                      {s.icon}
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Nivel Actual
                      </span>
                      <div className="text-xl font-extrabold text-slate-100 font-mono-numbers">
                        Lv. {currentLevel}
                      </div>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-100 mt-3 font-display">
                    {s.name}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    {s.description}
                  </p>

                  <div className="mt-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-amber-300/90 leading-tight">
                    <span className="font-semibold text-amber-400">Efecto: </span>
                    {s.gamePerk}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-[10px] text-slate-400 uppercase block">Costo de Mejora</span>
                    <span className="font-bold text-amber-400 font-mono-numbers flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5" />
                      {cost} Monedas
                    </span>
                  </div>

                  <button
                    onClick={() => upgradeSkill(s.key)}
                    disabled={!canAfford}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 ${
                      canAfford
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <ArrowUpCircle className="w-4 h-4" />
                    <span>Mejorar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
