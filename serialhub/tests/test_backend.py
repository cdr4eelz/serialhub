#!/usr/bin/env python
# coding: utf-8

# Copyright (c) cdr4eelz.
# Distributed under the terms of the Modified BSD License.

import pytest

from ..backend import SerialHubWidget


def test_backend_creation_blank():
    w = SerialHubWidget()
    assert w.isSupported == False
    assert w.status == 'Checking...'
    assert w.value == ''
