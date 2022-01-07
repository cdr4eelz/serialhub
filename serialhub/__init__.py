# Copyright (c) cdr4eelz.
# Distributed under the terms of the Modified BSD License.

"""\
Python backend module for SerialHub Widget
"""

import json
from pathlib import Path

#Import these so they get re-exported to serialhub package
from .backend import SerialHubWidget
from .serialio import SerialIO, SerialIOProvider, SerialIOLoopbackProvider
from .nbextension import _jupyter_nbextension_paths

from ._version import __version__

HERE = Path(__file__).parent.resolve()

with (HERE / "labextension" / "package.json").open() as fid:
    data = json.load(fid)

def _jupyter_labextension_paths():
    return [{
        "src": "labextension",
        "dest": data["name"]
    }]
