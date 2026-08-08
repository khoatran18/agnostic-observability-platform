import time
import logging
import numpy as np
from typing import Dict, Any, Tuple, List

from src.config.logging import setup_logging
from src.core_backend.core.models import CPUScenario, RAMScenario

setup_logging()
logger = logging.getLogger(__name__)


class AnomalyEngine:
    """
    Engine for anomaly detection combining historical MAD analysis and fixed Thresholds
    with time-based throttling for warning (20s) and alert (30s) intervals.
    """

    def __init__(self, prometheus_client=None):
        self.prometheus_client = prometheus_client
        # Key: "node_id:cpu" or "node_id:ram", Value: tracking state dict
        self.metric_trackers: Dict[str, Dict[str, Any]] = {}
        logger.debug("[AnomalyEngine] Initialized with time-based throttling support.")

    def _fetch_historical_values(self, node_id: str, metric_name: str, duration_minutes: int = 5) -> List[float]:
        """
        Internal helper function to fetch historical values for a given metric.
        """
        if not self.prometheus_client:
            return []

        try:
            end_time = time.time()
            start_time = end_time - (duration_minutes * 60)
            promql = f'{metric_name}{{instance="{node_id}"}}'

            results = self.prometheus_client.query_range(promql, start_time, end_time, step="10s")
            values = []
            for stream in results:
                for timestamp, val_str in stream.get("values", []):
                    values.append(float(val_str))
            return values
        except Exception as e:
            logger.error(f"[AnomalyEngine] Failed to fetch historical values for MAD calculation: {e}")
            return []

    def _check_mad_anomaly(self, node_id: str, metric_name: str, current_value: float, params: Dict[str, Any]) -> bool:
        """
        Internal function to check MAD anomaly.
        """
        mad_k = params.get("mad_k", 3.0)
        history_values = self._fetch_historical_values(node_id, metric_name, duration_minutes=5)

        if len(history_values) < 3:
            return False

        median = np.median(history_values)
        abs_deviations = [abs(v - median) for v in history_values]
        mad = np.median(abs_deviations)

        if mad == 0:
            return False

        modified_z_score = 0.6745 * (current_value - median) / mad
        return abs(modified_z_score) > mad_k

    def _handle_threshold_violation(self, node_id: str, resource_type: str, level: str, value: float,
                                    current_time: float, max_duration: float, is_mad_triggered: bool) -> Tuple[
        Any, str, bool]:
        """
        Internal helper function handling threshold violations with time-based throttling.
        - Warning throttled by 20 seconds.
        - Alert throttled by 30 seconds.
        Key format: node_id + resource_type.
        """
        tracker_key = f"{node_id}:{resource_type}"

        if tracker_key not in self.metric_trackers:
            # First time crossing threshold -> Send WARNING immediately
            self.metric_trackers[tracker_key] = {
                "level": level,
                "start_time": current_time,
                "last_warning_time": current_time,
                "last_alert_time": 0.0
            }
            logger.info(
                f"[Threshold Tracker] New breach recorded for key [{tracker_key}] at level {level.upper()}. Status: WARNING")

            scen = CPUScenario.SPIKE_TH1_SAFE if (
                        resource_type == "cpu" and level == "th1") else CPUScenario.SPIKE_TH2_SAFE
            if resource_type == "ram":
                scen = RAMScenario.SPIKE_TH1_SAFE if level == "th1" else RAMScenario.RAMScenario.SPIKE_TH2_SAFE if hasattr(
                    RAMScenario, 'SPIKE_TH2_SAFE') else RAMScenario.SPIKE_TH1_SAFE

            return scen, "warning", False

        tracker = self.metric_trackers[tracker_key]
        duration = current_time - tracker["start_time"]

        # Check if violation persists beyond max_duration to trigger ALERT
        if tracker["level"] == level and duration >= max_duration:
            is_critical = (level == "th2") or (level == "th1" and is_mad_triggered)

            if is_critical:
                last_alert = tracker.get("last_alert_time", 0.0)
                # Alert throttled by 30 seconds
                if current_time - last_alert >= 30.0:
                    tracker["last_alert_time"] = current_time
                    logger.info(f"[Threshold Tracker] Alert interval passed for [{tracker_key}]. Dispatching ALERT.")

                    if resource_type == "cpu":
                        scen = CPUScenario.SPIKE_TH2_DANGER if level == "th2" else CPUScenario.SPIKE_TH1_DANGER
                    else:
                        scen = RAMScenario.SPIKE_TH2_DANGER if level == "th2" else RAMScenario.SPIKE_TH1_DANGER
                    return scen, "alert", True
                else:
                    # Filtered out because 20s has not elapsed yet
                    if resource_type == "cpu":
                        scen = CPUScenario.SPIKE_TH2_DANGER if level == "th2" else CPUScenario.SPIKE_TH1_DANGER
                    else:
                        scen = RAMScenario.SPIKE_TH2_DANGER if level == "th2" else RAMScenario.SPIKE_TH1_DANGER
                    return scen, "filtered_alert", True
            else:
                # High load without MAD confirmation -> Handled as WARNING with 10s interval
                last_warn = tracker.get("last_warning_time", 0.0)
                if current_time - last_warn >= 20.0:
                    tracker["last_warning_time"] = current_time
                    return (
                        CPUScenario.SPIKE_TH1_SAFE if resource_type == "cpu" else RAMScenario.SPIKE_TH1_SAFE), "warning", False
                else:
                    return (
                        CPUScenario.SPIKE_TH1_SAFE if resource_type == "cpu" else RAMScenario.SPIKE_TH1_SAFE), "filtered_warning", False
        else:
            # Within safe duration limit -> WARNING throttled by 20 seconds
            last_warn = tracker.get("last_warning_time", 0.0)
            if current_time - last_warn >= 20.0:
                tracker["last_warning_time"] = current_time
                scen = CPUScenario.SPIKE_TH1_SAFE if (
                            resource_type == "cpu" and level == "th1") else CPUScenario.SPIKE_TH2_SAFE
                return scen, "warning", False
            else:
                scen = CPUScenario.SPIKE_TH1_SAFE if (
                            resource_type == "cpu" and level == "th1") else CPUScenario.SPIKE_TH2_SAFE
                return scen, "filtered_warning", False

    def evaluate_cpu(self, node_id: str, value: float, current_time: float, strategies_params: Dict[str, Any]) -> Tuple[
        Any, Any, bool]:
        """
        Evaluate CPU metric value and return (scenario, notification_type, is_danger).
        """
        th1 = strategies_params.get("threshold_1", 0.7)
        th2 = strategies_params.get("threshold_2", 0.9)
        max_duration = strategies_params.get("duration_danger_seconds", 30.0)

        mad_boundary = (2.0 / 3.0) * th1
        tracker_key = f"{node_id}:cpu"

        is_mad_triggered = self._check_mad_anomaly(node_id, "client_cpu_usage_ratio", value, strategies_params)

        if value < th1:
            if tracker_key in self.metric_trackers:
                logger.info(f"[CPU Engine] Metric for [{tracker_key}] recovered to normal. Triggering recovery.")
                del self.metric_trackers[tracker_key]
                return CPUScenario.NORMAL, "recovered", False

            if value < mad_boundary and not is_mad_triggered:
                return CPUScenario.NORMAL, None, False
            else:
                return CPUScenario.SPIKE_MAD_SAFE, None, False

        elif value >= th2:
            return self._handle_threshold_violation(node_id, "cpu", "th2", value, current_time, max_duration,
                                                    is_mad_triggered)

        elif value >= th1:
            return self._handle_threshold_violation(node_id, "cpu", "th1", value, current_time, max_duration,
                                                    is_mad_triggered)

        return CPUScenario.NORMAL, None, False

    def evaluate_ram(self, node_id: str, value: float, current_time: float, strategies_params: Dict[str, Any]) -> Tuple[
        Any, Any, bool]:
        """
        Evaluate RAM metric value and return (scenario, notification_type, is_danger).
        """
        th1 = strategies_params.get("threshold_1", 0.7)
        th2 = strategies_params.get("threshold_2", 0.9)
        max_duration = strategies_params.get("duration_danger_seconds", 30.0)

        mad_boundary = (2.0 / 3.0) * th1
        tracker_key = f"{node_id}:ram"

        is_mad_triggered = self._check_mad_anomaly(node_id, "client_ram_usage_ratio", value, strategies_params)

        if value < th1:
            if tracker_key in self.metric_trackers:
                logger.info(f"[RAM Engine] Metric for [{tracker_key}] recovered to normal. Triggering recovery.")
                del self.metric_trackers[tracker_key]
                return RAMScenario.NORMAL, "recovered", False

            if value < mad_boundary and not is_mad_triggered:
                return RAMScenario.NORMAL, None, False
            else:
                return RAMScenario.SPIKE_MAD_SAFE, None, False

        elif value >= th2:
            scen, notif_type, is_danger = self._handle_threshold_violation(node_id, "ram", "th2", value, current_time,
                                                                           max_duration, is_mad_triggered)
            return scen, notif_type, is_danger

        elif value >= th1:
            scen, notif_type, is_danger = self._handle_threshold_violation(node_id, "ram", "th1", value, current_time,
                                                                           max_duration, is_mad_triggered)
            return scen, notif_type, is_danger

        return RAMScenario.NORMAL, None, False