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























