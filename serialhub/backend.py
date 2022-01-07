#!/usr/bin/env python
# coding: utf-8

# Copyright (c) cdr4eelz.
# Distributed under the terms of the Modified BSD License.

"""SerialHub backend widget & support classes"""

from __future__ import absolute_import

from typing import Sequence, Mapping, Any, ByteString, Optional, Callable  # , BinaryIO, IO

import ipywidgets #eg: DOMWidget, register
import traitlets #eg: Integer, Unicode, Bool, Complex, Enum

from ._frontend import module_name, module_version
from .serialio import SerialIOProvider


@ipywidgets.register
class SerialHubWidget(ipywidgets.DOMWidget, SerialIOProvider):
    """\
    SerialHubWidget class inherits ipywidgets.DOMWidget
        Model: SerialHubModel, View: SerialHubView
    """
    _model_name = traitlets.Unicode('SerialHubModel').tag(sync=True)
    _model_module = traitlets.Unicode(module_name).tag(sync=True)
    _model_module_version = traitlets.Unicode(module_version).tag(sync=True)
    _view_name = traitlets.Unicode('SerialHubView').tag(sync=True)
    _view_module = traitlets.Unicode(module_name).tag(sync=True)
    _view_module_version = traitlets.Unicode(module_version).tag(sync=True)

    #is_supported starts as None, then is set by the JavaScript front-end upon load
    is_supported = traitlets.Bool(
        allow_none=True,
        read_only=True,
        help='is_supported is set by frontend to True if the browser supports Web Serial API'
    ).tag(sync=True)
    #FUTURE: Consider an Enum or UseEnum approach for status traitlet???
    status = traitlets.Unicode(
        default_value='Checking...',
        help='status of the widget frontend regarding serial port'
    ).tag(sync=True)
    value = traitlets.Unicode(
        default_value='',
        help='value for debug feedback messages'
    ).tag(sync=True)
    request_options = traitlets.Dict(
        per_key_traits={
            'filters': traitlets.List(trait=traitlets.Dict())
        }, default_value={
            'filters': []
        }, help='request_options to filter serial port list by vendor:product codes'
    ).tag(sync=True)
    serial_options = traitlets.Dict(
        per_key_traits={
            'baudRate': traitlets.Int(),
            'dataBits': traitlets.Int(), #7 | 8
            'parity': traitlets.Unicode(), #'none' | 'even' | 'odd' (Use Enum???)
            'stopBits': traitlets.Int(), #1 | 2
            'bufferSize': traitlets.Int(), #default 255
            'flowControl': traitlets.Unicode() #'none' | 'hardware'
        }, default_value={
            'baudRate': 9600,
            'dataBits': 8,
            'parity': 'none',
            'stopBits': 1
        }, help='serial_options to apply when opening serial port'
    ).tag(sync=True)
    #FUTURE: Optionally turn off 'sync' attribute for statistics (for performance)
    pkt_recv_front = traitlets.Tuple(
        traitlets.Int(), traitlets.Int(),
        default_value=(0, 0),
        read_only=True,
        help='[bytes,packets] received by frontend JS reader'
    ).tag(sync=True)
    pkt_send_front = traitlets.Tuple(
        traitlets.Int(), traitlets.Int(),
        default_value=(0, 0),
        read_only=True,
        help='[bytes,packets] sent to serial port by frontend'
    ).tag(sync=True)
    pkt_recv_back = traitlets.Tuple(
        traitlets.Int(), traitlets.Int(),
        default_value=(0, 0),
        help='[bytes,packets] received from trontend by backend callback'
    ).tag(sync=True)
    pkt_send_back = traitlets.Tuple(
        traitlets.Int(), traitlets.Int(),
        default_value=(0, 0),
        help='[bytes,packets] sent by backend to frontend'
    ).tag(sync=True)

    def __init__(self, *args, **kwargs):
        #FUTURE: Allow request & serial options to be passed at construction
        ipywidgets.DOMWidget.__init__(self, *args, **kwargs)
        self._cb_recv: Optional[Callable[[ByteString], None]] = None
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
                self.do_recv(buf)
        elif msgtype == 'SENT': #Acknowledge data sent by client
            (f_byt, f_pkt) = content['stat_client'] #Update backend stats
            self.pkt_send_front = (f_byt, f_pkt)
        elif msgtype == 'RSTS': #Reset backend statistics
            self.pkt_recv_back = (0, 0)
            self.pkt_send_back = (0, 0)
        elif msgtype == 'MSGV': #Append to "value" from client
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

    def on_recv(self, cb_recv: Optional[Callable[[ByteString], None]]):
        """Set callback for received buffers of serial data"""
        self._cb_recv = cb_recv

    def do_recv(self, buf: ByteString):
        """A buffer arrived, handle it."""
        if self._cb_recv:
            self._cb_recv(buf)
        else:
            # buf.hex() ; str(binascii.b2a_hex(buf)) ; buf.decode('ascii','ignore')
            decoded: str = str(buf, encoding='ascii',
                               errors='backslashreplace')
            self.value += decoded.replace("\n", "\\n").replace("\r", "\\r")

    def write_bytes(self,
                    buf: ByteString
                    ) -> None:
        """Sends a buffer for the client to write() as serial data.
          "buf" is a single bytestring to be output by client to the serialport
        """
        self.send_custom({'type': 'SEND'}, [buf])
        (o_byt, o_pkt) = self.pkt_send_back
        self.pkt_send_back = (o_byt + len(buf), o_pkt + 1)

    def is_closed(self) -> bool:
        """Currently presumes open if serial is supported."""
        return not self.is_supported

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
