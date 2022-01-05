#!/usr/bin/env python
# coding: utf-8

# Copyright (c) cdr4eelz.
# Distributed under the terms of the Modified BSD License.

"""Wrapper class to make serialhub.SerialHubPort access similar to regular IO."""

# , BinaryIO, IO
from typing import Deque, ByteString, Optional, NoReturn
import io  # , binascii
from collections import deque

from .backend import SerialHubWidget

#BinaryIO(IO[bytes])
class SerialIO(io.RawIOBase):
    """Serial IO proxied to frontend browser serial"""

    def __init__(self, widget: SerialHubWidget):  # , *args, **kwargs):
        io.RawIOBase.__init__(self)
        self.widget: SerialHubWidget = widget
        self.bufseq: Deque[io.BytesIO] = deque()

        def wrap_recv(buf):
            self.cb_recv(buf)  # Capture self in a callback wrapper
        widget.on_recv(wrap_recv)

    def cb_recv(self, buf: ByteString) -> None:
        """Append received data to our deque as BytesIO."""
        bio = io.BytesIO(buf)
        self.bufseq.append(bio)

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
        return not self.widget.is_supported or self.widget.status != 'Connected'

    def write(self, data: bytes) -> Optional[int]:
        if self.closed():
            raise ValueError("Stream closed")
        if len(data) <= 0:
            return None
        self.widget.write_bytes(data)
        return len(data)

    def readinto(self, b: bytearray) -> Optional[int]:
        if self.closed():
            raise ValueError("Stream closed")
        if len(b) <= 0:
            return None
        if len(self.bufseq) <= 0:
            return 0
        return self.bufseq[0].readinto(b)

    def fileno(self) -> NoReturn:
        raise OSError("No fileno")

    def tell(self) -> NoReturn:
        raise OSError("Not seekable")

    def seek(self, offset: int, whence=0) -> NoReturn:
        raise OSError("Not seekable")

    def truncate(self, size: Optional[int] = None) -> NoReturn:
        raise OSError("Not seekable")
