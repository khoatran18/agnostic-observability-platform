import logging
import requests
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any
from .base import BaseNotificationChannel

logger = logging.getLogger(__name__)


class TelegramChannel(BaseNotificationChannel):
    """Telegram notification implementation with color-coded status indicators in English."""

    def send(self, params: Dict[str, Any], node_id: str, resource_type: str, value: float, scenario: str,
             alert_level: str = "alert") -> bool:
        bot_token = params.get("bot_token")
        chat_id = params.get("chat_id")

        if not bot_token or not chat_id:
            return False

        # Color coding configuration: Green for recovered, Yellow for warning, Red for alert
        if alert_level == "recovered":
            status_indicator = "🟢 [RECOVERED]"
        elif alert_level == "warning":
            status_indicator = "🟡 [WARNING]"
        else:
            status_indicator = "🔴 [ALERT]"

        message = (
            f"{status_indicator} System Status Update\n"
            f"Node: {node_id}\n"
            f"Resource: {resource_type.upper()}\n"
            f"Current Value: {value * 100:.2f}%\n"
            f"Scenario State: {scenario}\n"
            f"Level: {alert_level.upper()}"
        )

        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        payload = {"chat_id": chat_id, "text": message}

        try:
            response = requests.post(url, json=payload, timeout=5)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"[Telegram] Error: {e}")
            return False


class WebhookChannel(BaseNotificationChannel):
    """Generic Webhook notification implementation with status level in English."""

    def send(self, params: Dict[str, Any], node_id: str, resource_type: str, value: float, scenario: str,
             alert_level: str = "alert") -> bool:
        url = params.get("url")
        if not url:
            return False

        payload = {
            "status_level": alert_level,  # recovered (green), warning (yellow), alert (red)
            "node_id": node_id,
            "resource_type": resource_type,
            "metric_value": value,
            "scenario": scenario
        }
        try:
            response = requests.post(url, json=payload, timeout=5)
            return response.status_code in [200, 201, 204]
        except Exception as e:
            logger.error(f"[Webhook] Error: {e}")
            return False


class GmailChannel(BaseNotificationChannel):
    """Gmail / SMTP email notification implementation with color indicator in English."""

    def send(self, params: Dict[str, Any], node_id: str, resource_type: str, value: float, scenario: str,
             alert_level: str = "alert") -> bool:
        smtp_server = params.get("smtp_server", "smtp.gmail.com")
        port = int(params.get("port", 587))
        sender_email = params.get("sender_email")
        password = params.get("password")
        recipient_email = params.get("recipient_email", sender_email)

        if not sender_email or not password:
            return False

        if alert_level == "recovered":
            tag = "GREEN - RECOVERED"
        elif alert_level == "warning":
            tag = "YELLOW - WARNING"
        else:
            tag = "RED - ALERT"

        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = recipient_email
        msg['Subject'] = f"[{tag}] Node {node_id} - {resource_type.upper()} Status Report"

        body = (
            f"Distributed System Monitoring Report:\n\n"
            f"- Status Tag: {tag}\n"
            f"- Node ID: {node_id}\n"
            f"- Resource: {resource_type.upper()}\n"
            f"- Metric Value: {value * 100:.2f}%\n"
            f"- Active Scenario: {scenario}\n"
        )
        msg.attach(MIMEText(body, 'plain', 'utf-8'))

        try:
            server = smtplib.SMTP(smtp_server, port)
            server.starttls()
            server.login(sender_email, password)
            server.sendmail(sender_email, recipient_email, msg.as_string())
            server.quit()
            return True
        except Exception as e:
            logger.error(f"[Gmail] Error: {e}")
            return False