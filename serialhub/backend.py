#!/usr/bin/env python
# coding: utf-8

# Copyright (c) cdr4eelz.
# Distributed under the terms of the Modified BSD License.

"""
SerialHub backend widget & support classes
"""

from ipywidgets import DOMWidget
from traitlets import Unicode, Int
from ._frontend import module_name, module_version


class SerialHubWidget(DOMWidget):
    """
    SerialHubWidget class inherits ipywidgets.DOMWidget
      Model: SerialHubModel
      View: SerialHubView
    
    Synchronized attributes:
      value: Unicode string
      xtra: Unicode string
    """
    _model_name = Unicode('SerialHubModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)
    _view_name = Unicode('SerialHubView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    value = Unicode('serial-on-your-hub').tag(sync=True)
    xtra = Unicode('font-weight: bold').tag(sync=True)
