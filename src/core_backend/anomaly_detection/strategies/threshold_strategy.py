import time
import logging
from typing import Dict, Any, Tuple
from src.core_backend.core.models import CPUScenario, RAMScenario

logger = logging.getLogger(__name__)


class ThresholdStrategy:
    """
    Evaluates metric anomalies using fixed thresholds (Th1, Th2) with time-based throttling.
    """

    @staticmethod
    def evaluate(node_id: str, resource_type: str, value: float, current_time: float,
                 params: Dict[str, Any], trackers: Dict[str, Any], is_mad_triggered: bool
    ) -> Tuple[Any, str, bool]:

        th1 = params.get("threshold_1", 0.55)
        th2 = params.get("threshold_2", 0.75)
        max_duration = params.get("duration_danger_seconds", 30.0)

        tracker_key = f"{node_id}:{resource_type}"

        if value < th1:
            return None, "normal", False

        level = "th2" if value >= th2 else "th1"

        if tracker_key not in trackers:
            trackers[tracker_key] = {
                "level": level,
                "start_time": current_time,
                "last_warning_time": current_time,
                "last_alert_time": 0.0
            }
            logger.info(
                f"[Threshold Strategy] New breach recorded for [{tracker_key}] at level {level.upper()}. Status: WARNING")

            scen = CPUScenario.SPIKE_TH1_SAFE if (resource_type == "cpu" and level == "th1") else CPUScenario.SPIKE_TH2_SAFE
            if resource_type == "ram":
                scen = RAMScenario.SPIKE_TH1_SAFE if level == "th1" else RAMScenario.SPIKE_TH2_SAFE
            return scen, "warning", False

        tracker = trackers[tracker_key]
        duration = current_time - tracker["start_time"]

        if tracker["level"] == level and duration >= max_duration:
            is_critical = (level == "th2") or (level == "th1" and is_mad_triggered)

            if is_critical:
                last_alert = tracker.get("last_alert_time", 0.0)
                if current_time - last_alert >= 30.0:
                    tracker["last_alert_time"] = current_time
                    scen = CPUScenario.SPIKE_TH2_DANGER if level == "th2" else CPUScenario.SPIKE_TH1_DANGER
                    return scen, "alert", True
                else:
                    scen = CPUScenario.SPIKE_TH2_DANGER if level == "th2" else CPUScenario.SPIKE_TH1_DANGER
                    return scen, "filtered_alert", True
            else:
                last_warn = tracker.get("last_warning_time", 0.0)
                if current_time - last_warn >= 20.0:
                    tracker["last_warning_time"] = current_time
                    scen = CPUScenario.SPIKE_TH1_SAFE if resource_type == "cpu" else RAMScenario.SPIKE_TH1_SAFE
                    return scen, "warning", False
                else:
                    scen = CPUScenario.SPIKE_TH1_SAFE if resource_type == "cpu" else RAMScenario.SPIKE_TH1_SAFE
                    return scen, "filtered_warning", False
        else:
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


