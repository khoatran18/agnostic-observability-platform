import time
import logging
from typing import Dict, Any, Tuple

from src.config.logging import setup_logging
from src.core_backend.core.models import CPUScenario, RAMScenario
from src.core_backend.anomaly_detection.strategies.threshold_strategy import ThresholdStrategy
from src.core_backend.anomaly_detection.strategies.mad_strategy import MadStrategy

setup_logging()
logger = logging.getLogger(__name__)

class AnomalyEngine:
    """
    Engine coordinating modular strategies (Threshold and MAD) with time-based throttling
    and strategy enablement verification.
    """
    def __init__(self, prometheus_client=None):
        self.prometheus_client = prometheus_client
        self.metric_trackers: Dict[str, Dict[str, Any]] = {}
        logger.debug("[AnomalyEngine] Initialized with modular strategy support.")

    def evaluate_cpu(self, node_id: str, value: float, current_time: float, strategies_params: Dict[str, Any]) -> Tuple[
        Any, Any, bool]:
        return self._evaluate_resource(node_id, "cpu", value, current_time, strategies_params)

    def evaluate_ram(self, node_id: str, value: float, current_time: float, strategies_params: Dict[str, Any]) -> Tuple[
        Any, Any, bool]:
        return self._evaluate_resource(node_id, "ram", value, current_time, strategies_params)

    def _evaluate_resource(self, node_id: str, resource_type: str, value: float, current_time: float,
                           strategies_params: Dict[str, Any]) -> Tuple[Any, Any, bool]:
        tracker_key = f"{node_id}:{resource_type}"

        threshold_config = strategies_params.get("Threshold_Strategy", {"is_enabled": True, "params": {}})
        mad_config = strategies_params.get("MAD_Strategy", {"is_enabled": True, "params": {}})

        th_enabled = threshold_config.get("is_enabled", True)
        th_params = threshold_config.get("params", {})

        mad_enabled = mad_config.get("is_enabled", True)
        mad_params = mad_config.get("params", {})

        th1 = th_params.get("threshold_1", 0.55)
        mad_boundary = (2.0 / 3.0) * th1

        # 1. Evaluate MAD if enabled
        metric_name = "client_cpu_usage_ratio" if resource_type == "cpu" else "client_ram_usage_ratio"
        is_mad_triggered = False
        if mad_enabled:
            is_mad_triggered = MadStrategy.evaluate(self.prometheus_client, node_id, metric_name, value, mad_params)

        # 2. Handle Recovery if value drops below th1 (or normal bounds)
        if value < th1:
            if tracker_key in self.metric_trackers:
                logger.info(
                    f"[{resource_type.upper()} Engine] Metric for [{tracker_key}] recovered to normal. Resetting tracker.")
                del self.metric_trackers[tracker_key]
                return (CPUScenario.NORMAL if resource_type == "cpu" else RAMScenario.NORMAL), "recovered", False

            if not th_enabled:
                if mad_enabled and is_mad_triggered:
                    return (
                        CPUScenario.SPIKE_MAD_SAFE if resource_type == "cpu" else RAMScenario.SPIKE_MAD_SAFE), None, False
                return (CPUScenario.NORMAL if resource_type == "cpu" else RAMScenario.NORMAL), None, False

            if value < mad_boundary and not is_mad_triggered:
                return (CPUScenario.NORMAL if resource_type == "cpu" else RAMScenario.NORMAL), None, False
            else:
                return (
                    CPUScenario.SPIKE_MAD_SAFE if resource_type == "cpu" else RAMScenario.SPIKE_MAD_SAFE), None, False

        # 3. Handle Threshold Strategy if enabled
        if th_enabled:
            scen, notif_type, is_danger = ThresholdStrategy.evaluate(
                node_id, resource_type, value, current_time, th_params, self.metric_trackers, is_mad_triggered
            )
            if notif_type != "normal":
                return scen, notif_type, is_danger

        return (CPUScenario.NORMAL if resource_type == "cpu" else RAMScenario.NORMAL), None, False