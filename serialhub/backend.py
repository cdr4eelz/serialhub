#!/usr/bin/env python
# coding: utf-8

# Copyright (c) cdr4eelz.
# Distributed under the terms of the Modified BSD License.

"""
SerialHub backend widget & support classes
"""

#from __future__ import print_function
from typing import Sequence, Mapping, Any, ByteString, Optional, BinaryIO, IO, NoReturn
import io, binascii

from ipywidgets import DOMWidget, register
from traitlets import Unicode, Int, Bool
from ._frontend import module_name, module_version

@register
class SerialHubWidget(DOMWidget):
    """
    SerialHubWidget class inherits ipywidgets.DOMWidget
      Model: SerialHubModel, View: SerialHubView
      Synchronized attributes: value (Unicode), status (Unicode)
    """
    _model_name = Unicode('SerialHubModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)
    _view_name = Unicode('SerialHubView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    isSupported = Bool(allow_none=True, read_only=True).tag(sync=True)
    #TODO: Use an Enum() rather than string
    status = Unicode(default_value='Checking...').tag(sync=True)
    value = Unicode(default_value='').tag(sync=True)

    def __init__(self, *args, **kwargs):
        DOMWidget.__init__(self, *args, **kwargs)
        self.on_msg(self.msg_custom)
    
    def msg_custom(self, obj, mData: Mapping[str,Any], mBufs: Optional[Sequence[ByteString]] = None) -> None:
        msgType = mData['type'];
        if (msgType == 'binary'):
            for buf in mBufs:
                self.value += str(binascii.b2a_hex(buf));
        elif (msgType == 'text'):
            self.value += mData['text'];


    def send_custom(self, mData: Mapping[str,Any], mBufs: Optional[Sequence[ByteString]] = None) -> None:
        self.send(mData, mBufs)


#BinaryIO(IO[bytes])
class Serial(io.RawIOBase):
    """
    Serial IO proxied to frontend browser serial
    """
    def __init__(self, *args, **kwargs):
        pass

    def readable(self) -> bool:  return True
    def writable(self) -> bool:  return True
    def isatty(self)   -> bool: return False
    def seekable(self) -> bool: return False

    def closed(self) -> bool:
        return True
    
    def write(self, data: bytes) -> Optional[int]:
        if self.closed(): raise ValueError("Stream closed")
        return 0
    
    def readinto(self, b: bytearray) -> Optional[int]:
        if self.closed(): raise ValueError("Stream closed")
        if (len(b) <= 0): return None
        b[0] = 0
        return 1

    def fileno(self) -> NoReturn: raise OSError('No fileno')
    def tell(self) -> NoReturn: raise OSError('Not seekable')
    def seek(self, offset: int, whence = 0) -> NoReturn: raise OSError('Not seekable')
    def truncate(self, size: Optional[int] = None) -> NoReturn: raise OSError('Not seekable')
