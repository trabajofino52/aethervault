/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GameProvider, OWNER_EMAIL, useGame } from './context/GameContext';
import { logVmExperience } from './utils/telemetry';
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
import { GreyhoundRaceGame } from './components/GreyhoundRaceGame';
import { HorseRaceGame } from './components/HorseRaceGame';
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
import { PlayerTransferExchangeModal } from './components/PlayerTransferExchangeModal';
import { COIN_TIERS } from './data/coinTiers';
import {
  Coins,
  ShieldCheck,
  Fingerprint,
  Lock,
  ArrowRight,
  Zap,
  Swords,
  ChevronRight,
  CheckCircle2,
  Trophy,
  Gift,
  Share2,
  Landmark,
  ArrowLeftRight,
  Mail,
  Eye,
  EyeOff,
  User,
  UserPlus,
  LogIn,
  AlertTriangle,
  Wallet,
  CreditCard,
  Database
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
    playerVisibility,
    setIsDailyBonusModalOpen,
    setIsLeaderboardModalOpen,
    setIsReferralModalOpen,
    setIsTransferModalOpen
  } = useGame();

  const showHeroTab = isOwner || playerVisibility.showCharacterHero;
  const showNeobank = isOwner || playerVisibility.showNeobankCard;
  const showCatalog = isOwner || playerVisibility.showStoreCatalog;
  const showTop50 = false;
  return (
    <div className="space-y-12 pb-16">
      
      {/* Hero Showcase Split */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[460px]">
          
          {/* Left Text Zone */}
          <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-between z-10 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold tracking-wider uppercase">
                <Coins className="w-4 h-4" />
                <span>Casino Provably-Fair · Mesas & Carreras en Vivo</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-100 font-display leading-[1.15] text-balance">
                Adquiere Monedas Aether y Juega en Nuestras 5 Salas Oficiales
              </h1>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
                Ruleta Europea, Blackjack 21, Póker Video, Carrera de Perros (10 Galgos) y Carrera de Caballos (10 Purasangres) con pagos transparentes, transferencias P2P y cambio USDT/PayPal.
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
                className="min-h-[44px] px-6 py-3 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-sm rounded-xl shadow-xl shadow-amber-500/20 flex items-center gap-2 transition-transform active:scale-95"
              >
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>Recargar Monedas</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {showHeroTab && (
                <button
                  onClick={() => {
                    setActiveTab('character');
                    soundFx.playClick();
                  }}
                  className="min-h-[44px] px-6 py-3 bg-slate-800/90 hover:bg-slate-750 border border-slate-700 text-slate-200 font-bold text-sm rounded-xl transition-colors flex items-center gap-2"
                >
                  <Swords className="w-4 h-4 text-rose-400" />
                  <span>Mejorar Héroe ({character.name})</span>
                </button>
              )}
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
        
        {/* Card 1: 🎰 Rueda 24h */}
        <div
          onClick={() => {
            setIsDailyBonusModalOpen(true);
            soundFx.playClick();
          }}
          className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/40 hover:border-amber-400 cursor-pointer shadow-lg hover:shadow-amber-500/10 transition-all group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-lg group-hover:scale-110 transition-transform">
              🎰
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Rueda 24h
            </span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
              🎰 Rueda 24h & Misiones
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Gira la rueda gratis cada 24h para ganar hasta 500 monedas y cumple misiones diarias.
            </p>
          </div>
          <div className="text-[11px] text-amber-400 font-bold flex items-center gap-1 pt-1">
            <span>Girar Fortuna</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Card 2: Torneo 30% */}
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
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono">
              Torneo 30%
            </span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 group-hover:text-blue-300 transition-colors">
              Ranking Top 100 & Torneo 30%
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

        {/* Card 3: Afiliados 5% */}
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
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
              Afiliados 5%
            </span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
              Afiliados 5% & Cupones
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

        {/* Card 4: Hub Neobanco (Admin/Gated) OR Transferir / Cambio (Always Visible) */}
        {showNeobank ? (
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
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-mono">
                10+ Pasarelas BaaS
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                Hub Neobanco & Pasarelas
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Plataformas BaaS (Swan, Unit, dLocal, NOWPayments) para gestionar tu infraestructura financiera.
              </p>
            </div>
            <div className="text-[11px] text-indigo-400 font-bold flex items-center gap-1 pt-1">
              <span>Abrir Módulo de Neobanco</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        ) : (
          <div
            onClick={() => {
              setIsTransferModalOpen(true);
              soundFx.playClick();
            }}
            className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/40 hover:border-emerald-400 cursor-pointer shadow-lg hover:shadow-emerald-500/10 transition-all group space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                PayPal / USDT
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
                Transferir / Cambio
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Envía monedas a otros jugadores, convierte saldo y solicita retiros a PayPal o USDT.
              </p>
            </div>
            <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 pt-1">
              <span>Abrir Transferencias & Cambio</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        )}

      </section>

      {/* 10 Tiers Showcase Grid (Shown only when Admin enables it or Owner) */}
      {showCatalog && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs uppercase tracking-widest text-amber-400 font-semibold">
                Paquetes de 10 hasta 10,000 Monedas (Nivel 7: 1,000 Monedas por $800 USD)
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-display">
                Catálogo de Monedas de 10 Niveles
              </h2>
              <p className="text-xs text-slate-400">
                Recarga desde 10 hasta 10,000 monedas con liquidación instantánea y bonificaciones VIP
              </p>
            </div>

            <div className="text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 self-start font-mono tabular-nums">
              Saldo actual: <span className="font-bold text-amber-400">{coins.toLocaleString()} monedas</span>
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
                    <span className="text-[11px] font-bold font-mono tabular-nums px-2 py-0.5 rounded bg-slate-950 text-amber-400 border border-slate-800">
                      {tier.badge}
                    </span>
                    {tier.bonusPercent > 0 && (
                      <span className="text-[11px] font-semibold text-emerald-400 font-mono tabular-nums">
                        +{tier.bonusPercent}%
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-100 text-sm font-display truncate">
                    {tier.name}
                  </h3>

                  <div className="my-3 flex items-baseline gap-1">
                    <Coins className="w-4 h-4 text-amber-400 shrink-0 self-center" />
                    <span className="text-2xl font-black text-amber-300 font-mono tabular-nums">
                      {tier.coins.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-400">monedas</span>
                  </div>

                  <div className="text-base font-bold text-slate-100 font-mono tabular-nums">
                    ${tier.priceUSD} USD
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono tabular-nums mt-0.5">
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
                  className={`mt-4 w-full min-h-[40px] py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
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
      )}

      {/* Casino Games Suite Preview Strip: 5 Visible Games Only */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <span className="text-xs uppercase tracking-widest text-emerald-400 font-semibold">
              Salas Oficiales de Casino & Carreras
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-display">
              5 Juegos Disponibles en Vivo
            </h2>
            <p className="text-xs text-slate-400">
              Ruleta Europea, Blackjack 21, Póker Video, Carrera de Perros (10 Galgos) y Carrera de Caballos (10 Purasangres).
            </p>
          </div>
          <div className="text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 font-mono tabular-nums self-start">
            Saldo: <span className="font-bold text-amber-400">{coins.toLocaleString()} mo</span>
          </div>
        </div>

        {/* Banner: Top 50 Casino Hub (Hidden from players unless Owner or explicitly enabled by Admin) */}
        {showTop50 && (
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
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                      {isOwner ? 'Catálogo Completo · Incluye 10 Juegos Exclusivos Admin' : 'Juegos Adicionales Habilitados por Admin'}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      RTP hasta 99.5%
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-100 group-hover:text-amber-300 transition-colors font-display">
                    {isOwner ? 'Panel Top 50 + 10 Juegos Exclusivos del Administrador' : 'Catálogo Extendido de Casino'}
                  </h3>
                  <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                    Slots, Crash, Minas, Dados y Mesas en vivo con verificación SHA-256.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 px-4 py-2.5 rounded-xl bg-amber-500 group-hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg transition-transform active:scale-95">
                <span>Abrir Catálogo</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        )}

        {/* 5 Core Visible Casino Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Roulette */}
          <div
            onClick={() => {
              setActiveTab('roulette');
              soundFx.playClick();
            }}
            className="group cursor-pointer rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/60 overflow-hidden shadow-xl transition-all hover:-translate-y-1"
          >
            <div className="h-44 overflow-hidden relative bg-slate-950">
              <img
                src="/src/assets/images/roulette_wheel_bg_1793650647052.jpg"
                alt="Ruleta Europea"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-slate-950/85 border border-slate-800 text-[10px] text-amber-400 font-bold uppercase font-mono">
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
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-slate-950/85 border border-slate-800 text-[10px] text-emerald-400 font-bold uppercase font-mono">
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
            <div className="h-44 overflow-hidden relative bg-slate-950">
              <img
                src="/src/assets/images/poker_cards_chips_1793650647589.jpg"
                alt="Póker Video"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-slate-950/85 border border-slate-800 text-[10px] text-cyan-400 font-bold uppercase font-mono">
                Multiplicador 800x
              </div>
            </div>
            <div className="p-5 space-y-2">
              <h3 className="text-lg font-bold text-slate-100 font-display group-hover:text-cyan-400 transition-colors">
                Póker Video 5-Card Draw
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

          {/* Card 4: Carrera de Perros (10 Galgos) */}
          <div
            onClick={() => {
              setActiveTab('greyhound_racing');
              soundFx.playClick();
            }}
            className="group cursor-pointer rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/60 overflow-hidden shadow-xl transition-all hover:-translate-y-1"
          >
            <div className="h-44 overflow-hidden relative bg-amber-950/40">
              <img
                src="/src/assets/images/greyhound_racing_banner_1795576242836.jpg"
                alt="Carrera de Perros"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-slate-950/85 border border-slate-800 text-[10px] text-amber-400 font-bold uppercase font-mono">
                10 Galgos · Hasta 18.0x
              </div>
            </div>
            <div className="p-5 space-y-2">
              <h3 className="text-lg font-bold text-slate-100 font-display group-hover:text-amber-400 transition-colors">
                Carrera de Perros (10 Galgos)
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Apuesta al Ganador (1°) o Podio (Top 3) entre 10 galgos numerados con pista nocturna animada en vivo.
              </p>
              <div className="pt-2 flex items-center justify-between text-xs text-amber-400 font-semibold">
                <span>Apostar en Galgos</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* Card 5: Carrera de Caballos (10 Purasangres) */}
          <div
            onClick={() => {
              setActiveTab('horse_racing');
              soundFx.playClick();
            }}
            className="group cursor-pointer rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/60 overflow-hidden shadow-xl transition-all hover:-translate-y-1"
          >
            <div className="h-44 overflow-hidden relative bg-emerald-950/40">
              <img
                src="/src/assets/images/horse_racing_banner_1795576242629.jpg"
                alt="Carrera de Caballos"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-slate-950/85 border border-slate-800 text-[10px] text-emerald-400 font-bold uppercase font-mono">
                10 Caballos · Hasta 20.0x
              </div>
            </div>
            <div className="p-5 space-y-2">
              <h3 className="text-lg font-bold text-slate-100 font-display group-hover:text-emerald-400 transition-colors">
                Carrera de Caballos (10 Purasangres)
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Hipódromo clásico de 10 purasangres sobre césped. Combina boletos a Ganador o Podio con foto-finish oficial.
              </p>
              <div className="pt-2 flex items-center justify-between text-xs text-emerald-400 font-semibold">
                <span>Apostar en Hipódromo</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

const RestrictedPlayerModuleFallback: React.FC<{ title: string }> = ({ title }) => {
  const { setActiveTab } = useGame();
  return (
    <div className="max-w-xl mx-auto my-14 p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-5 shadow-2xl">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-950 border border-slate-700 flex items-center justify-center text-amber-400 text-2xl">
        🔒
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-slate-100 font-display">{title}</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Esta sección adicional se encuentra oculta por configuración del Administrador. Puedes jugar libremente en nuestras 5 salas activas:
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {[
          { id: 'roulette' as const, label: 'Ruleta Europea' },
          { id: 'blackjack' as const, label: 'Blackjack 21' },
          { id: 'poker' as const, label: 'Póker Video' },
          { id: 'greyhound_racing' as const, label: 'Carrera de Perros' },
          { id: 'horse_racing' as const, label: 'Carrera de Caballos' }
        ].map(btn => (
          <button
            key={btn.id}
            onClick={() => {
              setActiveTab(btn.id);
              soundFx.playClick();
            }}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-xs font-bold transition-colors"
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
};

const MainContent: React.FC = () => {
  const { activeTab, isOwner, playerVisibility, userEmail, setIsAuthModalOpen } = useGame();

  switch (activeTab) {
    case 'store':
      return <StoreHeroHome />;
    case 'top_50_casino':
      return isOwner || playerVisibility.showTop50Casino ? (
        <Top50CasinoHub />
      ) : (
        <RestrictedPlayerModuleFallback title="Catálogo Adicional Reservado para el Administrador" />
      );
    case 'character':
      return isOwner || playerVisibility.showCharacterHero ? (
        <CharacterProgression />
      ) : (
        <RestrictedPlayerModuleFallback title="Héroe & Habilidades Oculto por el Administrador" />
      );
    case 'arena':
      return isOwner || playerVisibility.showArenaBattle ? (
        <ArenaBattle />
      ) : (
        <RestrictedPlayerModuleFallback title="Arena de Batalla Oculta por el Administrador" />
      );
    case 'roulette':
      return <RouletteGame />;
    case 'blackjack':
      return <BlackjackGame />;
    case 'poker':
      return <PokerGame />;
    case 'greyhound_racing':
      return <GreyhoundRaceGame />;
    case 'horse_racing':
      return <HorseRaceGame />;
    case 'payment_platforms':
      if (isOwner) {
        return <PaymentPlatformsGuide />;
      }
      return (
        <div className="max-w-xl mx-auto my-14 p-8 sm:p-10 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-indigo-400 text-3xl shadow-lg">
            🏛️
          </div>
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold uppercase tracking-wider font-mono">
              Fase Privada · Exclusivo Propietario
            </span>
            <h2 className="text-2xl font-black text-slate-100 font-display">
              Arquitectura de Banco Digital & Neobanco
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
              La suite de pasarelas de pago y Banking-as-a-Service (BaaS) está reservada exclusivamente para el administrador autorizado.
            </p>
          </div>
          <button
            onClick={() => {
              setIsAuthModalOpen(true);
              soundFx.playClick();
            }}
            className="w-full min-h-[44px] py-3 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-transform active:scale-95"
          >
            Autenticar Administrador
          </button>
        </div>
      );
    case 'admin':
      if (isOwner) {
        return <AdminPanel />;
      }
      return (
        <div className="max-w-md mx-auto my-16 p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-400 text-2xl shadow-lg">
            🔒
          </div>
          <h2 className="text-xl font-bold text-slate-100 font-display">
            Acceso Exclusivo: Bóveda del Dueño
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Esta sección administrativa únicamente es visible tras iniciar sesión con las credenciales de administrador autorizadas.
          </p>
          <div className="text-[11px] text-slate-500 font-mono">
            Sesión actual: {userEmail}
          </div>
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="w-full min-h-[44px] py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-transform active:scale-95"
          >
            Iniciar Sesión como Administrador
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
      <PlayerTransferExchangeModal />
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

class TelemetryErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message || 'Error inesperado de interfaz' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logVmExperience({
      category: 'UI_ERROR',
      gameName: 'REACT_BOUNDARY',
      severity: 'ERROR',
      summary: error?.message || 'Fallo de renderizado React',
      details: {
        stack: error?.stack ? String(error.stack).slice(0, 800) : '',
        componentStack: info?.componentStack ? String(info.componentStack).slice(0, 600) : ''
      }
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border border-rose-500/40 rounded-2xl p-6 space-y-4 text-center">
            <h2 className="text-lg font-bold text-rose-300">Se capturó un error en la prueba</h2>
            <p className="text-xs text-slate-300 font-mono bg-slate-950 p-3 rounded-xl border border-slate-800">
              {this.state.message}
            </p>
            <p className="text-xs text-slate-400">
              El incidente quedó guardado automáticamente en la bitácora QA del Administrador.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
            >
              Recargar Plataforma
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const PublicRegistrationGate: React.FC = () => {
  const {
    registerUserWithEmail,
    loginUserWithCredentials,
    loginOwnerWithKey,
    setIsStoreOpen
  } = useGame();

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [regUsername, setRegUsername] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regPayoutMethod, setRegPayoutMethod] = useState<'USDT' | 'PAYPAL'>('USDT');
  const [regPayoutAddress, setRegPayoutAddress] = useState('');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [openStoreAfter, setOpenStoreAfter] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanUsername = regUsername.trim();
    if (cleanUsername && !/^[a-zA-Z0-9._-]{3,32}$/.test(cleanUsername)) {
      setFormError('El usuario debe tener entre 3 y 32 caracteres (letras, números, . _ -).');
      return;
    }

    const cleanEmail = regEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setFormError('Ingresa un correo electrónico válido (ej. jugador@correo.com).');
      return;
    }
    if (regPassword.length < 6) {
      setFormError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (regPassword !== regConfirm) {
      setFormError('Las contraseñas no coinciden.');
      return;
    }

    const cleanPayoutAddress = regPayoutAddress.trim();
    if (regPayoutMethod === 'PAYPAL') {
      if (!emailRegex.test(cleanPayoutAddress)) {
        setFormError('Ingresa el correo válido de tu cuenta PayPal para recibir tus pagos.');
        return;
      }
    } else {
      if (cleanPayoutAddress.length < 10 || /\s/.test(cleanPayoutAddress)) {
        setFormError('Ingresa una dirección de billetera USDT válida (mínimo 10 caracteres, sin espacios).');
        return;
      }
    }

    setIsSubmitting(true);
    const res = await registerUserWithEmail({
      username: cleanUsername || undefined,
      email: cleanEmail,
      password: regPassword,
      displayName: regName.trim() || undefined,
      preferredPayoutMethod: regPayoutMethod,
      preferredPayoutAddress: cleanPayoutAddress
    });
    setIsSubmitting(false);
    if (!res.ok) {
      setFormError(res.error || 'No se pudo completar el registro.');
      return;
    }
    if (openStoreAfter) {
      setIsStoreOpen(true);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const cleanIdentifier = loginIdentifier.trim();
    if (!cleanIdentifier) {
      setFormError('Ingresa tu usuario o correo electrónico.');
      return;
    }
    if (!loginPassword) {
      setFormError('Ingresa tu contraseña.');
      return;
    }
    setIsSubmitting(true);
    if (cleanIdentifier.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
      const ok = await loginOwnerWithKey(loginPassword);
      setIsSubmitting(false);
      if (!ok) {
        setFormError('Credenciales inválidas o bloqueo temporal activo.');
      }
      return;
    }
    const res = await loginUserWithCredentials(cleanIdentifier, loginPassword);
    setIsSubmitting(false);
    if (!res.ok) {
      setFormError(res.error || 'Usuario, correo o contraseña incorrectos.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-amber-500 selection:text-slate-950">
      <PushNotificationToast />

      {/* Minimal Top Brand Bar (Zero exposed users) */}
      <header className="border-b border-slate-800/80 bg-slate-950/95 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
                <Coins className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-100 font-display">
                Aether<span className="text-amber-400">Vault</span>
              </span>
              <p className="text-[11px] text-slate-400">Acceso Privado · Base de Datos SQLite Local</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Database className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">SQLite Cifrado</span>
          </div>
        </div>
      </header>

      {/* Main Login / Create User Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Pitch Panel */}
          <div className="lg:col-span-5 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Acceso Protegido SQLite</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-display leading-tight">
                Inicia Sesión o Crea tu Usuario
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Ingresa con tu usuario y contraseña para acceder a Ruleta Europea, Blackjack 21, Póker Video, Carrera de Perros y Carrera de Caballos. Si eres nuevo, crea tu cuenta y elige cómo quieres cobrar: <strong>USDT</strong> o <strong>PayPal</strong>.
              </p>
            </div>

            <div className="space-y-2.5 pt-4 border-t border-slate-800 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Elige tu método de cobro al crear usuario: USDT o PayPal</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Depósitos por PayPal, Tarjeta Visa/MC y USDT a Bóveda</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Cuentas aisladas en SQLite local sin exponer usuarios</span>
              </div>
            </div>
          </div>

          {/* Right Form Panel */}
          <div className="lg:col-span-7 rounded-3xl bg-slate-900 border border-slate-700/80 p-6 sm:p-8 shadow-2xl space-y-5">
            {/* Tabs: Iniciar Sesión first, Crear Usuario second */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setMode('LOGIN');
                  setFormError(null);
                  soundFx.playClick();
                }}
                className={`min-h-[44px] rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                  mode === 'LOGIN'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>Iniciar Sesión</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('REGISTER');
                  setFormError(null);
                  soundFx.playClick();
                }}
                className={`min-h-[44px] rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                  mode === 'REGISTER'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>Crear Usuario</span>
              </button>
            </div>

            {mode === 'LOGIN' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold block mb-1">
                    Usuario o Correo Electrónico *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={loginIdentifier}
                      onChange={e => {
                        setLoginIdentifier(e.target.value);
                        setFormError(null);
                      }}
                      autoComplete="username"
                      placeholder="tu_usuario o correo@ejemplo.com"
                      className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold block mb-1">
                    Contraseña *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={e => {
                        setLoginPassword(e.target.value);
                        setFormError(null);
                      }}
                      autoComplete="current-password"
                      placeholder="Ingresa tu contraseña..."
                      className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200 p-1"
                      aria-label="Mostrar contraseña"
                    >
                      {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {formError && (
                  <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[46px] py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{isSubmitting ? 'Verificando acceso...' : 'Entrar a la Plataforma'}</span>
                </button>

                <div className="pt-2 text-center border-t border-slate-800/80">
                  <span className="text-xs text-slate-400">¿Todavía no tienes cuenta? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('REGISTER');
                      setFormError(null);
                      soundFx.playClick();
                    }}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 underline"
                  >
                    Crear Usuario Nuevo (USDT / PayPal)
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold block mb-1">
                      Usuario (Login)
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={regUsername}
                        onChange={e => {
                          setRegUsername(e.target.value);
                          setFormError(null);
                        }}
                        placeholder="ej. carlos_vip"
                        maxLength={32}
                        autoComplete="username"
                        className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold block mb-1">
                      Nombre Visible (Opcional)
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={regName}
                        onChange={e => {
                          setRegName(e.target.value);
                          setFormError(null);
                        }}
                        placeholder="Ej. Carlos Mendoza"
                        maxLength={60}
                        className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold block mb-1">
                    Correo Electrónico *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={e => {
                        setRegEmail(e.target.value);
                        setFormError(null);
                      }}
                      autoComplete="email"
                      placeholder="tucorreo@ejemplo.com"
                      className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold block mb-1">
                      Contraseña (mín. 6) *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type={showPass ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={regPassword}
                        onChange={e => {
                          setRegPassword(e.target.value);
                          setFormError(null);
                        }}
                        autoComplete="new-password"
                        placeholder="••••••"
                        className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200 p-1"
                        aria-label="Mostrar contraseña"
                      >
                        {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold block mb-1">
                      Confirmar Contraseña *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type={showPass ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={regConfirm}
                        onChange={e => {
                          setRegConfirm(e.target.value);
                          setFormError(null);
                        }}
                        autoComplete="new-password"
                        placeholder="••••••"
                        className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Preferred Payout Method Selector: USDT or PAYPAL */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-emerald-300 font-bold">
                      ¿Cómo quieres que te paguen? *
                    </span>
                    <span className="text-[10px] text-slate-400">Guardado en SQLite</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRegPayoutMethod('USDT');
                        setFormError(null);
                        soundFx.playClick();
                      }}
                      className={`min-h-[44px] p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 ${
                        regPayoutMethod === 'USDT'
                          ? 'bg-emerald-500/15 border-emerald-400 text-emerald-200 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Wallet className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <div className="text-xs font-bold">USDT (TRC-20)</div>
                        <div className="text-[10px] text-slate-400 font-normal">Billetera Cripto</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRegPayoutMethod('PAYPAL');
                        setFormError(null);
                        soundFx.playClick();
                      }}
                      className={`min-h-[44px] p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 ${
                        regPayoutMethod === 'PAYPAL'
                          ? 'bg-cyan-500/15 border-cyan-400 text-cyan-200 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <CreditCard className="w-4 h-4 text-cyan-400 shrink-0" />
                      <div>
                        <div className="text-xs font-bold">PayPal</div>
                        <div className="text-[10px] text-slate-400 font-normal">Correo PayPal</div>
                      </div>
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-slate-300 font-semibold block mb-1">
                      {regPayoutMethod === 'USDT'
                        ? 'Tu Dirección USDT (TRC-20 / ERC-20) *'
                        : 'Tu Correo de Cuenta PayPal *'}
                    </label>
                    <input
                      type={regPayoutMethod === 'PAYPAL' ? 'email' : 'text'}
                      required
                      value={regPayoutAddress}
                      onChange={e => {
                        setRegPayoutAddress(e.target.value);
                        setFormError(null);
                      }}
                      placeholder={
                        regPayoutMethod === 'USDT'
                          ? 'Ej. TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE'
                          : 'Ej. pagos@tupaypal.com'
                      }
                      className="w-full min-h-[42px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={openStoreAfter}
                    onChange={e => setOpenStoreAfter(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded"
                  />
                  <span className="text-xs text-slate-200 font-medium">
                    Abrir la Tienda de Monedas al completar registro (PayPal, USDT o Tarjeta)
                  </span>
                </label>

                {formError && (
                  <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[46px] py-3 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/15 flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50"
                >
                  <Coins className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? 'Creando usuario en SQLite...'
                      : openStoreAfter
                      ? 'Crear Usuario y Comprar Monedas'
                      : 'Crear Usuario'}
                  </span>
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800/80 py-5 px-6 text-xs text-slate-500 text-center">
        AetherVault · SQLite Local & Pasarela Internacional (USDT / PayPal)
      </footer>
    </div>
  );
};

const AppShell: React.FC = () => {
  const { authToken, userEmail, isSessionChecking } = useGame();

  if (isSessionChecking) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-300 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 mx-auto rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
            <Coins className="w-5 h-5 text-amber-400 animate-spin" />
          </div>
          <p className="text-xs font-mono text-slate-400">Verificando sesión segura...</p>
        </div>
      </div>
    );
  }

  const isAuthenticatedUser = Boolean(authToken) && userEmail.toLowerCase() !== 'jugador_anonimo@aethervault.com';
  if (!isAuthenticatedUser) {
    return <PublicRegistrationGate />;
  }

  return (
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
  );
};

export default function App() {
  return (
    <TelemetryErrorBoundary>
      <GameProvider>
        <AppShell />
      </GameProvider>
    </TelemetryErrorBoundary>
  );
}
