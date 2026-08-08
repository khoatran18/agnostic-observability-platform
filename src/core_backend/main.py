# from fastapi import FastAPI
# from src.core_backend.api.config_management_router import router as config_router
#
# app = FastAPI(
#     title="Core Backend Monitor System",
#     version="1.0.0"
# )
#
# # Include the configuration management router
# app.include_router(config_router)
#
# @app.get("/")
# def root():
#     return {"message": "Core Backend API is running successfully!"}


import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI

from src.config.settings import load_config
from src.core_backend.api.config_management_router import router as config_router
from src.core_backend.config_management.service import ConfigManagementService
from src.core_backend.anomaly_detection.worker import AnomalyWorker
from src.shared.postgres.postgres_client import PostgresClient

# Khởi tạo cấu hình và Database Client
app_config = load_config()
db_client = PostgresClient(app_config)
config_service = ConfigManagementService(db_client)

# Khởi tạo Anomaly Worker
anomaly_worker = AnomalyWorker(config_service=config_service, interval_seconds=10)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- KHỞI ĐỘNG KHI SERVER START ---
    # Chạy vòng lặp worker của Anomaly Detection ở background thread/task bất đồng bộ
    worker_task = asyncio.create_task(asyncio.to_thread(anomaly_worker.run))
    print("🚀 [System] Anomaly Detection Background Worker started successfully!")

    yield

    # --- KHI SHUTDOWN SERVER ---
    worker_task.cancel()
    db_client.disconnect()
    print("🛑 [System] System shutdown gracefully.")


app = FastAPI(
    title="Core Backend Monitor System",
    version="1.0.0",
    lifespan=lifespan
)

# Include các router hệ thống
app.include_router(config_router)


# (Bạn có thể include thêm router khác nếu có, ví dụ router dashboard/status)

@app.get("/")
def root():
    return {"message": "Core Backend API & Monitoring Worker are running successfully!"}


# uvicorn src.core_backend.main:app --host 0.0.0.0 --port 8000 --reload