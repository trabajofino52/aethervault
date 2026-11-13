import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import {
  LifeBuoy,
  X,
  MessageSquare,
  Lock,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  RefreshCw,
  Shield,
  HelpCircle,
  KeyRound,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Search,
  Check
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import { TicketCategory, TicketPriority, SupportTicket } from '../types';

export const UserSupportPanel: React.FC = () => {
  const {
    isSupportPanelOpen,
    setIsSupportPanelOpen,
    userEmail,
    isOwner,
    isDemoAccount,
    supportTickets,
    createSupportTicket,
    replyToTicket,
    updateUserPassword,
    resolvePaymentByTxHash,
    isRealAccountActive,
    coins
  } = useGame();

  const [activeTab, setActiveTab] = useState<'tickets' | 'security' | 'payments' | 'faq'>('tickets');

  // Ticket creation state
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [category, setCategory] = useState<TicketCategory>('PAYMENT_ISSUE');
  const [priority, setPriority] = useState<TicketPriority>('ALTA');
  const [subject, setSubject] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  const [relatedTxHash, setRelatedTxHash] = useState('');
  const [relatedAmountUSD, setRelatedAmountUSD] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketReplyText, setTicketReplyText] = useState('');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isUpdatingPwd, setIsUpdatingPwd] = useState(false);

  // Payment resolution state
  const [lookupHash, setLookupHash] = useState('');
  const [lookupGateway, setLookupGateway] = useState('USDT (TRC-20)');
  const [lookupCoins, setLookupCoins] = useState('100');
  const [isResolvingPayment, setIsResolvingPayment] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{
    success: boolean;
    credited: boolean;
    message: string;
    coinsAdded?: number;
  } | null>(null);

  if (!isSupportPanelOpen) return null;

  // Filter tickets for current user or all if owner
  const myTickets = isOwner
    ? supportTickets
    : supportTickets.filter(t => t.userEmail === userEmail || (isDemoAccount && t.userEmail.includes('demo')));

  const activeTicket = myTickets.find(t => t.id === selectedTicketId) || (myTickets.length > 0 && !showNewTicketForm ? myTickets[0] : null);

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !initialMessage.trim()) return;

    const createdTicket = createSupportTicket({
      category,
      priority,
      subject: subject.trim(),
      initialMessage: initialMessage.trim(),
      paymentTxHash: relatedTxHash.trim() || undefined,
      paymentAmountCoins: relatedAmountUSD ? Math.round(parseFloat(relatedAmountUSD) / 0.8) : undefined
    });

    setSubject('');
    setInitialMessage('');
    setRelatedTxHash('');
    setRelatedAmountUSD('');
    setShowNewTicketForm(false);
    setSelectedTicketId(createdTicket.id);
    soundFx.playPushNotification();
  };

  const handleSendTicketReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketReplyText.trim() || !activeTicket) return;

    replyToTicket(activeTicket.id, ticketReplyText.trim(), isOwner);
    setTicketReplyText('');
    soundFx.playClick();
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'La nueva contraseña y la confirmación no coinciden.' });
      soundFx.playClick();
      return;
    }

    setIsUpdatingPwd(true);
    const res = await updateUserPassword(currentPassword, newPassword);
    setIsUpdatingPwd(false);

    if (res.success) {
      setPasswordMsg({ type: 'success', text: res.message });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPasswordMsg({ type: 'error', text: res.message });
    }
  };

  const handleDiagnosePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupHash.trim()) return;

    setIsResolvingPayment(true);
    setPaymentResult(null);

    setTimeout(() => {
      const res = resolvePaymentByTxHash(
        lookupHash.trim(),
        lookupGateway,
        parseInt(lookupCoins, 10) || 100
      );
      setIsResolvingPayment(false);
      setPaymentResult(res);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/60 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-500/20 to-cyan-500/20 border border-amber-500/30 rounded-xl text-amber-400">
              <LifeBuoy className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-cyan-300">
                  Panel de Soporte & Seguridad
                </h2>
                {isDemoAccount && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    CUENTA DEMO
                  </span>
                )}
                {isOwner && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    ADMINISTRADOR
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Atención mediante tickets directos, seguridad de acceso y conciliación de transacciones en USDT / Pasarelas.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundFx.playClick();
              setIsSupportPanelOpen(false);
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/90 px-6 gap-2 pt-2">
          <button
            onClick={() => {
              setActiveTab('tickets');
              soundFx.playClick();
            }}
            className={`flex items-center gap-2 px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition ${
              activeTab === 'tickets'
                ? 'border-amber-400 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Tickets de Soporte
            {myTickets.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-slate-800 border border-slate-700 rounded-full text-slate-300">
                {myTickets.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('security');
              soundFx.playClick();
            }}
            className={`flex items-center gap-2 px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition ${
              activeTab === 'security'
                ? 'border-amber-400 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-4 h-4" />
            Modificar Contraseña
          </button>

          <button
            onClick={() => {
              setActiveTab('payments');
              soundFx.playClick();
            }}
            className={`flex items-center gap-2 px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition ${
              activeTab === 'payments'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Resolución de Pagos
          </button>

          <button
            onClick={() => {
              setActiveTab('faq');
              soundFx.playClick();
            }}
            className={`flex items-center gap-2 px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition ${
              activeTab === 'faq'
                ? 'border-amber-400 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            Preguntas Frecuentes
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: TICKETS DE SOPORTE */}
          {activeTab === 'tickets' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Tickets de Soporte Técnico y Transaccional</span>
                    {myTickets.length > 0 && (
                      <span className="text-xs font-normal text-slate-400">({myTickets.length} registros)</span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Comunícate con el Administrador para asistencia en depósitos, retiros o dudas del juego.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowNewTicketForm(!showNewTicketForm);
                    soundFx.playClick();
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg transition flex items-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {showNewTicketForm ? 'Ver Mis Tickets' : '+ Abrir Nuevo Ticket'}
                </button>
              </div>

              {/* Form to open ticket */}
              {showNewTicketForm ? (
                <form onSubmit={handleCreateTicket} className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2 text-amber-400 text-sm font-bold pb-2 border-b border-slate-800">
                    <LifeBuoy className="w-4 h-4" />
                    <span>Crear Nuevo Ticket de Asistencia</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Categoría del Caso</label>
                      <select
                        value={category}
                        onChange={e => setCategory(e.target.value as TicketCategory)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
                      >
                        <option value="PAYMENT_ISSUE">Problema con Depósito / Pasarela</option>
                        <option value="WITHDRAWAL_QUERY">Consulta sobre Retiro en USDT</option>
                        <option value="ACCOUNT_SECURITY">Seguridad de Cuenta / Contraseña</option>
                        <option value="GAME_BUG">Comportamiento en un Juego</option>
                        <option value="GENERAL_SUPPORT">Consulta General</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Prioridad</label>
                      <select
                        value={priority}
                        onChange={e => setPriority(e.target.value as TicketPriority)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
                      >
                        <option value="URGENTE">Urgente (Pagos o Bloqueos)</option>
                        <option value="ALTA">Alta</option>
                        <option value="MEDIA">Media</option>
                        <option value="BAJA">Baja</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Asunto del Ticket</label>
                    <input
                      type="text"
                      placeholder="Ej: Depósito de $50 USD en USDT TRC-20 pendiente de acreditar"
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Hash / TXID o Ref. de Pago (Opcional)</label>
                      <input
                        type="text"
                        placeholder="Ej: 4f9a32c7b1e8... o ID de PayPal"
                        value={relatedTxHash}
                        onChange={e => setRelatedTxHash(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono text-xs focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Monto en USD (Opcional)</label>
                      <input
                        type="number"
                        placeholder="Ej: 50.00"
                        value={relatedAmountUSD}
                        onChange={e => setRelatedAmountUSD(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Detalle del Mensaje</label>
                    <textarea
                      rows={4}
                      placeholder="Describe claramente la situación, fecha, hora aproximada o pasos para reproducir..."
                      value={initialMessage}
                      onChange={e => setInitialMessage(e.target.value)}
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowNewTicketForm(false)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-lg shadow-lg transition flex items-center gap-2"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Enviar Ticket al Soporte
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Ticket List column */}
                  <div className="lg:col-span-1 space-y-2 border-r border-slate-800/80 pr-0 lg:pr-3 max-h-[500px] overflow-y-auto">
                    {myTickets.length === 0 ? (
                      <div className="text-center py-10 px-4 bg-slate-950/40 rounded-xl border border-slate-800">
                        <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-xs text-slate-400 font-medium">No tienes tickets abiertos aún.</p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Abre un ticket para consultar sobre cualquier pago o ajuste.
                        </p>
                      </div>
                    ) : (
                      myTickets.map(t => {
                        const isSelected = activeTicket?.id === t.id;
                        const statusColors: Record<string, string> = {
                          ABIERTO: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                          EN_REVISION: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
                          RESPONDIDO: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
                          RESUELTO: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                          REEMBOLSO_PROCESADO: 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        };
                        const statusLabels: Record<string, string> = {
                          ABIERTO: 'Abierto',
                          EN_REVISION: 'En Revisión',
                          RESPONDIDO: 'Respondido',
                          RESUELTO: 'Resuelto',
                          REEMBOLSO_PROCESADO: 'Reembolso Procesado'
                        };

                        return (
                          <div
                            key={t.id}
                            onClick={() => {
                              setSelectedTicketId(t.id);
                              soundFx.playClick();
                            }}
                            className={`p-3 rounded-xl border cursor-pointer transition text-left ${
                              isSelected
                                ? 'bg-amber-500/10 border-amber-500/50 shadow-md'
                                : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] font-mono text-slate-400">#{t.id.slice(-6)}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[t.status]}`}>
                                {statusLabels[t.status] || t.status}
                              </span>
                            </div>
                            <div className="text-xs font-bold text-slate-100 truncate mb-1">{t.subject}</div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span className="truncate max-w-[120px]">{t.category}</span>
                              <span>{new Date(t.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Active Ticket Details & Message thread */}
                  <div className="lg:col-span-2 bg-slate-950/50 border border-slate-800 rounded-xl p-4 flex flex-col justify-between min-h-[400px]">
                    {activeTicket ? (
                      <div className="flex flex-col h-full justify-between space-y-4">
                        <div>
                          {/* Ticket Header info */}
                          <div className="border-b border-slate-800 pb-3">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                <span>{activeTicket.subject}</span>
                                <span className="text-xs font-mono text-slate-500">#{activeTicket.id.slice(-6)}</span>
                              </h4>
                              <span
                                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                                  activeTicket.status === 'RESUELTO'
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    : activeTicket.status === 'REEMBOLSO_PROCESADO'
                                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                    : activeTicket.status === 'EN_REVISION'
                                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                }`}
                              >
                                {activeTicket.status === 'REEMBOLSO_PROCESADO'
                                  ? 'Reembolso Procesado'
                                  : activeTicket.status === 'EN_REVISION'
                                  ? 'En Revisión'
                                  : activeTicket.status === 'RESUELTO'
                                  ? 'Resuelto'
                                  : activeTicket.status === 'RESPONDIDO'
                                  ? 'Respondido'
                                  : 'Abierto'}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                              <span>Usuario: <strong className="text-slate-300">{activeTicket.userEmail}</strong></span>
                              <span>Prioridad: <strong className="text-amber-400">{activeTicket.priority}</strong></span>
                              {activeTicket.paymentAmountCoins && (
                                <span>Monto: <strong className="text-emerald-400">{activeTicket.paymentAmountCoins.toLocaleString()} mo (${(activeTicket.paymentAmountCoins * 0.8).toFixed(2)} USD)</strong></span>
                              )}
                              {activeTicket.paymentTxHash && (
                                <span className="font-mono text-[10px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800 truncate max-w-[200px]">
                                  TX: {activeTicket.paymentTxHash}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Message thread */}
                          <div className="space-y-3 py-3 max-h-[250px] overflow-y-auto pr-2 mt-2">
                            {activeTicket.messages.map(msg => (
                              <div
                                key={msg.id}
                                className={`p-3 rounded-xl border text-xs ${
                                  msg.isAdmin
                                    ? 'bg-amber-950/20 border-amber-500/30 ml-4'
                                    : 'bg-slate-900/80 border-slate-800 mr-4'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`font-bold ${msg.isAdmin ? 'text-amber-300' : 'text-cyan-300'}`}>
                                    {msg.senderName} {msg.isAdmin && '🛡️ (Soporte Oficial)'}
                                  </span>
                                  <span className="text-[10px] text-slate-500">
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-slate-200 whitespace-pre-wrap">{msg.message}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Reply box */}
                        {activeTicket.status !== 'RESUELTO' && activeTicket.status !== 'REEMBOLSO_PROCESADO' ? (
                          <form onSubmit={handleSendTicketReply} className="flex gap-2 pt-2 border-t border-slate-800">
                            <input
                              type="text"
                              placeholder={isOwner ? "Escribe tu respuesta como Administrador..." : "Escribe una respuesta o aclara detalles al soporte..."}
                              value={ticketReplyText}
                              onChange={e => setTicketReplyText(e.target.value)}
                              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                            />
                            <button
                              type="submit"
                              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-lg transition flex items-center gap-1.5"
                            >
                              <Send className="w-3.5 h-3.5" />
                              Enviar
                            </button>
                          </form>
                        ) : (
                          <div className={`p-2.5 rounded-lg text-[11px] flex items-center gap-2 border ${
                            activeTicket.status === 'REEMBOLSO_PROCESADO'
                              ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          }`}>
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>
                              Este ticket ha sido marcado como{' '}
                              <strong>
                                {activeTicket.status === 'REEMBOLSO_PROCESADO' ? 'REEMBOLSO PROCESADO' : 'RESUELTO'}
                              </strong>. Si tienes una nueva incidencia, abre un nuevo ticket.
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs py-16">
                        <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                        <p>Selecciona un ticket de la lista para ver el historial o pulsa "+ Abrir Nuevo Ticket".</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MODIFICAR CONTRASEÑA */}
          {activeTab === 'security' && (
            <div className="max-w-xl mx-auto space-y-6">
              <div className="text-center pb-2">
                <div className="inline-flex p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-400 mb-2">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-white">Actualización de Contraseña y Credenciales</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Mantén tu cuenta protegida mediante cifrado local SHA-256 de alta fidelidad.
                </p>
              </div>

              {/* Special info banner for Demo or Owner */}
              {isDemoAccount && (
                <div className="p-3 bg-cyan-950/40 border border-cyan-500/40 rounded-xl text-xs text-cyan-200 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-cyan-300">Cuenta Demo Aislada (gokudemo):</strong>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Clave inicial: <code className="text-amber-300 font-mono">goku30309982</code>. Puedes modificarla para tu sesión de pruebas actual.
                    </p>
                  </div>
                </div>
              )}

              {isOwner && (
                <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl text-xs text-amber-200 flex items-start gap-2.5">
                  <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-amber-300">Cuenta Propietario (trabajofino52@gmail.com):</strong>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Protegida con la Clave Maestra de 256 bits (<code className="text-amber-300 font-mono">GokuCheckersMasterKey2024Secure</code>). Se verificará criptográficamente antes de autorizar el cambio.
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleUpdatePassword} className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-4">
                {passwordMsg && (
                  <div
                    className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                      passwordMsg.type === 'success'
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                    }`}
                  >
                    {passwordMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    <span>{passwordMsg.text}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Contraseña Actual {isOwner ? '(Clave Maestra Propietario)' : isDemoAccount ? '(Clave Demo: goku30309982)' : ''}
                  </label>
                  <input
                    type="password"
                    placeholder="Introduce tu contraseña actual"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nueva Contraseña</label>
                  <input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Confirmar Nueva Contraseña</label>
                  <input
                    type="password"
                    placeholder="Repite la nueva contraseña"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isUpdatingPwd}
                    className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                  >
                    {isUpdatingPwd ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    Guardar Nueva Contraseña
                  </button>
                </div>
              </form>

              {/* Security info card */}
              <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl space-y-2 text-xs text-slate-400">
                <div className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Seguridad de Sesión y Autenticación</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="p-2 bg-slate-900/60 rounded border border-slate-800/80">
                    <span className="text-slate-500 block">Usuario Activo:</span>
                    <span className="text-slate-200 font-mono">{userEmail}</span>
                  </div>
                  <div className="p-2 bg-slate-900/60 rounded border border-slate-800/80">
                    <span className="text-slate-500 block">Estado de Bóveda:</span>
                    <span className="text-emerald-400 font-bold">Activo & Encriptado</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RESOLUCIÓN DE PAGOS */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-cyan-400" />
                  <span>Centro de Diagnóstico & Conciliación Inmediata de Pagos</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  ¿Hiciste un depósito en USDT, Tarjeta de Crédito o PayPal y aún no ves tus monedas reflejadas? Introduce el TXID o referencia bancaria para verificar el bloque y acreditar tus monedas en el acto.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Form column */}
                <form onSubmit={handleDiagnosePayment} className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="text-xs font-bold text-amber-400 flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    <span>Verificador Automatizado de Transacciones</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Pasarela / Red de Pago Utilizada</label>
                    <select
                      value={lookupGateway}
                      onChange={e => setLookupGateway(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-400"
                    >
                      <option value="USDT (TRC-20)">USDT (Red TRC-20 Tron) [Predeterminada]</option>
                      <option value="Tarjeta de Crédito / Cryptomus">Tarjeta de Crédito (Cryptomus / MoonPay sin KYC)</option>
                      <option value="PayPal Business">PayPal Business</option>
                      <option value="Monero (XMR)">Monero (XMR Privado)</option>
                      <option value="Bitcoin (BTC)">Bitcoin (BTC)</option>
                      <option value="Transferencia Bancaria">Transferencia Bancaria Directa</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      TXID, Hash de Bloque o Referencia de Pago
                    </label>
                    <input
                      type="text"
                      placeholder="Pega aquí el TXID de TronScan o el comprobante"
                      value={lookupHash}
                      onChange={e => setLookupHash(e.target.value)}
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-400"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Tip: En TronScan es una cadena de 64 caracteres. En PayPal es el ID de transacción.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Monedas Estimadas a Recibir</label>
                    <select
                      value={lookupCoins}
                      onChange={e => setLookupCoins(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-400"
                    >
                      <option value="100">100 Monedas ($80 USD)</option>
                      <option value="250">250 Monedas ($200 USD)</option>
                      <option value="500">500 Monedas ($400 USD)</option>
                      <option value="1000">1,000 Monedas ($800 USD)</option>
                      <option value="2500">2,500 Monedas ($2,000 USD)</option>
                      <option value="6250">6,250 Monedas ($5,000 USD)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isResolvingPayment || !lookupHash.trim()}
                    className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                  >
                    {isResolvingPayment ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Diagnosticar y Acreditar Pago
                  </button>
                </form>

                {/* Result column */}
                <div className="space-y-4">
                  {paymentResult ? (
                    <div
                      className={`p-5 rounded-xl border ${
                        paymentResult.credited
                          ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                          : paymentResult.success
                          ? 'bg-cyan-950/30 border-cyan-500/40 text-cyan-200'
                          : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-sm mb-2">
                        {paymentResult.credited ? (
                          <>
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            <span className="text-emerald-300">¡Pago Conciliado y Saldo Acreditado!</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-5 h-5 text-amber-400" />
                            <span className="text-amber-300">Diagnóstico de Transacción</span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed mb-3">
                        {paymentResult.message}
                      </p>
                      {paymentResult.coinsAdded && (
                        <div className="p-3 bg-emerald-900/40 border border-emerald-500/30 rounded-lg flex items-center justify-between text-xs font-bold text-emerald-300">
                          <span>Monedas agregadas a tu balance:</span>
                          <span className="text-sm">+{paymentResult.coinsAdded.toLocaleString()} mo</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-5 bg-slate-950/40 border border-slate-800 rounded-xl space-y-3">
                      <div className="font-bold text-sm text-slate-200 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-cyan-400" />
                        <span>Tiempos de Confirmación de Red</span>
                      </div>
                      <ul className="space-y-2 text-xs text-slate-400">
                        <li className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span><strong>USDT TRC-20:</strong> Se acredita en ~30 a 90 segundos (requiere 19 confirmaciones de bloque).</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span><strong>Tarjeta de Crédito (Cryptomus / MoonPay):</strong> Instantáneo tras la autorización bancaria 3D Secure.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span><strong>PayPal Business:</strong> Confirmación automática webhook en menos de 2 minutos.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span><strong>Monero (XMR):</strong> 10 confirmaciones de bloque (~20 minutos por privacidad ringCT).</span>
                        </li>
                      </ul>
                    </div>
                  )}

                  {/* Activation info */}
                  <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl text-xs space-y-2">
                    <div className="font-bold text-slate-200 flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-amber-400" />
                      <span>Política de Activación de Cuentas Reales</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Como medida anti-fraude, las cuentas de juego real se activan automáticamente en el momento en que se confirma el primer depósito en la bóveda. Las cuentas demo (como <code className="text-cyan-300">gokudemo</code>) operan en un entorno aislado con $5,000 USD virtuales.
                    </p>
                    <div className="pt-1 flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">Estado de tu cuenta:</span>
                      {isDemoAccount ? (
                        <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
                          Demo Aislada ($5,000 USD)
                        </span>
                      ) : isRealAccountActive ? (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                          Cuenta Real Activa
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                          Pendiente de Primer Depósito
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PREGUNTAS FRECUENTES (FAQ) */}
          {activeTab === 'faq' && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <div className="text-center pb-2">
                <h3 className="text-lg font-black text-white">Preguntas Frecuentes & Asistencia Rápida</h3>
                <p className="text-xs text-slate-400">
                  Respuestas inmediatas a las dudas operativas más comunes de los jugadores.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5">
                  <h4 className="text-xs font-bold text-amber-300 flex items-center gap-2">
                    <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                    ¿Cómo retiro mis ganancias y cuál es el método predeterminado?
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed pl-5">
                    El método de pago predeterminado es <strong>USDT en red TRC-20</strong> por su velocidad y costos mínimos. También puedes optar por Monero (XMR) para privacidad total, Bitcoin, PayPal o Transferencia Bancaria. La tasa oficial es de <strong>1,000 monedas = $800.00 USD</strong>.
                  </p>
                </div>

                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5">
                  <h4 className="text-xs font-bold text-amber-300 flex items-center gap-2">
                    <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                    ¿Puedo pagar con tarjeta de crédito sin verificar documento de identidad (KYC)?
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed pl-5">
                    Sí. La pasarela integra proveedores como Cryptomus Card Gateway y MoonPay On-Ramp de bajo umbral, que permiten pagar con Visa/Mastercard sin enviar documentos de identidad físicos hasta los montos estándar permitidos.
                  </p>
                </div>

                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5">
                  <h4 className="text-xs font-bold text-amber-300 flex items-center gap-2">
                    <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                    ¿Cómo funciona la cuenta demo 'gokudemo'?
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed pl-5">
                    La cuenta demo permite probar todos los 50 juegos y funciones con un saldo precargado de <strong>$5,000 USD (6,250 monedas)</strong>. Está totalmente aislada de las cuentas de dinero real, y puedes restablecer los $5,000 USD en cualquier momento con un solo clic.
                  </p>
                </div>

                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5">
                  <h4 className="text-xs font-bold text-amber-300 flex items-center gap-2">
                    <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                    ¿Qué hago si mi depósito tarda más de lo previsto?
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed pl-5">
                    Ve a la pestaña <strong>"Resolución de Pagos"</strong> en este mismo panel, pega el TXID o número de transacción y presiona "Diagnosticar y Acreditar Pago". Si el sistema requiere intervención manual, abre un ticket y el Administrador (<code className="text-slate-300">trabajofino52@gmail.com</code>) lo acreditará inmediatamente.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Servidor de Soporte Operativo 24/7</span>
          </div>
          <button
            onClick={() => {
              soundFx.playClick();
              setIsSupportPanelOpen(false);
            }}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition"
          >
            Cerrar Panel
          </button>
        </div>

      </div>
    </div>
  );
};
