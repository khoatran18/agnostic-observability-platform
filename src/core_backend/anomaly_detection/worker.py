import time
import logging
from typing import Dict, Any

from src.config.logging import setup_logging
from .anomaly_engine import AnomalyEngine
from ..alert_notification.dispatcher import AlertDispatcher
from ...shared.prometheus.prometheus_client import PrometheusClient

setup_logging()
logger = logging.getLogger(__name__)


class AnomalyWorker:
    """
    Background worker focusing strictly on metric collection and anomaly evaluation.
    Delegates alert dispatching completely to the AlertDispatcher module.
    """

    def __init__(self, config_service, app_config: dict, interval_seconds: int = 10):
        self.config_service = config_service
        self.app_config = app_config
        self.prometheus_url = self.app_config.get("infrastructure", {}).get("prometheus", {}).get("url", "http://localhost:9090")
        self.client = PrometheusClient(prometheus_url=self.prometheus_url)
        self.engine = AnomalyEngine(self.client)

        self.alert_dispatcher = AlertDispatcher(config_service)

        self.interval_seconds = interval_seconds
        self._cached_strategies: Dict[str, Any] = {}
        self._last_cache_refresh = 0.0
        logger.info(f"[AnomalyWorker] Initialized with Prometheus URL: {self.prometheus_url}, Interval: {interval_seconds}s")

    def refresh_strategies_cache(self):
        """Force refresh strategy configurations from database."""
        try:
            strategies = self.config_service.get_all_anomaly_strategies()
            for strategy in strategies:
                name = strategy.get("strategy_name")
                self._cached_strategies[name] = {
                    "params": strategy.get("params", {}),
                    "is_enabled": strategy.get("is_enabled", True)
                }
            self._last_cache_refresh = time.time()
            logger.info(
                f"[AnomalyWorker] Successfully refreshed strategies cache. Loaded: {list(self._cached_strategies.keys())}")
        except Exception as e:
            logger.error(f"[AnomalyWorker] Failed to refresh strategies cache from DB: {e}")

    def reset_trackers(self):
        """Reset internal metric violation state trackers."""
        self.engine.metric_trackers.clear()
        logger.info("[AnomalyWorker] Anomaly detection metric trackers have been manually reset.")

    def run_once(self):
        current_time = time.time()

        if current_time - self._last_cache_refresh > 60.0 or not self._cached_strategies:
            self.refresh_strategies_cache()

        strategy_params = self._cached_strategies

        cpu_promql = 'client_cpu_usage_ratio{job="dynamic-metrics-craw"}'
        ram_promql = 'client_ram_usage_ratio{job="dynamic-metrics-craw"}'

        cpu_results = self.client.query_instant(cpu_promql)
        ram_results = self.client.query_instant(ram_promql)

        # 1. Evaluate CPU Metrics
        for item in cpu_results:
            node_id = item.get("metric", {}).get("instance", "unknown_node")
            try:
                value = float(item["value"][1])
            except (IndexError, ValueError):
                continue

            scenario, notification_type, is_danger = self.engine.evaluate_cpu(node_id, value, current_time,
                                                                              strategy_params)

            if notification_type == "warning":
                self.alert_dispatcher.dispatch(node_id, "cpu", value, scenario.value, alert_level="warning")
            elif notification_type == "alert":
                self.alert_dispatcher.dispatch(node_id, "cpu", value, scenario.value, alert_level="alert")
            elif notification_type == "recovered":
                self.alert_dispatcher.dispatch(node_id, "cpu", value, scenario.value, alert_level="recovered")

        # 2. Evaluate RAM Metrics
        for item in ram_results:
            node_id = item.get("metric", {}).get("instance", "unknown_node")
            try:
                value = float(item["value"][1])
            except (IndexError, ValueError):
                continue

            scenario, notification_type, is_danger = self.engine.evaluate_ram(node_id, value, current_time,
                                                                              strategy_params)

            if notification_type == "warning":
                self.alert_dispatcher.dispatch(node_id, "ram", value, scenario.value, alert_level="warning")
            elif notification_type == "alert":
                self.alert_dispatcher.dispatch(node_id, "ram", value, scenario.value, alert_level="alert")
            elif notification_type == "recovered":
                self.alert_dispatcher.dispatch(node_id, "ram", value, scenario.value, alert_level="recovered")

    def run(self):
        """Start the background worker loop enforcing the 10-second interval."""
        logger.info("=== Anomaly Detection Worker Started (Interval: 10s) ===")
        self.refresh_strategies_cache()

        while True:
            loop_start = time.time()
            try:
                self.run_once()
            except Exception as e:
                logger.error(f"[AnomalyWorker] Critical error during evaluation loop: {e}", exc_info=True)

            elapsed = time.time() - loop_start
            sleep_time = max(0.0, self.interval_seconds - elapsed)
            time.sleep(sleep_time)