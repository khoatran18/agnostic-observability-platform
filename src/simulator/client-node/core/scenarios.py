import random
import time

from .models import CPUScenario, RAMScenario

# In-memory state to preserve dynamic changes
_state = {
    "cpu_scenario": CPUScenario.NORMAL,
    "ram_scenario": RAMScenario.NORMAL,
    "cpu_start_time": time.time(),
    "ram_start_time": time.time(),
    "config": {
        "cpu_normal_min": 0.35,
        "cpu_normal_max": 0.45,
        "ram_normal_min": 3.5,
        "ram_normal_max": 4.5,
        "total_ram_gb": 10.0,

        "mad_k": 3.0,
        "threshold_1": 0.7,
        "threshold_2": 0.9,
        "duration_safe_seconds": 10.0,
        "duration_danger_seconds": 30.0,
    }
}

def set_cpu_scenario(scenario: CPUScenario) -> CPUScenario:
    """Update CPU scenario and reset CPU start time"""
    _state["cpu_scenario"] = scenario
    _state["cpu_start_time"] = time.time()
    return _state["cpu_scenario"]

def set_ram_scenario(scenario: RAMScenario) -> RAMScenario:
    """Update RAM scenario and reset RAM start time"""
    _state["ram_scenario"] = scenario
    _state["ram_start_time"] = time.time()
    return _state["ram_scenario"]

def update_global_config(new_config: dict) -> dict:
    """Update global configuration"""
    cfg = _state["config"]
    for key, val in new_config.items():
        if val is not None and key in cfg:
            cfg[key] = val
    return cfg

def get_global_config() -> dict:
    """Get global configuration"""
    return _state["config"]

def get_current_state() -> dict:
    """Returns the current state snapshot of the client node."""
    return _state

def _calculate_mad_threshold(min_val: float, max_val: float, k: float) -> float:
    """
    Calculate dynamic Median Absolute Deviation (MAD) threshold
    - Samples 5 evenly spaced values between min_val and max_val
    - Computes the Median of these points
    - Calculates absolute deviations from the Median, then find the median of these deviations
    - Returns the final upper threshold: Median + (K * MAD)
    """
    points = [min_val + i * (max_val - min_val) / 4 for i in range(5)]
    sorted_points = sorted(points)
    median = sorted_points[2]

    abs_devs = sorted([abs(p - median) for p in points])
    mad = abs_devs[2]

    if mad == 0:
        mad = (max_val - min_val) * 0.1 or 0.05

    return median + (k * mad)


def _calculate_cpu_metric(cfg: dict) -> float:
    """Evaluates and computes CPU usage ratio based on the active CPU scenario."""
    cpu_scen = _state["cpu_scenario"]
    cpu_elapsed = time.time() - _state["cpu_start_time"]
    c_min, c_max = cfg["cpu_normal_min"], cfg["cpu_normal_max"]

    mad_th = _calculate_mad_threshold(c_min, c_max, cfg["mad_k"])
    th1 = cfg["threshold_1"]
    th2 = cfg["threshold_2"]
    safe_sec = cfg["duration_safe_seconds"]
    danger_sec = cfg["duration_danger_seconds"]

    cpu_val = random.uniform(c_min, c_max)

    # CPU simulation by scenario
    if cpu_scen == CPUScenario.NORMAL:
        cpu_val = random.uniform(c_min, c_max)

    elif cpu_scen == CPUScenario.SPIKE_MAD_SAFE:
        if cpu_elapsed < safe_sec:
            cpu_val = random.uniform(mad_th + 0.01, th1 - 0.01)
        else:
            _state["cpu_scenario"] = CPUScenario.NORMAL
            cpu_val = random.uniform(c_min, c_max)

    elif cpu_scen == CPUScenario.SPIKE_TH1_SAFE:
        if cpu_elapsed < safe_sec:
            cpu_val = random.uniform(th1 + 0.02, th2 - 0.05)
        else:
            _state["cpu_scenario"] = CPUScenario.NORMAL
            cpu_val = random.uniform(c_min, c_max)

    elif cpu_scen == CPUScenario.SPIKE_TH1_DANGER:
        if cpu_elapsed < danger_sec:
            cpu_val = random.uniform(th1 + 0.02, th2 - 0.05)
        else:
            cpu_val = random.uniform(th1 + 0.05, th2 - 0.02)

    elif cpu_scen == CPUScenario.SPIKE_TH2_SAFE:
        if cpu_elapsed < safe_sec:
            cpu_val = random.uniform(th2 + 0.01, 0.98)
        else:
            _state["cpu_scenario"] = CPUScenario.NORMAL
            cpu_val = random.uniform(c_min, c_max)

    elif cpu_scen == CPUScenario.SPIKE_TH2_DANGER:
        if cpu_elapsed < danger_sec:
            cpu_val = random.uniform(th2 + 0.01, 0.99)
        else:
            cpu_val = random.uniform(th2 + 0.05, 0.99)

    return cpu_val

def _calculate_ram_metric(cfg: dict) -> float:
    """Evaluates and computes RAM usage in bytes based on the active RAM scenario."""
    ram_scen = _state["ram_scenario"]
    ram_elapsed = time.time() - _state["ram_start_time"]
    r_min, r_max = cfg["ram_normal_min"], cfg["ram_normal_max"]
    total_ram = cfg["total_ram_gb"]

    ram_th1 = r_max + 1.5
    ram_th2 = r_max + 3.5
    safe_sec = cfg["duration_safe_seconds"]
    danger_sec = cfg["duration_danger_seconds"]

    ram_val = random.uniform(r_min, r_max)

    # RAM simulation by scenario
    if ram_scen == RAMScenario.NORMAL:
        ram_val = random.uniform(r_min, r_max)

    elif ram_scen == RAMScenario.SPIKE_MAD_SAFE:
        if ram_elapsed < safe_sec:
            ram_val = random.uniform(r_max + 0.2, ram_th1 - 0.1)
        else:
            _state["ram_scenario"] = RAMScenario.NORMAL
            ram_val = random.uniform(r_min, r_max)

    elif ram_scen == RAMScenario.SPIKE_TH1_SAFE:
        if ram_elapsed < safe_sec:
            ram_val = random.uniform(ram_th1 + 0.2, ram_th2 - 0.2)
        else:
            _state["ram_scenario"] = RAMScenario.NORMAL
            ram_val = random.uniform(r_min, r_max)

    elif ram_scen == RAMScenario.SPIKE_TH1_DANGER:
        if ram_elapsed < danger_sec:
            ram_val = random.uniform(ram_th1 + 0.2, ram_th2 - 0.2)
        else:
            ram_val = random.uniform(ram_th2 - 0.5, ram_th2)

    elif ram_scen == RAMScenario.SPIKE_TH2_SAFE:
        if ram_elapsed < safe_sec:
            ram_val = random.uniform(ram_th2 + 0.1, total_ram - 0.5)
        else:
            _state["ram_scenario"] = RAMScenario.NORMAL
            ram_val = random.uniform(r_min, r_max)

    elif ram_scen == RAMScenario.SPIKE_TH2_DANGER:
        if ram_elapsed < danger_sec:
            ram_val = random.uniform(ram_th2 + 0.5, total_ram - 0.1)
        else:
            ram_val = random.uniform(total_ram - 0.3, total_ram - 0.05)

    return ram_val * 1024 * 1024 * 1024

def calculate_metrics() -> tuple[float, float, float]:
    """
    Evaluate the current system state and return CPU, RAM bytes, and RAM ratio.
    Returns:
        tuple: (cpu_usage_ratio, ram_usage_bytes, ram_usage_ratio)
    """
    cfg = _state["config"]
    cpu_val = _calculate_cpu_metric(cfg)
    ram_bytes = _calculate_ram_metric(cfg)

    # Tính toán tỷ lệ ratio (0.0 - 1.0) để phục vụ cho Anomaly Engine so sánh ngưỡng
    total_ram_bytes = cfg["total_ram_gb"] * 1024 * 1024 * 1024
    ram_ratio = ram_bytes / total_ram_bytes if total_ram_bytes > 0 else 0.0

    return cpu_val, ram_bytes, ram_ratio




