from prometheus_client import generate_latest, Gauge, CONTENT_TYPE_LATEST
from .scenarios import calculate_metrics

# Initialize metrics
cpu_usage = Gauge('client_cpu_usage_ratio', 'Client CPU usage ratio (0-1)')
ram_usage = Gauge('client_ram_usage_bytes', 'Client RAM usage in bytes')
ram_usage_ratio = Gauge('client_ram_usage_ratio', 'Client RAM usage ratio (0-1)')  # <--- Thêm metric ratio mới

def collect_and_generate_metrics() -> tuple[bytes, str]:
    """
    Compute current metrics and feeds into Prometheus metrics
    and format into text/plain output
    """
    cpu_val, ram_bytes, ram_ratio = calculate_metrics()

    cpu_usage.set(cpu_val)
    ram_usage.set(ram_bytes)
    ram_usage_ratio.set(ram_ratio)

    return generate_latest(), CONTENT_TYPE_LATEST



