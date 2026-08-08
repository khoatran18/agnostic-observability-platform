import time
from fastapi import APIRouter, Depends, Query
from src.config.settings import load_config
from src.core_backend.config_management.service import ConfigManagementService
from src.shared.postgres.postgres_client import PostgresClient
from src.shared.prometheus.prometheus_client import PrometheusClient

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard Monitoring"])


def get_config_service():
    config = load_config()
    db_client = PostgresClient(config)
    return ConfigManagementService(db_client)


@router.get("/nodes-realtime-status")
def get_nodes_realtime_status(service: ConfigManagementService = Depends(get_config_service)):
    """
    Fetch current operational status (green, yellow, red) of all nodes directly from the database.
    """
    try:
        query = """
                SELECT node_id, resource_type, status_level, last_value, scenario, updated_at
                FROM node_current_status
                ORDER BY updated_at DESC; \
                """
        results = service.db_client.execute_query(query)
        return {"status": "success", "data": results}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/alert-history")
def get_alert_history(
        limit: int = Query(50, description="Max number of historical logs to return"),
        service: ConfigManagementService = Depends(get_config_service)
):
    """
    Fetch historical log of dispatched notifications for frontend display.
    """
    try:
        query = """
                SELECT id, node_id, resource_type, status_level, metric_value, scenario, created_at
                FROM alert_history
                ORDER BY created_at DESC LIMIT :limit; \
                """
        results = service.db_client.execute_query(query, {"limit": limit})
        return {"status": "success", "data": results}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/metrics-history")
def get_metrics_history(
        node_id: str = Query(..., description="Instance name, e.g., client_node_1:8000"),
        metric_type: str = Query("cpu", description="Metric type: cpu or ram"),
        minutes: int = Query(30, description="Historical range in minutes")
):
    """
    Fetch time-series metric data from Prometheus proxy for dashboard chart rendering,
    pulling the Prometheus URL directly from the configuration structure.
    """
    try:
        config = load_config()

        # Lấy URL của Prometheus từ cấu hình YAML (infrastructure.prometheus.url)
        infra_config = getattr(config, "infrastructure", {})
        if isinstance(infra_config, dict):
            prom_url = infra_config.get("prometheus", {}).get("url", "http://localhost:9090")
        else:
            prom_url = getattr(getattr(config, "prometheus", None), "url", "http://localhost:9090")

        prom_client = PrometheusClient(prom_url)

        end_time = time.time()
        start_time = end_time - (minutes * 60)

        # Select correct metric name based on resource type
        metric_name = "client_cpu_usage_ratio" if metric_type.lower() == "cpu" else "client_ram_usage_ratio"
        promql = f'{metric_name}{{instance="{node_id}"}}'

        # Fetch range query results from Prometheus
        results = prom_client.query_range(promql, start_time, end_time, step="10s")

        chart_data = []
        if results:
            values = results[0].get("values", [])
            for ts, val in values:
                chart_data.append({
                    "timestamp": ts * 1000,  # Convert to milliseconds for JavaScript charts (e.g., Recharts)
                    "value": float(val) * (100.0 if metric_type.lower() == "cpu" else 1.0)
                })

        return {
            "status": "success",
            "node_id": node_id,
            "metric_type": metric_type,
            "data": chart_data
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}