# 🖥️ Core Frontend — Monitoring Dashboard

The Core Frontend is the main observability dashboard. It is a **React + TypeScript** single-page application built with Vite, served by **Nginx** inside Docker.

---

## 🛠️ Stack

| Technology | Role |
| :--- | :--- |
| React + TypeScript | UI framework |
| Vite | Build tool and dev server |
| Recharts | Time-series and status charts |
| Nginx | Production static file server + API reverse proxy |

---

## 📁 Structure

```text
core_frontend/
├── Dockerfile              # Multi-stage: Vite build → Nginx serve
├── nginx.conf              # SPA routing + /api/* proxy to core-backend
└── dashboard_fe/           # The React application
    ├── index.html
    ├── vite.config.ts
    ├── package.json
    └── src/
        └── components/
            └── Dashboard/  # Dashboard page components
```

---

## ✨ Dashboard Features

The dashboard communicates with the Core Backend REST API and provides:

- **Cluster Overview** — Real-time status cards for all registered nodes, color-coded by alert level (🟢 recovered / 🟡 warning / 🔴 alert).
- **Metric History Charts** — Time-series CPU and RAM charts pulled from Prometheus via the backend (`/api/dashboard/metrics-history`).
- **Alert History Log** — Table of recent dispatched notifications from the `alert_history` table.
- **Configuration Panel** — Forms to update anomaly strategy parameters, enable/disable notification channels, and manage Prometheus scrape targets.

---

## 🔀 Nginx Configuration

`nginx.conf` handles two responsibilities:

1. **Static SPA serving** — All routes fall back to `index.html` for React Router compatibility.
2. **API proxying** — Requests to `/api/*` are forwarded to `http://core-backend:8000`, avoiding CORS issues in production.

---

## 💻 Running Locally

```bash
cd dashboard_fe
npm install
npm run dev
```

The dev server proxies API calls to `http://localhost:8000` (configured in `vite.config.ts`).

---

## 🐳 Docker Build

The `Dockerfile` uses a two-stage build:

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
RUN npm ci && npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

The built static files are served by Nginx on port **80**.
