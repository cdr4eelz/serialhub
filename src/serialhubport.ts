// Copyright (c) cdr4eelz
// Distributed under the terms of the Modified BSD License.

import {
  ISerialPort,
  IRequestOptions,
  ISerialOptions,
  INavigatorSerial
} from './webserialtypes';

/* SerilHubPort class to simplify access to WebSerial ports */
export class SerialHubPort {
  port: ISerialPort | null;
  //outputDone: Promise<void> | null;
  protected writer: WritableStreamDefaultWriter<any> | null;
  //inputDone: Promise<void> |null;
  protected reader: ReadableStreamDefaultReader<Uint8Array> | null;

  constructor() {
    this.port = null;
    this.writer = null;
    this.reader = null;
  }

  /* connect the SerialHubPort by requesting and then opening a Web Serial port */
  async connect(
    requestOpts: IRequestOptions,
    serialOpts: ISerialOptions
  ): Promise<void> {
    const NAV: INavigatorSerial = window.navigator as INavigatorSerial;
    if (!NAV || !NAV.serial) {
      throw new TypeError('Web Serial API not supported');
    }
    if (this.port) {
      throw new TypeError('WebSerial port is already connected');
    }
    const rawPort = await NAV.serial.requestPort(requestOpts);
    if (!rawPort) {
      //The requestPort() probably threw error, but in case not...
      throw new TypeError('FAILED request a port from user');
    }

    //TODO: Install an this.ondisconnect(event) handler to rawPort

    console.log('OPENING PORT:', rawPort, rawPort.getInfo());
    this.port = rawPort;
    await this.port.open(serialOpts);

    //Note that getReader & getWriter "lock" the port to the reader
    this.writer = this.port.writable.getWriter();
    this.reader = this.port.readable.getReader();

    console.log('CONNECTED: ', this, this.port, this.port.getInfo());
    //Let cbConnect initiate this.readLoop(f);
  }

  /* disconnect the SerialHubPort by closing the associated Web Serial port */
  async disconnect(): Promise<void> {
    console.log('CLOSE: ', this);
    //TODO: Verify proper closing steps for reader/writer vs the port itself
    // Helpful hints about closing https://wicg.github.io/serial/#close-method
    try {
      //await this.port?.readable?.cancel('Closing port');
      await this.reader?.cancel('Closing port'); //Should indirectly signal readLoop to terminate
    } catch (e) {
      console.error('Ignoring error while closing readable', e);
      //Ignore exception on reader
    } finally {
      this.reader = null;
    }
    try {
      //await this.port?.writable?.abort('Closing port');
      //await this.writer?.abort('Closing port');
      await this.writer?.close();
    } catch (e) {
      console.error('Ignoring error while closing writable', e);
      //Ignore exception on writer
    } finally {
      this.writer = null;
    }
    //Hopefully the above have unlocked the reader/writer of the port???
    // and allowed the readLoop to fall-through before we close the port.
    try {
      await this.port?.close(); //Let exceptions through from here
    } finally {
      this.port = null; //But clear this.port reference
    }
  }

  /* writeToStream writes and awaits multiple buffers to the serial port */
  writeToStream(data: ArrayBufferView[] | ArrayBuffer[]): number {
    if (!this.writer) {
      throw new TypeError('Stream not open');
    }
    data.forEach(async (d: ArrayBufferView | ArrayBuffer) => {
      //Anonymous function is ASYNC so it can AWAIT the write() call below
      console.log('[WRITE]', d, d.byteLength);
      await this.writer?.write(d); //AWAIT in sequence, to avoid parallel promises
    });
    let nWritten = 0;
    for (const d of data) {
      nWritten += d.byteLength; //TODO: What about offsets in ArrayBufferView???
    }
    console.log('[WROTE]', nWritten);
    return nWritten;
  }

  /* readLoop to be called back to by Web Serial API as data is read from the serial port */
  async readLoop(cbRead: (theVAL: Uint8Array) => void): Promise<void> {
    //Possibly "SerialPort.readable" goes null if disconnected?
    while (this.reader && this.port?.readable) {
      //TODO: Inner loop for non-fatal errors & re-allocate local reader
      //console.log('[readLoop] LOOP');
      const { value, done } = await this.reader.read();
      if (value) {
        //console.log('[readLoop] VALUE', value);
        cbRead(value);
      }
      if (done) {
        console.log('[readLoop] DONE', done);
        this.reader.releaseLock();
        break;
      }
    }
    console.log('[readLoop] EXIT');
  }

  /* Static function to check if browser supports Web Serial API */
  static isSupported(): boolean {
    return 'serial' in navigator;
    /*
    const NAV: Navigator = window.navigator;
    if (NAV === undefined || NAV === null) {
      return false;
    }
    const SER: any = (NAV as any).serial;
    if (SER === undefined || SER === null) {
      return false;
    }
    return true;
    */
  }

  /* createOneHub() is a wrapper around "new SerialHubPort()" which
      attempts to auto-disconnect a prior port so that re-opening
      has a chance of succeeding.  Otherwise one tends to get a
      port already open error.
  */
  static createOneHub(): SerialHubPort {
    const oldSER = (window as any).serPort; //Get prior stashed value
    if (oldSER) {
      console.log('Closing left over port', oldSER);
      try {
        oldSER.disconnect(); //Dispose of prior "port" if passed to us
      } catch (e) {
        console.error('Ignoring close error', e);
      } finally {
        (window as any).serPort = null;
      }
    }
    const newSHP = new SerialHubPort();
    (window as any).serPort = newSHP; //Stash in a global location
    return newSHP;
  }
}
