import os
import re
from pathlib import Path

import yaml
from dotenv import load_dotenv
import logging

logger = logging.getLogger(__name__)


def load_config(config_path = None, env_path = None) -> dict:
    """
    Get APP_ENV to get config file and load
    """

    if not config_path:
        env = os.getenv("APP_ENV", "dev")
        config_path = Path(__file__).resolve().parent / f"config.{env}.yml"
    if not env_path:
        env_path = Path(__file__).resolve().parents[2] / ".env"

    if not config_path.exists():
        raise  FileNotFoundError(f"Config file not found: {config_path}")
    if not env_path.exists():
        raise  FileNotFoundError(f"Env file not found: {env_path}")

    # Load config
    with open(config_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Load env
    if os.path.exists(env_path):
        load_dotenv(dotenv_path=env_path)

    pattern = re.compile(r"\$\{(\w+)\}")    # () is target group
    content = pattern.sub(lambda m: os.getenv(m.group(1), m.group(0)), content)  # group(0) contains ${}, group(1) contains the variable name (target)

    return yaml.load(content, Loader=yaml.SafeLoader)


if __name__ == "__main__":
    print(load_config())