import { useState, useRef, useEffect } from 'react';
import { aiAPI } from '../../api';
import { Bot, X, Send, User, AlertCircle } from 'lucide-react';

const WELCOME = {
  id: 'welcome',
  role: 'assistant',
  content: "Hello! I'm your TransitOps AI assistant. I have access to your real fleet data. Ask me about vehicle status, driver compliance, maintenance scheduling, or operational costs.",
  ts: new Date(),
};

const SUGGESTIONS = [
  "Which drivers have expiring licenses?",
  "How many vehicles are available?",
  "What is our fleet utilization today?",
  "Which vehicles are in maintenance?",
];

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map(i => (
        <span key={i}
          className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

function Bubble({ msg }) {
  const isBot = msg.role === 'assistant';
  const isError = msg.role === 'error';
  return (
    <div className={`flex gap-2 mb-3 ${isBot || isError ? 'items-start' : 'items-end flex-row-reverse'}`}>
      {/* Avatar */}
      <div className={`w-6 h-6 rounded-full flex items-center justify-center
                       shrink-0 mt-0.5
        ${isBot || isError
          ? 'bg-orange-500/20 text-orange-400'
          : 'bg-blue-500/20 text-blue-400'}`}>
        {isBot || isError ? <Bot size={12} /> : <User size={12} />}
      </div>

      {/* Bubble */}
      <div className={`max-w-[80%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed
        ${isError
          ? 'bg-red-500/20 border border-red-500/30 text-red-300'
          : isBot
            ? 'bg-slate-700 text-slate-100'
            : 'bg-orange-500 text-white'}`}>
        {isError && (
          <div className="flex items-center gap-1 mb-1 text-xs font-medium text-red-400">
            <AlertCircle size={11} /> Error
          </div>
        )}
        <p className="whitespace-pre-wrap">{msg.content}</p>
        <p className={`text-xs mt-1.5 font-mono opacity-60
          ${isBot || isError ? 'text-left' : 'text-right'}`}>
          {msg.ts?.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

export default function AIChatbot({ onClose }) {
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput]       = useState('');
  const [typing, setTyping]     = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async (text) => {
    const content = (text || input).trim();
    if (!content || typing) return;
    setInput('');

    const userMsg = { id: Date.now(), role: 'user', content, ts: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setTyping(true);

    try {
      const res = await aiAPI.chat(content);
      setMessages(prev => [
        ...prev,
        { id: Date.now() + 1, role: 'assistant', content: res.message || res, ts: new Date() }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'error',
          content: err.error || 'Failed to reach AI assistant. Please try again.',
          ts: new Date()
        }
      ]);
    } finally {
      setTyping(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="fixed right-4 bottom-4 z-50 w-[380px] h-[600px]
                    flex flex-col rounded-2xl border border-slate-700
                    bg-slate-900 shadow-2xl shadow-black/50
                    animate-in slide-in-from-bottom-4 duration-300">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3
                      border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-500/30
                          flex items-center justify-center">
            <Bot size={16} className="text-orange-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">TransitOps AI</p>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Fleet data access enabled
            </p>
          </div>
        </div>
        <button onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white
                     hover:bg-slate-800 transition">
          <X size={16} />
        </button>
      </div>

      {/* ── Messages ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {messages.map(msg => <Bubble key={msg.id} msg={msg} />)}
        {typing && (
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center
                            justify-center shrink-0">
              <Bot size={12} className="text-orange-400" />
            </div>
            <div className="bg-slate-700 rounded-2xl">
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Suggestions ─────────────────────────────────────────────── */}
      {messages.length <= 1 && (
        <div className="px-3 pb-2 shrink-0">
          <p className="text-xs text-slate-500 mb-2 font-medium">Quick questions</p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map(q => (
              <button key={q}
                onClick={() => sendMessage(q)}
                disabled={typing}
                className="text-xs px-2.5 py-1.5 rounded-full border border-slate-700
                           text-slate-400 hover:border-orange-500/50 hover:text-orange-400
                           transition disabled:opacity-40">
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Input ───────────────────────────────────────────────────── */}
      <div className="px-3 pb-3 shrink-0 border-t border-slate-700 pt-3">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={typing}
            placeholder="Ask about your fleet..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl
                       px-3 py-2.5 text-sm text-white placeholder-slate-500
                       focus:outline-none focus:ring-2 focus:ring-orange-500/30
                       focus:border-orange-500 transition disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || typing}
            className="w-10 h-10 rounded-xl bg-orange-500 hover:bg-orange-600
                       text-white flex items-center justify-center transition
                       disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
            {typing
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white
                                 rounded-full animate-spin" />
              : <Send size={15} />}
          </button>
        </div>
        <p className="text-xs text-slate-600 text-center mt-2">
          Powered by Claude · Real fleet data
        </p>
      </div>
    </div>
  );
}
