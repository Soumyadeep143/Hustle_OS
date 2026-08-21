import { useEffect, useRef, useState } from 'react';
import { Loader2, Mic, Square } from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { SegmentedControl } from '../ui/SegmentedControl';
import { Button } from '../Button';
import { useUi } from '../../store/useUi';
import { api, type RecallItemCreateRequest, type RecallPriority, type RecallSource, type RecallStatus } from '../../services/api';
import { SourceIcon } from '../icons/SourceIcon';
import { RECALL_CATEGORIES, RECALL_STATUSES } from '../../lib/recall';

type Phase = 'idle' | 'analyzing' | 'result';
type DictationState = 'idle' | 'recording' | 'processing';

function formatCapturedAt(d: Date): string {
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const SOURCES: { value: RecallSource; label: string }[] = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'x', label: 'X' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'reddit', label: 'Reddit' },
  { value: 'other', label: 'Other' },
];

const PRIORITIES: { value: string; label: string }[] = [
  { value: '', label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const INPUT_CLASS =
  'w-full rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-raised)] px-3.5 py-2.5 text-[14px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)]';

interface Draft {
  url: string;
  source: RecallSource;
  sourceDisplay: string;
  title: string;
  description: string;
  category: string;
  status: RecallStatus;
  priority: string;
  company: string;
  location: string;
  followUpAt: string;
  followUpNote: string;
  extractionNote: string;
  tags: string[];
}

const EMPTY_DRAFT: Draft = {
  url: '',
  source: 'other',
  sourceDisplay: 'Other',
  title: '',
  description: '',
  category: 'Other',
  status: 'saved',
  priority: '',
  company: '',
  location: '',
  followUpAt: '',
  followUpNote: '',
  extractionNote: '',
  tags: [],
};

// Lowercase, trimmed, hyphenated-spaces-ok, deduped -- keeps AI-suggested
// and manually-typed tags in one consistent shape.
function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase().replace(/^#/, '');
}

export function RecallCaptureSheet({ onSaved }: { onSaved?: (item: { id: string }) => void }) {
  const open = useUi((s) => s.recallCaptureOpen);
  const prefillUrl = useUi((s) => s.recallCapturePrefillUrl);
  const closeRecallCapture = useUi((s) => s.closeRecallCapture);
  const showToast = useUi((s) => s.showToast);

  const [phase, setPhase] = useState<Phase>('idle');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [capturedAt, setCapturedAt] = useState<Date | null>(null);
  const [dictation, setDictation] = useState<DictationState>('idle');
  const [tagInput, setTagInput] = useState('');

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (open) setUrl(prefillUrl);
    if (open && prefillUrl.trim()) setCapturedAt(new Date());
  }, [open, prefillUrl]);

  const handleUrlChange = (value: string) => {
    if (value.trim() && !url.trim()) setCapturedAt(new Date());
    if (!value.trim()) setCapturedAt(null);
    setUrl(value);
  };

  const reset = () => {
    setPhase('idle');
    setUrl('');
    setDescription('');
    setDraft(EMPTY_DRAFT);
    setError(null);
    setCapturedAt(null);
    setDictation('idle');
    setTagInput('');
    if (recorderRef.current) {
      recorderRef.current.ondataavailable = null;
      recorderRef.current.onstop = null;
      if (recorderRef.current.state === 'recording') recorderRef.current.stop();
    }
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    recorderRef.current = null;
  };

  const startDictation = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      recorderRef.current = recorder;
      recorder.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      recorder.onstop = () => void handleDictationStop();
      recorder.start(250);
      setDictation('recording');
    } catch {
      setError('Microphone access is needed for voice input.');
    }
  };

  const stopDictation = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
  };

  const handleDictationStop = async () => {
    setDictation('processing');
    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const transcribed = await api.voice.transcribe(blob);
      if (!transcribed.text) {
        setDictation('idle');
        return;
      }
      const refined = await api.recall.refineNote(transcribed.text).catch(() => transcribed.text);
      setDescription((prev) => (prev.trim() ? `${prev.trim()} ${refined}` : refined));
    } catch {
      setError('Could not transcribe that — try again.');
    } finally {
      setDictation('idle');
    }
  };

  const handleClose = () => {
    closeRecallCapture();
    reset();
  };

  const runAnalyze = async () => {
    if (!url.trim() && !description.trim()) {
      setError('Paste a link or write what you found first.');
      return;
    }
    setPhase('analyzing');
    setError(null);
    try {
      const result = await api.recall.analyze({ url: url.trim() || undefined, description: description.trim() });
      setDraft({
        url: url.trim(),
        source: result.source,
        sourceDisplay: result.source_display,
        title: result.title,
        description: result.ai_summary || description.trim(),
        category: result.category,
        status: result.status_suggestion,
        priority: result.priority_suggestion || '',
        company: result.company || '',
        location: result.location || '',
        followUpAt: '',
        followUpNote: '',
        extractionNote: result.extraction_note || '',
        tags: (result.tags || []).map(normalizeTag).filter(Boolean),
      });
      setPhase('result');
    } catch {
      setError('Could not analyze that — try again, or fill it in yourself.');
      setPhase('idle');
    }
  };

  const captureManually = () => {
    setDraft({ ...EMPTY_DRAFT, url: url.trim(), description: description.trim(), title: description.trim().slice(0, 60) });
    setPhase('result');
  };

  const addTag = (raw: string) => {
    const tag = normalizeTag(raw);
    if (!tag) return;
    setDraft((d) => (d.tags.includes(tag) ? d : { ...d, tags: [...d.tags, tag] }));
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setDraft((d) => ({ ...d, tags: d.tags.filter((t) => t !== tag) }));
  };

  const handleSave = async () => {
    if (!draft.title.trim()) return;
    setSaving(true);
    try {
      const payload: RecallItemCreateRequest = {
        url: draft.url || undefined,
        title: draft.title.trim(),
        description: draft.description.trim(),
        category: draft.category,
        status: draft.status,
        priority: (draft.priority || undefined) as RecallPriority | undefined,
        company: draft.company.trim() || undefined,
        location: draft.location.trim() || undefined,
        follow_up_at: draft.followUpAt || undefined,
        follow_up_note: draft.followUpNote.trim() || undefined,
        tags: draft.tags,
      };
      const created = await api.recall.create(payload);
      showToast('Saved to RECALL');
      onSaved?.(created);
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
        <div className="flex flex-col gap-4">
          <h2 className="font-[var(--font-display)] text-[19px] font-semibold text-[var(--color-ink)]">
            Found something useful?
          </h2>
          <div>
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[.18em] text-[var(--color-ink-3)]">URL (optional)</div>
            <input
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="Paste a LinkedIn, X, Instagram or Reddit link…"
              className={INPUT_CLASS}
            />
            {capturedAt && (
              <p className="mt-1.5 text-[11.5px] text-[var(--color-ink-3)]">Captured {formatCapturedAt(capturedAt)}</p>
            )}
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[.18em] text-[var(--color-ink-3)]">What did you find?</span>
              <button
                type="button"
                onClick={() => (dictation === 'recording' ? stopDictation() : startDictation())}
                disabled={dictation === 'processing'}
                aria-label={dictation === 'recording' ? 'Stop recording' : 'Dictate with voice'}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-50"
                style={{
                  background: dictation === 'recording' ? 'var(--color-red)' : 'var(--color-blue-soft)',
                  color: dictation === 'recording' ? '#fff' : 'var(--color-blue)',
                }}
              >
                {dictation === 'processing' ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : dictation === 'recording' ? (
                  <Square size={12} fill="currentColor" />
                ) : (
                  <Mic size={14} />
                )}
              </button>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="e.g. Interesting AI Engineer opening, looks relevant to my profile…"
              className={INPUT_CLASS + ' resize-none'}
            />
            {dictation === 'recording' && (
              <p className="mt-1.5 text-[11.5px] font-medium text-[var(--color-red)]">Listening… tap to stop</p>
            )}
            {dictation === 'processing' && (
              <p className="mt-1.5 text-[11.5px] text-[var(--color-ink-3)]">Transcribing…</p>
            )}
          </div>
          {error && <p className="text-[13px] text-[var(--color-red)]">{error}</p>}
          <div className="flex gap-2">
            <Button variant="primary" className="flex-1" onClick={runAnalyze}>
              Analyze
            </Button>
            <Button variant="outline" onClick={captureManually}>
              Skip
            </Button>
          </div>
        </div>
      )}

      {phase === 'analyzing' && (
        <div className="flex flex-col items-center gap-4 py-10">
          <Loader2 size={28} className="animate-spin text-[var(--color-blue)]" />
          <div className="text-[15px] font-medium text-[var(--color-ink)]">Understanding what you found…</div>
        </div>
      )}

      {phase === 'result' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <SourceIcon source={draft.source} size={24} />
            <span className="text-[11px] font-semibold tracking-[.18em] text-[var(--color-blue)]">
              {draft.sourceDisplay.toUpperCase()} · EDITABLE
            </span>
          </div>

          {draft.extractionNote && (
            <p className="rounded-[var(--radius-control)] bg-[var(--color-line-2)] px-3 py-2 text-[12.5px] text-[var(--color-ink-2)]">
              {draft.extractionNote}
            </p>
          )}

          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="Title"
            className="border-b border-[var(--color-line)] bg-transparent pb-2 font-[var(--font-display)] text-[17px] font-semibold text-[var(--color-ink)] outline-none"
          />

          <textarea
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            rows={2}
            placeholder="Summary / context"
            className={INPUT_CLASS + ' resize-none'}
          />

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-[.14em] text-[var(--color-ink-3)]">Source</span>
              <select
                value={draft.source}
                onChange={(e) => setDraft({ ...draft, source: e.target.value as RecallSource })}
                className={INPUT_CLASS}
              >
                {SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-[.14em] text-[var(--color-ink-3)]">Category</span>
              <select
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                className={INPUT_CLASS}
              >
                {RECALL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[.14em] text-[var(--color-ink-3)]">Status</span>
            <select
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value as RecallStatus })}
              className={INPUT_CLASS}
            >
              {RECALL_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <div>
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[.14em] text-[var(--color-ink-3)]">Priority</span>
            <SegmentedControl options={PRIORITIES} value={draft.priority} onChange={(v) => setDraft({ ...draft, priority: v })} />
          </div>

          <div>
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[.14em] text-[var(--color-ink-3)]">Tags</span>
            {draft.tags.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {draft.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => removeTag(tag)}
                    aria-label={`Remove tag ${tag}`}
                    className="group flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium"
                    style={{ background: 'var(--color-blue-soft)', color: 'var(--color-blue)' }}
                  >
                    #{tag}
                    <span className="text-[13px] leading-none opacity-60 group-hover:opacity-100">×</span>
                  </button>
                ))}
              </div>
            )}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  addTag(tagInput);
                } else if (e.key === 'Backspace' && !tagInput && draft.tags.length) {
                  removeTag(draft.tags[draft.tags.length - 1]);
                }
              }}
              onBlur={() => tagInput.trim() && addTag(tagInput)}
              placeholder="Add a tag and press Enter…"
              className={INPUT_CLASS}
            />
            <p className="mt-1.5 text-[11.5px] text-[var(--color-ink-3)]">
              {draft.tags.length > 0
                ? 'AI-suggested tags above — remove any that don’t fit, or add your own.'
                : 'Type your own, or run Analyze again for AI suggestions.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              value={draft.company}
              onChange={(e) => setDraft({ ...draft, company: e.target.value })}
              placeholder="Company (optional)"
              className={INPUT_CLASS}
            />
            <input
              value={draft.location}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
              placeholder="Location (optional)"
              className={INPUT_CLASS}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-[.14em] text-[var(--color-ink-3)]">Follow-up date</span>
              <input
                type="date"
                value={draft.followUpAt}
                onChange={(e) => setDraft({ ...draft, followUpAt: e.target.value })}
                className={INPUT_CLASS}
              />
            </label>
            <input
              value={draft.followUpNote}
              onChange={(e) => setDraft({ ...draft, followUpNote: e.target.value })}
              placeholder="Follow-up note"
              className={INPUT_CLASS + ' mt-auto'}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="primary" className="flex-1" onClick={handleSave} loading={saving} disabled={!draft.title.trim()}>
              Save to RECALL
            </Button>
            <Button variant="outline" onClick={() => setPhase('idle')}>
              Back
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
