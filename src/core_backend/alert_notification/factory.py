import logging
from typing import Optional
from .base import BaseNotificationChannel
from .channels import TelegramChannel, WebhookChannel, GmailChannel

logger = logging.getLogger(__name__)

class NotificationFactory:
    """
    Factory class to instantiate notification channels dynamically.
    """
    @staticmethod
    def create_channel(channel_name: str) -> Optional[BaseNotificationChannel]:
        name = channel_name.lower().strip()
        if name == "telegram":
            return TelegramChannel()
        elif name == "webhook":
            return WebhookChannel()
        elif name == "gmail":
            return GmailChannel()
        else:
            logger.error(f"Unknown notification channel type: {channel_name}")
            return None