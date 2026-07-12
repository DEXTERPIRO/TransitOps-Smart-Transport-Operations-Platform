import { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Loader2, Trash2 } from 'lucide-react';
import { aiApi } from '../api';
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
      const { data } = await aiApi.ask(msg);
      setMessages((m) => [...m, { role: 'assistant', content: data.reply, ts: new Date() }]);
    } catch {
      toast.error('AI request failed');
      setMessages((m) => [...m, { role: 'assistant', content: '❌ Sorry, I encountered an error. Please try again.', ts: new Date() }]);
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
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Assistant</h1>
          <p className="page-subtitle">Ask questions about your fleet operations</p>
        </div>
        <button onClick={clearChat} className="btn-ghost gap-2">
          <Trash2 size={15} /> Clear
        </button>
      </div>

      {/* Chat window */}
      <div className="flex-1 card overflow-y-auto space-y-4 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === 'user' ? 'bg-brand-500' : 'bg-dark-700'
            }`}>
              {msg.role === 'user'
                ? <User size={15} className="text-white" />
                : <Bot size={15} className="text-brand-400" />
              }
            </div>
            <div className={`max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-brand-500 text-white rounded-tr-sm'
                  : 'bg-dark-800 text-dark-100 rounded-tl-sm'
              }`}>
                {msg.content}
              </div>
              <span className="text-xs text-dark-500">
                {msg.ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center">
              <Bot size={15} className="text-brand-400" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-dark-800 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-brand-400" />
              <span className="text-sm text-dark-400">Thinking…</span>
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
            className="text-xs px-3 py-1.5 rounded-full bg-dark-800 border border-dark-700 
                       text-dark-300 hover:border-brand-500/50 hover:text-brand-400 transition-all"
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
