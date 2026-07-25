from prometheus_client import generate_latest, Gauge, CONTENT_TYPE_LATEST
from .scenarios import calculate_metrics

# Initialize metrics
cpu_usage = Gauge('client_cpu_usage_ratio', 'Client CPU usage ratio (0-1)')
ram_usage = Gauge('client_ram_usage_bytes', 'Client RAM usage in bytes')

def collect_and_generate_metrics() -> tuple[bytes, str]:
    """
    Compute current metrics and feeds into Prometheus metrics
    and format into text/plain output
    """
    cpu_val, ram_bytes = calculate_metrics()

    cpu_usage.set(cpu_val)
    ram_usage.set(ram_bytes)

    return generate_latest(), CONTENT_TYPE_LATEST



