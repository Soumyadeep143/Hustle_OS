import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routes import create_router

load_dotenv()

app = FastAPI(
    title="HustleOS API",
    description="Voice-first AI Operating System for Job Search",
    version="0.2.0",
)

origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://localhost",
    os.getenv("FRONTEND_URL", "http://localhost:5173"),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(create_router(), prefix="/api")

@app.get("/")
def read_root():
    return {
        "message": "HustleOS API",
        "version": "0.2.0",
        "status": "running",
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "hustleos-backend",
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("API_PORT", 3000))
    uvicorn.run(app, host="0.0.0.0", port=port)
