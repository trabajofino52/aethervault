import React, { useState, useRef, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import {
  MessageSquare,
  Send,
  X,
  Users,
  Smile,
  ShieldCheck,
  Sparkles,
  Bot,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { soundFx } from '../utils/audio';

const QUICK_REACTIONS = [
  { emoji: '🔥', text: '¡All in!' },
  { emoji: '🎉', text: '¡Buena mano!' },
  { emoji: '💎', text: '¡Gran tirada!' },
  { emoji: '🍀', text: '¡Suerte a todos!' },
  { emoji: '👑', text: '¡Victoria total!' },
  { emoji: '👀', text: 'Atentos al croupier' }
];

export const MultiplayerChatWidget: React.FC = () => {
  const {
    isChatWidgetOpen,
    setIsChatWidgetOpen,
    chatMessages,
    sendChatMessage,
    character,
    gameMode,
    onlinePlayersCount
  } = useGame();

  const [inputMessage, setInputMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isChatWidgetOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatWidgetOpen, isMinimized]);

  if (!isChatWidgetOpen) return null;

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim()) return;
    sendChatMessage(inputMessage);
    setInputMessage('');
  };

  const handleQuickReaction = (reactionText: string, emoji: string) => {
    sendChatMessage(`${emoji} ${reactionText}`);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm sm:max-w-md animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-cyan-500/40 shadow-2xl overflow-hidden flex flex-col transition-all duration-300">
        
        {/* Header Bar */}
        <div className="p-3 bg-gradient-to-r from-cyan-950 via-slate-900 to-slate-950 border-b border-cyan-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <span>Chat Multijugador en Vivo</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="text-[10px] text-cyan-400/90 font-mono">
                {gameMode === 'MULTIPLAYER_LIVE' ? `Sala Activa · ${onlinePlayersCount} en línea` : 'Modo Solitario (Solo lectura)'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
              title={isMinimized ? 'Expandir' : 'Minimizar'}
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => {
                setIsChatWidgetOpen(false);
                soundFx.playClick();
              }}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
              title="Cerrar Chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {!isMinimized && (
          <>
            {/* Quick Reactions Bar */}
            <div className="px-3 py-2 bg-slate-950/60 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 shrink-0">Reaccionar:</span>
              {QUICK_REACTIONS.map((qr, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickReaction(qr.text, qr.emoji)}
                  className="px-2 py-1 rounded-md bg-slate-900 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 transition-all shrink-0 active:scale-95 text-[11px] flex items-center gap-1"
                >
                  <span>{qr.emoji}</span>
                  <span className="hidden sm:inline">{qr.text}</span>
                </button>
              ))}
            </div>

            {/* Message Stream */}
            <div className="p-3 max-h-72 min-h-48 overflow-y-auto space-y-2.5 font-sans text-xs">
              {chatMessages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.isUser ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5 text-[10px] text-slate-400 font-mono">
                    <span className={`font-bold ${msg.isUser ? 'text-amber-300' : 'text-cyan-300'}`}>
                      {msg.sender}
                    </span>
                    {msg.badge && (
                      <span className="px-1 py-0.2 rounded bg-cyan-950/80 border border-cyan-800/60 text-[9px] text-cyan-300">
                        {msg.badge}
                      </span>
                    )}
                    <span className="text-slate-600">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div
                    className={`px-3 py-2 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                      msg.isSystem
                        ? 'bg-amber-950/40 border border-amber-500/40 text-amber-200 text-center w-full font-mono text-[11px]'
                        : msg.isUser
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-none shadow-md'
                        : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-bl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="p-2.5 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                placeholder="Escribe un mensaje a la mesa..."
                maxLength={140}
                className="flex-1 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim()}
                className="p-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-slate-950 font-bold rounded-xl shadow transition-all active:scale-95"
              >
                <Send className="w-4 h-4 fill-slate-950" />
              </button>
            </form>
          </>
        )}

      </div>
    </div>
  );
};
