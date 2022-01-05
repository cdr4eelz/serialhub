#!/usr/bin/env python
# coding: utf-8

# Copyright (c) cdr4eelz.
# Distributed under the terms of the Modified BSD License.

"""Tests of custom Jupyter widget."""

#import pytest

from ..backend import SerialHubWidget


def test_backend_creation_blank():
    """Ensure traitlets exist and have reasonable defaults."""
    #pylint: disable=protected-access
    shw = SerialHubWidget()
    assert not shw.is_supported #Ensure either None or False
    assert shw.status == 'Checking...'
    assert shw.value == ''
    assert shw._model_name == 'SerialHubModel'
    assert shw._model_module == 'serialhub'
    assert shw._model_module_version
    assert shw._view_name == 'SerialHubView'
    assert shw._view_module == 'serialhub'
    assert shw._view_module_version
