#!/usr/bin/env python
# coding: utf-8

# Copyright (c) cdr4eelz.
# Distributed under the terms of the Modified BSD License.

"""Tests of serialhub widget in a JupyterLab environment."""

#import pytest

from .conftest import MockComm
from ..backend import SerialHubWidget
#from serialhub.serialio import SerialIOLoopbackProvider

#pylint: disable=protected-access

def test_widget(mock_comm: MockComm):
    assert mock_comm
    shw = SerialHubWidget()
    assert shw
    shw.write_bytes(b'Binary')
    print(mock_comm.log_open)
    print(mock_comm.log_send)
    print(mock_comm.log_close)
    #assert 0, mock_comm
