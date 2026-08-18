# HustleOS Backend Setup Guide

Complete setup instructions for running the HustleOS backend with the React frontend.

## Prerequisites

- Python 3.8 or higher
- npm (for frontend)
- API keys:
  - OpenAI API key (for Whisper & GPT)
  - Anthropic API key (for Claude)
  - ElevenLabs API key (for text-to-speech)

## Step 1: Backend Setup

### Create Virtual Environment

```bash
cd hustleos-backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your API keys:
```
OPENAI_API_KEY=sk-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here
ELEVENLABS_API_KEY=sk_your-key-here
ELEVENLABS_VOICE_ID=default
FRONTEND_URL=http://localhost:5173
API_PORT=3000
DEBUG=false
```

### Start Backend Server

```bash
python app.py
```

Server runs at `http://localhost:3000`

## Step 2: Frontend Setup

### Install Frontend Dependencies

```bash
cd ../hustleos
npm install
```

### Start Frontend Development Server

```bash
npm run dev
```

Frontend runs at `http://localhost:5173`

## Step 3: Verify Integration

### Test Backend Health

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "hustleos-backend"
}
```

### Test Memory Endpoint

```bash
curl http://localhost:3000/api/memory
```

Expected response includes user profile and applications.

### Test Dashboard

```bash
curl http://localhost:3000/api/dashboard
```

### Test Discover Opportunities

```bash
curl -X POST http://localhost:3000/api/opportunity/discover \
  -H "Content-Type: application/json" \
  -d '{"role": "AI Engineer", "location": "Bengaluru"}'
```

## Environment Configuration

### Development

```bash
# .env
DEBUG=true
FRONTEND_URL=http://localhost:5173
API_PORT=3000
```

### Production

```bash
# .env
DEBUG=false
FRONTEND_URL=https://your-domain.com
API_PORT=3000
```

## Running Both Services

### Option 1: Separate Terminal Windows

Terminal 1 (Backend):
```bash
cd hustleos-backend
source venv/bin/activate
python app.py
```

Terminal 2 (Frontend):
```bash
cd hustleos
npm run dev
```

### Option 2: Using Concurrently

Install concurrently:
```bash
npm install -g concurrently
```

From root directory:
```bash
concurrently \
  "cd hustleos-backend && python app.py" \
  "cd hustleos && npm run dev"
```

## Troubleshooting

### Port Already in Use

If port 3000 is in use:
```bash
# Set different port
export API_PORT=3001
python app.py
```

Update frontend API URL in `.env.local`:
```
VITE_API_URL=http://localhost:3001
```

### API Key Issues

- Verify keys in `.env` file
- Check API key format (should start with `sk-` for OpenAI, `sk-ant-` for Anthropic)
- Ensure keys have required permissions

### CORS Errors

Verify frontend URL in `.env`:
```
FRONTEND_URL=http://localhost:5173
```

### Virtual Environment Issues

Recreate environment:
```bash
rm -rf venv
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Testing the Full Pipeline

### 1. Voice Command Flow

Frontend sends voice command → Backend processes → Agent handles → Response sent back

Test in browser:
1. Open http://localhost:5173
2. Click Voice tab
3. Click mic button
4. Speak command (e.g., "Show my applications")
5. View response

### 2. Opportunity Discovery

```bash
curl -X POST http://localhost:3000/api/opportunity/discover \
  -H "Content-Type: application/json" \
  -d '{"role": "AI Engineer", "location": "Bengaluru"}' \
  | jq '.opportunities | sort_by(.score) | reverse'
```

### 3. Application Email Generation

```bash
curl -X POST http://localhost:3000/api/opportunity/apply \
  -H "Content-Type: application/json" \
  -d '{"opportunity_id": "job_1", "user_id": "user_default"}'
```

## Development Tips

### Using Logging

Add to app.py:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Hot Reload

Use uvicorn with auto-reload:
```bash
uvicorn app:app --reload --port 3000
```

### Testing Agents Independently

```python
from agents import MemoryAgent, OpportunityAgent

memory = MemoryAgent()
context = memory.get_user_context()

opportunity = OpportunityAgent()
jobs = opportunity.discover_jobs("AI Engineer", "Bengaluru")
```

## Next Steps

1. **Phase 3**: Wire frontend components to backend API
2. **Phase 4**: Integrate real APIs (actual job listings, authentication)
3. **Phase 5**: Add database persistence (PostgreSQL/MongoDB)
4. **Phase 6**: Deploy to cloud (AWS/GCP/Heroku)

## Support

For issues, check:
- Backend logs in terminal
- Browser console (Frontend)
- `.env` configuration
- API key validity

---

Happy building! 🚀
