// Copyright (c) cdr4eelz
// Distributed under the terms of the Modified BSD License.

interface IOutputSignals {
  dtr?: boolean;
  rts?: boolean;
  brk?: boolean;
}
interface IInputSignals {
  dcd: boolean;
  cts: boolean;
  ri: boolean;
  dsr: boolean;
}
interface ISerialOptions {
  baudRate?: number; // >0
  dataBits?: number; //ONLY: 7 8
  parity?: 'none' | 'even' | 'odd';
  stopBits?: number; //ONLY: 1 2
  bufferSize?: number; // >0
}
interface ISerialPortInfo {
  serialNumber?: string;
  manufacturer?: string;
  locationId?: number | string;
  vendorId?: number | string;
  vendor?: string;
  productId?: number | string;
  product?: string;
}
interface IRequestOption {
  usbVendorId?: number;
  usbProductId?: number; // usbVendorId required if productID present
}
interface IRequestOptions {
  filters?: IRequestOption[];
}
interface ISerialPort {
  open: (options?: ISerialOptions) => Promise<void>;
  close: () => Promise<void>;
  readonly readable: ReadableStream; //AKA: "in"
  readonly writable: WritableStream; //AKA: "out"
  getSignals: () => Promise<IInputSignals>;
  setSignals: (signals: IOutputSignals) => Promise<void>;
  getInfo: () => ISerialPortInfo;
}
interface ISerial extends EventTarget {
  onconnect: ((this: ISerial, ev: Event) => any) | null; // SerialConnectionEvent
  ondisconnect: ((this: ISerial, ev: Event) => any) | null; // SerialConnectionEvent
  getPorts: () => Promise<ISerialPort[]>;
  requestPort: (options?: IRequestOptions) => Promise<ISerialPort>;
}
interface INavigatorSerial extends Navigator {
  readonly serial?: ISerial;
}

export class SerialHubPort {
  port: ISerialPort | null;
  //outputDone: Promise<void> | null;
  writer: WritableStreamDefaultWriter | null;
  //inputDone: Promise<void> |null;
  reader: ReadableStreamDefaultReader | null;

  constructor(oldSP?: SerialHubPort) {
    if (oldSP) {
      oldSP.disconnect(); //Dispose of prior "port" if passed to us
    }
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
      await this.disconnect(); //TODO: Catch and suppress exceptions
    }
    const rawPort = await NAV.serial.requestPort(requestOpts);
    if (!rawPort) {
      return; //TODO: Throw exception? The requestPort() probably already threw error
    }
    this.port = rawPort;
    await this.port.open(serialOpts);

    this.writer = this.port.writable.getWriter();
    this.reader = this.port.readable.getReader();

    console.log('CONNECT: ', this);
    //Let cbConnect initiate this.readLoop(f);
  }

  async disconnect(): Promise<void> {
    console.log('CLOSE: ', this);
    //TODO: Verify proper closing steps for reader/writer & port
    try {
      await this.reader?.cancel();
    } catch (e) {
      //Ignore exception on reader
    } finally {
      this.reader = null;
    }
    try {
      await this.writer?.close();
    } catch (e) {
      //Ignore exception on writer
    } finally {
      this.writer = null;
    }
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

  static createHub(): SerialHubPort {
    const oldSER = (window as any).serPort;
    const newSHP = new SerialHubPort(oldSER);
    (window as any).serPort = newSHP; //Assign to a global location
    return newSHP;
  }
}
