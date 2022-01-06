#!/usr/bin/env python
# coding: utf-8

# Copyright (c) cdr4eelz.
# Distributed under the terms of the Modified BSD License.

"""Tests of custom Jupyter widget."""

#import pytest

#from serialhub import _jupyter_labextension_paths, SerialHubWidget
#from ..backend import SerialHubWidget
#from .. import XYZ

#pylint: disable=protected-access

def test_backend_creation_blank():
    """Ensure traitlets exist and have reasonable defaults."""
    from .. import SerialHubWidget  # pylint: disable=import-outside-toplevel
    shw = SerialHubWidget()
    assert not shw.is_supported  # Ensure either None or False
    assert shw.status == 'Checking...'
    assert shw.value == ''
    assert isinstance(shw.request_options, dict)
    assert isinstance(shw.serial_options, dict)
    assert shw.pkt_send_front == shw.pkt_send_back == (0, 0)
    assert shw.pkt_recv_front == shw.pkt_recv_back == (0, 0)
    #Confirm some semi-internal settings under our control
    assert shw._model_name == 'SerialHubModel'
    assert shw._model_module == 'serialhub'
    assert isinstance(shw._model_module_version, str)
    assert shw._view_name == 'SerialHubView'
    assert shw._view_module == 'serialhub'
    assert isinstance(shw._view_module_version, str)
    assert shw.model_id

def test_backend_labextension():
    """Check that we seem to be a JupyterLab extension."""
    from .. import _jupyter_labextension_paths # pylint: disable=import-outside-toplevel
    # Ensure that it can be called without incident:
    path = _jupyter_labextension_paths()
    assert path
    # Some sanity checks:
    assert len(path) == 1
    assert isinstance(path[0], dict)
