import React, { useState, useRef, useEffect } from 'react';
import {
  useGame,
  OWNER_EMAIL,
  DEMO_USERNAME,
  DEMO_PASSWORD,
  VM_TESTER_DEFAULT_PASS
} from '../context/GameContext';
import {
  ShieldCheck,
  CheckCircle2,
  X,
  Mail,
  Lock,
  LogOut,
  Sparkles,
  KeyRound,
  Eye,
  EyeOff,
  AlertTriangle,
  Users,
  UserPlus,
  LogIn,
  Coins,
  User
} from 'lucide-react';
import { soundFx } from '../utils/audio';

const VM_TESTER_SLOTS = Array.from({ length: 10 }, (_, idx) => {
  const num = String(idx + 1).padStart(2, '0');
  return {
    alias: `tester${num}`,
    email: `tester${num}@vm.aethervault.local`,
    label: `Tester #${num}`
  };
});

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    userEmail,
    authToken,
    coins,
    isOwner,
    isDemoAccount,
    isRealAccountActive,
    loginUser,
    loginUserWithCredentials,
    registerUserWithEmail,
    loginOwnerWithKey,
    loginDemoUser,
    loginVmTester,
    logoutUser,
    setIsStoreOpen
  } = useGame();

  // Login form state
  const [inputEmail, setInputEmail] = useState(userEmail);
  const [inputPassword, setInputPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [openStoreOnSuccess, setOpenStoreOnSuccess] = useState(true);

  const [authError, setAuthError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [selectedVmTester, setSelectedVmTester] = useState('tester01');
  const passwordInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isAuthModalOpen) {
      setAuthError(null);
      if (userEmail === 'jugador_anonimo@aethervault.com') {
        setInputEmail('');
      } else {
        setInputEmail(userEmail);
      }
      setInputPassword('');
    }
  }, [isAuthModalOpen, userEmail]);

  if (!isAuthModalOpen) return null;

  const isGuestSession = userEmail.toLowerCase() === 'jugador_anonimo@aethervault.com';
  const isRegisteredEmailPlayer =
    !isOwner &&
    !isDemoAccount &&
    !isGuestSession &&
    !userEmail.endsWith('@vm.aethervault.local') &&
    Boolean(authToken);

  const cleanInputLower = inputEmail.trim().toLowerCase();
  const isOwnerTarget = cleanInputLower === OWNER_EMAIL.toLowerCase();
  const isDemoTarget =
    cleanInputLower === DEMO_USERNAME.toLowerCase() ||
    cleanInputLower === 'gokudemo@aethervault.com';
  const isVmTesterTarget =
    /^tester(0[1-9]|10)$/.test(cleanInputLower) ||
    cleanInputLower.endsWith('@vm.aethervault.local');
  const isLegacyPresetTarget = cleanInputLower === 'jugador_real@aethervault.com';
  const isCustomEmailLogin =
    Boolean(cleanInputLower) &&
    !isOwnerTarget &&
    !isDemoTarget &&
    !isVmTesterTarget &&
    !isLegacyPresetTarget;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const cleanEmail = inputEmail.trim();
    if (!cleanEmail) {
      setAuthError('Ingresa tu correo electrónico o usuario.');
      return;
    }

    if (isOwnerTarget) {
      if (!inputPassword.trim()) {
        setAuthError('Ingresa tu clave de propietario para autenticar en la base de datos SQL.');
        passwordInputRef.current?.focus();
        return;
      }
      setIsVerifying(true);
      const success = await loginOwnerWithKey(inputPassword.trim());
      setIsVerifying(false);
      if (success) {
        setIsAuthModalOpen(false);
        setInputPassword('');
      } else {
        setAuthError('Clave incorrecta o bloqueo temporal activo. Verifica tu clave en la bóveda SQL.');
      }
    } else if (isDemoTarget) {
      if (!inputPassword.trim()) {
        setAuthError(`Se requiere la clave para la cuenta demo ${DEMO_USERNAME} (${DEMO_PASSWORD}).`);
        return;
      }
      setIsVerifying(true);
      const success = await loginDemoUser(inputPassword.trim());
      setIsVerifying(false);
      if (success) {
        setIsAuthModalOpen(false);
        setInputPassword('');
      } else {
        setAuthError(`Clave de demo incorrecta. La clave requerida es: ${DEMO_PASSWORD}`);
      }
    } else if (isVmTesterTarget) {
      if (!inputPassword.trim()) {
        setAuthError(`Ingresa la contraseña de prueba VM (${VM_TESTER_DEFAULT_PASS}).`);
        return;
      }
      setIsVerifying(true);
      const result = await loginVmTester(cleanEmail, inputPassword.trim());
      setIsVerifying(false);
      if (result.ok) {
        setIsAuthModalOpen(false);
        setInputPassword('');
      } else {
        setAuthError(result.error || 'No se pudo iniciar sesión como tester VM.');
      }
    } else if (isLegacyPresetTarget) {
      loginUser(cleanEmail);
      setIsAuthModalOpen(false);
      setInputPassword('');
    } else {
      if (!inputPassword) {
        setAuthError('Ingresa la contraseña de tu cuenta para iniciar sesión.');
        return;
      }
      setIsVerifying(true);
      const res = await loginUserWithCredentials(cleanEmail, inputPassword);
      setIsVerifying(false);
      if (res.ok) {
        setIsAuthModalOpen(false);
        setInputPassword('');
      } else {
        setAuthError(res.error || 'Correo o contraseña incorrectos.');
      }
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const cleanEmail = regEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setAuthError('Ingresa un correo electrónico válido (ej. nombre@correo.com).');
      return;
    }
    if (regPassword.length < 6) {
      setAuthError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setAuthError('Las contraseñas no coinciden.');
      return;
    }

    setIsVerifying(true);
    const result = await registerUserWithEmail({
      email: cleanEmail,
      password: regPassword,
      displayName: regName.trim()
    });
    setIsVerifying(false);

    if (!result.ok) {
      setAuthError(result.error || 'No se pudo registrar la cuenta.');
      return;
    }

    setRegName('');
    setRegEmail('');
    setRegPassword('');
    setRegConfirmPassword('');
    setIsAuthModalOpen(false);
    if (openStoreOnSuccess) {
      setIsStoreOpen(true);
    }
  };

  const handleQuickLoginOwnerPreset = () => {
    setAuthModalMode('LOGIN');
    setInputEmail(OWNER_EMAIL);
    setInputPassword('');
    setAuthError(null);
    soundFx.playClick();
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 50);
  };

  const handleQuickLoginDemoPreset = async () => {
    setAuthModalMode('LOGIN');
    setInputEmail(DEMO_USERNAME);
    setInputPassword(DEMO_PASSWORD);
    setAuthError(null);
    await loginDemoUser(DEMO_PASSWORD);
    setIsAuthModalOpen(false);
  };

  const handleSelectVmTesterPreset = (alias: string) => {
    setSelectedVmTester(alias);
    setInputEmail(alias);
    setInputPassword(VM_TESTER_DEFAULT_PASS);
    setAuthError(null);
    soundFx.playClick();
  };

  const handleQuickConnectVmTester = async () => {
    setIsVerifying(true);
    setAuthError(null);
    const result = await loginVmTester(selectedVmTester, VM_TESTER_DEFAULT_PASS);
    setIsVerifying(false);
    if (result.ok) {
      setIsAuthModalOpen(false);
      setInputPassword('');
    } else {
      setAuthError(result.error || 'Error conectando tester VM.');
    }
  };

  const handleQuickLoginPlayerPreset = () => {
    const playerEmail = 'jugador_real@aethervault.com';
    setInputEmail(playerEmail);
    setInputPassword('');
    setAuthError(null);
    loginUser(playerEmail);
    setIsAuthModalOpen(false);
  };

  const handleAutoFillDemoKey = () => {
    setInputPassword(DEMO_PASSWORD);
    setAuthError(null);
    soundFx.playClick();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isOwner
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : isDemoAccount
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              <Lock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 font-display flex items-center gap-2">
                <span>Control de Sección de Usuario</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  SQL Seguro
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Regístrate con tu correo, inicia sesión y compra monedas en la tienda
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(false)}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-slate-100 rounded-xl hover:bg-slate-800 transition-colors"
            aria-label="Cerrar control de sesión"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4">
          {/* Current status card */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Sesión Activa Actualmente
              </span>
              <span className="text-xs font-mono font-bold text-amber-400 tabular-nums">
                {coins.toLocaleString()} mo
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-slate-200 font-bold truncate">
                {isGuestSession ? 'Invitado (Sin correo registrado)' : userEmail}
              </span>
              {isOwner ? (
                <span className="text-[11px] font-bold text-amber-400 bg-amber-950/80 border border-amber-600/50 px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Dueño
                </span>
              ) : isDemoAccount ? (
                <span className="text-[11px] font-bold text-purple-300 bg-purple-950/90 border border-purple-500/50 px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  Demo Aislada
                </span>
              ) : userEmail.endsWith('@vm.aethervault.local') ? (
                <span className="text-[11px] font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-500/40 px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Tester VM
                </span>
              ) : isRegisteredEmailPlayer ? (
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md shrink-0 border ${
                    isRealAccountActive
                      ? 'text-emerald-300 bg-emerald-950/70 border-emerald-500/40'
                      : 'text-amber-300 bg-amber-950/60 border-amber-500/40'
                  }`}
                >
                  {isRealAccountActive ? 'Cuenta Activa' : 'Registrado (Sin Depósito)'}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md shrink-0">
                  Sin Registro
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <p className="text-[11px] text-slate-400 leading-relaxed flex-1">
                {isOwner ? (
                  <span className="text-emerald-400">
                    Acceso completo a Bóveda del Dueño, pasarelas USDT/PayPal y bitácora del servidor.
                  </span>
                ) : isDemoAccount || userEmail.endsWith('@vm.aethervault.local') ? (
                  <span className="text-purple-300">
                    Sesión de pruebas aislada activa con $5,000 USD (6,250 monedas).
                  </span>
                ) : isRegisteredEmailPlayer ? (
                  <span className="text-emerald-300">
                    Tu cuenta por correo está conectada. Compra monedas en la Tienda para acreditarlas al instante.
                  </span>
                ) : (
                  <span className="text-amber-300">
                    Registra tu correo electrónico para guardar tu saldo y comprar monedas.
                  </span>
                )}
              </p>

              {(isRegisteredEmailPlayer || isOwner || userEmail.endsWith('@vm.aethervault.local')) && (
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playClick();
                    setIsAuthModalOpen(false);
                    setIsStoreOpen(true);
                  }}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 transition shrink-0"
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>Comprar Monedas</span>
                </button>
              )}
            </div>
          </div>

          {/* Mode Tabs: Register vs Login */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setAuthModalMode('REGISTER');
                setAuthError(null);
                soundFx.playClick();
              }}
              className={`min-h-[42px] rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                authModalMode === 'REGISTER'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Registrar Correo</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthModalMode('LOGIN');
                setAuthError(null);
                soundFx.playClick();
              }}
              className={`min-h-[42px] rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                authModalMode === 'LOGIN'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Iniciar Sesión</span>
            </button>
          </div>

          {authModalMode === 'REGISTER' ? (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div className="p-3 rounded-xl bg-emerald-950/25 border border-emerald-500/30 text-[11px] text-emerald-200 leading-relaxed">
                Crea tu cuenta personal con tu correo electrónico. Al registrarte podrás comprar tus paquetes de monedas por PayPal, tarjeta o USDT y conservar tu saldo entre sesiones.
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold block mb-1">
                  Nombre o Alias (Opcional)
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={regName}
                    onChange={e => {
                      setRegName(e.target.value);
                      setAuthError(null);
                    }}
                    placeholder="Ej. Carlos Mendoza"
                    maxLength={60}
                    className="w-full min-h-[42px] bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-400"
                  />
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
                      setAuthError(null);
                    }}
                    autoComplete="email"
                    placeholder="tucorreo@ejemplo.com"
                    className="w-full min-h-[42px] bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-400"
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
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={regPassword}
                      onChange={e => {
                        setRegPassword(e.target.value);
                        setAuthError(null);
                      }}
                      autoComplete="new-password"
                      placeholder="••••••"
                      className="w-full min-h-[42px] bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200 p-1"
                      aria-label="Mostrar contraseña"
                    >
                      {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
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
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={regConfirmPassword}
                      onChange={e => {
                        setRegConfirmPassword(e.target.value);
                        setAuthError(null);
                      }}
                      autoComplete="new-password"
                      placeholder="••••••"
                      className="w-full min-h-[42px] bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={openStoreOnSuccess}
                  onChange={e => setOpenStoreOnSuccess(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded"
                />
                <span className="text-xs text-slate-200 font-medium">
                  Abrir automáticamente la Tienda para comprar mis monedas al terminar
                </span>
              </label>

              {authError && (
                <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full min-h-[44px] py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/15 flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50"
              >
                <Coins className="w-4 h-4" />
                <span>
                  {isVerifying
                    ? 'Registrando cuenta...'
                    : openStoreOnSuccess
                    ? 'Crear Cuenta y Comprar Monedas'
                    : 'Registrar Cuenta por Correo'}
                </span>
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Quick preset switches */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                  Accesos Rápidos de Administración y Pruebas
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Owner Preset */}
                  <button
                    type="button"
                    onClick={handleQuickLoginOwnerPreset}
                    className={`min-h-[48px] p-2.5 rounded-xl border text-left text-xs transition-colors flex items-center justify-between ${
                      isOwnerTarget
                        ? 'bg-amber-500/10 border-amber-500/50 text-amber-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1">
                        <span>👑 Dueño (Clave)</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[115px] font-mono">{OWNER_EMAIL}</div>
                    </div>
                    {isOwnerTarget && <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />}
                  </button>

                  {/* Demo Account Preset */}
                  <button
                    type="button"
                    onClick={handleQuickLoginDemoPreset}
                    className={`min-h-[48px] p-2.5 rounded-xl border text-left text-xs transition-colors flex items-center justify-between ${
                      isDemoTarget
                        ? 'bg-purple-500/20 border-purple-500/70 text-purple-200 font-bold shadow-lg shadow-purple-500/10'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-purple-500/40'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-purple-300 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>🎮 Demo $5,000</span>
                      </div>
                      <div className="text-[10px] text-purple-400/80 truncate max-w-[110px] font-mono">{DEMO_USERNAME}</div>
                    </div>
                    {isDemoTarget && <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />}
                  </button>

                  {/* Legacy Player Preset */}
                  <button
                    type="button"
                    onClick={handleQuickLoginPlayerPreset}
                    className={`min-h-[48px] p-2.5 rounded-xl border text-left text-xs transition-colors flex items-center justify-between ${
                      isLegacyPresetTarget
                        ? 'bg-slate-800 border-slate-600 text-slate-100 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold">👤 Cuenta Real</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[110px] font-mono">jugador_real</div>
                    </div>
                    {isLegacyPresetTarget && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                  </button>
                </div>
              </div>

              {/* VM 10-Tester Sandbox Quick Access */}
              <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Entorno Pruebas Virtual (Máx. 10 Usuarios)
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Clave: {VM_TESTER_DEFAULT_PASS}</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={selectedVmTester}
                    onChange={e => handleSelectVmTesterPreset(e.target.value)}
                    className="flex-1 min-h-[40px] bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-cyan-200 font-mono focus:outline-none focus:border-cyan-400"
                  >
                    {VM_TESTER_SLOTS.map(slot => (
                      <option key={slot.alias} value={slot.alias}>
                        {slot.label} ({slot.alias}) — $5,000 USD Prueba
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={isVerifying}
                    onClick={handleQuickConnectVmTester}
                    className="min-h-[40px] px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-xs transition shrink-0"
                  >
                    Probar Juegos ({selectedVmTester})
                  </button>
                </div>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-400 font-medium block mb-1">
                    Correo Electrónico o Usuario
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={inputEmail}
                      onChange={e => {
                        setInputEmail(e.target.value);
                        setAuthError(null);
                      }}
                      placeholder="tucorreo@ejemplo.com o tester01"
                      className="w-full min-h-[42px] bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {/* Owner Password */}
                {isOwnerTarget && (
                  <div className="space-y-1.5 animate-in fade-in duration-150">
                    <label className="text-[10px] uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1">
                      <KeyRound className="w-3 h-3" />
                      <span>Contraseña de Propietario Requerida</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-amber-500 absolute left-3 top-3" />
                      <input
                        ref={passwordInputRef}
                        type={showPassword ? 'text' : 'password'}
                        value={inputPassword}
                        onChange={e => {
                          setInputPassword(e.target.value);
                          setAuthError(null);
                        }}
                        autoComplete="current-password"
                        placeholder="Ingresa tu clave privada de administrador..."
                        className="w-full min-h-[42px] bg-slate-950 border border-amber-500/50 rounded-xl pl-9 pr-9 py-2 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200 p-1"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Demo Password */}
                {isDemoTarget && (
                  <div className="space-y-1.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] uppercase tracking-wider text-purple-400 font-bold flex items-center gap-1">
                        <KeyRound className="w-3 h-3" />
                        <span>Contraseña Demo Requerida</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleAutoFillDemoKey}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-mono"
                      >
                        Autocompletar ({DEMO_PASSWORD})
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-purple-500 absolute left-3 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={inputPassword}
                        onChange={e => {
                          setInputPassword(e.target.value);
                          setAuthError(null);
                        }}
                        placeholder={`Ingresa ${DEMO_PASSWORD}`}
                        className="w-full min-h-[42px] bg-slate-950 border border-purple-500/50 rounded-xl pl-9 pr-9 py-2 text-xs text-purple-300 font-mono focus:outline-none focus:border-purple-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200 p-1"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* VM Tester Password */}
                {isVmTesterTarget && !isOwnerTarget && !isDemoTarget && (
                  <div className="space-y-1.5 animate-in fade-in duration-150">
                    <label className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-1">
                      <KeyRound className="w-3 h-3" />
                      <span>Contraseña Tester VM ({VM_TESTER_DEFAULT_PASS})</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-cyan-500 absolute left-3 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={inputPassword}
                        onChange={e => {
                          setInputPassword(e.target.value);
                          setAuthError(null);
                        }}
                        placeholder={VM_TESTER_DEFAULT_PASS}
                        className="w-full min-h-[42px] bg-slate-950 border border-cyan-500/50 rounded-xl pl-9 pr-9 py-2 text-xs text-cyan-200 font-mono focus:outline-none focus:border-cyan-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200 p-1"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Registered Email Player Password */}
                {isCustomEmailLogin && (
                  <div className="space-y-1.5 animate-in fade-in duration-150">
                    <label className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1">
                      <KeyRound className="w-3 h-3" />
                      <span>Contraseña de tu Cuenta</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-emerald-500 absolute left-3 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={inputPassword}
                        onChange={e => {
                          setInputPassword(e.target.value);
                          setAuthError(null);
                        }}
                        autoComplete="current-password"
                        placeholder="Ingresa tu contraseña registrada..."
                        className="w-full min-h-[42px] bg-slate-950 border border-emerald-500/40 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200 p-1"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}

                {authError && (
                  <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="flex-1 min-h-[42px] py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow transition-transform active:scale-95 disabled:opacity-50"
                  >
                    {isVerifying
                      ? 'Verificando en Base de Datos...'
                      : isOwnerTarget
                      ? 'Verificar Clave y Desbloquear Bóveda'
                      : isVmTesterTarget
                      ? 'Entrar como Tester VM'
                      : 'Iniciar Sesión'}
                  </button>
                  {(isOwner || isDemoAccount || isRegisteredEmailPlayer || userEmail.endsWith('@vm.aethervault.local')) && (
                    <button
                      type="button"
                      onClick={logoutUser}
                      className="min-h-[42px] px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-rose-300 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Salir</span>
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
