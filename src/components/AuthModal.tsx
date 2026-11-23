import React, { useState, useRef } from 'react';
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
  Users
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
    userEmail,
    isOwner,
    isDemoAccount,
    loginUser,
    loginOwnerWithKey,
    loginDemoUser,
    loginVmTester,
    logoutUser
  } = useGame();

  const [inputEmail, setInputEmail] = useState(userEmail);
  const [inputPassword, setInputPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [selectedVmTester, setSelectedVmTester] = useState('tester01');
  const passwordInputRef = useRef<HTMLInputElement | null>(null);

  if (!isAuthModalOpen) return null;

  const cleanInputLower = inputEmail.trim().toLowerCase();
  const isOwnerTarget = cleanInputLower === OWNER_EMAIL.toLowerCase();
  const isDemoTarget =
    cleanInputLower === DEMO_USERNAME.toLowerCase() ||
    cleanInputLower === 'gokudemo@aethervault.com';
  const isVmTesterTarget =
    /^tester(0[1-9]|10)$/.test(cleanInputLower) ||
    cleanInputLower.endsWith('@vm.aethervault.local');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const cleanEmail = inputEmail.trim();
    if (!cleanEmail) return;

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
    } else {
      loginUser(cleanEmail);
      setIsAuthModalOpen(false);
      setInputPassword('');
    }
  };

  const handleQuickLoginOwnerPreset = () => {
    setInputEmail(OWNER_EMAIL);
    setInputPassword('');
    setAuthError(null);
    soundFx.playClick();
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 50);
  };

  const handleQuickLoginDemoPreset = async () => {
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
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl p-6 text-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
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
                <span>Seguridad & Control de Sesión</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  scrypt SQL
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Bóveda del Dueño, Cuenta Demo y Entorno Virtual (Máx. 10 Testers)
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAuthModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current status */}
        <div className="py-4 space-y-4">
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
              Sesión Activa Actualmente
            </span>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-slate-200 font-bold truncate pr-2">
                {userEmail}
              </span>
              {isOwner ? (
                <span className="text-[11px] font-bold text-amber-400 bg-amber-950/80 border border-amber-600/50 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Dueño Verificado
                </span>
              ) : isDemoAccount ? (
                <span className="text-[11px] font-bold text-purple-300 bg-purple-950/90 border border-purple-500/50 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  Demo Aislada ($5,000 USD)
                </span>
              ) : userEmail.endsWith('@vm.aethervault.local') ? (
                <span className="text-[11px] font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-500/40 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Tester VM ($5,000 Prueba)
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full shrink-0">
                  Jugador Estándar
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
              {isOwner ? (
                <span className="text-emerald-400">
                  ✓ Acceso completo a la <strong>Bóveda del Dueño</strong>, configuración USDT/BTC/PayPal y bitácora QA de los 10 testers en máquina virtual.
                </span>
              ) : isDemoAccount || userEmail.endsWith('@vm.aethervault.local') ? (
                <span className="text-purple-300">
                  🎮 Sesión de pruebas aislada activa con <strong>$5,000 USD (6,250 monedas)</strong>. Cada jugada y fallo se guarda automáticamente en el log QA del servidor.
                </span>
              ) : (
                <span className="text-amber-400/90">
                  🔒 Cuenta Estándar: Las cuentas reales únicamente se activan tras confirmar un depósito en USDT o tarjeta.
                </span>
              )}
            </p>
          </div>

          {/* Quick preset switches */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
              Seleccionar Cuenta / Rol de Acceso
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Owner Preset (Requires Password Prompt) */}
              <button
                type="button"
                onClick={handleQuickLoginOwnerPreset}
                className={`p-2.5 rounded-2xl border text-left text-xs transition-colors flex items-center justify-between ${
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
                className={`p-2.5 rounded-2xl border text-left text-xs transition-colors flex items-center justify-between ${
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

              {/* Player Preset */}
              <button
                type="button"
                onClick={handleQuickLoginPlayerPreset}
                className={`p-2.5 rounded-2xl border text-left text-xs transition-colors flex items-center justify-between ${
                  !isOwnerTarget && !isDemoTarget && !isVmTesterTarget
                    ? 'bg-slate-800 border-slate-600 text-slate-100 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="font-bold">👤 Cuenta Real</div>
                  <div className="text-[10px] text-slate-400 truncate max-w-[110px] font-mono">jugador_real</div>
                </div>
                {!isOwnerTarget && !isDemoTarget && !isVmTesterTarget && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
              </button>
            </div>
          </div>

          {/* VM 10-Tester Sandbox Quick Access */}
          <div className="p-3 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-2">
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
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-cyan-200 font-mono focus:outline-none focus:border-cyan-400"
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
                className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-xs transition shrink-0"
              >
                Probar Juegos ({selectedVmTester})
              </button>
            </div>
          </div>

          {/* Custom Form */}
          <form onSubmit={handleSubmit} className="space-y-3 pt-2 border-t border-slate-800">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-medium block mb-1">
                Usuario o Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={inputEmail}
                  onChange={e => {
                    setInputEmail(e.target.value);
                    setAuthError(null);
                  }}
                  placeholder="ej. trabajofino52@gmail.com, tester01 o gokudemo"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Password ALWAYS required & prompted cleanly if target is Owner */}
            {isOwnerTarget && (
              <div className="space-y-1.5 animate-in fade-in duration-150">
                <label className="text-[10px] uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1">
                  <KeyRound className="w-3 h-3" />
                  <span>Contraseña de Propietario Requerida (Verificación SQL)</span>
                </label>

                <div className="relative">
                  <Lock className="w-4 h-4 text-amber-500 absolute left-3 top-2.5" />
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
                    className="w-full bg-slate-950 border border-amber-500/50 rounded-xl pl-9 pr-9 py-2 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/20 text-[10px] text-slate-400 space-y-1">
                  <div className="flex items-center gap-1 text-amber-400 font-bold">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Verificación Criptográfica en Servidor (scrypt + Salt 128-bit)</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Por seguridad, la clave nunca se guarda ni se autocompleta en el navegador. Se valida directamente contra la base de datos SQL.
                  </p>
                </div>
              </div>
            )}

            {/* Password Required if target is Demo Account */}
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
                  <Lock className="w-4 h-4 text-purple-500 absolute left-3 top-2.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={inputPassword}
                    onChange={e => {
                      setInputPassword(e.target.value);
                      setAuthError(null);
                    }}
                    placeholder={`Ingresa ${DEMO_PASSWORD}`}
                    className="w-full bg-slate-950 border border-purple-500/50 rounded-xl pl-9 pr-9 py-2 text-xs text-purple-300 font-mono focus:outline-none focus:border-purple-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            {/* Password Required if target is VM Tester */}
            {isVmTesterTarget && !isOwnerTarget && !isDemoTarget && (
              <div className="space-y-1.5 animate-in fade-in duration-150">
                <label className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-1">
                  <KeyRound className="w-3 h-3" />
                  <span>Contraseña Tester VM ({VM_TESTER_DEFAULT_PASS})</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-cyan-500 absolute left-3 top-2.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={inputPassword}
                    onChange={e => {
                      setInputPassword(e.target.value);
                      setAuthError(null);
                    }}
                    placeholder={VM_TESTER_DEFAULT_PASS}
                    className="w-full bg-slate-950 border border-cyan-500/50 rounded-xl pl-9 pr-9 py-2 text-xs text-cyan-200 font-mono focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
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
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow transition-transform active:scale-95 disabled:opacity-50"
              >
                {isVerifying
                  ? 'Verificando en Base de Datos...'
                  : isOwnerTarget
                  ? 'Verificar Clave y Desbloquear Bóveda'
                  : isVmTesterTarget
                  ? 'Entrar como Tester VM'
                  : 'Iniciar como Jugador'}
              </button>
              {(isOwner || isDemoAccount || userEmail.endsWith('@vm.aethervault.local')) && (
                <button
                  type="button"
                  onClick={logoutUser}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-750 text-rose-300 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Salir</span>
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
