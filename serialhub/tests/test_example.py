#!/usr/bin/env python
# coding: utf-8

# Copyright (c) cdr4eelz.
# Distributed under the terms of the Modified BSD License.

import pytest

from ..example import SerialHubWidget


def test_example_creation_blank():
    w = SerialHubWidget()
    assert w.value == 'serial-on-your-hub'
