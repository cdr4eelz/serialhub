#!/usr/bin/env python
# coding: utf-8

# Copyright (c) cdr4eelz.
# Distributed under the terms of the Modified BSD License.

"""Tests of custom Jupyter widget to be loaded by a classic notebook environment."""

def test_nbextension_path():
    """Does the package export the magic extension related info?"""
    # Check that magic function can be imported from package root:
    from .. import _jupyter_nbextension_paths #pylint: disable=import-outside-toplevel
    # Ensure that it can be called without incident:
    path = _jupyter_nbextension_paths()
    # Some sanity checks:
    assert len(path) == 1
    assert isinstance(path[0], dict)
