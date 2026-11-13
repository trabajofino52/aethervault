import React, { useState } from 'react';
import {
  useGame,
  OWNER_EMAIL,
  DEMO_USERNAME,
  DEMO_PASSWORD,
  DEMO_INITIAL_USD
} from '../context/GameContext';
import {
  User,
  ShieldCheck,
  CheckCircle2,
  X,
  Mail,
  Lock,
  ArrowRight,
  LogOut,
  Sparkles,
  KeyRound,
  Eye,
  EyeOff,
  AlertTriangle,
  Landmark,
  Coins
} from 'lucide-react';
import { soundFx } from '../utils/audio';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    userEmail,
    isOwner,
    isDemoAccount,
    isRealAccountActive,
    loginUser,
    loginOwnerWithKey,
    loginDemoUser,
    resetDemoFunds,
    logoutUser
  } = useGame();

  const [inputEmail, setInputEmail] = useState(userEmail);
  const [inputPassword, setInputPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isAuthModalOpen) return null;

  const isOwnerTarget = inputEmail.trim().toLowerCase() === OWNER_EMAIL.toLowerCase();
  const isDemoTarget =
    inputEmail.trim().toLowerCase() === DEMO_USERNAME.toLowerCase() ||
    inputEmail.trim().toLowerCase() === 'gokudemo@aethervault.com';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const cleanEmail = inputEmail.trim();
    if (!cleanEmail) return;

    if (cleanEmail.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
      if (!inputPassword.trim()) {
        setAuthError('Se requiere la clave maestra de 256 bits para acceder como Propietario.');
        return;
      }
      setIsVerifying(true);
      const success = await loginOwnerWithKey(inputPassword.trim());
      setIsVerifying(false);
      if (success) {
        setIsAuthModalOpen(false);
        setInputPassword('');
      } else {
        setAuthError('Clave de seguridad inválida. El hash SHA-256 (256-bit) no coincide con los registros.');
      }
    } else if (cleanEmail.toLowerCase() === DEMO_USERNAME.toLowerCase() || cleanEmail.toLowerCase() === 'gokudemo@aethervault.com') {
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
    } else {
      loginUser(cleanEmail);
      setIsAuthModalOpen(false);
      setInputPassword('');
    }
  };

  const handleQuickLoginOwnerPreset = () => {
    setInputEmail(OWNER_EMAIL);
    setAuthError(null);
  };

  const handleQuickLoginDemoPreset = async () => {
    setInputEmail(DEMO_USERNAME);
    setInputPassword(DEMO_PASSWORD);
    setAuthError(null);
    await loginDemoUser(DEMO_PASSWORD);
    setIsAuthModalOpen(false);
  };

  const handleQuickLoginPlayerPreset = () => {
    const playerEmail = 'jugador_real@aethervault.com';
    setInputEmail(playerEmail);
    setInputPassword('');
    setAuthError(null);
    loginUser(playerEmail);
    setIsAuthModalOpen(false);
  };

  const handleAutoFillKey = () => {
    setInputPassword('GokuCheckersMasterKey2024Secure');
    setAuthError(null);
    soundFx.playClick();
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
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
              isOwner
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : isDemoAccount
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                : 'bg-slate-800 text-slate-300 border border-slate-700'
            }`}>
              <Lock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 font-display flex items-center gap-2">
                <span>Seguridad & Control de Sesión</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  SHA-256 (256-bit)
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Acceso exclusivo a Bóveda del Dueño, Neobanco y Modo Demo Aislado
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
                  Dueño Cifrado 256-bit
                </span>
              ) : isDemoAccount ? (
                <span className="text-[11px] font-bold text-purple-300 bg-purple-950/90 border border-purple-500/50 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 animate-pulse">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  Demo Aislada ($5,000 USD)
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
                  ✓ Tienes acceso total a la <strong>Bóveda del Dueño</strong>, retiros con comisión 20% y al módulo <strong>🏛️ Neobanco & Pasarelas</strong>.
                </span>
              ) : isDemoAccount ? (
                <span className="text-purple-300">
                  🎮 Estás en la <strong>Cuenta Demo Aislada (gokudemo)</strong> con <strong>$5,000 USD (6,250 monedas)</strong>. Puedes probar todos los juegos sin riesgo. Las cuentas reales solo se activan con confirmación de depósito.
                </span>
              ) : (
                <span className="text-amber-400/90">
                  🔒 Cuenta Estándar: Las opciones de <strong>Banco Digital</strong> y la <strong>Bóveda del Dueño</strong> están reservadas solo para <strong>{OWNER_EMAIL}</strong>. Las cuentas reales son activadas solo con la confirmación de los depósitos.
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
              {/* Owner Preset */}
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
                    <span>👑 Dueño & Banco</span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate max-w-[110px] font-mono">{OWNER_EMAIL}</div>
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
                  !isOwnerTarget && !isDemoTarget
                    ? 'bg-slate-800 border-slate-600 text-slate-100 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="font-bold">👤 Cuenta Real</div>
                  <div className="text-[10px] text-slate-400 truncate max-w-[110px] font-mono">jugador_real</div>
                </div>
                {!isOwnerTarget && !isDemoTarget && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
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
                  placeholder="ej. trabajofino52@gmail.com o gokudemo"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Password Required if target is Owner */}
            {isOwnerTarget && (
              <div className="space-y-1.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1">
                    <KeyRound className="w-3 h-3" />
                    <span>Clave Maestra 256-bit Requerida</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoFillKey}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-mono"
                  >
                    Usar clave autorizada
                  </button>
                </div>

                <div className="relative">
                  <Lock className="w-4 h-4 text-amber-500 absolute left-3 top-2.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={inputPassword}
                    onChange={e => {
                      setInputPassword(e.target.value);
                      setAuthError(null);
                    }}
                    placeholder="Ingresa GokuCheckersMasterKey2024Secure"
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

                <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/20 text-[10px] text-slate-400 space-y-1 font-mono">
                  <div className="flex items-center gap-1 text-amber-400 font-bold">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Cifrado SHA-256 de 256-Bit Activo</span>
                  </div>
                  <div className="truncate text-slate-500 text-[9px]">
                    Hash: 4fa9b3722fd5ff79ffea5511c819e9cafc4592b026864d82b25857e885c91cdf
                  </div>
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
                    Autocompletar (goku30309982)
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
                    placeholder="Ingresa goku30309982"
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

                <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-[10px] text-purple-300 space-y-1">
                  <div className="flex items-center gap-1 font-bold">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    <span>Cuenta Demo Aislada ($5,000 USD / 6,250 Monedas)</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Aislada de las cuentas reales. Puedes probar los 50 juegos y simular partidas sin riesgo.
                  </p>
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
                {isVerifying ? 'Verificando Hash 256-bit...' : isOwnerTarget ? 'Verificar y Desbloquear Banco' : 'Iniciar como Jugador'}
              </button>
              {isOwner && (
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
