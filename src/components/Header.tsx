import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { NavigationTab } from '../types';
import {
  Coins,
  Fingerprint,
  Bell,
  Volume2,
  VolumeX,
  History,
  Lock,
  Plus,
  User,
  Trophy,
  Share2,
  MessageSquare,
  DollarSign,
  ArrowLeftRight,
  LifeBuoy
} from 'lucide-react';
import { soundFx } from '../utils/audio';

export const Header: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    coins,
    notifications,
    setIsStoreOpen,
    setSelectedStoreTier,
    setIsBiometricModalOpen,
    setIsProvablyFairModalOpen,
    setIsHistoryModalOpen,
    setIsDailyBonusModalOpen,
    setIsLeaderboardModalOpen,
    setIsReferralModalOpen,
    setIsChatWidgetOpen,
    isChatWidgetOpen,
    biometrics,
    clearAllNotifications,
    userEmail,
    isOwner,
    playerVisibility,
    isDemoAccount,
    resetDemoFunds,
    setIsAuthModalOpen,
    setIsSupportPanelOpen,
    setIsTransferModalOpen
  } = useGame();

  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);
  const [muted, setMuted] = useState(soundFx.getMuted());
  const [currencyMode, setCurrencyMode] = useState<'COINS' | 'USD'>('COINS');

  const toggleSound = () => {
    const next = !muted;
    soundFx.setMuted(next);
    setMuted(next);
  };

  const canSeeTop50 = isOwner || playerVisibility.showTop50Casino;
  const canSeeHero = isOwner || playerVisibility.showCharacterHero;
  const canSeeArena = isOwner || playerVisibility.showArenaBattle;
  const canSeeSecurityTools = isOwner || playerVisibility.showSecurityTools;

  const navItems: { id: NavigationTab; label: string }[] = [
    { id: 'store', label: 'Casino' },
    { id: 'roulette', label: 'Ruleta Europea' },
    { id: 'blackjack', label: 'Blackjack 21' },
    { id: 'poker', label: 'Póker Video' },
    { id: 'greyhound_racing', label: 'Carrera de Perros' },
    { id: 'horse_racing', label: 'Carrera de Caballos' },
    ...(canSeeTop50 ? [{ id: 'top_50_casino' as const, label: isOwner ? '🎰 Juegos Admin' : '🎰 Juegos Extra' }] : []),
    ...(canSeeHero ? [{ id: 'character' as const, label: 'Héroe & Habilidades' }] : []),
    ...(canSeeArena ? [{ id: 'arena' as const, label: 'Arena de Batalla' }] : []),
    ...(isOwner
      ? [
          { id: 'payment_platforms' as const, label: '🏛️ Neobanco & Pasarelas' },
          { id: 'admin' as const, label: '👑 Bóveda Dueño' }
        ]
      : [])
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              setActiveTab('store');
              soundFx.playClick();
            }}
            className="flex items-center gap-2.5 text-left group min-h-[40px]"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
                <Coins className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-100 font-display whitespace-nowrap">
                Aether<span className="text-amber-400">Vault</span>
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Clean navigation links */}
        <nav className="hidden lg:flex items-center gap-4 text-xs xl:text-sm font-medium overflow-x-auto">
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  soundFx.playClick();
                }}
                className={`relative py-2 whitespace-nowrap shrink-0 transition-colors ${
                  isActive ? 'text-amber-400 font-semibold' : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {item.label}
                {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400" />}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Action Cluster */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Optional Extra Security Tools (Hidden from players unless Admin enables them) */}
          {canSeeSecurityTools && (
            <>
              <button
                onClick={() => {
                  setIsProvablyFairModalOpen(true);
                  soundFx.playClick();
                }}
                title="Cifrado E2EE y Provably-Fair"
                className="hidden sm:flex items-center gap-1.5 min-h-[36px] px-2.5 py-1.5 text-xs text-slate-300 bg-slate-900 border border-slate-700/60 rounded-lg hover:border-emerald-500/50 hover:text-emerald-300 transition-colors whitespace-nowrap"
              >
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-mono tabular-nums">E2EE</span>
              </button>

              <button
                onClick={() => {
                  setIsBiometricModalOpen(true);
                  soundFx.playClick();
                }}
                title="Seguridad Biométrica (Touch ID / Face ID)"
                className={`flex items-center gap-1.5 min-h-[36px] px-2.5 py-1.5 text-xs rounded-lg border transition-colors whitespace-nowrap ${
                  biometrics.enabled
                    ? 'bg-cyan-950/40 text-cyan-300 border-cyan-800/60 hover:bg-cyan-900/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                <Fingerprint className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden md:inline">Biometría</span>
              </button>

              <button
                onClick={() => {
                  setIsHistoryModalOpen(true);
                  soundFx.playClick();
                }}
                title="Historial de Transacciones"
                className="p-2 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-lg transition-colors"
              >
                <History className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Always Visible: 🎰 Rueda 24h */}
          <button
            onClick={() => {
              setIsDailyBonusModalOpen(true);
              soundFx.playClick();
            }}
            title="🎰 Rueda Diaria 24h & Misiones"
            className="flex items-center gap-1 min-h-[36px] px-2.5 py-1.5 text-xs text-amber-300 bg-amber-950/40 border border-amber-600/60 rounded-lg hover:bg-amber-900/40 transition-colors whitespace-nowrap font-bold"
          >
            <span>🎰</span>
            <span className="hidden sm:inline">Rueda 24h</span>
          </button>

          {/* Always Visible: Torneo 30% */}
          <button
            onClick={() => {
              setIsLeaderboardModalOpen(true);
              soundFx.playClick();
            }}
            title="Ranking Top 100 & Torneo 30%"
            className="hidden sm:flex items-center gap-1.5 min-h-[36px] px-2.5 py-1.5 text-xs text-slate-200 bg-slate-900 border border-slate-700/60 rounded-lg hover:border-amber-500/50 hover:text-amber-300 transition-colors whitespace-nowrap"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xl:inline">Torneo 30%</span>
          </button>

          {/* Always Visible: Afiliados 5% */}
          <button
            onClick={() => {
              setIsReferralModalOpen(true);
              soundFx.playClick();
            }}
            title="Programa de Afiliados (5% Vitalicio)"
            className="hidden sm:flex items-center gap-1.5 min-h-[36px] px-2.5 py-1.5 text-xs text-cyan-300 bg-slate-900 border border-slate-700/60 rounded-lg hover:border-cyan-500/50 hover:text-cyan-200 transition-colors whitespace-nowrap"
          >
            <Share2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden xl:inline">Afiliados 5%</span>
          </button>

          {/* Always Visible: Chat */}
          <button
            onClick={() => {
              setIsChatWidgetOpen(!isChatWidgetOpen);
              soundFx.playClick();
            }}
            title="Chat Multijugador en Vivo"
            className={`p-2 rounded-lg border transition-colors ${
              isChatWidgetOpen
                ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900 border-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          {/* Always Visible: Transferir / Cambio */}
          <button
            onClick={() => {
              setIsTransferModalOpen(true);
              soundFx.playClick();
            }}
            title="Transferir Monedas P2P, Conversor USD/USDT y Retiro PayPal/USDT"
            className="flex items-center gap-1.5 min-h-[36px] px-2.5 py-1.5 text-xs text-emerald-300 bg-emerald-950/30 border border-emerald-600/50 rounded-lg hover:bg-emerald-900/40 hover:border-emerald-500 transition-colors whitespace-nowrap font-medium"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden xl:inline">Transferir / Cambio</span>
          </button>

          {/* Always Visible: Soporte */}
          <button
            onClick={() => {
              setIsSupportPanelOpen(true);
              soundFx.playClick();
            }}
            title="Soporte, Tickets, Contraseña y Pagos"
            className="flex items-center gap-1.5 min-h-[36px] px-2.5 py-1.5 text-xs text-amber-300 bg-amber-950/30 border border-amber-600/50 rounded-lg hover:bg-amber-900/40 hover:border-amber-500 transition-colors whitespace-nowrap font-medium"
          >
            <LifeBuoy className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xl:inline">Soporte</span>
          </button>

          {/* User Account / Owner Session Switcher */}
          <button
            onClick={() => {
              setIsAuthModalOpen(true);
              soundFx.playClick();
            }}
            title={
              isOwner
                ? `Sesión de Propietario (${userEmail})`
                : isDemoAccount
                ? `Cuenta Demo Aislada (${userEmail})`
                : userEmail === 'jugador_anonimo@aethervault.com'
                ? 'Control de Usuario: Regístrate con tu correo o inicia sesión'
                : `Sesión de Jugador (${userEmail})`
            }
            className={`flex items-center gap-1.5 min-h-[36px] px-2.5 py-1.5 text-xs rounded-lg border transition-colors whitespace-nowrap ${
              isOwner
                ? 'bg-amber-950/40 text-amber-300 border-amber-600/60 hover:bg-amber-900/40 font-bold'
                : isDemoAccount
                ? 'bg-purple-950/50 text-purple-300 border-purple-500/60 hover:bg-purple-900/40 font-bold'
                : userEmail === 'jugador_anonimo@aethervault.com'
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/50 hover:bg-emerald-900/40 font-semibold'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            <User className={`w-3.5 h-3.5 ${isDemoAccount ? 'text-purple-400' : userEmail === 'jugador_anonimo@aethervault.com' ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span className="hidden sm:inline font-mono text-[11px] truncate max-w-[116px]">
              {userEmail === 'jugador_anonimo@aethervault.com' ? 'Entrar / Registro' : userEmail.split('@')[0]}
            </span>
            {isOwner && <span className="text-[10px] text-amber-400">👑</span>}
            {isDemoAccount && <span className="text-[10px] text-purple-300 font-bold">DEMO</span>}
          </button>

          {/* Quick Demo Recharge button when logged in as gokudemo */}
          {isDemoAccount && (
            <button
              onClick={resetDemoFunds}
              title="Restablecer saldo a $5,000 USD (6,250 monedas) de prueba"
              className="hidden md:flex items-center gap-1 min-h-[36px] px-2.5 py-1.5 rounded-lg bg-purple-900/60 hover:bg-purple-800 border border-purple-500/50 text-purple-200 text-xs font-bold transition-all shadow active:scale-95 whitespace-nowrap"
            >
              <span>🔄 $5,000 Demo</span>
            </button>
          )}

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            title={muted ? 'Activar Sonido' : 'Silenciar'}
            className="p-2 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-lg transition-colors"
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Notification Center Popover */}
          <div className="relative">
            <button
              onClick={() => setIsNotifDropdownOpen(!isNotifDropdownOpen)}
              title="Notificaciones Push"
              className="relative p-2 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-lg transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-slate-950 text-[10px] font-bold rounded flex items-center justify-center font-mono tabular-nums">
                  {unreadCount}
                </span>
              )}
            </button>

            {isNotifDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                  <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-amber-400" />
                    Bandeja de Push
                  </span>
                  {notifications.length > 0 && (
                    <button
                      onClick={clearAllNotifications}
                      className="text-[11px] text-slate-400 hover:text-slate-200"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">No hay notificaciones recientes</p>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/40 text-xs">
                        <div className="font-medium text-slate-200">{n.title}</div>
                        <div className="text-slate-400 text-[11px] mt-0.5">{n.message}</div>
                        <div className="text-[10px] text-slate-500 font-mono tabular-nums mt-1">
                          {new Date(n.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Primary Action: Multi-Currency Live Wallet */}
          <div className="flex items-center bg-slate-900 border border-amber-500/40 hover:border-amber-400 rounded-lg pl-2 pr-1.5 py-1 transition-all shadow-md shadow-amber-500/5">
            <button
              onClick={() => {
                setCurrencyMode(prev => (prev === 'COINS' ? 'USD' : 'COINS'));
                soundFx.playClick();
              }}
              title="Tasa oficial: 1,000 monedas = $800.00 USD ($0.80 / moneda). Clic para alternar vista."
              className="flex items-center gap-1.5 mr-2 px-1.5 py-0.5 rounded hover:bg-slate-800 transition-colors cursor-pointer text-left"
            >
              {currencyMode === 'COINS' ? (
                <>
                  <Coins className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-sm font-bold text-amber-300 font-mono tabular-nums">
                    {coins.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-amber-500/80 font-bold bg-amber-950/60 px-1 rounded border border-amber-500/30">
                    MO
                  </span>
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-sm font-bold text-emerald-300 font-mono tabular-nums">
                    ${(coins * 0.8).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-emerald-400/90 font-bold bg-emerald-950/80 px-1 rounded border border-emerald-500/30">
                    USD
                  </span>
                </>
              )}
              <ArrowLeftRight className="w-3 h-3 text-slate-500 hover:text-amber-300 transition-colors shrink-0 ml-0.5" />
            </button>
            <button
              onClick={() => {
                setSelectedStoreTier(null);
                setIsStoreOpen(true);
                soundFx.playClick();
              }}
              className="flex items-center gap-1 min-h-[30px] px-2.5 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-md shadow transition-all whitespace-nowrap active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Tienda</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav bar row for small screens */}
      <div className="flex lg:hidden items-center gap-1 pt-2.5 mt-2 border-t border-slate-800/60 overflow-x-auto text-xs">
        {navItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                soundFx.playClick();
              }}
              className={`px-2.5 py-1.5 min-h-[36px] rounded whitespace-nowrap transition-colors ${
                isActive ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-slate-400'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
