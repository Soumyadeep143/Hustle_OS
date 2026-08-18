# HustleOS Backend - Multi-Agent API

FastAPI backend for HustleOS featuring a multi-agent system for intelligent job search automation.

## Features

- **Multi-Agent Architecture**: 5 specialized agents handling different job search tasks
- **Voice Processing**: Speech-to-text and text-to-speech capabilities
- **Job Discovery**: Intelligent opportunity discovery and ranking
- **Documentation Generation**: Auto-generate emails and cover letters
- **Daily Planning**: AI-powered priority planning
- **Memory Management**: Persistent storage of applications and insights

## Architecture

### Agents

1. **MemoryAgent** - Data persistence & retrieval
   - Load and save job applications
   - Detect insights from application history
   - Retrieve user context

2. **OpportunityAgent** - Job discovery & scoring
   - Discover matching opportunities
   - Score jobs using Claude API
   - Rank opportunities by relevance

3. **DocumentationAgent** - Email & letter generation
   - Generate personalized cold emails
   - Create compelling cover letters
   - Customize based on job details

4. **PlannerAgent** - Daily planning & strategy
   - Generate motivational daily priorities
   - Calculate execution score
   - Track progress metrics

5. **VoiceAgent** - Speech & routing
   - Transcribe speech using Whisper
   - Generate speech using ElevenLabs
   - Route commands to appropriate agents

## Project Structure

```
hustleos-backend/
├── agents/
│   ├── __init__.py
│   ├── memory_agent.py
│   ├── opportunity_agent.py
│   ├── documentation_agent.py
│   ├── planner_agent.py
│   └── voice_agent.py
├── routes/
│   ├── __init__.py
│   ├── voice.py
│   ├── opportunities.py
│   ├── dashboard.py
│   └── memory.py
├── models/
│   ├── __init__.py
│   └── schemas.py
├── app.py
├── memory.json
├── requirements.txt
├── .env.example
└── README.md
```

## Installation

### Prerequisites
- Python 3.8+
- API keys for OpenAI, Anthropic, and ElevenLabs

### Setup

1. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your API keys
```

## Running the Server

```bash
python app.py
```

Server will start at `http://localhost:3000`

### Development Mode

For auto-reloading during development:
```bash
uvicorn app:app --reload --port 3000
```

## API Endpoints

### Voice
- `POST /api/voice/transcribe` - Transcribe audio
- `POST /api/voice/command` - Process voice command
- `POST /api/tts` - Generate speech

### Opportunities
- `POST /api/opportunity/discover` - Discover job opportunities
- `POST /api/opportunity/apply` - Generate application email

### Memory
- `GET /api/memory` - Get user memory and applications

### Dashboard
- `GET /api/dashboard` - Get dashboard metrics and priorities

### Health
- `GET /` - API status
- `GET /health` - Health check

## Configuration

### Environment Variables

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_VOICE_ID=default
FRONTEND_URL=http://localhost:5173
API_PORT=3000
DEBUG=false
```

## Development

### Adding a New Agent

1. Create `agents/new_agent.py`
2. Implement agent class with required methods
3. Add to `agents/__init__.py`
4. Create routes in `routes/new_feature.py`
5. Register in `routes/__init__.py`

### Adding a New Endpoint

1. Create route file in `routes/`
2. Define FastAPI router with endpoints
3. Import and include in `routes/__init__.py`

## Testing

Test endpoints using curl or Postman:

```bash
# Health check
curl http://localhost:3000/health

# Memory
curl http://localhost:3000/api/memory

# Dashboard
curl http://localhost:3000/api/dashboard

# Discover opportunities
curl -X POST http://localhost:3000/api/opportunity/discover \
  -H "Content-Type: application/json" \
  -d '{"role": "AI Engineer", "location": "Bengaluru"}'
```

## Deployment

### Docker

```bash
docker build -t hustleos-backend .
docker run -p 3000:3000 --env-file .env hustleos-backend
```

### Production

- Use Gunicorn with Uvicorn workers
- Enable HTTPS/SSL
- Configure proper CORS origins
- Set DEBUG=false
- Use PostgreSQL for persistence

## Integration with Frontend

The frontend connects to this backend via axios:

```typescript
const api = axios.create({
  baseURL: 'http://localhost:3000',
  timeout: 30000
});
```

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) in the root directory.

## License

MIT License - Built for HustleOS
