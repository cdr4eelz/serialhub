#!/usr/bin/env python
# coding: utf-8

# Copyright (c) cdr4eelz.
# Distributed under the terms of the Modified BSD License.

"""\
Tests related to SerialIO basics and stream reading.
    NOTE: Some tests examine or depend upon specific implementation internals,
        so these tests go beyond end-result "behavioral" tests.
"""

import sys
import io
import collections
import typing
import pytest

from .. import SerialIO, SerialIOLoopbackProvider, SerialIOProvider

# Is end-of-stream expected to return None or 0/b''
_WANT_NONE_FOR_EOS: bool = False

# Fixtures trigger outer name reuse warning so we suppress it in the module:
#pylint: disable=redefined-outer-name
#pylint: disable=protected-access


@pytest.fixture  # (scope="module")
def sio_provider() -> SerialIOProvider:
    """Create a dummy SerialIOProvider to share in "class" scope."""
    return SerialIOLoopbackProvider(sys.stderr)

@pytest.fixture
def sio(sio_provider: SerialIOProvider) -> typing.Generator[SerialIO, None, None]:
    """Create a fresh SerialIO as basis for a test."""
    siop = sio_provider
    yield SerialIO(siop, sys.stderr)

    siop.on_recv(None)  # Remove callback


# Note "casting" sio as io.IOBase
def test_attributes_iobase(sio: io.IOBase) -> None:
    """Check basic attrs/descriptor functions related to being subclass of io.IOBase."""
    assert sio is not None
    assert isinstance(sio, io.IOBase)
    assert isinstance(sio, io.RawIOBase)
    assert not isinstance(sio, io.TextIOBase)
    assert sio.readable() is True
    assert sio.writable() is True
    assert sio.seekable() is False
    assert sio.isatty() is False
    assert sio.closed() is False

def test_protected(sio: SerialIO) -> None:
    """Check some protected properties that we use during testing."""
    assert sio._siop is not None
    assert isinstance(sio._siop, SerialIOProvider)
    assert sio._siop.is_closed() is False
    assert sio._qread is not None
    assert isinstance(sio._qread, typing.Deque)
    assert isinstance(sio._qread, collections.deque)
    assert sio.cb_recv
    # Not a very specific test!
    assert isinstance(sio.cb_recv, typing.Callable)
    #FUTURE: Check callback signature (by introspection???)

def test_cb_recv(sio: SerialIO) -> None:
    """Indirectly SerialIO.cb_recv() is called by SerialIOProvider.do_recv()."""
    assert len(sio._qread) == 0  # The deque of BytesIO starts empty
    assert sio.in_waiting == 0  # Depends upon working "in_waiting" property
    # Push a buffer using SerialIOProvider method
    sio._siop.do_recv(b'VIA-SIOP')
    assert len(sio._qread) == 1  # One buffer should be present in the deque
    assert sio.in_waiting == 8  # It should contain the length in bytes of the first buffer
    sio.cb_recv(b'VIA-SIO')  # Push a second buffer using SerialIO directly
    # Two buffers should now be present in the deque
    assert len(sio._qread) == 2
    assert sio.in_waiting == 8 + 7  # Expect the sum of each buffer size in bytes

def test_read_varsz(sio: SerialIO) -> None:
    """Sequential buffers read in various sizes"""
    assert sio.in_waiting == 0
    sio._siop.do_recv(b'BUF1\n')
    sio._siop.do_recv(b'BUF2\n')
    assert sio.in_waiting == 5 + 5
    sio._siop.do_recv(b'BUF3\n')
    sio._siop.do_recv(b'BUF4\n')
    # Four buffers, of five bytes each (see above)
    assert sio.in_waiting == 5 + 5 + 5 + 5
    assert sio.read(5) == b'BUF1\n'
    assert sio.in_waiting == 15
    assert sio.read(2) == b'BU'
    assert sio.in_waiting == 13
    assert sio.read(3) == b'F2\n'
    assert sio.in_waiting == 10
    assert sio.read(3) == b'BUF'
    assert sio.in_waiting == 7
    # Ends prematurely by design, at end of input byte buffer
    assert sio.read(20) == b'3\n'
    assert sio.in_waiting == 5
    assert sio.read(20) == b'BUF4\n'
    assert sio.in_waiting == 0

def test_readneg_empties(sio: SerialIO) -> None:
    """Skip empty bufs and read almost all"""
    sio._siop.do_recv(b'BUF5\n')
    assert sio.in_waiting == 5
    sio._siop.do_recv(b'')  # We want it to silently skip empty bufs
    assert sio.in_waiting == 5
    sio._siop.do_recv(b'')
    assert sio.in_waiting == 5
    sio._siop.do_recv(b'BUF6\n')
    assert sio.in_waiting == 10
    assert sio.read(-1) == b'BUF5\nBUF6\n'  # Reads to End-Of-Stream
    assert sio.in_waiting == 0
    assert sio.read(-1) == b''  # Now at EOS
    assert sio.in_waiting == 0

def test_readline_unterm(sio: SerialIO) -> None:
    """Terminated and non-terminated readline"""
    sio._siop.do_recv(b'Buffer7 is a line.\nBuffer8')
    sio._siop.do_recv(b' ends')
    sio._siop.do_recv(b' without NL')
    sio._siop.do_recv(b'.')
    assert sio.in_waiting == 43
    assert sio.readline() == b'Buffer7 is a line.\n'  # Reads to NL
    assert sio.in_waiting == 24
    assert sio.readline() == b'Buffer8 ends without NL.'  # Reads to EOS
    assert sio.in_waiting == 0
    sio._siop.do_recv(b'End NL\n')  # Reads to EOS including NL
    assert sio.readline() == b'End NL\n'
    assert sio.in_waiting == 0


def test_readinto(sio: SerialIO) -> None:
    """Re-used bytearray for readinto amid empty buffers"""
    sio._siop.do_recv(b'')
    sio._siop.do_recv(b'DATA VAL')
    sio._siop.do_recv(b'')
    assert sio.in_waiting == 8
    ba1: bytearray = bytearray(b'.....')  # 5 bytes long writable bytearray
    assert sio.readinto(ba1) == 5  # Reads up to len(bytearray) bytes
    assert ba1 == b'DATA '  # First 5 bytes, filling ba1
    assert sio.in_waiting == 3
    assert sio.readinto(ba1) == 3  # Exhausts input at 3 bytes vs 5 max
    assert ba1 == b'VALA '  # Overlay only first 3 bytes in ba1
    assert sio.in_waiting == 0
    if _WANT_NONE_FOR_EOS:  # pragma: no cover
        assert sio.readinto(ba1) is None  # None for no bytes avail
    else:
        assert sio.readinto(ba1) == 0  # Zero size (or None)
    assert ba1 == b'VALA '  # Unaltered bytearray
    assert sio.in_waiting == 0

def test_readall_multiline(sio: SerialIO) -> None:
    """Multi-line readall"""
    sio._siop.do_recv(b'...several lines\n')
    sio._siop.do_recv(b'until')
    sio._siop.do_recv(b'\nend!')
    assert sio.in_waiting == 27
    assert sio.readall() == b'...several lines\nuntil\nend!'
    assert sio.in_waiting == 0
    if _WANT_NONE_FOR_EOS:  # pragma: no cover
        assert sio.readall() is None
    else:
        assert sio.readall() == b''
    assert sio.in_waiting == 0

def test_readlines_unimp(sio: SerialIO) -> None:
    """Multi-line readlines"""
    assert sio.closed() is False
    #sio._checkClosed()  # Always closed
    sio._siop.do_recv(b'LINE1\nLINE2\r\nLINE3')
    assert sio.readlines
    sio._checkClosed()  # Raises error if closed
    with pytest.raises(OSError):
        sio.readlines()

def test_reset_buffers(sio: SerialIO) -> None:
    """Clear input buffers then resume"""
    assert sio.out_waiting == 0
    sio._siop.do_recv(b'DISCARDED1')
    sio._siop.do_recv(b'Also Discarded')
    assert sio.out_waiting == 0
    sio.reset_output_buffer()  # No action performed
    assert sio.out_waiting == 0
    assert sio.in_waiting == 24  # Confirm something is IN the buffer now
    sio.reset_input_buffer()  # Attempt to clear accumulated read buffers
    assert sio.in_waiting == 0  # Confirm that buffer seems empty
    sio._siop.do_recv(b'FRESH1')
    sio._siop.do_recv(b'FRESH2')
    assert sio.in_waiting == 12  # Ensure fresh buffer is functional
    assert sio.readall() == b'FRESH1FRESH2'  # Read up to EOS (multi-readinto's)
    assert sio.in_waiting == 0  # Already at EOS
    if _WANT_NONE_FOR_EOS:  # pragma: no cover
        assert sio.read(-1) is None
    else:
        assert sio.read(-1) == b''
    assert sio.in_waiting == 0

def test_write_simple(sio: SerialIO) -> None:
    """Write a little bit to the stream."""
    n_written: int = sio.write(b'Hello World\n')
    assert n_written == 12
    ba1 = bytearray(n_written + 4)  # Give it room to make a mistake
    assert sio.readinto(ba1) == 12
    assert ba1 == b'Hello World\n\x00\x00\x00\x00'  # Four extra nulls
    assert sio.in_waiting == 0  # At EOS

def test_write_amid_read(sio: SerialIO) -> None:
    """Mix reading from fake buffers and writing to loop-back."""
    sio._siop.do_recv(b'\x03\x02\x01\x00')  # Add a buffer directly
    # Write to stream and add buffer via loopback
    assert sio.write(b'Howdy') == 5
    assert sio.read(2) == b'\x03\x02'
    # Align with source buffer since not testing that
    assert sio.read(2) == b'\x01\x00'
    assert sio.readall() == b'Howdy'
    assert sio.in_waiting == 0

def test_raise_seekablefd(sio: SerialIO) -> None:
    """Ensure exception raised on use of seekable or related functions."""
    with pytest.raises(OSError) as err1:
        sio.tell()
    # NOTE: PyLance presumes unreachable code blow here
    with pytest.raises(OSError) as err2:
        sio.seek(0)
    with pytest.raises(OSError) as err3:
        sio.truncate(0)
    assert str(err1.value) == str(err2.value) == str(err3.value) == "Not seekable"
    with pytest.raises(OSError):
        sio.fileno()

def test_closed_exceptions() -> None:
    """Confirm that operations on closed stream throw exceptions."""
    siop = SerialIOLoopbackProvider(sys.stderr)
    sio = SerialIO(siop, sys.stderr)
    assert sio.write(b'') is None  # Returns None rather than raise exception
    ba1 = bytearray(0)
    assert sio.readinto(ba1) is None  # Returns None rather than raise exception
    siop.set_closed(True)
    assert sio.closed() is True
    ba2 = bytearray(b'ABC') # Not to be accessed
    with pytest.raises(ValueError):
        sio.readinto(ba2)
    assert ba2 == b'ABC'
    with pytest.raises(ValueError):
        sio.write(b'IGNORED')

def test_closed_behavior() -> None:
    """Sanity checks on SerialIO with a closed provider"""
    siop = SerialIOLoopbackProvider(sys.stderr)
    sio = SerialIO(siop, sys.stderr)
    assert siop.is_closed() is False
    assert sio.closed() is False
    sio._checkClosed()  # Raises error if closed
    siop.set_closed(True)
    assert siop.is_closed() is True
    assert sio.closed() is True
    with pytest.raises(ValueError):
        sio._checkClosed()  # Raises error if closed

def test_callback_none() -> None:
    """Exercise the case of lost data due to no callback."""
    siop = SerialIOLoopbackProvider(sys.stderr)
    assert siop._cb_recv is None
    siop.do_recv(b'Some lost data')
    sio = SerialIO(siop, sys.stderr)  # This connects the callback
    assert siop._cb_recv is not None
    siop.do_recv(b'OK')
    assert sio.in_waiting == 2
    siop.on_recv(None)  # Disconnect the callback
    assert siop._cb_recv is None
    siop.do_recv(b'LOST')
    assert sio.in_waiting == 2
    assert sio.out_waiting == 0
