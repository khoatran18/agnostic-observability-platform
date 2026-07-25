from fastapi import FastAPI
from core.api import router

app = FastAPI(title="Client Node Simulator", version="1.0.0")

# Register API routes from the router module
app.include_router(router)

@app.get("/")
def root():
    return {
        "message": "Client Simulator Node is up and running.",
        "docs": "/docs",
        "metrics": "/metrics",
        "status": "/api/status"
    }

# docker compose -f docker_compose.yml up -d --build --force-recreate


