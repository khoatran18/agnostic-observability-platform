import json
from typing import List, Any, Dict

from fastapi import APIRouter, Depends

from src.config.settings import load_config
from src.core_backend.api.models import StrategyUpdateModel, NotificationUpdateModel, TargetsUpdateModel
from src.core_backend.config_management.service import ConfigManagementService
from src.core_backend.config_management.targets_manager import TargetsManager
from src.shared.postgres.postgres_client import PostgresClient

router = APIRouter(prefix="/api/config", tags=["Configuration Management"])

def get_config_service():
    config = load_config()
    db_client = PostgresClient(config)
    return ConfigManagementService(db_client)


# ==================== STRATEGY ENDPOINTS ====================

@router.get("/strategies")
def get_all_strategies(service: ConfigManagementService = Depends(get_config_service)):
    """Retrieve all anomaly detection strategies."""
    try:
        strategies = service.get_all_anomaly_strategies()
        return {"status": "success", "strategies": strategies}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.put("/strategies/{strategy_id}")
def update_strategy_status(strategy_id: int, payload: StrategyUpdateModel, service: ConfigManagementService = Depends(get_config_service)):
    """Enable or disable a specific anomaly detection strategy."""
    try:
        service.update_strategy_status(strategy_id, payload.is_enabled)
        service.update_strategy_params(strategy_id, json.dumps(payload.params))
        return {"status": "success", "message": f"Strategy {strategy_id} updated successfully."}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# ==================== NOTIFICATION ENDPOINTS ====================

@router.get("/notifications")
def get_notifications(service: ConfigManagementService = Depends(get_config_service)):
    """Retrieve all notification channels (telegram, webhook, gmail)."""
    try:
        notifications = service.get_all_notifications()
        return {"status": "success", "notifications": notifications}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.put("/notifications/{channel_name}")
def update_notification(
        channel_name: str,
        payload: NotificationUpdateModel,
        service: ConfigManagementService = Depends(get_config_service)
):
    """Update configuration params and status for a specific notification channel."""
    try:
        service.update_notification_status(channel_name, payload.is_enabled)
        service.update_notification_params(channel_name, json.dumps(payload.params))
        return {"status": "success", "message": f"Notification channel {channel_name} updated successfully."}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# ==================== PROMETHEUS TARGETS ENDPOINTS ====================

@router.get("/targets")
def get_prometheus_targets():
    """Get the current list of Prometheus target endpoints."""
    try:
        targets = TargetsManager.get_current_target_endpoints()
        return {"status": "success", "targets": targets}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.put("/targets")
def update_prometheus_targets(payload: TargetsUpdateModel):
    """Overwrite the inner targets list inside targets.json file."""
    try:
        ConfigManagementService.sync_prometheus_targets(payload.targets)
        return {"status": "success", "message": "Prometheus targets updated successfully."}
    except Exception as e:
        return {"status": "error", "message": str(e)}






