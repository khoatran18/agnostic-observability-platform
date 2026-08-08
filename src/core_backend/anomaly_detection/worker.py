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

    def __init__(self, config_service, prometheus_url: str = "http://localhost:9090", interval_seconds: int = 10):
        self.config_service = config_service
        self.client = PrometheusClient(prometheus_url)
        self.engine = AnomalyEngine(self.client)

        self.alert_dispatcher = AlertDispatcher(config_service)

        self.interval_seconds = interval_seconds
        self._cached_strategies: Dict[str, Any] = {}
        self._last_cache_refresh = 0.0
        logger.info(f"[AnomalyWorker] Initialized with Prometheus URL: {prometheus_url}, Interval: {interval_seconds}s")

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
        """Execute a single evaluation cycle across CPU and RAM metrics."""
        current_time = time.time()

        if current_time - self._last_cache_refresh > 60.0 or not self._cached_strategies:
            self.refresh_strategies_cache()

        mad_strat = self._cached_strategies.get("MAD_Strategy", {})
        mad_params = mad_strat.get("params", {"mad_k": 3.0, "duration_safe_seconds": 12.0})

        threshold_strat = self._cached_strategies.get("Threshold_Strategy", {})
        threshold_params = threshold_strat.get("params", {
            "threshold_1": 0.55,
            "threshold_2": 0.75,
            "duration_danger_seconds": 30.0
        })

        strategy_params = {
            "mad_k": mad_params.get("mad_k", 3.0),
            "duration_safe_seconds": mad_params.get("duration_safe_seconds", 12.0),
            "threshold_1": threshold_params.get("threshold_1", 0.55),
            "threshold_2": threshold_params.get("threshold_2", 0.75),
            "duration_danger_seconds": threshold_params.get("duration_danger_seconds", 30.0)
        }

        cpu_promql = 'client_cpu_usage_ratio{job="dynamic-metrics-craw"}'
        ram_promql = 'client_ram_usage_ratio{job="dynamic-metrics-craw"}'

        cpu_results = self.client.query_instant(cpu_promql)
        ram_results = self.client.query_instant(ram_promql)

        # 1. Evaluate CPU Metrics
        for item in cpu_results:
            node_id = item.get("metric", {}).get("instance", "unknown_node")
            try:
                value = float(item["value"][1])
            except (IndexError, ValueError) as e:
                logger.error(f"[AnomalyWorker] Failed to parse CPU metric value for node {node_id}: {e}")
                continue

            scenario, notification_type, is_danger = self.engine.evaluate_cpu(node_id, value, current_time,
                                                                              strategy_params)

            logger.info(
                f"[CPU Monitor] Node: {node_id} | Value: {value * 100:.2f}% | Scenario: {scenario.value} | Notif: {notification_type}")

            # Handle notification routing based on type
            if notification_type == "warning":
                logger.warning(f"[CPU WARNING] Threshold crossed on Node {node_id}. Monitoring further...")
                self.alert_dispatcher.dispatch(node_id, "cpu", value, scenario.value, alert_level="warning")

            elif notification_type == "alert":
                logger.warning(
                    f"[CPU ALERT] Critical threshold violation confirmed on Node {node_id}. Dispatching alert...")
                self.alert_dispatcher.dispatch(node_id, "cpu", value, scenario.value, alert_level="alert")

            elif notification_type == "recovered":
                logger.info(f"[CPU RECOVERED] System back to normal on Node {node_id}.")
                self.alert_dispatcher.dispatch(node_id, "cpu", value, scenario.value, alert_level="recovered")

        # 2. Evaluate RAM Metrics
        for item in ram_results:
            node_id = item.get("metric", {}).get("instance", "unknown_node")
            try:
                value = float(item["value"][1])
            except (IndexError, ValueError) as e:
                logger.error(f"[AnomalyWorker] Failed to parse RAM metric value for node {node_id}: {e}")
                continue

            scenario, notification_type, is_danger = self.engine.evaluate_ram(node_id, value, current_time, strategy_params)

            logger.info(
                f"[RAM Monitor] Node: {node_id} | Value: {value * 100:.2f}% | Scenario: {scenario.value} | Notif: {notification_type}")

            if notification_type == "warning":
                logger.warning(f"[RAM WARNING] Threshold crossed on Node {node_id}. Monitoring further...")
                self.alert_dispatcher.dispatch(node_id, "ram", value, scenario.value, alert_level="warning")

            elif notification_type == "alert":
                logger.warning(
                    f"[RAM ALERT] Critical threshold violation confirmed on Node {node_id}. Dispatching alert...")
                self.alert_dispatcher.dispatch(node_id, "ram", value, scenario.value, alert_level="alert")

            elif notification_type == "recovered":
                logger.info(f"[RAM RECOVERED] System back to normal on Node {node_id}.")
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