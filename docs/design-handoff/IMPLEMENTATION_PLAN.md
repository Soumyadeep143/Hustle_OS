# Implementation plan — wiring the redesign into Hustle_OS

Ordered so the app is runnable after every phase. Nothing here touches agents, memory providers,
auth or business logic.

## Phase 0 — foundation (½ day)
1. `npm i react-router-dom` (deep links per screen; zustand already handles the rest).
2. Replace the palette. Tailwind v4 is in use, so tokens go in `src/styles/globals.css` as
   `@theme` + a `[data-theme]` block — copy `code/tokens.css` verbatim. Delete the old
   `#3498db`/slate-900 theme from `tailwind.config.js` and the gradients
   (`gradient-hero`, `gradient-subtle`, `gradient-success`) — the redesign uses none of them.
3. Add `JetBrains Mono` to the Google Fonts import already in `globals.css`.
4. Set `data-theme` on `<html>` from `localStorage.hustleos-theme` (default light) before React
   mounts, so there is no flash.
5. Keep `Card`/`Button`/`Badge` but restyle: radius 8–16px (not `rounded-full` for Badge — use
   `rounded-md` + uppercase 9.5px `.13em`), `Card` padding 14–16px not `p-6`, drop the
   `variant="gradient"` branch.

## Phase 1 — mobile shell (1 day)
- `src/app/AppShell.tsx` — `min-h-dvh`, scroll container, `pb-[116px]`, safe-area insets.
- `src/components/nav/BottomNav.tsx` — see `code/BottomNav.tsx`. Replaces the current top
  `Navigation.tsx` on mobile; keep a desktop rail behind `md:` later.
- `src/components/CaptureFab.tsx` — 54px, opens the capture sheet.
- `src/store/useUi.ts` — `code/useUiStore.ts`: tab, workspace, workTab, sheet, theme, toast.
- Routes: `/` Home, `/work`, `/recall`, `/recall/:id`, `/ai`, `/profile`; voice and sheets are
  overlay state, not routes (so back-swipe closes them naturally via `history.back` if you prefer).
- `src/lib/api.ts` — `code/api.ts` (axios instance, typed helpers, error normalisation).

## Phase 2 — primitives (1 day)
Build these once; every screen is assembled from them:
`SectionLabel`, `StatCell`, `Chip` (tone: blue|yellow|red|neutral), `Row` (hairline list row),
`TaskRow`, `TimelineRow`, `ProgressBar`, `AiCard` (the ✦ card), `Sheet` (portal + scrim +
`hosSheet`), `Toast`, `SegmentedControl`, `UnderlineTabs`, `VoiceOrb` (`code/VoiceOrb.tsx`).
Motion lives in `globals.css` keyframes: `hosUp, hosFade, hosSheet, hosWave, hosSpin, hosRipple,
hosGlow, hosMorph, hosMorphRev, hosBreathe, hosDrift` — copy them from the prototype's
`<style>` block; wrap all of them in a `@media (prefers-reduced-motion: reduce)` override that
sets `animation: none`.

## Phase 3 — screens on real data (2–3 days)
Order: Home → Work → Profile → RECALL → AI. For each screen: loading skeleton (hairline rows at
40% opacity, no spinners), empty state (one sentence in `ink-2`), error state (red 13px line +
Retry). Data sources are in `API_CONTRACT.md`.
- Home: `GET /api/brief`, `/api/timeline/today`, `/api/tasks`, `/api/memory` (insights).
  Until `/brief` and `/timeline` exist, derive them client-side from `/api/dashboard` +
  `/api/memory` behind `src/lib/adapters.ts` — one file to delete later, not scattered fallbacks.
- Work: `/api/tasks`, `/api/memory` (applications), projects from `/api/team/.../sprint`.
- Task toggle: optimistic `PATCH /api/tasks/{id}`, rollback + red toast on failure.
- RECALL: summary / prospects / detail; `Approve & Execute` consumes the SSE stream and renders
  one row per agent event (do not fake the timing once the stream is live).
- AI: prompt chips → `POST /api/voice/command` with the prompt as `transcript`; render
  `response`; if the backend later returns structured `points[]`, render them as the sub-rows.

## Phase 4 — voice, for real (1–2 days)
`code/useVoiceSession.ts` implements the whole loop:
1. `navigator.mediaDevices.getUserMedia({audio:true})` → `MediaRecorder` (`audio/webm`).
2. `AudioContext` + `AnalyserNode` → RMS at ~30fps, written to a CSS variable `--voice-level`
   (0–1). The orb and equalizer read that variable, so amplitude is real, not decorative.
3. Silence for 1.2s (or mic tap) stops the recorder → `POST /api/voice/transcribe` → transcript
   into the headline → `POST /api/voice/command` → `POST /api/voice/tts` → play `audio_url`.
4. State machine `idle → listening → thinking → speaking → idle` drives the orb timings in the
   README §8 table; the stage rail (LISTEN/UNDERSTAND/RECALL/ANSWER) is the same enum.
5. Permission denied → red line "Microphone access is needed for voice" + a text input fallback.
6. Interrupt: tapping the orb while speaking pauses the audio and returns to listening.
`VoiceOrb` is presentational and takes `state` + `level`; keep the four gradient layers and the
morph keyframes exactly as specified or it stops reading as an OS-level intelligence layer.

## Phase 5 — Quick Capture (1 day)
Sheet with the three phases. Real work: `POST /api/capture/parse` (stream or staged response) →
show each step as it actually completes → editable result form (every field an input, deadline via
native date picker) → `POST /api/capture/commit` → insert into the target list + toast.
Support `navigator.clipboard.readText()` on open to prefill a detected URL, and accept the
share-target intent if you ship a PWA manifest.

## Phase 6 — responsive + polish (1 day)
- `md:` and up: nav becomes a left rail, Home becomes two columns (brief + timeline | focus +
  signals), RECALL becomes list + detail side by side. Mobile layout is authoritative below 768px.
- Test 360 / 390 / 402 / 430px. Nothing may wrap in the meta lines; use `whitespace-nowrap` on
  timestamps and chips.
- `dvh` units, `env(safe-area-inset-bottom)` on the nav, `overscroll-behavior: contain` on sheets.
- Focus rings: 2px `blue` at 40% offset 2 on every interactive element; sheets trap focus and
  close on Escape.

## Acceptance checklist
- [ ] Bottom nav pinned, blurred, 5 tabs, active state blue; FAB opens capture from any tab.
- [ ] Theme toggle persists and never flashes; dark mode is a designed surface set, not inverted.
- [ ] Task check is optimistic, animates, and updates FOCUS count + progress + brief counts.
- [ ] Applications reflect real `/api/memory` statuses with correct chip tones.
- [ ] RECALL detail shows real memory sentences with source, date, confidence.
- [ ] Approve & Execute renders live agent events, then the toast.
- [ ] Voice: real mic, real transcript, real answer, real TTS, orb amplitude tracks the mic.
- [ ] Capture parses a pasted LinkedIn/GitHub/event URL and commits an editable entity.
- [ ] Workspace switch changes Home between Personal / Team / Enterprise.
- [ ] 360px has no horizontal scroll; all tap targets ≥44px; reduced-motion honoured.
