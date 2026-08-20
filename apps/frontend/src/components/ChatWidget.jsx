import { useState, useRef, useEffect } from 'react';

const CHATBOT_URL = 'http://localhost:5050/api/chat';

const WELCOME_MSG = {
  id: 'welcome',
  role: 'bot',
  text: '🦟 Hello! I\'m the **DengueRadar AI Assistant**.\n\nAsk me about dengue risk in your area, symptoms, or prevention tips.\n\nTry: *"risk in Homagama"*',
};

/** Render *bold* and newlines from the bot response */
function FormatText({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**'))
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (part.startsWith('*') && part.endsWith('*'))
          return <em key={i} style={{ color: 'inherit', opacity: 0.85 }}>{part.slice(1, -1)}</em>;
        return part.split('\n').map((line, j, arr) => (
          <span key={`${i}-${j}`}>{line}{j < arr.length - 1 && <br />}</span>
        ));
      })}
    </span>
  );
}

function BotIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
      <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none"/>
      <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none"/>
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '12px 16px', background: 'var(--surface-2)', borderRadius: '18px 18px 18px 4px', width: 'fit-content' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: '7px', height: '7px', borderRadius: '50%',
          background: 'var(--text-3)',
          animation: 'chatDot 1.2s infinite',
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
    </div>
  );
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MSG]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setHasNew(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { id: Date.now(), role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(CHATBOT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      const reply = data.reply || data.error || 'Sorry, I could not get a response.';
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'bot', text: reply }]);
      if (!open) setHasNew(true);
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'bot',
        text: '⚠️ Unable to reach the assistant. Please make sure the chatbot service is running on port 5050.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      {/* CSS animations */}
      <style>{`
        @keyframes chatDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes chatPulseRing {
          0%   { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .chat-widget-window {
          animation: chatSlideUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .chat-send-btn:hover { transform: scale(1.1); }
        .chat-send-btn:active { transform: scale(0.96); }
        .chat-fab:hover { transform: scale(1.08); box-shadow: 0 8px 32px rgba(14,165,165,0.5) !important; }
        .chat-fab:active { transform: scale(0.95); }
        .chat-msg-user { animation: chatSlideUp 0.18s ease; }
        .chat-msg-bot { animation: chatSlideUp 0.18s ease; }
      `}</style>

      {/* Chat Window */}
      {open && (
        <div className="chat-widget-window" style={{
          position: 'fixed', bottom: '90px', right: '24px', zIndex: 9999,
          width: '360px', height: '520px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #0d9488 0%, #0891b2 100%)',
            padding: '16px 18px',
            display: 'flex', alignItems: 'center', gap: '12px',
            flexShrink: 0,
          }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', flexShrink: 0,
            }}>
              <BotIcon />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '14px', lineHeight: 1.2 }}>DengueRadar AI</div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                Dengue guidance assistant
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{
              background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer',
              color: '#fff', borderRadius: '8px', padding: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
            >
              <CloseIcon />
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '16px',
            display: 'flex', flexDirection: 'column', gap: '10px',
            scrollbarWidth: 'thin',
          }}>
            {messages.map(msg => (
              <div key={msg.id} className={`chat-msg-${msg.role}`} style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                {msg.role === 'bot' && (
                  <div style={{
                    width: '26px', height: '26px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #0d9488, #0891b2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', flexShrink: 0, marginRight: '8px', marginTop: '2px',
                    fontSize: '12px',
                  }}>🦟</div>
                )}
                <div style={{
                  maxWidth: '80%',
                  padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, #0d9488, #0891b2)'
                    : 'var(--surface-2)',
                  color: msg.role === 'user' ? '#fff' : 'var(--text)',
                  fontSize: '13px', lineHeight: '1.5',
                  wordBreak: 'break-word',
                  boxShadow: msg.role === 'user' ? '0 2px 12px rgba(13,148,136,0.3)' : 'none',
                }}>
                  <FormatText text={msg.text} />
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'linear-gradient(135deg, #0d9488, #0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 }}>🦟</div>
                <TypingDots />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '12px 14px',
            borderTop: '1px solid var(--border)',
            background: 'var(--surface)',
            display: 'flex', gap: '8px', alignItems: 'flex-end',
            flexShrink: 0,
          }}>
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px';
              }}
              onKeyDown={handleKey}
              placeholder="Ask about dengue..."
              style={{
                flex: 1, resize: 'none', border: '1.5px solid var(--border)',
                borderRadius: '12px', padding: '9px 12px',
                fontSize: '13px', fontFamily: 'inherit',
                background: 'var(--surface-2)', color: 'var(--text)',
                outline: 'none', lineHeight: '1.4', overflow: 'hidden',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = '#0d9488'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            <button
              className="chat-send-btn"
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              style={{
                width: '38px', height: '38px', borderRadius: '12px', border: 'none',
                background: input.trim() && !loading
                  ? 'linear-gradient(135deg, #0d9488, #0891b2)'
                  : 'var(--surface-2)',
                color: input.trim() && !loading ? '#fff' : 'var(--text-3)',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s', flexShrink: 0,
              }}
            >
              <SendIcon />
            </button>
          </div>

          {/* Disclaimer */}
          <div style={{
            padding: '6px 14px 10px',
            fontSize: '10px', color: 'var(--text-3)', textAlign: 'center',
            background: 'var(--surface)', flexShrink: 0,
          }}>
            General education only · Not medical advice
          </div>
        </div>
      )}

      {/* FAB Button */}
      <button
        className="chat-fab"
        onClick={() => setOpen(o => !o)}
        title="Chat with DengueRadar AI"
        style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
          width: '56px', height: '56px', borderRadius: '50%', border: 'none',
          background: open
            ? 'linear-gradient(135deg, #475569, #334155)'
            : 'linear-gradient(135deg, #0d9488 0%, #0891b2 100%)',
          color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(13,148,136,0.4)',
          transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {open ? <CloseIcon /> : <BotIcon />}

        {/* Pulse ring when closed */}
        {!open && (
          <span style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '2px solid #0d9488',
            animation: 'chatPulseRing 2s infinite',
            pointerEvents: 'none',
          }} />
        )}

        {/* New message badge */}
        {hasNew && !open && (
          <span style={{
            position: 'absolute', top: '-2px', right: '-2px',
            width: '16px', height: '16px', borderRadius: '50%',
            background: '#ef4444', border: '2px solid var(--bg)',
            fontSize: '9px', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700,
          }}>!</span>
        )}
      </button>
    </>
  );
}
