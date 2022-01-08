"""Compute module version by parsing package.json settings."""

import json
from pathlib import Path

__all__ = ["__version__"]

def _fetch_version():
    here = Path(__file__).parent.resolve()

    for settings in here.rglob("package.json"):
        try:
            with settings.open() as f_settings:
                version = json.load(f_settings)["version"]
                return (
                    version.replace("-alpha.", "a")
                    .replace("-beta.", "b")
                    .replace("-rc.", "rc")
                )
        except FileNotFoundError:  # pragma: no cover
            pass

    raise FileNotFoundError(
        f"Could not find package.json under dir {here!s}")  # pragma: no cover

__version__ = _fetch_version()
