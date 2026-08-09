# ⚙️ App Config & Shared Infrastructure

This document covers two foundational modules used across the entire platform: the **Config** loader and the **Shared** infrastructure clients.

---

## 📁 Config — Application Configuration

### Purpose

Provides a unified configuration loading mechanism that merges environment-specific YAML files with secrets from `.env`.

### Files

| File | Description |
| :--- | :--- |
| `config.dev.yml` | Configuration for the `dev` environment (local) |
| `config.prod.yml` | Configuration for the `prod` environment (Docker) |
| `settings.py` | Loads the correct YAML file based on `APP_ENV`, substitutes `${VAR}` placeholders from `.env` |
| `logging.py` | Sets up `logging` with a standard format for all modules |

### ⚙️ How It Works

```python
# settings.py — load_config()
env = os.getenv("APP_ENV", "dev")          # "dev" or "prod"
config_path = f"config.{env}.yml"          # selects the right file
load_dotenv(".env")                         # load secrets
content = pattern.sub(os.getenv, content)  # substitute ${VAR}
return yaml.load(content)
```

The `APP_ENV` environment variable (set in `docker_compose.yml` as `APP_ENV=prod`) controls which file is loaded. In local development, it defaults to `dev`.

### Configuration Structure

```yaml
app:
  name: "Agnostic Observability Platform"
  env: "dev"
  version: "1.0.0"

infrastructure:
  prometheus:
    url: "http://localhost:9090"
    timeout: 5
  postgres:
    host: "postgres"
    port: 5432
    user: "admin"
    password: ${POSTGRES_PASSWORD}   # injected from .env
    database: "main_db"

core-backend:
  anomaly-detection:
    scrape_interval: 10
    strategies:
      - static_threshold: { cpu_threshold: 90, memory_threshold: 90 }
      - mad: { z_score: 3.5, min_samples: 10 }
```

---

## 🗄️ Shared — Infrastructure Clients

### PostgreSQL (`shared/postgres/`)

| File | Description |
| :--- | :--- |
| `postgres_client.py` | `PostgresClient` — SQLAlchemy-based wrapper with `execute_query` (SELECT) and `execute_non_query` (INSERT/UPDATE) |
| `init_db.sql` | Full schema: creates all tables and seeds default data |
| `init_db.example.sql` | Template with placeholder credentials — copy to `init_db.sql` and fill in before first run |

#### Database Schema

| Table | Purpose |
| :--- | :--- |
| `anomaly_strategies` | Strategy name, params (JSONB), is_enabled |
| `alert_notifications` | Channel name, params (JSONB), is_enabled |
| `node_current_status` | `node_id × resource_type` → latest status, upserted every 10 s |
| `alert_history` | Append-only log of every dispatched notification |

#### Initialization

```bash
# Copy the template and edit credentials (Telegram token, Gmail, etc.)
cp init_db.example.sql init_db.sql
```

The backend applies the schema automatically on startup.

### Prometheus (`shared/prometheus/`)

| File | Description |
| :--- | :--- |
| `prometheus_client.py` | `PrometheusClient` — HTTP wrapper around the Prometheus HTTP API |

#### Key Methods

```python
client.query_instant(promql)                    # /api/v1/query       — current value per node
client.query_range(promql, start, end, step)    # /api/v1/query_range — time-series history
```

Both methods are consumed by the backend in two distinct contexts:
- `query_instant` → **AnomalyWorker** polling loop (every 10 s)
- `query_range` → **MAD Strategy** (5-min history window) + **Dashboard** metrics chart (30-min window)
