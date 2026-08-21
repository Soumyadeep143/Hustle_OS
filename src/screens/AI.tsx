import { useState } from 'react';
import { ChevronRight, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { useUi } from '../store/useUi';

const SUGGESTED = [
  "What's my plan today?",
  'Which applications need a follow-up?',
  'What did I save to RECALL this week?',
  'What do I have to follow up on today?',
  'What should I do next?',
  'Any deadlines coming up?',
];

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

export function AI() {
  const setVoiceOpen = useUi((s) => s.setVoiceOpen);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState('');

  const ask = async (prompt: string) => {
    if (!prompt.trim() || typing) return;
    setMessages((m) => [...m, { role: 'user', text: prompt }]);
    setInput('');
    setTyping(true);
    try {
      const res = await api.voice.command(prompt);
      setMessages((m) => [...m, { role: 'ai', text: res.response }]);
      // May have just created a task via the create_task tool -- refresh so
      // the FOCUS list on Home reflects it without a full app reload.
      void useUi.getState().refreshTasks();
    } catch {
      setMessages((m) => [...m, { role: 'ai', text: "I couldn't reach HustleOS — try again in a moment." }]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100dvh-116px)] flex-col gap-6 px-5 pt-6">
      <div>
        <span className="text-[11px] font-semibold tracking-[.18em] text-[var(--color-blue)]">✦ HUSTLEOS AI</span>
        <h1 className="mt-1 font-[var(--font-display)] text-[22px] font-semibold text-[var(--color-ink)]">
          Ask anything about your work.
        </h1>
      </div>

      <button
        onClick={() => setVoiceOpen(true)}
        className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 text-left"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <MiniOrb />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-[var(--color-ink)]">Speak to HustleOS</div>
          <div className="text-[12.5px] text-[var(--color-ink-2)]">Hands-free · listens, recalls, answers</div>
        </div>
        <ChevronRight size={18} className="shrink-0 text-[var(--color-blue)]" />
      </button>

      <div className="flex-1">
        {messages.length === 0 ? (
          <div className="flex flex-col">
            {SUGGESTED.map((prompt) => (
              <button
                key={prompt}
                onClick={() => ask(prompt)}
                className="flex items-center justify-between gap-3 border-b border-[var(--color-line-2)] py-3.5 text-left last:border-b-0"
              >
                <span className="text-[14.5px] text-[var(--color-ink)]">{prompt}</span>
                <ArrowRight size={16} className="shrink-0 text-[var(--color-blue)]" />
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3 pb-4">
            {messages.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className="ml-auto max-w-[85%] rounded-[13px_13px_4px_13px] px-4 py-2.5 text-[14.5px] text-white" style={{ background: 'var(--color-blue)' }}>
                  {m.text}
                </div>
              ) : (
                <div
                  key={i}
                  className="mr-auto max-w-[90%] rounded-[13px_13px_13px_4px] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 text-[14.5px] leading-relaxed text-[var(--color-ink)]"
                  style={{ boxShadow: 'var(--shadow-card)' }}
                >
                  {m.text}
                </div>
              )
            )}
            {typing && (
              <div className="mr-auto text-[12.5px] text-[var(--color-ink-3)]">Reading calendar, tasks and memory…</div>
            )}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="sticky bottom-0 flex items-center gap-2 border-t border-[var(--color-line-2)] bg-[var(--color-bg)] py-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask HustleOS…"
          className="flex-1 rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-raised)] px-3.5 py-2.5 text-[14px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)]"
        />
        <button
          type="submit"
          disabled={typing || !input.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-white disabled:opacity-40"
          style={{ background: 'var(--color-blue)' }}
        >
          <ArrowRight size={18} />
        </button>
      </form>
    </div>
  );
}

function MiniOrb() {
  return (
    <div className="relative h-11 w-11 shrink-0">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle at 34% 30%,var(--color-blue) 0%,transparent 70%)',
          animation: 'hosBreathe 4s ease-in-out infinite',
        }}
      />
      <div
        className="absolute inset-[6px] rounded-full"
        style={{ background: 'radial-gradient(circle at 60% 65%,var(--color-yellow-ink) 0%,transparent 65%)', opacity: 0.6 }}
      />
      <div
        className="absolute inset-[14px] rounded-full"
        style={{ background: 'rgba(255,255,255,.9)', filter: 'blur(2px)' }}
      />
    </div>
  );
}
