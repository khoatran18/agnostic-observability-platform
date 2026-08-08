import os
import json
import logging
from pathlib import Path

from src.config.logging import setup_logging

setup_logging()
logger = logging.getLogger(__name__)

local_targets_path = Path(__file__).parents[3] / "docker" / "prometheus" / "targets.json"

TARGETS_FILE_PATH = os.getenv("TARGETS_FILE_PATH", local_targets_path)

class TargetsManager:
    """
    Handles the management of Prometheus targets.
    """

    @staticmethod
    def get_current_targets() -> list:
        """Return raw targets from the targets file."""
        if not os.path.exists(TARGETS_FILE_PATH):
            logger.warning(f"Targets file found at {TARGETS_FILE_PATH}")
            return []

        try:
            with open(TARGETS_FILE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error reading targets file: {e}")
            return []

    @staticmethod
    def get_current_target_endpoints() -> list:
        """
        Extracts the endpoints from the current targets.
        """
        data = TargetsManager.get_current_targets()
        if isinstance(data, list) and len(data) > 0:
            return data[0]["targets"]
        return []

    @staticmethod
    def update_targets(new_target_endpoints: list) -> dict:
        """
        Update only the inner targets list in the targets file.
        """
        try:
            target_dir = os.path.dirname(TARGETS_FILE_PATH)

            existing_data = []
            if os.path.exists(TARGETS_FILE_PATH):
                try:
                    with open(TARGETS_FILE_PATH, "r", encoding="utf-8") as f:
                        existing_data = json.load(f)
                except json.JSONDecodeError:
                    logger.error("Error decoding existing targets file.")
                    return {}

            existing_data[0]["targets"] = new_target_endpoints
            with open(TARGETS_FILE_PATH, "w", encoding="utf-8") as f:
                json.dump(existing_data, f, indent=4)
            logger.info("Targets file updated successfully.")
            return {
                "status": "success",
                "path": TARGETS_FILE_PATH,
                "targets": new_target_endpoints,
                "count": len(new_target_endpoints)
            }
        except Exception as e:
            logger.error(f"Error updating targets file: {e}")
            return {"status": "error", "message": str(e)}












