# HustleOS - Project Summary

**Status**: Phase 2 Complete ✅ | Phase 3 In Progress

## What is HustleOS?

A **voice-first AI operating system** for intelligent job search automation. Think of it as your personal AI assistant that helps you discover, apply, and follow up on job opportunities using multi-agent AI orchestration.

## Project Structure

```
hustleos/
├── 📁 Frontend (React/TypeScript)
│   ├── src/components/        # Voice, Dashboard, Applications, Settings
│   ├── src/styles/            # Tailwind CSS + Design System
│   ├── package.json
│   └── README.md
│
├── 📁 hustleos-backend/       # Phase 2: Multi-Agent FastAPI
│   ├── agents/                # 5 Specialized AI Agents
│   ├── routes/                # API Endpoints
│   ├── models/                # Pydantic Schemas
│   ├── requirements.txt
│   ├── README.md
│   └── SETUP.md
│
├── 📋 Project Documentation
│   ├── README.md              # Project overview
│   ├── ROADMAP.md             # Feature roadmap (Phases 1-6)
│   ├── CONTRIBUTING.md        # Developer guidelines
│   └── LICENSE                # MIT License
```

## Completed Phases

### ✅ Phase 1: Frontend (v0.1.0)

**Status**: Complete & Production Ready

**Features**:
- 🎤 Voice Command Center with waveform visualization
- 📊 Dashboard with metrics and priorities
- 📋 Applications Kanban board (3-column pipeline)
- ⚙️ Settings page with user preferences
- 🎨 Complete design system with animations
- 📱 Fully responsive design

**Tech Stack**:
- React 19.2.8 + TypeScript 6.0
- Vite 8.2.0 (build tool)
- Tailwind CSS v4.3.3
- Lucide React (icons)
- Zustand 5.0 (state management)
- Axios 1.19.0 (HTTP client)

**Try It**: `npm run dev` (runs at http://localhost:5173)

### ✅ Phase 2: Backend (v0.2.0)

**Status**: Complete & Ready for Integration

**Multi-Agent System**:

1. **MemoryAgent** - Data persistence
   - Load/save applications
   - Detect follow-up insights
   - Provide user context

2. **OpportunityAgent** - Job discovery
   - Discover opportunities
   - Score jobs using Claude API
   - Rank by relevance

3. **DocumentationAgent** - Content generation
   - Generate cold emails (3 sentences)
   - Create cover letters
   - Personalize by job details

4. **PlannerAgent** - Daily planning
   - Generate priority tasks
   - Calculate execution score
   - Track progress

5. **VoiceAgent** - Speech & routing
   - Transcribe speech (Whisper API)
   - Generate speech (ElevenLabs)
   - Route commands to agents

**API Endpoints**:
```
POST   /api/voice/transcribe      # Speech → Text
POST   /api/voice/command         # Route voice commands
GET    /api/memory                # Get applications
GET    /api/dashboard             # Get metrics
POST   /api/opportunity/discover  # Find jobs
POST   /api/opportunity/apply     # Generate email
```

**Try It**: 
```bash
cd hustleos-backend
pip install -r requirements.txt
cp .env.example .env              # Configure API keys
python app.py                     # Runs at http://localhost:3000
```

## In Progress

### 🔄 Phase 3: Frontend-Backend Integration

**What's Next**:
- Connect React components to backend API
- Implement real voice command processing
- Load actual data from backend
- Error handling & loading states
- Real-time updates

**Files to Update**:
- `src/services/api.ts` - Axios configuration
- `src/store/voiceStore.ts` - Zustand store
- `src/components/VoiceCommandCenter.tsx`
- `src/components/Dashboard.tsx`
- `src/components/Applications.tsx`

**Example Integration**:
```typescript
// Replace mock responses
const response = await axios.post('/api/voice/command', {
  transcript: userSpoken,
  user_id: userId
});
```

## Quick Start

### Prerequisites
- Node.js 16+
- Python 3.8+
- API keys: OpenAI, Anthropic, ElevenLabs

### 1. Frontend Setup
```bash
cd hustleos
npm install
npm run dev
```

### 2. Backend Setup
```bash
cd hustleos-backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env              # Add your API keys
python app.py
```

### 3. Full Integration Setup
See `hustleos-backend/SETUP.md` for complete setup guide.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   React Frontend (Port 5173)                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Voice | Dashboard | Applications | Settings          │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↕ (Axios)                         │
├─────────────────────────────────────────────────────────────┤
│                  FastAPI Backend (Port 3000)               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  /voice  /opportunity  /dashboard  /memory           │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↕                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  5 AI Agents: Memory | Opportunity | Documentation   │  │
│  │               Planner | Voice                         │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↕                                 │
├─────────────────────────────────────────────────────────────┤
│           External APIs & Services                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  OpenAI (Whisper, GPT)                              │  │
│  │  Anthropic (Claude API)                             │  │
│  │  ElevenLabs (Text-to-Speech)                        │  │
│  │  Job APIs (LinkedIn, Indeed, etc.)                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Development Workflow

### Frontend Development
```bash
cd hustleos
npm run dev        # Start dev server
npm run build      # Production build
npm run lint       # Code linting
```

### Backend Development
```bash
cd hustleos-backend
uvicorn app:app --reload    # Hot reload for development
python app.py               # Standard run
```

### Both Services at Once
```bash
# Terminal 1
cd hustleos-backend && python app.py

# Terminal 2
cd hustleos && npm run dev
```

## Key Features

### 🎯 Voice Interface
- Natural language commands
- Real-time waveform visualization
- Intelligent intent detection
- Audio playback of responses

### 🤖 AI-Powered
- Job opportunity scoring
- Email & cover letter generation
- Daily priority planning
- Insight detection

### 📊 Dashboard
- Application pipeline overview
- Success metrics
- Priority tracking
- Real-time updates

### 🔐 User-Centric
- Data persistence
- Customizable settings
- Privacy-focused
- MIT Licensed

## Configuration

### Environment Variables

**Backend** (`.env`):
```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
ELEVENLABS_API_KEY=sk_...
FRONTEND_URL=http://localhost:5173
API_PORT=3000
DEBUG=false
```

**Frontend** (`.env.local` - optional):
```
VITE_API_URL=http://localhost:3000
```

## Testing the System

### Test API Health
```bash
curl http://localhost:3000/health
```

### Test Memory
```bash
curl http://localhost:3000/api/memory
```

### Test Discover
```bash
curl -X POST http://localhost:3000/api/opportunity/discover \
  -H "Content-Type: application/json" \
  -d '{"role": "AI Engineer", "location": "Bengaluru"}'
```

## Roadmap

- ✅ Phase 1: Frontend
- ✅ Phase 2: Backend
- 🔄 Phase 3: Wire Frontend ↔ Backend
- ⏳ Phase 4: Real API Integration
- ⏳ Phase 5: Database Persistence
- ⏳ Phase 6: Advanced Features

See `ROADMAP.md` for detailed feature breakdown.

## Contributing

We welcome contributions! See `CONTRIBUTING.md` for:
- Code style guidelines
- Development workflow
- Component architecture
- Testing guidelines

## Support

**Getting Help**:
1. Check the README files in each directory
2. Review the SETUP.md in hustleos-backend
3. Look at existing issues
4. Ask questions in GitHub Discussions

## Deployed Versions

- **Frontend (Standalone)**: Repo at `/tmp/hustleos-repo`
- **Full Stack (DevScale)**: Repo at `Soumyadeep143/DevScale`

## License

MIT License - Free to use, modify, and distribute.

---

## Next Steps for Users

### To Run Locally:
1. Clone the repository
2. Follow setup instructions above
3. Configure API keys in `.env`
4. Start both frontend & backend
5. Open http://localhost:5173

### To Contribute:
1. Fork the repository
2. Create feature branch
3. Make changes
4. Submit pull request
5. See CONTRIBUTING.md for details

### To Deploy:
1. Build frontend: `npm run build`
2. Deploy frontend to Vercel/Netlify
3. Deploy backend to AWS/GCP/Heroku
4. Configure production environment variables
5. Update frontend API URL

---

**Built with ❤️ by Soumyadeep**

Last Updated: August 18, 2026
