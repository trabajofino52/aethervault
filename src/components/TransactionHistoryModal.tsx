import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import {
  History,
  X,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Fingerprint,
  Download,
  Copy,
  CheckCircle2
} from 'lucide-react';
import { soundFx } from '../utils/audio';

export const TransactionHistoryModal: React.FC = () => {
  const { isHistoryModalOpen, setIsHistoryModalOpen, transactions } = useGame();
  const [filter, setFilter] = useState<'ALL' | 'RECHARGE' | 'CASINO' | 'SKILL_UPGRADE'>('ALL');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  if (!isHistoryModalOpen) return null;

  const filteredTxs = transactions.filter(t => {
    if (filter === 'ALL') return true;
    if (filter === 'RECHARGE') return t.type === 'RECHARGE';
    if (filter === 'SKILL_UPGRADE') return t.type === 'SKILL_UPGRADE';
    if (filter === 'CASINO') return t.type === 'CASINO_WIN' || t.type === 'CASINO_BET';
    return true;
  });

  const copyTxHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    soundFx.playClick();
    setTimeout(() => setCopiedHash(null), 1800);
  };

  const exportCSV = () => {
    const headers = 'ID,Fecha,Tipo,Titulo,Monedas,USD,Hash,Biometria\n';
    const rows = transactions.map(t => 
      `"${t.id}","${new Date(t.timestamp).toISOString()}","${t.type}","${t.title}",${t.amountCoins},${t.amountUSD || 0},"${t.txHash}",${t.biometricVerified}`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aethervault_ledger_${Date.now()}.csv`;
    a.click();
    soundFx.playClick();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 font-display">
                Libro Mayor de Transacciones E2EE
              </h3>
              <p className="text-xs text-slate-400">
                Registro criptográfico inmutable de recargas, mejoras de habilidades y juegos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 text-xs font-semibold rounded-lg transition-colors border border-slate-700"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>
            <button
              onClick={() => setIsHistoryModalOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar (Segmented control) */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 my-4 text-xs font-medium">
          {(
            [
              { id: 'ALL', label: 'Todas las Operaciones' },
              { id: 'RECHARGE', label: 'Recargas de Monedas' },
              { id: 'CASINO', label: 'Juegos de Casino' },
              { id: 'SKILL_UPGRADE', label: 'Mejoras de Habilidad' }
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setFilter(tab.id);
                soundFx.playClick();
              }}
              className={`flex-1 py-1.5 px-2 rounded-md transition-colors text-center whitespace-nowrap ${
                filter === tab.id
                  ? 'bg-slate-800 text-amber-400 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Transaction list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filteredTxs.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No se encontraron registros en esta categoría.
            </div>
          ) : (
            filteredTxs.map(tx => {
              const isPositive = tx.amountCoins > 0;
              return (
                <div
                  key={tx.id}
                  className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700/80 transition-colors flex items-center justify-between gap-4 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        tx.type === 'RECHARGE'
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                          : tx.type === 'SKILL_UPGRADE'
                          ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-800/60'
                          : isPositive
                          ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                          : 'bg-slate-850 text-slate-400 border border-slate-700/60'
                      }`}
                    >
                      {isPositive ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-200 truncate flex items-center gap-2">
                        <span>{tx.title}</span>
                        {tx.biometricVerified && (
                          <span className="flex items-center gap-0.5 text-[10px] text-cyan-400 font-normal">
                            <Fingerprint className="w-3 h-3" />
                            Biométrico
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">{tx.description}</div>
                      <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2 mt-1">
                        <span>{new Date(tx.timestamp).toLocaleString()}</span>
                        <span>·</span>
                        <button
                          onClick={() => copyTxHash(tx.txHash)}
                          className="hover:text-amber-400 flex items-center gap-1"
                          title="Copiar Hash SHA-256"
                        >
                          <span>{tx.txHash.slice(0, 16)}...</span>
                          {copiedHash === tx.txHash ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right side: Amount in Coins */}
                  <div className="text-right shrink-0">
                    <div
                      className={`font-mono-numbers font-bold text-sm ${
                        isPositive ? 'text-emerald-400' : 'text-slate-300'
                      }`}
                    >
                      {isPositive ? '+' : ''}{tx.amountCoins.toLocaleString()} Monedas
                    </div>
                    {tx.amountUSD !== undefined && tx.amountUSD > 0 && (
                      <div className="text-[11px] text-slate-400 font-mono-numbers">
                        ${tx.amountUSD.toFixed(2)} USD
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>{transactions.length} transacciones registradas</span>
          <button
            onClick={() => setIsHistoryModalOpen(false)}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
