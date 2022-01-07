#!/usr/bin/env python
# coding: utf-8

# Copyright (c) cdr4eelz.
# Distributed under the terms of the Modified BSD License.

"""Wrapper class to make serialhub.SerialHubPort access similar to regular IO."""

import io
from collections import deque
from typing import ByteString, Optional, NoReturn, Callable, TextIO, Deque
from abc import abstractmethod  # ABCMeta


class SerialIOProvider():
    """Base class defining an "interface" providing serial data to SerialIO."""

    @abstractmethod
    def on_recv(self, cb_recv: Callable[[ByteString], None]) -> None:
        """Set a single callback for received buffers of serial data"""

    @abstractmethod
    def do_recv(self, buf: ByteString) -> None:
        """A buffer arrived, handle it (by calling the callback set by on_recv)."""

    @abstractmethod
    def is_closed(self) -> bool:
        """Is the provider closed?"""

    @abstractmethod
    def write_bytes(self, buf: ByteString) -> None:
        """Send data to serial port."""


#typing.BinaryIO(typing.IO[bytes])
class SerialIO(io.RawIOBase):
    """Serial IO to be proxied to frontend browser Web Serial API"""

    def __init__(self, provider: SerialIOProvider, dbglog: TextIO = None):
        super().__init__()  # Perhaps not necessary for RawIOBase?
        self._siop: SerialIOProvider = provider
        self._qread: Deque[io.BytesIO] = deque()
        self._dbglog: Optional[TextIO] = dbglog
        self._dbg(f'Constructing {ascii(self)}\n')

        # Wrap callback method in a callback function...
        def wrap_recv_cb(buf: ByteString) -> None:
            # ...in order to capture "self" in a Closure and use for method call
            self.cb_recv(buf)
        provider.on_recv(wrap_recv_cb)

    def _dbg(self, msg: str) -> None:
        """Log msg string to _dbglog and immediately flush, or ignore if it is None"""
        if self._dbglog is not None:  # Caller should chck, to short-circuit a complicated msg
            self._dbglog.write(msg)
            self._dbglog.flush()

    def cb_recv(self, data: ByteString) -> None:
        """Append received data to our deque as BytesIO."""
        bio_data = io.BytesIO(data)
        self._qread.append(bio_data)
        if self._dbglog is not None:  # Avoid creating message unless needed
            self._dbg(f'  +RECV: {len(data)} {ascii(data)} 0x{id(bio_data):X}\n')

    def closed(self) -> bool:
        """Rely on the widget/provider to report closed status."""
        return self._siop.is_closed()

    def write(self, data: bytes) -> Optional[int]:
        """Sends data to the associated SerialIOProvider."""
        if self.closed():
            raise ValueError("Stream closed")
        if len(data) <= 0:
            return None
        self._siop.write_bytes(data)
        return len(data)  # Assume all data gets written

    def readinto(self, ba_into: bytearray) -> Optional[int]:
        if self.closed():
            raise ValueError("Stream closed")
        if len(ba_into) <= 0:
            return None
        # Examine deque from left, looking for first readable stream
        while len(self._qread) > 0:  # While deque MIGHT have more data avail
            n_written: Optional[int] = self._qread[0].readinto(ba_into)
            if n_written is not None and n_written > 0:  # If something written...
                if self._dbglog is not None:  # Avoid details of message unless needed
                    # View of the written portion
                    ba_part: bytearray = ba_into[:n_written]
                    # Take note of current offset
                    ba_off: int = self._qread[0].tell()
                    self._dbg(
                        f'  =RDIN: {n_written} {len(ba_into)} {ba_off} {repr(ba_part)}\n')
                return n_written  # Return first successful chunk, even more might be available
            # Unsuccessful nested readint(), discard the depleated BytesIO stream
            disc_bio: io.BytesIO = self._qread.popleft()  # Discard zeroth/left-most element
            if self._dbglog is not None:  # Avoid details of message unless needed
                disc_byt: bytes = disc_bio.getvalue()
                disc_off: int = disc_bio.tell()
                self._dbg(
                    f'  -DISC: {len(disc_byt)} {disc_off} {repr(disc_byt)} 0x{id(disc_bio):X}\n')
            disc_bio.close()  # Hopefully this releases referenced bytes as if detach()
            del disc_bio  # Promote opportunity for GC to free buffers ASAP???
        # Empty, return 0/None as though non-blocking (rather than zero length)???
        return 0

    def reset_input_buffer(self) -> None:
        """Clear all data waiting to be read (Data that has arrived at backend)."""
        old_deque = self._qread
        self._qread = deque()  # Replace deque with a blank one
        self._dbg('reset_input_buffer() called\n')
        for rio in old_deque:
            rio.close()
        old_deque.clear()

    @property
    def in_waiting(self) -> int:
        """Number of bytes waiting in backend read buffers."""
        t_bytes: int = 0
        for rio in self._qread:
            # Total buffer minus seek position
            t_bytes += len(rio.getbuffer()) - rio.tell()
        return t_bytes

    def reset_output_buffer(self) -> None:
        """Clear data waiting to be written (Does nothing)."""
        self._dbg('reset_output_buffer() called\n')

    @property
    def out_waiting(self) -> int:
        """Number of bytes outgoing buffers (Always zero)"""
        return 0

    def readable(self) -> bool:
        return True

    def writable(self) -> bool:
        return True

    def isatty(self) -> bool:
        return False

    def seekable(self) -> bool:
        return False

    def fileno(self) -> NoReturn:
        raise OSError("No fileno")

    def tell(self) -> NoReturn:
        raise OSError("Not seekable")

    def seek(self, offset: int, whence=0) -> NoReturn:
        raise OSError("Not seekable")

    def truncate(self, size: Optional[int] = None) -> NoReturn:
        raise OSError("Not seekable")

    def _checkClosed(self) -> None:
        """Override closed check performed by super."""
        if self.closed():
            raise ValueError('I/O operation on closed file.')

    def readlines(self, hint: int = -1) -> NoReturn:
        """readlines is unimplemented."""
        raise OSError("Unimplemented")


class SerialIOLoopbackProvider(SerialIOProvider):
    """Dummy SerialIOProvider which logs output and loops back to input callback."""

    def __init__(self, dbglog: TextIO = None):
        #Don't need to call super().__init__ since SerialIOProvider is fully abstract
        self._cb_recv: Optional[Callable[[ByteString], None]] = None
        self._dbglog: TextIO = dbglog
        self._closed = False
        if self._dbglog:
            self._dbglog.write(f'Constructed {ascii(self)}\n')

    def on_recv(self, cb_recv: Optional[Callable[[ByteString], None]]) -> None:
        """Set callback for received buffers of serial data."""
        self._cb_recv = cb_recv
        if self._dbglog:
            self._dbglog.write(f'Provider-ONRECV: {ascii(cb_recv)}\n')

    def do_recv(self, buf: ByteString) -> None:
        """A buffer arrived, handle it."""
        if self._cb_recv:
            self._cb_recv(buf)
        elif self._dbglog:
            self._dbglog.write(f'Provider-LOST: {len(buf)} {ascii(buf)}\n')

    def write_bytes(self, buf: ByteString) -> None:
        """Would send data to serial port."""
        if self._dbglog:
            self._dbglog.write(f'Provider-WRITELOOP: {len(buf)} {ascii(buf)}\n')
        self.do_recv(buf)  # Loopback to our own recv method

    def is_closed(self) -> bool:
        """Test code can manipulate this value with set_closed()."""
        return self._closed

    def set_closed(self, val: bool) -> None:
        """Manipulate the "closed" state of the dummy provider."""
        self._closed = val
