FROM python:3.10-slim

WORKDIR /app

COPY src/core_backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/core_backend/ /app/src/core_backend/
COPY src/shared/ /app/src/shared/
COPY src/config/ /app/src/config/
COPY .env /app/.env

ENV PYTHONPATH=/app

CMD ["uvicorn", "src.core_backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
