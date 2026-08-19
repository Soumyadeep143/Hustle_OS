repo: Soumyadeep143/Hustle_OS
branch: main
path: src

## Last sync
date: 2026-08-18T15:52:00Z

### Updated in this project
- Redesigned HustleOS as a mobile-first premium app (10 screens, light + dark).
- Kept the real application pipeline data (OpenAI, Anthropic, Google, Mem0, DeepMind) and voice prompt set.
- Added screens absent from the repo: RECALL, prospect memory/timeline, Quick Capture, Team, Enterprise.
- No backend, agent or API logic touched — presentation layer only.

## Screen map
| Project screen | Repo files it was built from |
| --- | --- |
| Home + AI brief | src/components/Dashboard.tsx |
| Work · Tasks | src/components/Dashboard.tsx |
| Work · Applications | src/components/Applications.tsx |
| AI assistant | src/components/VoiceCommandCenter.tsx |
| Voice mode | src/components/VoiceCommandCenter.tsx |
| Profile | src/components/Settings.tsx |
| Bottom navigation | src/components/Navigation.tsx |
| Type + color foundation | src/styles/design-system.ts, src/styles/globals.css, tailwind.config.js |
| RECALL, prospect detail, Quick Capture, Team, Enterprise | new — not present in repo |
