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
  baudRate?: number; /* >0 */
  dataBits?: number; /*ONLY: 7 8 */
  parity?: 'none' | 'even' | 'odd';
  stopBits?: number; /*ONLY: 1 2 */
  bufferSize?: number; /* >0 */
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
  usbProductId?: number; /* usbVendorId required if productID present */
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
  onconnect: ((this: ISerial, ev: Event) => any) | null; /* SerialConnectionEvent */
  ondisconnect: ((this: ISerial, ev: Event) => any) | null; /* SerialConnectionEvent */
  getPorts: () => Promise<ISerialPort[]>;
  requestPort: (options? : IRequestOptions) => Promise<ISerialPort>;
}
interface INavigatorSerial extends Navigator {
    readonly serial?: ISerial;
}


export
class SerialHubPort {
  port: ISerialPort |null;
  outputStream: WritableStream |null;
  outputDone: Promise<void> |null;
  //inputStream: ReadableStream |null;
  //inputDone: Promise<void> |null;
  reader: ReadableStreamDefaultReader |null;

  constructor( oldSP?: SerialHubPort ) {
    if (oldSP) oldSP.disconnect(); //Dispose of prior "port" if passed to us
    this.port = null;
    this.outputStream = null;
    this.outputDone = null;
    //this.inputStream = null;
    //this.inputDone = null;
    this.reader = null;
  }
  
  async connect(f: Function) {
    let NAV: INavigatorSerial = (window.navigator as INavigatorSerial);
    if (!NAV || !NAV.serial) return;
    if (this.port) {
      await this.disconnect();
    }
    const filter = { usbVendorId: 0x2047 }; // TI proper ; unused 0x0451 for "TUSB2046 Hub"
    let rawPort = await NAV.serial.requestPort( {filters: [filter]} );
    if (!rawPort) return;
    this.port = rawPort;
    await this.port.open({ baudRate: 115200 });

    const encoder = new TextEncoderStream();
    this.outputDone = encoder.readable.pipeTo(this.port.writable);
    this.outputStream = encoder.writable;

//    let decoder = new TextDecoderStream();
//    this.inputDone = this.port.readable.pipeTo(decoder.writable);
//    this.inputStream = decoder.readable;
//    this.reader = this.inputStream.getReader();
    this.reader = this.port.readable.getReader();

    console.log("CONNECT: ", this);
    this.readLoop(f);
  }
  
  async disconnect() {
    console.log("CLOSE: ", this);
    if (this.reader) {
      await this.reader.cancel();
      this.reader = null;
      //if (this.inputDone) await this.inputDone.catch(() => {});
      //this.inputDone = null;
    }
    if (this.outputStream) {
      await this.outputStream.getWriter().close();
      await this.outputDone;
      this.outputStream = null;
      this.outputDone = null;
    }
    if (this.port) {
      await this.port.close();
      this.port = null;
    }
  }
  
  writeToStream(...lines: string[]) {
    if (!this.outputStream) return;
    const writer = this.outputStream.getWriter();
    lines.forEach(line => {
        console.log("[SEND]", line);
        writer.write(line + "\n");
      });
    writer.releaseLock();
  }
  
  async readLoop(f: Function) {
    while (true) {
      if (!this.reader) break;
      const { value, done } = await this.reader.read();
      if (value) {
        console.log("[readLoop] VALUE", value);
        f(value);
      }
      if (done) {
        console.log("[readLoop] DONE", done);
        this.reader.releaseLock();
        break;
      }
    }
  }
  

  static isSupported(): boolean {
    let NAV: Navigator = window.navigator;
    if (NAV === undefined || NAV === null) return false;
    let SER: any = (NAV as any).serial;
    if (SER === undefined || SER === null) return false;
    return true;
  }

  static test(f: Function): SerialHubPort {
    let W : any = (window as any);
    let SER = new SerialHubPort( W.serPort );
    W.serPort = SER;
    SER.connect(f).then( () : void => {
      console.log(SER);
      SER.writeToStream("1");
    });
    return SER;
  }

}
