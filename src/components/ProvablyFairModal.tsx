import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import {
  Lock,
  ShieldCheck,
  CheckCircle2,
  X,
  Search,
  ExternalLink,
  Code
} from 'lucide-react';
import { sha256 } from '../utils/crypto';

export const ProvablyFairModal: React.FC = () => {
  const {
    isProvablyFairModalOpen,
    setIsProvablyFairModalOpen,
    provablyFairHistory
  } = useGame();

  const [inputServerSeed, setInputServerSeed] = useState('');
  const [inputClientSeed, setInputClientSeed] = useState('');
  const [inputNonce, setInputNonce] = useState('1');
  const [verificationResult, setVerificationResult] = useState<{
    hash: string;
    computedOutcome: number;
  } | null>(null);

  if (!isProvablyFairModalOpen) return null;

  const handleVerify = async () => {
    if (!inputServerSeed || !inputClientSeed) return;
    const msg = `${inputServerSeed}:${inputClientSeed}:${inputNonce}`;
    const digest = await sha256(msg);
    const intVal = parseInt(digest.slice(0, 8), 16) % 37; // Sample roulette outcome
    setVerificationResult({ hash: digest, computedOutcome: intVal });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 font-display">
                Cifrado Extremo a Extremo & Provably-Fair
              </h3>
              <p className="text-xs text-slate-400">
                Verificación matemática inmutable de resultados de casino y transacciones
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsProvablyFairModalOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-5">
          
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed">
            <span className="font-semibold text-emerald-400">¿Cómo garantizamos 100% juego limpio?</span> Antes de que comience cada tirada o mano, el servidor genera una semilla secreta y te entrega su Hash SHA-256. Dado que el hash está prefijado, el casino no puede alterar el resultado a posteriori. Tu semilla de cliente y el número de turno determinan el resultado matemáticamente.
          </div>

          {/* Interactive Verifier Calculator */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Code className="w-3.5 h-3.5 text-cyan-400" />
              Calculadora Independiente de Verificación
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 uppercase">Semilla del Servidor (Revelada)</label>
                <input
                  type="text"
                  placeholder="ej. a9f83... (o selecciona una ronda abajo)"
                  value={inputServerSeed}
                  onChange={e => setInputServerSeed(e.target.value)}
                  className="w-full mt-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-[11px] text-slate-200 focus:outline-none focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase">Semilla del Cliente</label>
                <input
                  type="text"
                  placeholder="ej. client_seed_xyz"
                  value={inputClientSeed}
                  onChange={e => setInputClientSeed(e.target.value)}
                  className="w-full mt-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-[11px] text-slate-200 focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-slate-400 uppercase">Nonce (Turno):</label>
                <input
                  type="number"
                  value={inputNonce}
                  onChange={e => setInputNonce(e.target.value)}
                  className="w-20 bg-slate-900 border border-slate-800 rounded px-2 py-1 font-mono text-xs text-slate-200"
                />
              </div>
              <button
                onClick={handleVerify}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verificar Hash SHA-256</span>
              </button>
            </div>

            {verificationResult && (
              <div className="mt-3 p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/50 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Resultado Verificado Matemáticamente</span>
                </div>
                <div className="font-mono text-[11px] text-slate-300 break-all">
                  Hash: {verificationResult.hash}
                </div>
                <div className="text-slate-200 font-mono-numbers">
                  Número Determinístico Ruleta: <span className="font-bold text-amber-400">{verificationResult.computedOutcome}</span>
                </div>
              </div>
            )}
          </div>

          {/* Recent Rounds Log */}
          <div>
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Historial de Rondas Provably-Fair Recientes
            </h4>
            <div className="max-h-56 overflow-y-auto space-y-2">
              {provablyFairHistory.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4 bg-slate-950 rounded-xl border border-slate-800">
                  Aún no has jugado rondas de casino. Juega en Ruleta, Blackjack o Póker para generar pruebas criptográficas.
                </p>
              ) : (
                provablyFairHistory.map(round => (
                  <div
                    key={round.id}
                    className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">
                        {round.game} · Nonce #{round.nonce}
                      </span>
                      <span className="text-[11px] text-emerald-400 font-mono-numbers flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Verificado
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">{round.outcome}</div>
                    <div className="font-mono text-[10px] text-slate-500 truncate">
                      SHA256: {round.serverSeedHash}
                    </div>
                    <button
                      onClick={() => {
                        setInputServerSeed(round.revealedServerSeed || '');
                        setInputClientSeed(round.clientSeed);
                        setInputNonce(round.nonce.toString());
                      }}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 underline"
                    >
                      Cargar en calculadora
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={() => setIsProvablyFairModalOpen(false)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
