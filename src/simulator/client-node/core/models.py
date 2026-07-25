from enum import Enum
from pydantic import BaseModel

class CPUScenario(str, Enum):
    """
    CPU simulation behaviors and anomaly levels
    """
    NORMAL = "normal"                           # (Safe)
    SPIKE_MAD_SAFE = "spike_mad_safe"           # Exceeds MAD threshold but below Threshold 1 (Safe)
    SPIKE_TH1_SAFE = "spike_th1_safe"           # Exceeds Threshold 1 but recovers within safe duration (Safe)
    SPIKE_TH1_DANGER = "spike_th1_danger"       # Exceeds Threshold 1 and persists too long (Danger)
    SPIKE_TH2_SAFE = "spike_th2_safe"           # Exceeds Threshold 2 but recovers within safe duration (Safe)
    SPIKE_TH2_DANGER = "spike_th2_danger"       # Exceeds Threshold 2 and persists too long (Danger)

class RAMScenario(str, Enum):
    """
    RAM simulation behaviors and anomaly levels
    """
    NORMAL = "normal"                           # (Safe)
    SPIKE_MAD_SAFE = "spike_mad_safe"           # Exceeds MAD threshold but below Threshold 1 (Safe)
    SPIKE_TH1_SAFE = "spike_th1_safe"           # Exceeds Threshold 1 but recovers within safe duration (Safe)
    SPIKE_TH1_DANGER = "spike_th1_danger"       # Exceeds Threshold 1 and persists too long (Danger)
    SPIKE_TH2_SAFE = "spike_th2_safe"           # Exceeds Threshold 2 but recovers within safe duration (Safe)
    SPIKE_TH2_DANGER = "spike_th2_danger"       # Exceeds Threshold 2 and persists too long (Danger)


### For API
class CPUScenarioRequest(BaseModel):
    """Payload for CPU simulation request"""
    scenario: CPUScenario
class CPUScenarioResponse(BaseModel):
    """Response for CPU simulation request"""
    status: str
    scenario: str

class RAMScenarioRequest(BaseModel):
    """Payload for RAM simulation request"""
    scenario: RAMScenario
class RAMScenarioResponse(BaseModel):
    """Response for RAM simulation request"""
    status: str
    scenario: str

class SystemConfigRequest(BaseModel):
    """Payload for system configuration request"""
    cpu_normal_min: float | None = None
    cpu_normal_max: float | None = None
    ram_normal_min: float | None = None
    ram_normal_max: float | None = None
    total_ram_gb: float | None = None

    # MAD and threshold values
    mad_k: float | None = None
    threshold_1: float | None = None
    threshold_2: float | None = None

    # Time window limits (seconds)
    duration_safe_seconds: float | None = None
    duration_danger_seconds: float | None = None
class SystemConfigResponse(BaseModel):
    """Response for system configuration request"""
    status: str
    config: dict

class StatusResponse(BaseModel):
    """Response for system status request"""
    status: str
    state: dict























