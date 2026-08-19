# Handoff: HustleOS premium mobile redesign

## Overview
A mobile-first redesign of HustleOS as a premium AI operating system: Home + AI brief, Work
(tasks / applications / projects), RECALL growth intelligence with prospect memory + timeline,
AI assistant, voice mode, Team and Enterprise workspaces, Profile, and Quick Capture with
link parsing. Light and dark.

Target repo: `Soumyadeep143/Hustle_OS` (Vite 8 + React 19 + TS + Tailwind v4 + zustand +
axios + lucide-react) with the FastAPI backend in `hustleos-backend/`.

## About the design files
The files in this bundle are **design references written as HTML/JS prototypes** — they show
intended look, motion and behaviour. They are NOT production code to paste in. The job is to
**recreate them inside the existing React + Tailwind app**, using its own components, stores
and API layer. All product logic (agents, memory, providers, auth) stays as-is; this is the
presentation layer plus the thin data wiring it needs.

Reference files:
- `HustleOS Mobile.dc.html` — the stage: both devices side by side, plus design notes.
- `HustleOS App.dc.html` — the app itself: every screen, all interactions, all motion.
- `ios-frame.jsx` — device bezel used only for presentation; do not port.

## Fidelity
**High fidelity.** Colors, type, spacing, radii, motion durations and copy below are final.
Match them exactly. Where the prototype uses canned data, wire the real API instead (see
`API_CONTRACT.md`); do not keep the mock arrays.

---

## Design tokens

### Color — semantic, not decorative
Ratio target: ~70% neutral, 20% blue, 7% red, 3% yellow.

| Meaning | Token | Light | Dark |
| --- | --- | --- | --- |
| Intelligence, primary action, active nav, links | `blue` | `#2563EB` | `#5B8DEF` |
| Blue wash (chips, fills) | `blue-soft` | `rgba(37,99,235,.10)` | `rgba(91,141,239,.15)` |
| Urgency, blocked, overdue, risk | `red` | `#E53935` | `#FF5F55` |
| Red wash | `red-soft` | `rgba(229,57,53,.09)` | `rgba(255,95,85,.14)` |
| Insight / opportunity accent (dots, ✦) | `yellow-ink` | `#F5C542` | `#F5C542` |
| Insight text (contrast-safe) | `yellow` | `#9A7000` | `#F5C542` |
| Yellow wash | `yellow-soft` | `rgba(245,197,66,.18)` | `rgba(245,197,66,.12)` |
| Page background | `bg` | `#F6F5F1` | `#0B0B0C` |
| Card surface | `surface` | `#FFFFFF` | `#141416` |
| Inset / raised surface | `raised` | `#FBFAF7` | `#1B1B1E` |
| Primary text | `ink` | `#121211` | `#F3F2EF` |
| Secondary text | `ink-2` | `#56544E` | `#A3A19B` |
| Meta / tertiary text | `ink-3` | `#8E8B83` | `#6F6C66` |
| Hairline | `line` | `rgba(18,18,17,.11)` | `rgba(255,255,255,.12)` |
| Row divider | `line-2` | `rgba(18,18,17,.055)` | `rgba(255,255,255,.06)` |
| Modal scrim | `scrim` | `rgba(18,18,17,.44)` | `rgba(0,0,0,.62)` |
| Nav bar (over blur) | `nav-bg` | `rgba(246,245,241,.86)` | `rgba(11,11,12,.86)` |

Card shadow — light: `0 1px 2px rgba(18,18,17,.05), 0 10px 28px -14px rgba(18,18,17,.16)`;
dark: `0 1px 2px rgba(0,0,0,.6), 0 14px 34px -16px rgba(0,0,0,.8)`.
FAB shadow: `0 10px 26px -8px rgba(37,99,235,.7)`.

### Typography
- Display / numbers / editorial body: **Geist** 600 (headlines), 400–500 (AI copy).
- UI, labels, meta: **Inter** 400/500/600.
- Numeric meta, URLs, timestamps: **JetBrains Mono** 400/500.

| Role | Spec |
| --- | --- |
| Screen title | Geist 600, 29–30px / 1.1, `-.028em` |
| Big metric | Geist 600, 34–68px / .9–1, `-.03…-.05em` |
| Card / row title | Geist 600, 16–17px / 1.25, `-.018em` |
| AI editorial body | Geist 400–500, 15–16.5px / 1.5 |
| Body / task title | Inter 500, 15.5px / 1.35 |
| Secondary | Inter 400, 13–14.5px / 1.45 |
| Section label | Inter 600, 10px / 1, `.18em`, uppercase, `ink-3` |
| Chip / status | Inter 600, 9.5px / 1, `.13em`, uppercase |
| Nav label | Inter 500 (600 active), 10px |
| Mono meta | JetBrains Mono 500, 10.5–12px, `.06em` |

Minimum tap target 44px (nav buttons are 21px icon + label in a 5-column grid, each ≥44px wide;
FAB is 54×54; voice controls 50/66px).

### Spacing, radius, motion
- Horizontal gutters: 20px for text/rows, 16px for cards (cards are 4px wider than text).
- Section rhythm: label → 12px → content → 26px → next label.
- Radius: cards/sheets 14px (sheet top corners 18px), buttons/inputs 9–11px, chips 5–7px,
  FAB 17px, avatars/tiles 8–14px. No pills except the sheet grabber and status dots.
- Motion: entrance `hosUp` 300–380ms ease (translateY 10px + fade); sheets `hosSheet` 300–320ms
  `cubic-bezier(.2,.9,.2,1)`; scrim fade 220ms; task check 220ms `cubic-bezier(.2,1.4,.4,1)`;
  progress bars 500ms `cubic-bezier(.2,.8,.2,1)`; agent/capture steps advance every 620–750ms;
  press states `transform:scale(.93–.985)` 160–180ms. Respect `prefers-reduced-motion`.

---

## Screens

### 1. Home — Personal
Workspace button (`PERSONAL ▾`, Inter 600 10.5px `.16em`) left, mono timestamp right.
Greeting: "Good evening, Soumyadeep." (Geist 600 30px, two lines) + "Here's what matters today."
**AI Brief card** (surface, 1px `line`, r14, card shadow): row `✦ AI BRIEF` + time; body Geist 400
15.5px with "5 important actions" bolded; hairline; split footer — "View plan →" (blue 600 13px)
and "Ask" (`ink-2`).
**TODAY** — vertical timeline, grid `62px 1px 1fr`, gap 14px. Mono time right-aligned, 8px dot
(blue / `ink-3` / red) with 3px `bg` halo on the rule, title Geist 600 16px, sub `ink-2` 13px,
optional chip: `HIGHEST PRIORITY` (blue wash), `OVERDUE` (red wash).
**FOCUS** — "n of m done" + 3px blue progress bar; task rows: 22px circle (ring red when urgent,
blue+check when done), title, meta (red when urgent). Done rows: 45% opacity + line-through.
**SIGNALS** — yellow-wash rows, ✦ bullet, text + `OPPORTUNITY` / `RECOMMENDATION` tag in `yellow`.

### 2. Home — Team (workspace switch)
"Sprint 04" title; `72%` Geist 600 46px with "complete / 18 of 25 tasks" right-aligned; 4px blue
bar; red-wash blocked block (`2` + `BLOCKED` + names); TEAM AVAILABILITY rows (34px initials tile,
name, role, status dot: red Blocked / blue Available / `ink-3` Busy); AI RECOMMENDATION card with
Review (blue) + Later (outline).

### 3. Home — Enterprise
"Organization"; EXECUTION HEALTH `91%` Geist 600 68px + "▲ 4 pts" blue; full-bleed hairline rows
(label `ink-2` 15px / value Geist 600 24px, red for risk, yellow for overload); AI INSIGHT card
with three lines, the risk line in red.

### 4. Work
Title + "7 open tasks · 5 applications · 2 projects". Underline tabs (Tasks / Applications /
Projects), 22px gap, 2px `ink` indicator.
Tasks = same rows as FOCUS (shared component).
Applications rows: company Geist 600 17px + mono match right; role `ink-2`; chip `INTERVIEW` blue /
`REVIEWING` yellow / `STALE` red / `APPLIED` neutral / `CAPTURED` yellow + note `ink-3` 12px.
Projects rows: name + percent, meta, 3px bar (blue on track, red at risk).

### 5. RECALL overview
`RECALL` Inter 600 11px `.3em` blue; "Growth intelligence" Geist 600 30px two lines.
2×2 hairline stat grid — 21 high-intent (blue), 7 actions today (ink), 3 meetings (ink),
5 positive signals (yellow); numbers Geist 600 34px.
PRIORITY QUEUE rows: name, role (ellipsis), intent chip (`HIGH INTENT` blue / `WARM` yellow /
`COOLING` red), score Geist 600 27px in the intent color, `SCORE` caption, chevron.

### 6. RECALL prospect detail
Back to `RECALL`; name Geist 600 27px; role; intent chip. Hairline, then score Geist 600 54px +
"lead score / +7 this week" and a 4px bar at score%.
NEXT BEST ACTION card: `✦ NEXT BEST ACTION`, action Geist 500 16.5px, `WHY` block on yellow wash,
buttons `Approve & Execute` (blue, full) + `Edit` (outline). On execute the buttons are replaced
in place by the agent chain: Research Agent → Memory → Strategy Agent → Execution Agent, each
row `✓` blue when done, spinner while active, 32% opacity when pending, right-aligned detail
("context gathered", "4 facts recalled", "action drafted", "sending"). Ends with a toast
"Outreach sent · memory updated".
MEMORY rows: human-readable fact (Geist 400 14.5px) + source · date + confidence chip (blue wash).
TIMELINE: grid `74px 1px 1fr`, uppercase relative day, colored dot per tone, text 14px.

### 7. AI assistant
`✦ HUSTLEOS AI` + "Ask anything about your work." Then the **Speak to HustleOS** launcher card
(44px living mini-orb, title + "Hands-free · listens, recalls, answers", blue chevron).
Empty state = six suggested prompts as hairline rows with a blue arrow. Asking pushes a blue
user bubble (r13 13 4 13) and, after a "Reading calendar, tasks and memory…" indicator, an AI
card (surface, r13 13 13 4) whose supporting points render as `raised` sub-rows with a tone dot.

### 8. Voice mode (full screen)
`HUSTLEOS VOICE` + close. Centre: 270px stage — three expanding ripple rings (`hosRipple` 3.4s,
1.13s stagger), a radial blue glow (`hosGlow`), and a 196px **orb** = four blurred radial-gradient
layers (blue 34%/30%, yellow 68%/62%, red 40%/72%, white core) each morphing on
`hosMorph`/`hosMorphRev` (border-radius + rotate + scale) at different speeds, the whole orb
breathing on `hosBreathe`. A 22-bar equalizer sits at the base.
State drives the motion: listening = slow (breathe 3.4s, orb layers 9/11/13s, eq full),
thinking = tighter (2.1s, 6/7.5s, eq 25%), speaking = fast (1.5s, 4.5/5.5/6.5s, eq full, brighter core).
Headline shows transcript, sub shows the stage; answer arrives in a card. Controls: restart (50px),
mic (66px blue), end (50px, red glyph). Bottom stage rail: LISTEN → UNDERSTAND → RECALL → ANSWER,
blue once passed.

### 9. Quick Capture (bottom sheet from the FAB)
Grabber; "What do you want to remember?"; URL field (mono `URL` prefix) + `Analyze` (blue) and
`Paste example`; `OR CAPTURE AS` 2-column grid — Create task, Add opportunity, Add event, Save
knowledge, Add note, Add prospect (tone dot each, blue border on hover); "Use voice instead".
Processing: "Analyzing link…", the URL in mono, then four steps 620ms apart — Extracting context,
Identifying category, Finding important dates, Creating memory (spinner → blue ✓).
Result: `✦ EXTRACTED · EDITABLE`, "AI Engineer Intern", "ABC Technologies · Bangalore", hairline
field rows (DEADLINE September 1 in red, CATEGORY Career → Internship, LOCATION Bangalore · Hybrid,
CONFIDENCE High · 4 fields found in blue), `Save` + `Edit`. Save inserts the item at the top of
Work · Applications with a `CAPTURED` chip and toasts "Saved to Work · Applications".

### 10. Profile
Avatar tile + name + "Founder · HustleOS Pro"; APPEARANCE segmented Light/Dark; WORKSPACE radio
rows (Personal / Team / Enterprise, blue when selected); INTEGRATIONS rows (Gmail, Calendar,
LinkedIn, GitHub connected in blue; Notion "Connect" in `ink-3`); MEMORY card "1,284 memories
stored" + sources line; `Sign out` outline button in red.

### Chrome
Bottom nav: fixed, `nav-bg` + `backdrop-filter: blur(18px)`, 1px top hairline, 5-column grid,
9px top / 26px bottom padding (safe area), 21px stroke icons — Home, Work, Recall, AI, Profile;
active = blue + stroke 1.9 + label 600.
FAB: 54px, r17, blue, `right:18px; bottom:96px`, opens Quick Capture.
Toast: `ink` background, `bg` text, yellow dot, bottom 104px, 2.6s.

## Interactions
- Nav switches tab and clears prospect / sheet / voice state.
- Workspace switch changes the Home screen (Personal / Team / Enterprise) and closes the sheet.
- Task check: optimistic toggle → meta becomes "Completed", row dims + strikes, FOCUS count and
  progress bar animate, brief counts recompute.
- "View plan" jumps to AI and auto-asks "What's my plan today?".
- Scrim tap closes any sheet and resets capture phase.
- Every extracted field is editable before save.

## State
`tab`, `workspace`, `workTab`, `sheet (null|capture|workspace)`, `captureText`,
`capturePhase (idle|processing|result)`, `captureStep`, `prospectId`, `agentStep`, `messages`,
`typing`, `voiceOpen`, `voiceStage (0..3)`, `theme`, `toast`, `tasks`.
See `IMPLEMENTATION_PLAN.md` for the zustand slices and which of these must come from the API.

## Assets
No image assets. All icons are inline 24×24 stroke paths (1.5 default / 1.9 active, round caps) —
in the app use `lucide-react` equivalents: Home, Briefcase, Radar, Sparkles, User, Plus, Mic,
RotateCcw, X, ChevronRight, ChevronDown, Check. The AI mark is the character `✦`, never a robot.
Fonts: Geist, Inter, JetBrains Mono (Google Fonts) — already imported in `src/styles/globals.css`.

## Files
- `HustleOS Mobile.dc.html`, `HustleOS App.dc.html`, `ios-frame.jsx` (design references)
- `IMPLEMENTATION_PLAN.md` — phase-by-phase build order in the real repo
- `API_CONTRACT.md` — every screen mapped to an endpoint, existing and new
- `code/` — drop-in starting points: tokens, api client, store, voice hook, orb, nav, FastAPI router
