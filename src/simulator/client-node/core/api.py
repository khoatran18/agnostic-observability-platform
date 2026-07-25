from fastapi import APIRouter, Response
from .metrics import collect_and_generate_metrics
from .models import CPUScenarioRequest, RAMScenarioRequest, SystemConfigRequest
from .scenarios import set_cpu_scenario, set_ram_scenario, update_global_config, get_current_state

router = APIRouter()

@router.get("/metrics")
def api_get_metrics():
    """
    Prometheus metrics endpoint
    """
    data, content_type = collect_and_generate_metrics()
    return Response(content=data, media_type=content_type)

@router.post("/api/scenario/cpu")
def api_set_cpu_scenario(req: CPUScenarioRequest):
    """
    Endpoint to set CPU simulation scenario
    """
    res = set_cpu_scenario(req.scenario)
    return {"status": "success", "cpu_scenario": res}

@router.post("/api/scenario/ram")
def api_set_ram_scenario(req: RAMScenarioRequest):
    """
    Endpoint to set RAM simulation scenario
    """
    res = set_ram_scenario(req.scenario)
    return {"status": "success", "ram_scenario": res}

@router.post("/api/config")
def api_update_config(req: SystemConfigRequest):
    """
    Endpoint to update system configuration
    """
    new_cfg = update_global_config(req.model_dump(exclude_unset=True))
    return {"status": "success", "config": new_cfg}

@router.get("/api/status")
def api_get_status():
    """
    Endpoint to get system status
    """
    return get_current_state()






