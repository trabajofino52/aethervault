import React, { useEffect, useMemo, useState } from 'react';
import { useGame } from '../context/GameContext';
import {
  ArrowLeftRight,
  ArrowRight,
  CheckCircle2,
  Coins,
  DollarSign,
  History,
  Lock,
  RefreshCw,
  Send,
  ShieldCheck,
  Users,
  Wallet,
  X,
  AlertCircle
} from 'lucide-react';
import { soundFx } from '../utils/audio';

export const PlayerTransferExchangeModal: React.FC = () => {
  const {
    isTransferModalOpen,
    setIsTransferModalOpen,
    setIsRedemptionModalOpen,
    setIsAuthModalOpen,
    setIsStoreOpen,
    coins,
    userEmail,
    authToken,
    isDemoAccount,
    isRealAccountActive,
    vaultRetentionRate,
    redemptionFeeRate,
    transferFeeRate,
    directoryPlayers,
    transfersHistory,
    redemptionRequests,
    refreshTransfersAndDirectory,
    transferCoinsToPlayer
  } = useGame();

  const [tab, setTab] = useState<'transfer' | 'exchange' | 'history'>('transfer');
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [transferAmountInput, setTransferAmountInput] = useState<string>('100');
  const [transferNote, setTransferNote] = useState<string>('');
  const [isSendingTransfer, setIsSendingTransfer] = useState(false);
  const [transferFeedback, setTransferFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [isRefreshingDir, setIsRefreshingDir] = useState(false);

  // Currency converter state (1 moneda = $0.80 USD = 0.80 USDT)
  const [convCoins, setConvCoins] = useState<string>('1000');

  useEffect(() => {
    if (isTransferModalOpen && authToken) {
      void refreshTransfersAndDirectory();
    }
  }, [isTransferModalOpen, authToken, refreshTransfersAndDirectory]);

  const otherPlayers = useMemo(
    () =>
      directoryPlayers.filter(
        p => p.email.toLowerCase() !== userEmail.trim().toLowerCase()
      ),
    [directoryPlayers, userEmail]
  );

  const userRedemptions = useMemo(
    () =>
      redemptionRequests.filter(
        r => r.playerEmail.toLowerCase() === userEmail.trim().toLowerCase()
      ),
    [redemptionRequests, userEmail]
  );

  if (!isTransferModalOpen) return null;

  const parsedTransferAmount = Math.max(0, Math.floor(Number(transferAmountInput) || 0));
  const calculatedFeeCoins =
    parsedTransferAmount > 0 && transferFeeRate > 0
      ? Math.max(1, Math.round(parsedTransferAmount * (transferFeeRate / 100)))
      : 0;
  const calculatedNetCoins = Math.max(0, parsedTransferAmount - calculatedFeeCoins);
  const transferInvalid =
    isDemoAccount ||
    !authToken ||
    !recipientEmail.trim() ||
    parsedTransferAmount <= 0 ||
    parsedTransferAmount > coins ||
    calculatedNetCoins <= 0;

  // Converter derivations
  const convCoinsNum = Math.max(0, Number(convCoins) || 0);
  const convUsdNum = convCoinsNum * 0.8;
  const maxCashout30Coins = Math.floor(coins * 0.30);
  const maxCashoutGrossUsd = maxCashout30Coins * 0.8;
  const maxCashoutFeeUsd = maxCashoutGrossUsd * (redemptionFeeRate / 100);
  const maxCashoutNetUsd = Math.max(0, maxCashoutGrossUsd - maxCashoutFeeUsd);

  const handleCoinsInput = (val: string) => {
    setConvCoins(val);
  };

  const handleUsdInput = (val: string) => {
    const usd = Math.max(0, Number(val) || 0);
    setConvCoins(String(Math.round(usd / 0.8)));
  };

  const handleSendTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferInvalid) return;
    setIsSendingTransfer(true);
    setTransferFeedback(null);
    const res = await transferCoinsToPlayer({
      recipientEmail: recipientEmail.trim(),
      amountCoins: parsedTransferAmount,
      note: transferNote.trim() || undefined
    });
    setIsSendingTransfer(false);
    setTransferFeedback({ ok: res.ok, message: res.message });
    if (res.ok) {
      soundFx.playCoinChime();
      setTransferNote('');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshingDir(true);
    await refreshTransfersAndDirectory();
    setIsRefreshingDir(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-100 font-display">
                Transferencias P2P, Cambio de Monedas & Retiro PayPal / USDT
              </h3>
              <p className="text-xs text-slate-400 font-mono tabular-nums">
                Cuenta: <span className="text-cyan-300">{userEmail}</span> · Saldo:{' '}
                <strong className="text-amber-300">{coins.toLocaleString()} mo</strong> (${(coins * 0.8).toFixed(2)} USD)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsTransferModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Cerrar panel de transferencias y cambio"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Authoritative Casino Commissions Strip */}
        <div className="px-6 py-2.5 bg-slate-950 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono tabular-nums">
          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">Casa Casino:</span>
            <span className="text-amber-300 font-bold">{vaultRetentionRate}%</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">Comisión P2P:</span>
            <span className="text-cyan-300 font-bold">{transferFeeRate}%</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">Comisión Retiro:</span>
            <span className="text-rose-300 font-bold">{redemptionFeeRate}%</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">Tope Retiro:</span>
            <span className="text-emerald-300 font-bold">30% máx</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setTab('transfer');
                soundFx.playClick();
              }}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                tab === 'transfer' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviar Monedas (P2P)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('exchange');
                soundFx.playClick();
              }}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                tab === 'exchange' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Cambio & Retiro PayPal/USDT</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('history');
                soundFx.playClick();
              }}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                tab === 'history' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Historial ({transfersHistory.length + userRedemptions.length})</span>
            </button>
          </div>

          {authToken && (
            <button
              type="button"
              onClick={handleRefresh}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingDir ? 'animate-spin' : ''}`} />
              <span>Sincronizar</span>
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {tab === 'transfer' && (
            <>
              {isDemoAccount ? (
                <div className="p-5 rounded-2xl bg-slate-950 border border-purple-500/40 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-purple-950 border border-purple-500/50 flex items-center justify-center text-purple-300">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-purple-300">
                    Transferencias Desactivadas en Cuenta Demo (gokudemo)
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Las cuentas de prueba VM (tester01..tester10) o usuarios reales registrados pueden enviarse monedas entre sí con liquidación atómica en SQLite.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTransferModalOpen(false);
                      setIsAuthModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                  >
                    Iniciar Sesión con Cuenta Real o Tester VM
                  </button>
                </div>
              ) : !authToken ? (
                <div className="p-5 rounded-2xl bg-slate-950 border border-amber-500/40 text-center space-y-3">
                  <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                  <h4 className="text-sm font-bold text-amber-300">Sesión Segura Requerida</h4>
                  <p className="text-xs text-slate-400">
                    Inicia sesión con tu cuenta registrada o un perfil Tester VM para transferir monedas en vivo por la red local o Ngrok.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTransferModalOpen(false);
                      setIsAuthModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                  >
                    Autenticar Cuenta
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendTransfer} className="space-y-4">
                  {/* Directory Quick Select */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-bold flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-cyan-400" />
                        Jugadores Disponibles en el Servidor ({otherPlayers.length})
                      </span>
                      <span className="text-[11px] text-slate-500">Clic para seleccionar destinatario</span>
                    </div>
                    {otherPlayers.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto pr-1">
                        {otherPlayers.map(player => {
                          const isSelected = recipientEmail.trim().toLowerCase() === player.email.toLowerCase();
                          return (
                            <button
                              key={player.id}
                              type="button"
                              onClick={() => {
                                setRecipientEmail(player.email);
                                setTransferFeedback(null);
                                soundFx.playClick();
                              }}
                              className={`p-2 rounded-xl border text-left transition-colors ${
                                isSelected
                                  ? 'bg-cyan-500/15 border-cyan-400 text-cyan-200'
                                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                              }`}
                            >
                              <div className="text-[11px] font-bold truncate">{player.displayName}</div>
                              <div className="text-[10px] font-mono text-slate-400 truncate">{player.email}</div>
                              <div className="text-[10px] font-mono tabular-nums text-amber-300 mt-0.5">
                                {player.coinsBalance.toLocaleString()} mo
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
                        Ingresa manualmente el correo del jugador registrado en el campo inferior.
                      </div>
                    )}
                  </div>

                  {/* Recipient + Amount */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">
                        Correo del Jugador Destinatario
                      </label>
                      <input
                        type="email"
                        required
                        value={recipientEmail}
                        onChange={e => {
                          setRecipientEmail(e.target.value);
                          setTransferFeedback(null);
                        }}
                        placeholder="tester02@vm.aethervault.local"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">
                        Monedas Brutas a Enviar (Máx: {coins.toLocaleString()})
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={Math.max(1, coins)}
                        required
                        value={transferAmountInput}
                        onChange={e => setTransferAmountInput(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono tabular-nums font-bold text-amber-300 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">
                      Concepto / Nota (Opcional)
                    </label>
                    <input
                      type="text"
                      maxLength={80}
                      value={transferNote}
                      onChange={e => setTransferNote(e.target.value)}
                      placeholder="Ej. Premio partida Póker o intercambio entre jugadores"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Live Fee Breakdown */}
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs font-mono tabular-nums">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Monto Bruto Debitado:</span>
                      <span className="text-slate-100 font-bold">{parsedTransferAmount.toLocaleString()} mo</span>
                    </div>
                    <div className="flex items-center justify-between text-rose-400">
                      <span>Comisión del Casino ({transferFeeRate}% → Bóveda Dueño):</span>
                      <span className="font-bold">-{calculatedFeeCoins.toLocaleString()} mo</span>
                    </div>
                    <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-emerald-400 font-bold text-sm">
                      <span>Neto Acreditado al Destinatario:</span>
                      <span>
                        +{calculatedNetCoins.toLocaleString()} mo (${(calculatedNetCoins * 0.8).toFixed(2)} USD)
                      </span>
                    </div>
                  </div>

                  {transferFeedback && (
                    <div
                      className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                        transferFeedback.ok
                          ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-200'
                          : 'bg-rose-950/50 border-rose-500/50 text-rose-200'
                      }`}
                    >
                      {transferFeedback.ok ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span>{transferFeedback.message}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={transferInvalid || isSendingTransfer}
                    className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {isSendingTransfer
                        ? 'Ejecutando Transferencia Atómica...'
                        : `Transferir ${parsedTransferAmount.toLocaleString()} mo (Neto +${calculatedNetCoins.toLocaleString()} mo)`}
                    </span>
                  </button>
                </form>
              )}
            </>
          )}

          {tab === 'exchange' && (
            <div className="space-y-4">
              {/* Interactive Bi-Directional Converter */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-amber-400" />
                    Conversor Oficial en Vivo (1,000 Monedas = $800.00 USD / ₮800.00 USDT)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono tabular-nums">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">Monedas Aether</label>
                    <input
                      type="number"
                      min="0"
                      value={convCoins}
                      onChange={e => handleCoinsInput(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-amber-300 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">Dólares PayPal (USD)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={convUsdNum.toFixed(2)}
                      onChange={e => handleUsdInput(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-cyan-300 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">Tether TRC-20 (USDT)</label>
                    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm font-bold text-emerald-300">
                      ₮{convUsdNum.toFixed(2)} USDT
                    </div>
                  </div>
                </div>
              </div>

              {/* Real Account Cashout Summary */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-3 text-xs font-mono tabular-nums">
                <div className="flex items-center justify-between font-sans">
                  <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <Wallet className="w-4 h-4" />
                    Tu Capacidad Actual de Retiro (Límite 30%)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {isRealAccountActive ? 'Cuenta Real Activa' : 'Requiere Depósito Confirmado'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400 font-sans">Máx. 30% Retirable</div>
                    <div className="text-base font-bold text-amber-300">{maxCashout30Coins.toLocaleString()} mo</div>
                    <div className="text-[10px] text-slate-500">Bruto: ${maxCashoutGrossUsd.toFixed(2)} USD</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400 font-sans">Comisión Casino ({redemptionFeeRate}%)</div>
                    <div className="text-base font-bold text-rose-400">-${maxCashoutFeeUsd.toFixed(2)} USD</div>
                    <div className="text-[10px] text-slate-500">Retenido en Bóveda</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/30">
                    <div className="text-[10px] text-slate-400 font-sans">Neto a Recibir ({100 - redemptionFeeRate}%)</div>
                    <div className="text-base font-bold text-emerald-400">${maxCashoutNetUsd.toFixed(2)}</div>
                    <div className="text-[10px] text-slate-500">Vía PayPal o USDT</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-sans text-slate-300 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Cuando solicitas el canje en PayPal o USDT, la orden entra con <strong>Espera de Autorización</strong>. Al autorizarla <strong>trabajofino52@gmail.com</strong>, el sistema despacha automáticamente el pago vía <strong>PayPal Payouts v1</strong> o registra el lote <strong>USDT TRC-20</strong>.
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-1 font-sans">
                  <button
                    type="button"
                    onClick={() => {
                      setIsTransferModalOpen(false);
                      setIsRedemptionModalOpen(true);
                      soundFx.playClick();
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5"
                  >
                    <span>Solicitar Retiro a PayPal o USDT</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTransferModalOpen(false);
                      setIsStoreOpen(true);
                      soundFx.playClick();
                    }}
                    className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700"
                  >
                    Recargar Monedas (PayPal / USDT)
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'history' && (
            <div className="space-y-4">
              {/* P2P Coin Transfers History */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Transferencias P2P Recientes ({transfersHistory.length})
                </h4>
                {transfersHistory.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-500 text-center">
                    No hay transferencias entre jugadores registradas en esta cuenta todavía.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {transfersHistory.map(tr => {
                      const isOutgoing = tr.senderEmail.toLowerCase() === userEmail.toLowerCase();
                      return (
                        <div
                          key={tr.id}
                          className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-slate-200 truncate">
                              {isOutgoing ? `Enviado a ${tr.recipientEmail}` : `Recibido de ${tr.senderEmail}`}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {new Date(tr.createdAt).toLocaleString()} · TX {tr.txHash.slice(0, 12)}...
                            </div>
                            {tr.note && <div className="text-[11px] text-slate-400 mt-0.5">{tr.note}</div>}
                          </div>
                          <div className="text-right font-mono tabular-nums shrink-0">
                            <div className={`font-bold ${isOutgoing ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {isOutgoing ? `-${tr.grossCoins.toLocaleString()} mo` : `+${tr.netCoins.toLocaleString()} mo`}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Comisión casa: {tr.feeCoins} mo ({tr.feePct}%)
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Player Withdrawals Status History */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Tus Solicitudes de Retiro PayPal / USDT ({userRedemptions.length})
                </h4>
                {userRedemptions.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-500 text-center">
                    No tienes solicitudes de canje registradas.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {userRedemptions.map(req => (
                      <div
                        key={req.id}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-slate-200 flex items-center gap-2">
                            <span>{req.destinationType.toUpperCase()}</span>
                            <span className="font-mono text-[10px] text-slate-400 truncate max-w-[180px]">
                              {req.destinationAddress}
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {new Date(req.timestamp).toLocaleString()} · {req.awaitingAuthorization ? 'Espera Autorización Dueño' : req.status}
                          </div>
                          {req.payoutStatus && (
                            <div className="text-[10px] font-mono text-cyan-300 mt-0.5">
                              Payout: {req.payoutStatus} {req.externalPayoutId ? `(${req.externalPayoutId})` : ''}
                            </div>
                          )}
                        </div>
                        <div className="text-right font-mono tabular-nums shrink-0">
                          <div className="font-bold text-emerald-400">${req.netUSD.toFixed(2)} USD</div>
                          <div className="text-[10px] text-slate-500">{req.amountCoins.toLocaleString()} mo</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
