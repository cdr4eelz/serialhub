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
  baudrate?: number; /* >0 */
  databits?: number; /*ONLY: 7 8 */
  parity?: 'none' | 'even' | 'odd';
  stopbits?: number; /*ONLY: 1 2 */
  buffersize?: number; /* >0 */
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
  inputStream: ReadableStream |null;
  inputDone: Promise<void> |null;
  reader: ReadableStreamDefaultReader |null;

  static NAV: INavigatorSerial = (window.navigator as INavigatorSerial);
  
  constructor( oldSP?: SerialHubPort ) {
    if (oldSP) oldSP.disconnect(); //Dispose of prior "port" if passed to us
    this.port = null;
    this.outputStream = null;
    this.outputDone = null;
    this.inputStream = null;
    this.inputDone = null;
    this.reader = null;
  }
  
  async connect() {
    if (this.port) {
      await this.disconnect();
    }
    if (!SerialHubPort.NAV.serial) return;
    const filter = { usbVendorId: 0x2047 }; // TI proper ; unused 0x0451 for "TUSB2046 Hub"
    let rawPort = await SerialHubPort.NAV.serial.requestPort( {filters: [filter]} );
    if (!rawPort) return;
    this.port = rawPort;
    await this.port.open({ baudrate: 115200 });

    const encoder = new TextEncoderStream();
    this.outputDone = encoder.readable.pipeTo(this.port.writable);
    this.outputStream = encoder.writable;

    let decoder = new TextDecoderStream();
    this.inputDone = this.port.readable.pipeTo(decoder.writable);
    this.inputStream = decoder.readable;
    this.reader = this.inputStream.getReader();

    console.log("CONNECT: ", this);
    this.readLoop();
  }
  
  async disconnect() {
    console.log("CLOSE: ", this);
    if (this.reader) {
      await this.reader.cancel();
      if (this.inputDone) await this.inputDone.catch(() => {});
      this.reader = null;
      this.inputDone = null;
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
  
  async readLoop() {
    while (true) {
      if (!this.reader) break;
      const { value, done } = await this.reader.read();
      if (value) {
        console.log("[readLoop] VALUE", value);
        //let CC=Backbone.$("#custom-custom")[0];
        //if (CC) CC.innerText += value;
      }
      if (done) {
        console.log("[readLoop] DONE", done);
        this.reader.releaseLock();
        break;
      }
    }
  }
  
  static test() {
    let W : any = (window as any);
    W.serPort = new SerialHubPort( W.serPort );
    W.P1 = W.serPort.connect().then( (val: any) => {
        console.log(val);
        W.serPort.writeToStream("1");
      });
  }

}
