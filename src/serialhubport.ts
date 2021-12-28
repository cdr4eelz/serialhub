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
  protected writer: WritableStreamDefaultWriter | null;
  //inputDone: Promise<void> |null;
  protected reader: ReadableStreamDefaultReader | null;

  constructor() {
    this.port = null;
    this.writer = null;
    this.reader = null;
  }

  async connect(
    requestOpts: IRequestOptions,
    serialOpts: ISerialOptions
  ): Promise<void> {
    const NAV: INavigatorSerial = window.navigator as INavigatorSerial;
    if (!NAV || !NAV.serial) {
      return;
    }
    if (this.port) {
      //Implies potentially "connected" status if this.port is set
      try {
        await this.disconnect();
      } catch (e) {
        console.log('Ignoring exception', e);
      } finally {
        this.port = null; //Ensure it is null before proceeding
      }
    }
    const rawPort = await NAV.serial.requestPort(requestOpts);
    if (!rawPort) {
      return; //TODO: Throw exception? The requestPort() probably already threw error
    }
    console.log('OPENING PORT:', rawPort, rawPort.getInfo());
    this.port = rawPort;
    await this.port.open(serialOpts);

    this.writer = this.port.writable.getWriter();
    this.reader = this.port.readable.getReader();

    console.log('CONNECTED: ', this, this.port, this.port.getInfo());
    //Let cbConnect initiate this.readLoop(f);
  }

  async disconnect(): Promise<void> {
    console.log('CLOSE: ', this);
    //TODO: Verify proper closing steps for reader/writer vs the port itself
    try {
      //await this.port?.readable.cancel('Closing port');
      await this.reader?.cancel();
    } catch (e) {
      console.error('Ignoring error while closing readable', e);
      //Ignore exception on reader
    } finally {
      this.reader = null;
    }
    try {
      //await this.port?.writable.abort('Closing port');
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

  writeToStream(data: ArrayBufferView[] | ArrayBuffer[]): void {
    if (this.writer) {
      data.forEach(async (d: any) => {
        //Anonymous function is ASYNC so it can AWAIT the write() call below
        console.log('[WRITE]', d);
        await this.writer?.write(d); // AWAIT in sequence, to avoid parallel promises
      });
    }
  }

  async readLoop(cbRead: (theVAL: any) => void): Promise<void> {
    while (this.reader) {
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

  static isSupported(): boolean {
    const NAV: Navigator = window.navigator;
    if (NAV === undefined || NAV === null) {
      return false;
    }
    const SER: any = (NAV as any).serial;
    if (SER === undefined || SER === null) {
      return false;
    }
    return true;
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
