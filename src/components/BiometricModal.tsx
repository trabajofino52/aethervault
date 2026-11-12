import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import {
  Fingerprint,
  ShieldCheck,
  Lock,
  Key,
  X,
  CheckCircle2,
  RefreshCw,
  Smartphone
} from 'lucide-react';
import { soundFx } from '../utils/audio';

export const BiometricModal: React.FC = () => {
  const {
    isBiometricModalOpen,
    setIsBiometricModalOpen,
    biometrics,
    setBiometrics,
    addNotification
  } = useGame();

  const [isTestingScan, setIsTestingScan] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  if (!isBiometricModalOpen) return null;

  const handleToggleBiometrics = () => {
    const updated = !biometrics.enabled;
    setBiometrics(prev => ({ ...prev, enabled: updated }));
    soundFx.playClick();
    addNotification(
      updated ? 'Biometría Activada' : 'Biometría Pausada',
      updated
        ? 'Las compras y transferencias de alto valor requerirán confirmación por huella/FaceID.'
        : 'Se utilizará confirmación estándar por contraseña.',
      'security'
    );
  };

  const handleTestScan = () => {
    setIsTestingScan(true);
    setTestResult(null);
    soundFx.playBiometricScan();

    setTimeout(() => {
      soundFx.playBiometricSuccess();
      setIsTestingScan(false);
      setTestResult('¡Passkey Biométrica Validada con éxito! Firma HMAC generada.');
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Fingerprint className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 font-display">
                Seguridad Biométrica Avanzada
              </h3>
              <p className="text-xs text-slate-400">
                WebAuthn Passkey · Touch ID & Face ID Hardware Enclave
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsBiometricModalOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-4">
          
          {/* Toggle Switch */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5 pr-4">
              <div className="text-sm font-semibold text-slate-200">
                Exigir Autenticación Biométrica
              </div>
              <div className="text-xs text-slate-400">
                Requiere escaneo de huella dactilar o reconocimiento facial para transacciones mayores a $100 USD.
              </div>
            </div>
            <button
              onClick={handleToggleBiometrics}
              className={`w-12 h-6 rounded-full transition-colors relative flex items-center p-1 shrink-0 ${
                biometrics.enabled ? 'bg-cyan-500' : 'bg-slate-800'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full bg-slate-950 shadow-md transform transition-transform ${
                  biometrics.enabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Device Profile */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-slate-300 font-semibold">
              <Smartphone className="w-4 h-4 text-cyan-400" />
              <span>Dispositivo Vinculado</span>
            </div>
            <div className="flex items-center justify-between text-slate-400 font-mono-numbers">
              <span>Nombre:</span>
              <span className="text-slate-200 font-sans">{biometrics.deviceName}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400 font-mono-numbers">
              <span>Identificador Passkey:</span>
              <span className="text-cyan-400 font-mono">{biometrics.fingerprintId}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400 font-mono-numbers">
              <span>Umbral de Seguridad:</span>
              <span className="text-slate-200 font-bold">${biometrics.highValueThresholdUSD} USD</span>
            </div>
          </div>

          {/* Interactive Test Scanner */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-3">
            <div className="text-xs text-slate-400 font-medium">
              Prueba de Sensor Biométrico
            </div>

            <button
              onClick={handleTestScan}
              disabled={isTestingScan}
              className="w-16 h-16 mx-auto rounded-full bg-cyan-950/70 border-2 border-cyan-500/50 hover:border-cyan-400 flex items-center justify-center text-cyan-400 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-cyan-500/10"
            >
              {isTestingScan ? (
                <RefreshCw className="w-8 h-8 animate-spin text-cyan-300" />
              ) : (
                <Fingerprint className="w-8 h-8" />
              )}
            </button>

            {testResult && (
              <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/50 text-xs text-emerald-300 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{testResult}</span>
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Las claves privadas biométricas nunca abandonan el hardware seguro de tu navegador.</span>
          </div>

        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={() => setIsBiometricModalOpen(false)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
          >
            Listo
          </button>
        </div>

      </div>
    </div>
  );
};
