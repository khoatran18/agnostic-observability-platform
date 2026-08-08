import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class AlertHistoryService:
    """
    Service responsible for persisting node current operational status and historical alert records into PostgreSQL.
    """

    def __init__(self, db_client):
        self.db_client = db_client

    def record_alert_event(self, node_id: str, resource_type: str, value: float, scenario: str, alert_level: str):
        """
        Upsert current status into node_current_status and insert a new row into alert_history.
        """
        try:
            # 1. Upsert current status for real-time dashboard monitoring
            upsert_query = """
                INSERT INTO node_current_status (node_id, resource_type, status_level, last_value, scenario, updated_at)
                VALUES (:node_id, :resource_type, :status_level, :last_value, :scenario, CURRENT_TIMESTAMP)
                ON CONFLICT (node_id, resource_type) 
                DO UPDATE SET 
                    status_level = EXCLUDED.status_level,
                    last_value = EXCLUDED.last_value,
                    scenario = EXCLUDED.scenario,
                    updated_at = CURRENT_TIMESTAMP;
            """
            self.db_client.execute_non_query(upsert_query, {
                "node_id": node_id,
                "resource_type": resource_type,
                "status_level": alert_level,
                "last_value": value,
                "scenario": scenario
            })

            # 2. Insert into historical log table
            history_query = """
                INSERT INTO alert_history (node_id, resource_type, status_level, metric_value, scenario, created_at)
                VALUES (:node_id, :resource_type, :status_level, :metric_value, :scenario, CURRENT_TIMESTAMP);
            """
            self.db_client.execute_non_query(history_query, {
                "node_id": node_id,
                "resource_type": resource_type,
                "status_level": alert_level,
                "metric_value": value,
                "scenario": scenario
            })

            logger.debug(f"[AlertHistoryService] Successfully recorded status [{alert_level}] for [{node_id}:{resource_type}]")
        except Exception as e:
            logger.error(f"[AlertHistoryService] Failed to record alert event to database: {e}")