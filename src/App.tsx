/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { Header } from './components/Header';
import { PushNotificationToast } from './components/PushNotificationToast';
import { StoreModal } from './components/StoreModal';
import { BiometricModal } from './components/BiometricModal';
import { ProvablyFairModal } from './components/ProvablyFairModal';
import { TransactionHistoryModal } from './components/TransactionHistoryModal';
import { CharacterProgression } from './components/CharacterProgression';
import { ArenaBattle } from './components/ArenaBattle';
import { RouletteGame } from './components/RouletteGame';
import { BlackjackGame } from './components/BlackjackGame';
import { PokerGame } from './components/PokerGame';
import { AdminPanel } from './components/AdminPanel';
import { AuthModal } from './components/AuthModal';
import { LiveWinningTicker } from './components/LiveWinningTicker';
import { RedemptionModal } from './components/RedemptionModal';
import { Level100ProgressionModal } from './components/Level100ProgressionModal';
import { DailyBonusModal } from './components/DailyBonusModal';
import { LeaderboardTournamentModal } from './components/LeaderboardTournamentModal';
import { ReferralModal } from './components/ReferralModal';
import { MultiplayerChatWidget } from './components/MultiplayerChatWidget';
import { PaymentPlatformsGuide } from './components/PaymentPlatformsGuide';
import { Top50CasinoHub } from './components/Top50CasinoHub';
import { FloatingShortcutsDock } from './components/FloatingShortcutsDock';
import { UserSupportPanel } from './components/UserSupportPanel';
import { COIN_TIERS } from './data/coinTiers';
import {
  Coins,
  ShieldCheck,
  Fingerprint,
  Lock,
  Sparkles,
  ArrowRight,
  Zap,
  Swords,
  ChevronRight,
  CheckCircle2,
  Trophy,
  Gift,
  Share2,
  Landmark,
  MessageSquare
} from 'lucide-react';
import { soundFx } from './utils/audio';

const StoreHeroHome: React.FC = () => {
  const {
    setActiveTab,
    setIsStoreOpen,
    setSelectedStoreTier,
    character,
    coins,
    isOwner,
    setIsDailyBonusModalOpen,
    setIsLeaderboardModalOpen,
    setIsReferralModalOpen,
    setIsChatWidgetOpen
  } = useGame();

  return (
    <div className="space-y-12 pb-16">
      
      {/* Hero Showcase Split */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[480px]">
          
          {/* Left Text Zone */}
          <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-between z-10 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold tracking-wider uppercase">
                <Coins className="w-4 h-4" />
                <span>Gestión de Activos Digitales & Casino Provably-Fair</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-100 font-display leading-[1.15] text-balance">
                Adquiere Monedas Aether y Domina el Casino con Cifrado E2EE
              </h1>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
                Plataforma de alta seguridad con tienda de 10 niveles de monedas, mejoras progresivas para tu héroe, pasarela de pagos internacional con confirmación biométrica y juegos de Ruleta, Blackjack y Póker inmutables.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={() => {
                  setSelectedStoreTier(null);
                  setIsStoreOpen(true);
                  soundFx.playClick();
                }}
                className="px-6 py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-sm rounded-xl shadow-xl shadow-amber-500/20 flex items-center gap-2 transition-transform active:scale-95"
              >
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>Explorar Tienda de 10 Niveles</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  setActiveTab('character');
                  soundFx.playClick();
                }}
                className="px-6 py-3.5 bg-slate-800/90 hover:bg-slate-750 border border-slate-700 text-slate-200 font-bold text-sm rounded-xl transition-colors flex items-center gap-2"
              >
                <Swords className="w-4 h-4 text-rose-400" />
                <span>Mejorar Héroe ({character.name})</span>
              </button>
            </div>

            {/* Trust Badges */}
            <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-6 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Fingerprint className="w-4 h-4 text-cyan-400" />
                Biometría Touch/Face ID
              </span>
              <span className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-emerald-400" />
                Cifrado E2EE SHA-256
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
                Push al Instante
              </span>
            </div>
          </div>

          {/* Right Image Zone */}
          <div className="lg:col-span-5 relative min-h-[300px] lg:min-h-full">
            <img
              src="/src/assets/images/hero_casino_vault_1793650646325.jpg"
              alt="Bóveda de Activos Digitales y Casino AetherVault"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-slate-900 via-transparent to-transparent pointer-events-none" />
          </div>

        </div>
      </section>

      {/* Owner Access Banner (Only visible for trabajofino52@gmail.com) */}
      {isOwner && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-950 border border-amber-500/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0">
              👑
            </div>
            <div>
              <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Bóveda del Dueño (trabajofino52@gmail.com)</span>
                <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                  Acceso Exclusivo
                </span>
              </div>
              <div className="text-xs text-slate-400">
                Configura tus billeteras USDT y cuentas bancarias receptoras, administra ganancias y retira tus fondos netos.
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setActiveTab('admin');
              soundFx.playClick();
            }}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow transition-transform active:scale-95 whitespace-nowrap self-stretch sm:self-auto text-center"
          >
            Abrir Bóveda del Dueño
          </button>
        </div>
      )}

      {/* Interactive Hub for All Integrated Suggestions */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Rueda Diaria & Misiones */}
        <div
          onClick={() => {
            setIsDailyBonusModalOpen(true);
            soundFx.playClick();
          }}
          className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/40 hover:border-amber-400 cursor-pointer shadow-lg hover:shadow-amber-500/10 transition-all group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <Gift className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Giro Gratis 24h
            </span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
              Rueda Diaria & Misiones
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Gira la rueda gratis para ganar hasta 500 monedas y cumple misiones diarias.
            </p>
          </div>
          <div className="text-[11px] text-amber-400 font-bold flex items-center gap-1 pt-1">
            <span>Girar Fortuna</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Card 2: Ranking Global & Torneo Semanal */}
        <div
          onClick={() => {
            setIsLeaderboardModalOpen(true);
            soundFx.playClick();
          }}
          className="p-5 rounded-2xl bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-950 border border-blue-500/40 hover:border-blue-400 cursor-pointer shadow-lg hover:shadow-blue-500/10 transition-all group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <Trophy className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono">
              Pozo 30% Wagers
            </span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 group-hover:text-blue-300 transition-colors">
              Ranking Top 100 & Torneo
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Compite en niveles del 1 al 100 con pozo acumulado en tiempo real.
            </p>
          </div>
          <div className="text-[11px] text-blue-400 font-bold flex items-center gap-1 pt-1">
            <span>Ver Clasificación</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Card 3: Programa de Afiliados */}
        <div
          onClick={() => {
            setIsReferralModalOpen(true);
            soundFx.playClick();
          }}
          className="p-5 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-slate-900 to-slate-950 border border-cyan-500/40 hover:border-cyan-400 cursor-pointer shadow-lg hover:shadow-cyan-500/10 transition-all group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
              <Share2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              5% Vitalicio
            </span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
              Afiliados & Códigos VIP
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Invita amigos con tu enlace personal y canjea cupones de bono instantáneos.
            </p>
          </div>
          <div className="text-[11px] text-cyan-400 font-bold flex items-center gap-1 pt-1">
            <span>Copiar Enlace & Cupones</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Card 4: Top 10 Pasarelas & Neobanco BaaS */}
        <div
          onClick={() => {
            setActiveTab('payment_platforms');
            soundFx.playClick();
          }}
          className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 border border-indigo-500/40 hover:border-indigo-400 cursor-pointer shadow-lg hover:shadow-indigo-500/10 transition-all group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
              <Landmark className="w-5 h-5" />
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              isOwner 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-mono' 
                : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 font-mono'
            }`}>
              {isOwner ? '10+ Pasarelas BaaS' : 'Fase Privada · Dueño'}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
              Hub Neobanco & Pasarelas
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {isOwner 
                ? 'Top 10+ plataformas BaaS (Swan, Unit, dLocal, NOWPayments) para crear tu banco digital.'
                : 'Módulo exclusivo para trabajofino52@gmail.com con clave SHA-256. Próximamente para usuarios.'}
            </p>
          </div>
          <div className="text-[11px] text-indigo-400 font-bold flex items-center gap-1 pt-1">
            <span>{isOwner ? 'Abrir Módulo de Neobanco' : 'Ver Estado & Roadmap'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

      </section>

      {/* 10 Tiers Showcase Grid */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest text-amber-400 font-semibold">
                Paquetes de 10 hasta 10,000 Monedas (Nivel 7: 1,000 Monedas por $800 USD)
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-display">
              Catálogo de Monedas de 10 Niveles
            </h2>
            <p className="text-xs text-slate-400">
              Recarga desde 10 hasta 10,000 monedas con liquidación instantánea y bonificaciones VIP
            </p>
          </div>

          <div className="text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 self-start">
            Saldo actual: <span className="font-bold text-amber-400 font-mono-numbers">{coins.toLocaleString()} monedas</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {COIN_TIERS.map(tier => (
            <div
              key={tier.level}
              className={`p-4 rounded-2xl bg-slate-900 border transition-all flex flex-col justify-between ${
                tier.popular
                  ? 'border-amber-400/80 shadow-xl shadow-amber-500/10 ring-1 ring-amber-400/40'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold font-mono-numbers px-2 py-0.5 rounded bg-slate-950 text-amber-400 border border-slate-800">
                    {tier.badge}
                  </span>
                  {tier.bonusPercent > 0 && (
                    <span className="text-[11px] font-semibold text-emerald-400 font-mono-numbers">
                      +{tier.bonusPercent}%
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-slate-100 text-sm font-display truncate">
                  {tier.name}
                </h3>

                <div className="my-3 flex items-baseline gap-1">
                  <Coins className="w-4 h-4 text-amber-400 shrink-0 self-center" />
                  <span className="text-2xl font-black text-amber-300 font-mono-numbers">
                    {tier.coins.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400">monedas</span>
                </div>

                <div className="text-base font-bold text-slate-100 font-mono-numbers">
                  ${tier.priceUSD} USD
                </div>
                <div className="text-[11px] text-slate-400 font-mono-numbers mt-0.5">
                  ${(tier.priceUSD / tier.coins).toFixed(2)} por moneda
                </div>

                <ul className="mt-3 space-y-1 text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
                  {tier.features.slice(0, 2).map((f, i) => (
                    <li key={i} className="flex items-center gap-1.5 truncate">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => {
                  setSelectedStoreTier(tier);
                  setIsStoreOpen(true);
                  soundFx.playClick();
                }}
                className={`mt-4 w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  tier.popular
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-800 hover:bg-slate-750 text-slate-200'
                }`}
              >
                <span>Comprar</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Casino Games Suite Preview Strip */}
      <section className="space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-emerald-400 font-semibold">
              Suite de Casino Cifrada
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-display">
            Juegos de Casino con Extremo a Extremo
          </h2>
          <p className="text-xs text-slate-400">
            Juega con tus monedas de forma justa, verificando cada tirada mediante la cadena criptográfica SHA-256
          </p>
        </div>

        {/* Banner: Top 50 Casino Hub */}
        <div
          onClick={() => {
            setActiveTab('top_50_casino');
            soundFx.playClick();
          }}
          className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-indigo-950/80 via-purple-950/50 to-slate-900 border border-indigo-500/50 hover:border-amber-400 cursor-pointer shadow-2xl transition-all group relative overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-purple-600 to-indigo-600 flex items-center justify-center text-3xl shadow-xl group-hover:scale-105 transition-transform shrink-0">
                🎰
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                    Catálogo Completo · 50 Títulos
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    RTP hasta 99.5%
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-100 group-hover:text-amber-300 transition-colors font-display">
                  Los 50 Mejores Juegos de Casino Online del Mundo
                </h3>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Gates of Olympus, Sweet Bonanza, Aviator, Starburst, Book of Dead, Lightning Roulette, Baccarat y más. Con simuladores interactivos, búsqueda y filtro de proveedores.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 px-4 py-2.5 rounded-xl bg-amber-500 group-hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg transition-transform active:scale-95">
              <span>Explorar los 50 Juegos</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Roulette */}
          <div
            onClick={() => {
              setActiveTab('roulette');
              soundFx.playClick();
            }}
            className="group cursor-pointer rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/60 overflow-hidden shadow-xl transition-all hover:-translate-y-1"
          >
            <div className="h-44 overflow-hidden relative">
              <img
                src="/src/assets/images/roulette_wheel_bg_1793650647052.jpg"
                alt="Ruleta Europea"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[10px] text-amber-400 font-bold uppercase">
                Pago hasta 35:1
              </div>
            </div>
            <div className="p-5 space-y-2">
              <h3 className="text-lg font-bold text-slate-100 font-display group-hover:text-amber-400 transition-colors">
                Ruleta Europea Real
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Rueda física sobre canvas, apuestas Pleno, Rojo/Negro, Docenas y cálculo probabilístico en tiempo real.
              </p>
              <div className="pt-2 flex items-center justify-between text-xs text-amber-400 font-semibold">
                <span>Jugar Ruleta</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* Card 2: Blackjack */}
          <div
            onClick={() => {
              setActiveTab('blackjack');
              soundFx.playClick();
            }}
            className="group cursor-pointer rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/60 overflow-hidden shadow-xl transition-all hover:-translate-y-1"
          >
            <div className="h-44 overflow-hidden relative bg-emerald-950/60 flex items-center justify-center">
              <div className="w-full h-full bg-gradient-to-tr from-emerald-950 to-slate-900 flex items-center justify-center">
                <span className="text-4xl font-extrabold text-emerald-400 font-display">
                  BLACKJACK 21
                </span>
              </div>
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[10px] text-emerald-400 font-bold uppercase">
                Pago 3:2 Natural
              </div>
            </div>
            <div className="p-5 space-y-2">
              <h3 className="text-lg font-bold text-slate-100 font-display group-hover:text-emerald-400 transition-colors">
                Blackjack 21 Las Vegas
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Mesa VIP frente al crupier de la bóveda. Acciones de pedir carta, plantarse y doblar apuesta con seguro.
              </p>
              <div className="pt-2 flex items-center justify-between text-xs text-emerald-400 font-semibold">
                <span>Jugar Blackjack</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* Card 3: Poker */}
          <div
            onClick={() => {
              setActiveTab('poker');
              soundFx.playClick();
            }}
            className="group cursor-pointer rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/60 overflow-hidden shadow-xl transition-all hover:-translate-y-1"
          >
            <div className="h-44 overflow-hidden relative">
              <img
                src="/src/assets/images/poker_cards_chips_1793650647589.jpg"
                alt="Póker Video"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[10px] text-cyan-400 font-bold uppercase">
                Multiplicador 800x
              </div>
            </div>
            <div className="p-5 space-y-2">
              <h3 className="text-lg font-bold text-slate-100 font-display group-hover:text-cyan-400 transition-colors">
                Póker 5-Card Draw
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Elige qué cartas retener y cambia para armar Escaleras Reales, Full House o Tríos con bonificación de Suerte.
              </p>
              <div className="pt-2 flex items-center justify-between text-xs text-cyan-400 font-semibold">
                <span>Jugar Póker</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
};

const MainContent: React.FC = () => {
  const { activeTab, isOwner, userEmail, setIsAuthModalOpen } = useGame();

  switch (activeTab) {
    case 'store':
      return <StoreHeroHome />;
    case 'top_50_casino':
      return <Top50CasinoHub />;
    case 'character':
      return <CharacterProgression />;
    case 'arena':
      return <ArenaBattle />;
    case 'roulette':
      return <RouletteGame />;
    case 'blackjack':
      return <BlackjackGame />;
    case 'poker':
      return <PokerGame />;
    case 'payment_platforms':
      if (isOwner) {
        return <PaymentPlatformsGuide />;
      }
      return (
        <div className="max-w-xl mx-auto my-14 p-8 sm:p-10 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-indigo-400 text-3xl shadow-lg">
            🏛️
          </div>
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold uppercase tracking-wider font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Fase Privada · Exclusivo Propietario
            </span>
            <h2 className="text-2xl font-black text-slate-100 font-display">
              Arquitectura de Banco Digital & Neobanco
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
              La suite de pasarelas de pago y Banking-as-a-Service (BaaS) está reservada de forma estricta para el propietario registrado (<strong className="text-amber-400 font-mono">trabajofino52@gmail.com</strong>) protegido por clave maestra de 256 bits (<span className="font-mono text-cyan-400 text-[11px]">SHA-256</span>).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-left text-xs space-y-2.5">
            <div className="text-cyan-400 font-bold flex items-center gap-1.5">
              <span>⏳ Roadmap para Jugadores Estándar:</span>
            </div>
            <p className="text-[12px] text-slate-400 leading-relaxed">
              Actualmente los usuarios normales no tienen acceso al panel bancario ni a la emisión de cuentas. En fases futuras del roadmap del proyecto, cada jugador podrá solicitar su propia tarjeta prepaga vinculada a su saldo de monedas Aether.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 font-mono border-t border-slate-800/80 gap-1">
              <span>Sesión actual: <span className="text-slate-300">{userEmail}</span></span>
              <span className="text-emerald-400/90 font-semibold">Cifrado SHA-256 Activo</span>
            </div>
          </div>

          <button
            onClick={() => {
              setIsAuthModalOpen(true);
              soundFx.playClick();
            }}
            className="w-full py-3.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-transform active:scale-95"
          >
            Autenticar como Propietario (trabajofino52@gmail.com)
          </button>
        </div>
      );
    case 'admin':
      if (isOwner) {
        return <AdminPanel />;
      }
      return (
        <div className="max-w-md mx-auto my-16 p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 mx-auto rounded-full bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-400 text-2xl shadow-lg">
            🔒
          </div>
          <h2 className="text-xl font-bold text-slate-100 font-display">
            Acceso Exclusivo: Bóveda del Dueño
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Esta sección administrativa de recaudación y retiros únicamente es visible para el propietario registrado con el correo <strong className="text-amber-400 font-mono">trabajofino52@gmail.com</strong>.
          </p>
          <div className="text-[11px] text-slate-500 font-mono">
            Sesión actual: {userEmail}
          </div>
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-transform active:scale-95"
          >
            Iniciar Sesión con trabajofino52@gmail.com
          </button>
        </div>
      );
    default:
      return <StoreHeroHome />;
  }
};

const GlobalModalsContainer: React.FC = () => {
  const {
    isRedemptionModalOpen,
    setIsRedemptionModalOpen,
    isLevelModalOpen,
    setIsLevelModalOpen
  } = useGame();

  return (
    <>
      <StoreModal />
      <BiometricModal />
      <ProvablyFairModal />
      <TransactionHistoryModal />
      <AuthModal />
      <RedemptionModal
        isOpen={isRedemptionModalOpen}
        onClose={() => setIsRedemptionModalOpen(false)}
      />
      <Level100ProgressionModal
        isOpen={isLevelModalOpen}
        onClose={() => setIsLevelModalOpen(false)}
      />
      <DailyBonusModal />
      <LeaderboardTournamentModal />
      <ReferralModal />
      <MultiplayerChatWidget />
      <UserSupportPanel />
    </>
  );
};

const DemoAccountTopBanner: React.FC = () => {
  const { isDemoAccount, resetDemoFunds, coins, setActiveTab } = useGame();
  if (!isDemoAccount) return null;

  return (
    <div className="bg-gradient-to-r from-purple-950/90 via-slate-900 to-indigo-950/90 border-b border-purple-500/40 px-4 py-2 text-xs">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-bold uppercase tracking-wider font-mono flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
            🎮 Cuenta Demo Aislada (gokudemo)
          </span>
          <span className="text-slate-300">
            Saldo de pruebas: <strong className="text-amber-300 font-mono-numbers">{coins.toLocaleString()} monedas</strong> (${(coins * 0.8).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD). Aislada de las cuentas reales (las cuentas reales se activan tras confirmación de depósito).
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={resetDemoFunds}
            className="px-3 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white font-bold text-xs shadow active:scale-95 transition-all"
          >
            🔄 Recargar $5,000 USD Demo
          </button>
          <button
            onClick={() => setActiveTab('top_50_casino')}
            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition-colors"
          >
            🎰 Top 50 Casino
          </button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <GameProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
        
        {/* Floating Real-Time Push Notification Toast */}
        <PushNotificationToast />

        {/* 3-Zone Top Bar */}
        <Header />

        {/* Real-Time Live Winning Marquee Ticker */}
        <LiveWinningTicker />

        {/* Demo Account Indicator Banner */}
        <DemoAccountTopBanner />

        {/* Main View Area */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
          <MainContent />
        </main>

        {/* Global Modals */}
        <GlobalModalsContainer />

        {/* Floating Quick Action Dock */}
        <FloatingShortcutsDock />

        {/* Clean Editorial Footer (§1.B) */}
        <footer className="border-t border-slate-800/80 py-8 bg-slate-950/90 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-300 font-display">AETHERVAULT</span>
              <span>·</span>
              <span>Gestión de Monedas & Casino Provably-Fair</span>
              <span>·</span>
              <span>Cifrado E2EE 256-Bit</span>
            </div>

            <div className="flex items-center gap-4 text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Semillas SHA-256 Verificadas
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Fingerprint className="w-3.5 h-3.5 text-cyan-400" />
                WebAuthn Passkey
              </span>
            </div>
          </div>
        </footer>

      </div>
    </GameProvider>
  );
}
