import time
import logging
import numpy as np
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class MadStrategy:
    """
    Evaluates metric anomalies using Median Absolute Deviation (MAD).
    """
    @staticmethod
    def fetch_historical_values(prometheus_client, node_id: str, metric_name: str, duration_minutes: int = 5) -> List[float]:
        if not prometheus_client:
            return []
        try:
            end_time = time.time()
            start_time = end_time - (duration_minutes * 60)
            promql = f'{metric_name}{{instance="{node_id}"}}'
            results = prometheus_client.query_range(promql, start_time, end_time, step="10s")
            values = []
            for stream in results:
                for _, val_str in stream.get("values", []):
                    values.append(float(val_str))
            return values
        except Exception as e:
            logger.error(f"[MAD Strategy] Failed to fetch historical values: {e}")
            return []

    @classmethod
    def evaluate(cls, prometheus_client, node_id: str, metric_name: str, current_value: float, params: Dict[str, Any]) -> bool:
        mad_k = params.get("mad_k", 3.0)
        history_values = cls.fetch_historical_values(prometheus_client, node_id, metric_name, duration_minutes=5)

        if len(history_values) < 3:
            return False

        median = np.median(history_values)
        abs_deviations = [abs(v - median) for v in history_values]
        mad = np.median(abs_deviations)

        if mad == 0:
            return False

        modified_z_score = 0.6745 * (current_value - median) / mad
        return abs(modified_z_score) > mad_k