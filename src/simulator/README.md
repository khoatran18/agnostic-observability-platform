# 🧪 Simulator — Client Node Simulators

The Simulator module provides a fully controllable test environment for validating the anomaly detection pipeline end-to-end. It consists of:

1. **`client-node/`** — A simulated distributed node that exposes realistic CPU and RAM metrics via a Prometheus `/metrics` endpoint, with API-controllable scenarios.
2. **`client-control-plane/`** — A React UI for managing and injecting scenarios into one or more simulator nodes.

---

## 📁 Structure

```text
simulator/
├── docker_compose.yml            # Launches 3 client nodes + Control Plane
├── client-node/                  # Simulated node (FastAPI)
│   ├── main.py                   # FastAPI entrypoint
│   ├── Dockerfile
│   ├── requirements.txt
│   └── core/
│       ├── api.py                # Route definitions
│       ├── metrics.py            # Prometheus metric exposition
│       ├── scenarios.py          # Scenario logic + metric computation
│       └── models.py             # CPUScenario / RAMScenario enums
└── client-control-plane/         # Control plane (React + Nginx)
    ├── Dockerfile
    └── client-cp-fe/             # Vite + React + TypeScript app
```

---

## 🤖 Client Node (`client-node/`)

Each client node is an independent FastAPI service that simulates a monitored machine. The node ID is set via the `CLIENT_NODE_ID` environment variable.

### 🌐 Endpoints

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/metrics` | Prometheus-compatible metrics (scraped every 5 s) |
| `POST` | `/api/scenario/cpu` | Set the active CPU simulation scenario |
| `POST` | `/api/scenario/ram` | Set the active RAM simulation scenario |
| `POST` | `/api/config` | Update simulation parameters (thresholds, RAM total, etc.) |
| `GET` | `/api/status` | Get current internal state snapshot |

### 📊 Metrics Exposed

```
client_cpu_usage_ratio    # float 0.0–1.0
client_ram_usage_bytes    # raw bytes
client_ram_usage_ratio    # float 0.0–1.0
```

### 🎭 Simulation Scenarios

Each scenario produces a different metric profile to validate the backend's detection logic:

| Scenario | CPU/RAM Behaviour | Expected Detection Outcome |
| :--- | :--- | :--- |
| `normal` | Random within `[0.35, 0.45]` | No alert |
| `spike_mad_safe` | Between MAD boundary and Th1 | No alert (MAD triggered, below Th1) |
| `spike_th1_safe` | Th1–Th2 range, auto-recovers within `safe_sec` | Warning → auto recover |
| `spike_th1_danger` | Th1–Th2 range, sustained beyond `danger_sec` | Warning → **Alert** (Th1 Danger) |
| `spike_th2_safe` | Above Th2, auto-recovers within `safe_sec` | Warning → auto recover |
| `spike_th2_danger` | Above Th2, sustained beyond `danger_sec` | Warning → **Alert** (Th2 Danger) |

> Default thresholds: `Th1 = 0.55`, `Th2 = 0.75`. Updatable at runtime via `POST /api/config`.

### Example: Trigger a critical alert

```bash
# Set node 1 to a sustained CPU spike above Th2
curl -X POST http://localhost:8010/api/scenario/cpu \
  -H "Content-Type: application/json" \
  -d '{"scenario": "spike_th2_danger"}'

# Wait ~30s, then check the dashboard or Telegram for the alert
```

---

## 🎛️ Client Control Plane (`client-control-plane/`)

A React + TypeScript UI (built with Vite, served by Nginx) that provides a visual interface to control simulator nodes:

- Select a node and inject a CPU or RAM scenario with a single click.
- Monitor the current state of each simulator node.
- Useful for demos and manual testing without using `curl`.

---

## 🐳 Docker Compose

```yaml
services:
  client-simulator-1:   # → localhost:8010
  client-simulator-2:   # → localhost:8011
  client-simulator-3:   # → localhost:8012
  client-control-plane: # → localhost:3000

networks:
  agnostic-observability-platform_monitor-net:
    external: true      # Joins the main stack's network
```

> ⚠️ The main infrastructure stack must be started first — the `monitor-net` Docker network must already exist before launching the simulators.

```bash
# Start simulators
docker compose -f docker_compose.yml up -d --build

# Stop and clean up
docker compose -f docker_compose.yml down
```
