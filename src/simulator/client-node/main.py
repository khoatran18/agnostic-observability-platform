import os
import socket

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.api import router

app = FastAPI(title="Client Node Simulator", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CLIENT_NODE_ID = os.getenv("CLIENT_NODE_ID", socket.gethostname())

# Register API routes from the router module
app.include_router(router)

@app.get("/")
def root():
    return {
        "message": "Client Simulator Node is up and running.",
        "client_node_id": CLIENT_NODE_ID,
        "docs": "/docs",
        "metrics": "/metrics",
        "status": "/api/status"
    }

# docker compose -f docker_compose.yml up -d --build --force-recreate


