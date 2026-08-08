import logging
import time
from fastapi import APIRouter, Depends, Query

from src.config.logging import setup_logging
from src.config.settings import load_config
from src.core_backend.config_management.service import ConfigManagementService
from src.shared.postgres.postgres_client import PostgresClient
from src.shared.prometheus.prometheus_client import PrometheusClient

setup_logging()
logger = logging.getLogger(__name__)

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


@router.get("/node-status")
def get_node_status(
        node_id: str = Query(..., description="Node instance ID, e.g., client_node_1:8000"),
        service: ConfigManagementService = Depends(get_config_service)
):
    """
    Fetch the latest status of a specific node from the database (filtered by node_id).
    If the node has no history in the DB yet, returns placeholder 'recovered' rows
    so the frontend always renders the node card.
    """
    try:
        query = """
                SELECT node_id, resource_type, status_level, last_value, scenario, updated_at
                FROM node_current_status
                WHERE node_id = :node_id
                ORDER BY updated_at DESC; \
                """
        results = service.db_client.execute_query(query, {"node_id": node_id})

        # If no DB rows yet, return placeholder rows so FE still shows the node card
        if not results:
            from datetime import datetime, timezone
            now = datetime.now(timezone.utc).isoformat()
            results = [
                {"node_id": node_id, "resource_type": "cpu", "status_level": "recovered",
                 "last_value": 0.0, "scenario": "No data yet", "updated_at": now},
                {"node_id": node_id, "resource_type": "ram", "status_level": "recovered",
                 "last_value": 0.0, "scenario": "No data yet", "updated_at": now},
            ]

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

        prom_url = config.get("infrastructure", {}).get("prometheus", {}).get("url", "http://localhost:9090")

        logger.info(f"Prometheus URL: {prom_url}")
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

        logger.info(f"Fetched {len(chart_data)} datapoints for {metric_type} metric on {node_id}")
        return {
            "status": "success",
            "node_id": node_id,
            "metric_type": metric_type,
            "data": chart_data
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}