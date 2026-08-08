from typing import Dict, List, Any

from pydantic import BaseModel


class StrategyUpdateModel(BaseModel):
    is_enabled: bool
    params: Dict[str, Any]

class NotificationUpdateModel(BaseModel):
    is_enabled: bool
    params: Dict[str, Any]

class TargetsUpdateModel(BaseModel):
    targets: List[str]



