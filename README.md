# HustleOS - Voice-First AI Operating System for Job Search

A beautiful, pitch-day-ready React/TypeScript frontend for HustleOS, a voice-first AI operating system designed to revolutionize job search automation.

## Features

### 🎤 Voice Command Center
- **Animated Waveform Visualization**: Real-time animated waveform bars that respond to voice input
- **Mic Button**: Large circular button with pulsing glow effect when listening
- **Quick Commands**: Pre-built command chips for common searches
- **Command History**: Displays recent commands and AI responses
- **Mock Voice Responses**: Intelligent responses to voice queries

### 📊 Dashboard
- **Metrics Cards**: Display key statistics (Active Applications, Awaiting Response, Interviews, Action Required)
- **Priorities List**: Today's top tasks with priority levels and status indicators
- **Quick Stats**: Weekly and monthly application stats

### 📋 Applications
- **Kanban Board**: 3-column pipeline (Applied, Reviewing, Interview)
- **Application Cards**: Company, position, salary, match percentage
- **Actions**: Quick buttons for messaging, external links, and delete
- **Pipeline Stats**: Total applications, reviews pending, interviews scheduled

### ⚙️ Settings
- **Notifications**: Toggle push notifications, email alerts, voice output, daily summary
- **Automation**: Auto-apply settings and job preferences
- **Privacy & Security**: 2FA, API key management, connected accounts
- **Profile**: Edit email, name, bio, location
- **Danger Zone**: Clear data or delete account

## Tech Stack

- **Frontend Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom design system
- **Icons**: Lucide React
- **State Management**: Zustand (ready for implementation)
- **HTTP Client**: Axios (ready for API integration)
- **Utilities**: clsx, tailwind-merge

## Design System

### Colors
- **Primary**: #3498db (Blue)
- **Secondary**: #2c3e50 (Slate)
- **Success**: #2ecc71 (Emerald)
- **Slate Palette**: 9 shades from 50 to 900

### Typography
- **Display Font**: Geist (headings)
- **Body Font**: Inter (body text)
- **Mono Font**: JetBrains Mono (code)

### Animations
- **fadeIn**: 0.6s ease-in-out
- **slideInFromLeft**: 0.6s ease-out
- **voiceWave**: 0.6s infinite
- **pulseGlow**: 2s infinite

### Gradients
- **Hero**: #667eea → #764ba2
- **Subtle**: #f5f7fa → #c3cfe2
- **Success**: #84fab0 → #8fd3f4

## Getting Started

### Installation

```bash
cd hustleos
npm install
```

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── Navigation.tsx        # Fixed header with 4 tabs
│   ├── VoiceCommandCenter.tsx # Main voice interface
│   ├── Dashboard.tsx         # Statistics & priorities
│   ├── Applications.tsx      # Kanban pipeline
│   ├── Settings.tsx          # Configuration options
│   ├── Card.tsx              # Reusable card component
│   ├── Button.tsx            # Reusable button component
│   ├── Badge.tsx             # Reusable badge component
│   └── index.ts              # Component exports
├── styles/
│   ├── design-system.ts      # Design tokens & constants
│   └── globals.css           # Global styles & animations
├── App.tsx                   # Main app component
├── main.tsx                  # React entry point
└── index.css                 # Base CSS reset
```

## Key Components

### Card Component
Versatile card container with multiple variants:
- `variant`: 'default' | 'gradient' | 'dark'
- `hover`: Enable hover effects
- `animated`: Apply fade-in animation

### Button Component
Flexible button with various options:
- `variant`: 'primary' | 'secondary' | 'success' | 'danger' | 'outline'
- `size`: 'sm' | 'md' | 'lg'
- `loading`: Show loading spinner
- `fullWidth`: Make button full width

### Badge Component
Status indicators with style variants:
- `variant`: 'default' | 'success' | 'warning' | 'danger' | 'info'
- `size`: 'sm' | 'md' | 'lg'

## Navigation

The app has 4 main tabs:
1. **Voice** - Voice command center with waveform visualization
2. **Dashboard** - Overview of job search progress
3. **Applications** - Kanban board of all applications
4. **Settings** - User preferences and configuration

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## License

MIT License - Built for HustleOS
