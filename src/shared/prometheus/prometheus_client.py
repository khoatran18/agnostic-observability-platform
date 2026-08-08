import logging
from typing import List, Dict, Any

import requests

from src.config.logging import setup_logging

setup_logging()
logger = logging.getLogger(__name__)

class PrometheusClient:
    """
    Prometheus client for interacting with Prometheus API to fetch metrics
    """
    def __init__(self, prometheus_url: str = "http://localhost:9090"):
        self.prometheus_url = prometheus_url

    def query_instant(self, promql: str) -> List[Dict[str, Any]]:
        """
        Execute a Prometheus instant query
        """
        try:
            query_url = f"{self.prometheus_url}/api/v1/query"
            response = requests.get(query_url, params={"query": promql}, timeout=5)
            result = response.json()

            if result.get("status") == "success":
                logger.info(f"Prometheus query result: {result.get('data', {}).get('result', [])}")
                return result.get("data", {}).get("result", [])
            else:
                logger.error(f"Prometheus query failed: {result.get('error')}")
                return []
        except Exception as e:
            logger.error(f"Error querying Prometheus: {e}")
            return []

    def query_range(self, promql: str, start: float, end: float, step: str = "10s") -> list:
        """
        Execute a range Prometheus query for historical data analysis (Required for MAD).
        """
        try:
            url = f"{self.prometheus_url}/api/v1/query_range"
            params = {
                "query": promql,
                "start": start,
                "end": end,
                "step": step
            }
            response = requests.get(url, params=params, timeout=5)
            data = response.json()
            if data.get("status") == "success":
                return data.get("data", {}).get("result", [])
            return []
        except Exception as e:
            logger.error(f"Prometheus range query failed: {e}")
            return []





