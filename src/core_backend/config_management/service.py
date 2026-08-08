import logging
from typing import Dict, List, Any

from src.config.logging import setup_logging
from .targets_manager import TargetsManager

setup_logging()
logger = logging.getLogger(__name__)

class ConfigManagementService:
    """
    Service layer to manage anomaly strategies, notifications, and Prometheus targets.
    """
    def __init__(self, db_client):
        self.db_client = db_client


    ### ANOMALY STRATEGIES ###

    def get_all_anomaly_strategies(self) -> List[Dict[str, Any]]:
        """Retrieve all anomaly detection strategies."""
        query = "SELECT id, strategy_name, description, params, is_enabled, created_at, updated_at FROM anomaly_strategies"
        return self.db_client.execute_query(query)

    def update_strategy_status(self, strategy_id: int, is_enabled: bool) -> bool:
        """Enable or disable a specific anomaly detection strategy."""
        query = """
                UPDATE anomaly_strategies
                SET is_enabled = :is_enabled, \
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :id; \
                """
        return self.db_client.execute_non_query(query, {"id": strategy_id, "is_enabled": is_enabled})

    def update_strategy_params(self, strategy_id: int, params: str) -> bool:
        """Update JSON parameters for a specific strategy."""
        query = """
                UPDATE anomaly_strategies
                SET params     = CAST(:params AS JSONB), \
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :id; \
                """
        return self.db_client.execute_non_query(query, {"id": strategy_id, "params": params})


    ### ALERT NOTIFICATIONS ###

    def get_all_notifications(self) -> List[Dict[str, Any]]:
        """Retrieve all notification channels (telegram, webhook, gmail)."""
        query = "SELECT id, channel_name, params, is_enabled, created_at, updated_at FROM alert_notifications ORDER BY id ASC;"
        return self.db_client.execute_query(query)

    def get_enabled_notifications(self) -> List[Dict[str, Any]]:
        """Retrieve only active/enabled notification channels for alerting."""
        query = "SELECT id, channel_name, params FROM alert_notifications WHERE is_enabled = TRUE;"
        return self.db_client.execute_query(query)

    def update_notification_status(self, channel_id: str, is_enabled: bool) -> bool:
        """Enable or disable a specific notification channel by its name."""
        query = """
            UPDATE alert_notifications 
            SET is_enabled = :is_enabled, updated_at = CURRENT_TIMESTAMP 
            WHERE id = :channel_id;
        """
        return self.db_client.execute_non_query(query, {"id": channel_id, "is_enabled": is_enabled})

    def update_notification_params(self, channel_name: str, params: str) -> bool:
        """Update configuration parameters (tokens, webhooks, smtp settings) for a channel."""
        query = """
            UPDATE alert_notifications 
            SET params = CAST(:params AS JSONB), updated_at = CURRENT_TIMESTAMP 
            WHERE channel_name = :channel_name;
        """
        return self.db_client.execute_non_query(query, {"channel_name": channel_name, "params": params})

    ### PROMETHEUS TARGETS ###
    @staticmethod
    def sync_prometheus_targets(new_targets: list) -> dict:
        """Update Prometheus targets file with the latest list of endpoints."""
        return TargetsManager.update_targets(new_targets)




