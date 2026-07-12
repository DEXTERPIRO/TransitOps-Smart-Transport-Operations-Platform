import { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Loader2, Trash2 } from 'lucide-react';
import { aiAPI } from '../api';
import { PageHeader } from '../components/ui';
import toast from 'react-hot-toast';

const SUGGESTIONS = [
  'How many vehicles are active?',
  'How many trips are scheduled today?',
  'What is the total fuel cost?',
  'How many maintenance tasks are pending?',
  'What are the total operational expenses?',
  'How many drivers are currently active?',
];

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "👋 Hi! I'm TransitOps AI. I can answer questions about your fleet — vehicles, trips, fuel, expenses, and more. How can I help?",
      ts: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (msg = input.trim()) => {
    if (!msg || loading) return;
    const userMsg = { role: 'user', content: msg, ts: new Date() };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await aiAPI.chat(msg);
      setMessages((m) => [...m, { role: 'assistant', content: res.reply || res, ts: new Date() }]);
    } catch (err) {
      const errMsg = err?.error || 'AI request failed';
      toast.error(errMsg);
      setMessages((m) => [...m, { role: 'assistant', content: `❌ Sorry, I encountered an error: ${errMsg}. Please try again.`, ts: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: "Chat cleared! Ask me anything about your fleet.",
      ts: new Date(),
    }]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] relative">
      <PageHeader
        title="AI Assistant"
        subtitle="Ask questions about your fleet operations"
        icon={Bot}
        action={
          <button onClick={clearChat} className="btn-secondary gap-2 font-mono text-xs py-1.5 px-3">
            <Trash2 size={13} /> Clear
          </button>
        }
      />

      {/* Chat window */}
      <div className="flex-1 card bg-panel shadow-[var(--shadow-card)] border border-[var(--border-color)] overflow-y-auto space-y-4 mb-4 p-5 relative">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border ${
              msg.role === 'user' ? 'bg-accent border-accent/20 shadow-[var(--shadow-glow)]' : 'bg-recessed border-b-shadow/30'
            }`}>
              {msg.role === 'user'
                ? <User size={15} className="text-white" />
                : <Bot size={15} className="text-accent" />
              }
            </div>
            <div className={`max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
              <div className={`px-4 py-3 rounded-2xl text-xs leading-relaxed border ${
                msg.role === 'user'
                  ? 'bg-accent text-white rounded-tr-sm border-accent/20 shadow-[var(--shadow-glow)] font-mono'
                  : 'bg-recessed text-text-main rounded-tl-sm border-b-shadow/35 shadow-[var(--shadow-recessed)] font-mono'
              }`}>
                {msg.content}
              </div>
              <span className="text-[9px] font-mono text-text-sub uppercase tracking-wider">
                {msg.ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-recessed border border-b-shadow/30 flex items-center justify-center">
              <Bot size={15} className="text-accent" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-recessed border border-b-shadow/35 flex items-center gap-2 font-mono shadow-[var(--shadow-recessed)]">
              <Loader2 size={14} className="animate-spin text-accent" />
              <span className="text-xs text-text-sub">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      <div className="flex flex-wrap gap-2 mb-3">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            className="text-[9px] px-3.5 py-2 rounded-full border border-b-shadow/30 text-text-sub hover:text-[var(--accent)] hover:border-[var(--accent)]/40 bg-[var(--background)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-floating)] active:shadow-[var(--shadow-pressed)] hover:-translate-y-[1px] active:translate-y-[1px] font-mono uppercase tracking-wider transition-all duration-150"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-3">
        <input
          id="ai-input"
          className="input flex-1"
          placeholder="Ask about your fleet…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          className="btn-primary px-5 disabled:opacity-50"
          id="ai-send-btn"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
