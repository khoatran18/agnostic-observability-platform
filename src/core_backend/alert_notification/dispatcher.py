import logging
import threading
from typing import Dict, Any

from src.config.logging import setup_logging
from src.core_backend.alert_notification.alert_history import AlertHistoryService
from src.core_backend.alert_notification.factory import NotificationFactory

setup_logging()
logger = logging.getLogger(__name__)


class AlertDispatcher:
    """
    Independent dispatcher module responsible for querying active notification
    channels from the database and dispatching alerts using the Factory Pattern.
    """

    def __init__(self, config_service):
        self.config_service = config_service
        self.alert_history = AlertHistoryService(config_service.db_client)

    def _send_async_channels(self, active_channels, node_id, resource_type, value, scenario, alert_level):
        """
        Background task to iterate and dispatch alerts across channels without blocking the main loop.
        """
        try:
            for channel_record in active_channels:
                channel_name = channel_record.get("channel_name")
                params = channel_record.get("params", {})

                channel_instance = NotificationFactory.create_channel(channel_name)
                if channel_instance:
                    channel_instance.send(params, node_id, resource_type, value, scenario, alert_level)
                else:
                    logger.error(f"[AlertDispatcher] Failed to create channel instance for: {channel_name}")
        except Exception as e:
            logger.error(f"[AlertDispatcher] Error in background channel dispatch: {e}")

    def dispatch(self, node_id: str, resource_type: str, value: float, scenario: str, alert_level: str = "alert"):
        """
        Query enabled notification channels from DB and trigger delivery.
        Applies filtering logic: warnings are always sent, alerts can be filtered/processed, recoveries are sent.
        """
        try:
            # 1. Record alert event in alert_history
            self.alert_history.record_alert_event(node_id, resource_type, value, scenario, alert_level)

            # 2. Query active channels from DB
            active_channels = self.config_service.get_enabled_notifications()

            if not active_channels:
                logger.warning("[AlertDispatcher] No active notification channels found in database.")
                return

            # 3. Iterate and dispatch alerts
            dispatch_thread = threading.Thread(
                target=self._send_async_channels,
                args=(active_channels, node_id, resource_type, value, scenario, alert_level),
                daemon=True
            )
            dispatch_thread.start()

            # for channel_record in active_channels:
            #     channel_name = channel_record.get("channel_name")
            #     params = channel_record.get("params", {})
            #
            #     channel_instance = NotificationFactory.create_channel(channel_name)
            #     if channel_instance:
            #         # Dispatch message without icons and purely in English
            #         channel_instance.send(params, node_id, resource_type, value, scenario, alert_level)
            #     else:
            #         logger.error(f"[AlertDispatcher] Failed to create channel instance for: {channel_name}")

        except Exception as e:
            logger.error(f"[AlertDispatcher] Error dispatching alert for node {node_id}: {e}")