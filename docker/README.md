# 🐳 Docker — External Service Configurations

This directory contains configuration files for the external services managed by Docker Compose — **Prometheus** and **Alertmanager** (reserved).

---

## 📡 Prometheus (`prometheus/`)

### `prometheus.yml` — Scrape Configuration

Prometheus is configured with **file-based service discovery** (`file_sd_configs`) instead of static targets. This is the key mechanism enabling **dynamic target management at runtime** without restarting Prometheus.

```yaml
global:
  scrape_interval: 5s       # How often to scrape each target
  scrape_timeout: 2s        # Max time to wait for a scrape response
  evaluation_interval: 10s  # How often to evaluate alerting rules

scrape_configs:
  - job_name: 'dynamic-metrics-craw'
    file_sd_configs:
      - files:
          - /etc/prometheus/targets.json   # Prometheus watches this file
```

Prometheus watches `targets.json` for changes and **hot-reloads** scrape targets automatically whenever the file is updated.

---

### `targets.json` — Dynamic Scrape Targets

This file holds the list of endpoints that Prometheus scrapes. It is **written at runtime by the Core Backend** via the `/api/config/targets` endpoint, and shared between the `core-backend` and `prometheus` containers via the `prom_shared_data` Docker volume.

```json
[
  {
    "targets": [
      "client_node_1:8000",
      "client_node_2:8000",
      "client_node_3:8000"
    ],
    "labels": {}
  }
]
```

#### 🔗 How the shared volume works

```yaml
# docker_compose.yml (project root)
core-backend:
  volumes:
    - prom_shared_data:/etc/prometheus       # backend writes here

prometheus:
  volumes:
    - prom_shared_data:/etc/prometheus       # prometheus reads here

volumes:
  prom_shared_data:                          # named shared volume
```

When the backend calls `TargetsManager.update_targets()`, it writes the new list to `targets.json`. Prometheus detects the file change and reloads without restart — enabling **zero-downtime target registration**.

---

## 🔔 Alertmanager (`alertmanager/`)

`alertmanager.yml` is reserved for future use. The platform currently implements its own alert dispatching in the Core Backend (`alert_notification/`) to support database-driven, dynamically configurable channels (Telegram, Gmail, Webhook).

Alertmanager integration for rule-based alerting directly from Prometheus can be added here in the future.
