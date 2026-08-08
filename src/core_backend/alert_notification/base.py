from abc import ABC, abstractmethod
from typing import Dict, Any

class BaseNotificationChannel(ABC):
    """
    Abstract Base Class for all alert notification channels.
    """
    @abstractmethod
    def send(self, params: Dict[str, Any], node_id: str, resource_type: str, value: float, scenario: str, alert_level: str) -> bool:
        """Send notification using channel-specific logic."""
        pass