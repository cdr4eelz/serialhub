#!/usr/bin/env python
# coding: utf-8

# Copyright (c) cdr4eelz
# Distributed under the terms of the Modified BSD License.

"""Module to export magic value related to classic Notebook extension."""

def _jupyter_nbextension_paths():
    return [{
        'section': 'notebook',
        'src': 'nbextension/static',
        'dest': 'serialhub',
        'require': 'serialhub/extension'
    }]
