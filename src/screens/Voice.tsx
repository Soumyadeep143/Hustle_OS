import { useEffect } from 'react';
import { X, RotateCcw, Mic, Square } from 'lucide-react';
import { VoiceOrb } from '../components/VoiceOrb';
import { useVoiceSession, type VoiceState } from '../hooks/useVoiceSession';
import { useUi } from '../store/useUi';

const STAGE_LABEL: Record<VoiceState, string> = {
  idle: 'Tap the mic to start',
  listening: "I'm listening…",
  thinking: 'Understanding & recalling…',
  speaking: 'Responding…',
};

const RAIL_STEPS: { key: VoiceState; label: string }[] = [
  { key: 'idle', label: 'LISTEN' },
  { key: 'listening', label: 'UNDERSTAND' },
  { key: 'thinking', label: 'RECALL' },
  { key: 'speaking', label: 'ANSWER' },
];
const STAGE_INDEX: Record<VoiceState, number> = { idle: -1, listening: 0, thinking: 1, speaking: 2 };

export function Voice({ onClose }: { onClose: () => void }) {
  const { state, level, transcript, answer, error, start, stop, interrupt, close } = useVoiceSession();

  useEffect(() => {
    void start();
    return () => close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const passedIndex = STAGE_INDEX[state];

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col"
      style={{ background: 'var(--color-bg)', animation: 'hosFade 220ms ease-out' }}
    >
      <div className="flex items-center justify-between px-5 pt-[max(20px,env(safe-area-inset-top))]">
        <span className="text-[11px] font-semibold tracking-[.3em] text-[var(--color-blue)]">HUSTLEOS VOICE</span>
        <button
          onClick={() => {
            close();
            onClose();
          }}
          aria-label="Close voice"
          className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-ink-2)] hover:bg-[var(--color-line-2)]"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
        <VoiceOrb
          state={state}
          level={level}
          onTap={() => (state === 'speaking' ? interrupt() : state === 'idle' ? start() : undefined)}
        />

        <div className="max-w-sm text-center">
          <div className="font-[var(--font-display)] text-[19px] font-semibold leading-snug text-[var(--color-ink)]">
            {transcript || 'Say something…'}
          </div>
          <div className="mt-1 text-[13px] text-[var(--color-ink-2)]">
            {error ?? STAGE_LABEL[state]}
          </div>
        </div>

        {answer && (
          <div
            className="w-full max-w-sm rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 text-[14.5px] leading-relaxed text-[var(--color-ink)]"
            style={{ boxShadow: 'var(--shadow-card)', animation: 'hosUp 320ms ease' }}
          >
            {answer}
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-6 pb-6">
        <button
          onClick={() => start()}
          aria-label="Restart"
          className="flex h-[50px] w-[50px] items-center justify-center rounded-full border border-[var(--color-line)] text-[var(--color-ink-2)] active:scale-90"
        >
          <RotateCcw size={20} />
        </button>
        <button
          onClick={() => (state === 'listening' ? stop() : start())}
          aria-label={state === 'listening' ? 'Stop' : 'Speak'}
          className="flex h-[66px] w-[66px] items-center justify-center rounded-full text-white active:scale-90"
          style={{ background: 'var(--color-blue)', boxShadow: 'var(--shadow-fab)' }}
        >
          {state === 'listening' ? <Square size={22} fill="white" /> : <Mic size={26} />}
        </button>
        <button
          onClick={() => {
            close();
            onClose();
          }}
          aria-label="End"
          className="flex h-[50px] w-[50px] items-center justify-center rounded-full border border-[var(--color-red)] text-[var(--color-red)] active:scale-90"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex items-center justify-center gap-2 pb-[max(20px,env(safe-area-inset-bottom))]">
        {RAIL_STEPS.map((step, i) => (
          <span
            key={step.key}
            className="text-[10px] font-semibold uppercase tracking-[.14em]"
            style={{ color: i <= passedIndex ? 'var(--color-blue)' : 'var(--color-ink-3)' }}
          >
            {step.label}
            {i < RAIL_STEPS.length - 1 && <span className="mx-1.5 text-[var(--color-ink-3)]">→</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

export function VoiceOverlay() {
  const voiceOpen = useUi((s) => s.voiceOpen);
  const setVoiceOpen = useUi((s) => s.setVoiceOpen);
  if (!voiceOpen) return null;
  return <Voice onClose={() => setVoiceOpen(false)} />;
}
