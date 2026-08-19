import { useState } from 'react';
import { Check, Loader2, Mic } from 'lucide-react';
import clsx from 'clsx';
import { Sheet } from '../ui/Sheet';
import { Button } from '../Button';
import { useUi } from '../../store/useUi';
import { parseCapture, commitCapturedLocally, type ParsedCapture, type CaptureKind } from '../../lib/capture';
import { api } from '../../services/api';

type Phase = 'idle' | 'processing' | 'result';

const MANUAL_KINDS: { kind: CaptureKind; label: string; tone: string }[] = [
  { kind: 'task', label: 'Create task', tone: 'var(--color-blue)' },
  { kind: 'job', label: 'Add opportunity', tone: 'var(--color-blue)' },
  { kind: 'event', label: 'Add event', tone: 'var(--color-yellow-ink)' },
  { kind: 'article', label: 'Save knowledge', tone: 'var(--color-yellow-ink)' },
  { kind: 'note', label: 'Add note', tone: 'var(--color-ink-3)' },
  { kind: 'prospect', label: 'Add prospect', tone: 'var(--color-red)' },
];

const STEPS = ['Extracting context', 'Identifying category', 'Finding important dates', 'Creating memory'];

export function CaptureSheet() {
  const sheet = useUi((s) => s.sheet);
  const closeSheet = useUi((s) => s.closeSheet);
  const showToast = useUi((s) => s.showToast);
  const addTask = useUi((s) => s.addTask);
  const setVoiceOpen = useUi((s) => s.setVoiceOpen);

  const [text, setText] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState<ParsedCapture | null>(null);
  const [saving, setSaving] = useState(false);

  const open = sheet === 'capture';

  const reset = () => {
    setText('');
    setPhase('idle');
    setStepIndex(0);
    setResult(null);
  };

  const handleClose = () => {
    closeSheet();
    reset();
  };

  const runAnalyze = (input: string) => {
    if (!input.trim()) return;
    setPhase('processing');
    setStepIndex(0);
    let i = 0;
    const tick = () => {
      i += 1;
      setStepIndex(i);
      if (i < STEPS.length) {
        window.setTimeout(tick, 650);
      } else {
        window.setTimeout(() => {
          setResult(parseCapture(input));
          setPhase('result');
        }, 300);
      }
    };
    window.setTimeout(tick, 650);
  };

  const handleManualCapture = (kind: CaptureKind) => {
    setResult({
      kind,
      title: '',
      org: '',
      location: '',
      deadline: '',
      category: '',
      confidence: 'Low',
      sourceUrl: '',
    });
    setPhase('result');
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      if (result.kind === 'prospect') {
        await api.recall.createProspect({
          name: result.title || 'Untitled prospect',
          company: result.org || 'Unknown',
          source_url: result.sourceUrl || undefined,
        });
        showToast('Saved to RECALL · Prospects');
      } else if (result.kind === 'task') {
        addTask(result.title || 'Untitled task', result.deadline || 'Today', 'normal');
        showToast('Saved to Work · Tasks');
      } else {
        commitCapturedLocally(result.kind, result.title || 'Untitled', result.org);
        showToast(
          result.kind === 'job' ? 'Saved to Work · Applications' : 'Saved to your memory'
        );
      }
      handleClose();
    } catch {
      showToast('Could not save — try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={handleClose}>
      {phase === 'idle' && (
        <div className="flex flex-col gap-5">
          <h2 className="font-[var(--font-display)] text-[19px] font-semibold text-[var(--color-ink)]">
            What do you want to remember?
          </h2>

          <div className="flex items-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-raised)] px-3 py-2.5">
            <span className="font-[var(--font-mono)] text-[10.5px] font-medium tracking-[.06em] text-[var(--color-ink-3)]">
              URL
            </span>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste a link…"
              className="flex-1 bg-transparent text-[14px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)]"
            />
          </div>

          <div className="flex gap-2">
            <Button variant="primary" className="flex-1" onClick={() => runAnalyze(text)}>
              Analyze
            </Button>
            <Button
              variant="outline"
              onClick={() => setText('https://linkedin.com/jobs/view/ai-engineer-intern-abc-technologies')}
            >
              Paste example
            </Button>
          </div>

          <div>
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-[.18em] text-[var(--color-ink-3)]">
              OR CAPTURE AS
            </div>
            <div className="grid grid-cols-2 gap-2">
              {MANUAL_KINDS.map((m) => (
                <button
                  key={m.label}
                  onClick={() => handleManualCapture(m.kind)}
                  className="flex items-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-line)] px-3 py-3 text-left text-[13.5px] font-medium text-[var(--color-ink)] transition-colors hover:border-[var(--color-blue)]"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: m.tone }} />
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              handleClose();
              setVoiceOpen(true);
            }}
            className="flex items-center justify-center gap-2 text-[13px] font-medium text-[var(--color-blue)]"
          >
            <Mic size={15} /> Use voice instead
          </button>
        </div>
      )}

      {phase === 'processing' && (
        <div className="flex flex-col gap-5 py-2">
          <div>
            <div className="text-[15px] font-medium text-[var(--color-ink)]">Analyzing link…</div>
            {text && (
              <div className="mt-1 truncate font-[var(--font-mono)] text-[12px] text-[var(--color-ink-3)]">
                {text}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3">
            {STEPS.map((step, i) => (
              <div key={step} className="flex items-center gap-3 text-[14px]">
                {i < stepIndex ? (
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white"
                    style={{ background: 'var(--color-blue)' }}
                  >
                    <Check size={12} strokeWidth={3} />
                  </span>
                ) : i === stepIndex ? (
                  <Loader2 size={20} className="shrink-0 animate-spin text-[var(--color-blue)]" />
                ) : (
                  <span className="h-5 w-5 shrink-0 rounded-full border border-[var(--color-line)]" />
                )}
                <span className={clsx(i <= stepIndex ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-3)]')}>
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {phase === 'result' && result && (
        <div className="flex flex-col gap-4">
          <span className="text-[11px] font-semibold tracking-[.18em] text-[var(--color-blue)]">
            ✦ EXTRACTED · EDITABLE
          </span>

          <input
            value={result.title}
            onChange={(e) => setResult({ ...result, title: e.target.value })}
            placeholder="Title"
            className="border-b border-[var(--color-line)] bg-transparent pb-2 font-[var(--font-display)] text-[17px] font-semibold text-[var(--color-ink)] outline-none"
          />
          <input
            value={result.org}
            onChange={(e) => setResult({ ...result, org: e.target.value })}
            placeholder="Organization · Location"
            className="border-b border-[var(--color-line)] bg-transparent pb-2 text-[14px] text-[var(--color-ink-2)] outline-none"
          />

          <div className="flex flex-col divide-y divide-[var(--color-line-2)]">
            <FieldRow label="DEADLINE" value={result.deadline} tone="red" onChange={(v) => setResult({ ...result, deadline: v })} />
            <FieldRow label="CATEGORY" value={result.category} onChange={(v) => setResult({ ...result, category: v })} />
            <FieldRow label="LOCATION" value={result.location} onChange={(v) => setResult({ ...result, location: v })} />
            <div className="flex items-center justify-between py-2.5 text-[13px]">
              <span className="text-[var(--color-ink-3)]">CONFIDENCE</span>
              <span className="font-medium text-[var(--color-blue)]">{result.confidence}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="primary" className="flex-1" onClick={handleSave} loading={saving}>
              Save
            </Button>
            <Button variant="outline" onClick={() => setPhase('idle')}>
              Edit
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

function FieldRow({
  label,
  value,
  tone,
  onChange,
}: {
  label: string;
  value: string;
  tone?: 'red';
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
      <span className="shrink-0 text-[var(--color-ink-3)]">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={clsx(
          'flex-1 bg-transparent text-right outline-none',
          tone === 'red' ? 'text-[var(--color-red)]' : 'text-[var(--color-ink)]'
        )}
      />
    </div>
  );
}
