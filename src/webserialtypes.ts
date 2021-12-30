// Copyright (c) cdr4eelz
// Distributed under the terms of the Modified BSD License.

export interface IOutputSignals {
  dtr?: boolean;
  rts?: boolean;
  brk?: boolean;
}
export interface IInputSignals {
  dcd: boolean;
  cts: boolean;
  ri: boolean;
  dsr: boolean;
}
export interface ISerialOptions {
  baudRate?: number; // >0
  dataBits?: number; //ONLY: 7 8
  parity?: 'none' | 'even' | 'odd';
  stopBits?: number; //ONLY: 1 2
  bufferSize?: number; // >0 (default 255 if unspecified?)
  flowControl?: 'none' | 'hardware';
}
export interface ISerialPortInfo {
  //Seems only vendorId & productId get set for serial ports???
  serialNumber?: string;
  manufacturer?: string;
  locationId?: number | string;
  vendorId?: number | string;
  vendor?: string;
  productId?: number | string;
  product?: string;
}
export interface IRequestOption {
  //IRequestOption to filter ports list ISerial.requestPort() offers to user
  usbVendorId?: number;
  usbProductId?: number; // usbVendorId required if productID present
}
export interface IRequestOptions {
  //IRequestOptions object only recognizes one (optional) key
  filters?: IRequestOption[];
}
export interface ISerialPort {
  //Acquire ISerialPort objects via ISerial.requestPort() or .getPorts()
  open: (options?: ISerialOptions) => Promise<void>;
  close: () => Promise<void>;
  readonly readable: ReadableStream<Uint8Array>; //AKA: "in"
  readonly writable: WritableStream<any>; //AKA: "out"
  getSignals: () => Promise<IInputSignals>;
  setSignals: (signals: IOutputSignals) => Promise<void>;
  getInfo: () => ISerialPortInfo;
}
export interface ISerial extends EventTarget {
  //Acquire the singleton ISerial object from "window.navigator.serial" object
  onconnect: ((this: ISerial, ev: Event) => any) | null; // SerialConnectionEvent
  ondisconnect: ((this: ISerial, ev: Event) => any) | null; // SerialConnectionEvent
  getPorts: () => Promise<ISerialPort[]>;
  requestPort: (options?: IRequestOptions) => Promise<ISerialPort>;
}
export interface INavigatorSerial extends Navigator {
  //Casting interface for accessing the ISerial singleton object (if present)
  readonly serial?: ISerial;
}
