export type CaptureKind = 'job' | 'event' | 'repo' | 'article' | 'prospect' | 'note' | 'task';

export interface ParsedCapture {
  kind: CaptureKind;
  title: string;
  org: string;
  location: string;
  deadline: string;
  category: string;
  confidence: 'High' | 'Medium' | 'Low';
  sourceUrl: string;
}

const CAPTURED_KEY = 'hustleos-captured';

export interface CapturedItem {
  id: string;
  kind: CaptureKind;
  title: string;
  org: string;
  createdAt: string;
}

export function loadCapturedItems(): CapturedItem[] {
  try {
    const raw = localStorage.getItem(CAPTURED_KEY);
    return raw ? (JSON.parse(raw) as CapturedItem[]) : [];
  } catch {
    return [];
  }
}

function saveCapturedItems(items: CapturedItem[]) {
  localStorage.setItem(CAPTURED_KEY, JSON.stringify(items));
}

/**
 * No backend link-parser exists yet (POST /api/capture/parse in
 * docs/design-handoff/API_CONTRACT.md is not implemented). This is a client-side
 * heuristic standing in for it — every field it produces is editable before save,
 * per the design spec.
 */
export function parseCapture(input: string): ParsedCapture {
  const isUrl = /^https?:\/\//i.test(input.trim());
  const url = isUrl ? new URL(input.trim()) : null;
  const host = url?.hostname.replace(/^www\./, '') ?? '';
  const slug = (url?.pathname.split('/').filter(Boolean).pop() ?? input)
    .replace(/[-_]+/g, ' ')
    .replace(/\.\w+$/, '')
    .trim();
  const title = slug
    ? slug.replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Untitled capture';

  const path = url?.pathname ?? '';

  let kind: CaptureKind = 'note';
  let category = 'General';
  if (/indeed\.|greenhouse\.io|lever\.co|myworkdayjobs/.test(host) || (/linkedin\.com/.test(host) && /\/jobs\//.test(path))) {
    kind = 'job';
    category = 'Career → Internship';
  } else if (/linkedin\.com/.test(host) && /\/in\//.test(path)) {
    kind = 'prospect';
    category = 'Network';
  } else if (/github\.com/.test(host)) {
    kind = 'repo';
    category = 'Engineering';
  } else if (/eventbrite|lu\.ma|meetup\.com|devpost\.com/.test(host)) {
    kind = 'event';
    category = 'Event';
  } else if (isUrl) {
    kind = 'article';
    category = 'Knowledge';
  }

  const deadline = kind === 'job' ? 'September 1' : '';

  return {
    kind,
    title,
    org: host || 'Manual entry',
    location: kind === 'job' ? 'Remote · Hybrid' : '',
    deadline,
    category,
    confidence: isUrl ? 'Medium' : 'Low',
    sourceUrl: isUrl ? input.trim() : '',
  };
}

export function commitCapturedLocally(kind: CaptureKind, title: string, org: string): CapturedItem {
  const item: CapturedItem = { id: `cap-${Date.now()}`, kind, title, org, createdAt: new Date().toISOString() };
  const items = [item, ...loadCapturedItems()];
  saveCapturedItems(items);
  return item;
}
