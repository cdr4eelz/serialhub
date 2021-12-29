#!/usr/bin/env python
# coding: utf-8

# Copyright (c) cdr4eelz.
# Distributed under the terms of the Modified BSD License.

"""\
SerialHub backend widget & support classes
"""

#from __future__ import print_function
from typing import Sequence, Mapping, Any, ByteString, Optional, NoReturn #, BinaryIO, IO
import io #, binascii

import ipywidgets #from ipywidgets import DOMWidget, register
import traitlets
#from traitlets.traitlets import Integer #from traitlets import Unicode, Int, Bool, Complex, Enum
from ._frontend import module_name, module_version

@ipywidgets.register
class SerialHubWidget(ipywidgets.DOMWidget):
    """SerialHubWidget class inherits ipywidgets.DOMWidget
        Model: SerialHubModel, View: SerialHubView
    """
    _model_name = traitlets.Unicode('SerialHubModel').tag(sync=True)
    _model_module = traitlets.Unicode(module_name).tag(sync=True)
    _model_module_version = traitlets.Unicode(module_version).tag(sync=True)
    _view_name = traitlets.Unicode('SerialHubView').tag(sync=True)
    _view_module = traitlets.Unicode(module_name).tag(sync=True)
    _view_module_version = traitlets.Unicode(module_version).tag(sync=True)

    is_supported = traitlets.Bool(allow_none=True, read_only=True).tag(sync=True)
    #TODO: Use Enum and traitlets.UseEnum() to constrain "status" values???
    status = traitlets.Unicode(default_value='Checking...').tag(sync=True)
    value = traitlets.Unicode(default_value='').tag(sync=True)
    request_options = traitlets.Dict(per_key_traits={
            'filters': traitlets.List(trait=traitlets.Dict())
        }, default_value={
            'filters': []
    }).tag(sync=True)
    serial_options = traitlets.Dict(
        per_key_traits={
            'baudRate': traitlets.Int(),
            'dataBits': traitlets.Int(),
            'parity': traitlets.Unicode(),
            'stopBits': traitlets.Int(),
            'bufferSize': traitlets.Int(),
            'flowControl': traitlets.Unicode()
        }, default_value={
            'baudRate': 9600,
            'dataBits': 8,
            'parity': 'none',
            'stopBits': 1
    }).tag(sync=True)
    pkt_recv_front = traitlets.Tuple(
        traitlets.Int(), traitlets.Int(),
        default_value=(0, 0), read_only=True
    ).tag(sync=True)
    pkt_send_front = traitlets.Tuple(
        traitlets.Int(), traitlets.Int(),
        default_value=(0, 0), read_only=True
    ).tag(sync=True)
    pkt_recv_back = traitlets.Tuple(
        traitlets.Int(), traitlets.Int(),
        default_value=(0, 0)
    ).tag(sync=True)
    pkt_send_back = traitlets.Tuple(
        traitlets.Int(), traitlets.Int(),
        default_value=(0, 0)
    ).tag(sync=True)

    def __init__(self, *args, **kwargs):
        #TODO: Allow request & serial options to be passed at construction
        ipywidgets.DOMWidget.__init__(self, *args, **kwargs)
        self.on_msg(self.msg_custom)

    def msg_custom(self,
                widget: ipywidgets.DOMWidget,  #pylint: disable=unused-argument
                content: Mapping[str, Any],
                buffers: Optional[Sequence[ByteString]] = None
    ) -> None:
        """Receives custom message callbacks from the frontend client."""
        msgtype = str(content['type'])
        if msgtype == 'RECV':
            for buf in buffers:
                (o_byt, o_pkt) = self.pkt_recv_back
                self.pkt_recv_back = (o_byt + len(buf), o_pkt + 1)
                #decoded: str = buf.hex()
                #decoded: str = str(binascii.b2a_hex(buf))
                #decoded: str = buf.decode('ascii','ignore')
                decoded: str = str(buf, encoding='ascii', errors='ignore')
                self.value += decoded.replace("\n", "\\n").replace("\r", "\\r")
        elif msgtype == 'text': #Leftover test message
            self.value += content['text']

    def send_custom(self,
                content: Mapping[str, Any],
                buffers: Optional[Sequence[ByteString]] = None
    ) -> None:
        """Sends a custom message to frontend.
            Map "content" gets serialized to JSON available as JS object in client.
            Optional "buffers" get sent as binary data (unlike binary data within "content").
        """
        self.send(content, buffers)

    def write_bytes(self,
                data: ByteString
    ) -> None:
        """Sends a buffer for the client to write() as serial data.
          "data" is a single bytestring to be output by client to the serialport
        """
        self.send_custom({'type': 'SEND'}, [data])
        (o_byt, o_pkt) = self.pkt_send_back
        self.pkt_send_back = (o_byt + len(data), o_pkt + 1)

    def write_str(self,
                data: str,
                enc: Optional[str] = 'ascii',
                errs: Optional[str] = 'ignore'
    ) -> None:
        """Sends a single buffer for the client to write() as serial data.
            Optional "enc" for desired encoding (default 'ascii')
            Optional "errs" for desired encoding error handling (default 'ignore')
        """
        self.write_bytes(data.encode(encoding=enc, errors=errs))


#BinaryIO(IO[bytes])
class Serial(io.RawIOBase):
    """Serial IO proxied to frontend browser serial"""
    def __init__(self, widget: SerialHubWidget): #, *args, **kwargs):
        io.RawIOBase.__init__(self)
        self.widget = widget

    def readable(self) -> bool:
        return True
    def writable(self) -> bool:
        return True
    def isatty(self) -> bool:
        return False
    def seekable(self) -> bool:
        return False

    def closed(self) -> bool:
        """Currently True only if widget reports unsupported"""
        return self.widget.is_supported

    def write(self, data: bytes) -> Optional[int]:
        if self.closed():
            raise ValueError("Stream closed")
        if len(data) <= 0:
            return None
        return 0

    def readinto(self, b: bytearray) -> Optional[int]:
        if self.closed():
            raise ValueError("Stream closed")
        if len(b) <= 0:
            return None
        b[0] = 0
        return 1

    def fileno(self) -> NoReturn:
        raise OSError("No fileno")
    def tell(self) -> NoReturn:
        raise OSError("Not seekable")
    def seek(self, offset: int, whence = 0) -> NoReturn:
        raise OSError("Not seekable")
    def truncate(self, size: Optional[int] = None) -> NoReturn:
        raise OSError("Not seekable")
