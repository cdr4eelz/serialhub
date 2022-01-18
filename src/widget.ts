// Copyright (c) cdr4eelz
// Distributed under the terms of the Modified BSD License.

import {
  DOMWidgetModel,
  DOMWidgetView,
  ISerializers,
  Dict
} from '@jupyter-widgets/base';

import { MODULE_NAME, MODULE_VERSION } from './version';

// Import the CSS
import '../style/index.css'; //was '../css/widget.css'

import * as utils from '@jupyter-widgets/base';
import { UUID } from '@lumino/coreutils';

import {
  IRequestOptions,
  ISerialOptions,
  ISerialPortInfo
} from './webserialtypes';
import { SerialHubPort } from './serialhubport';

export class SerialHubModel extends DOMWidgetModel {
  defaults(): any {
    return {
      ...super.defaults(),
      _model_name: SerialHubModel.model_name,
      _model_module: SerialHubModel.model_module,
      _model_module_version: SerialHubModel.model_module_version,
      _view_name: SerialHubModel.view_name,
      _view_module: SerialHubModel.view_module,
      _view_module_version: SerialHubModel.view_module_version,

      is_supported: false,
      status: 'Initializing...',
      value: 'Loading...',
      request_options: {},
      serial_options: {}, //Rely initial backend sync with frontend for real default
      pkt_recv_front: [0, 0],
      pkt_send_front: [0, 0],
      pkt_recv_back: [0, 0],
      pkt_send_back: [0, 0]
    };
  }

  private static _mytempid: string = utils.uuid();
  static get mytempid(): string {
    return SerialHubModel._mytempid;
  }

  static serializers: ISerializers = {
    ...DOMWidgetModel.serializers
    // Add any extra serializers here
  };

  static model_name = 'SerialHubModel';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;
  static view_name = 'SerialHubView'; // Set to null if no view
  static view_module = MODULE_NAME; // Set to null if no view
  static view_module_version = MODULE_VERSION;
}

export class SerialHubView extends DOMWidgetView {
  protected _el_status: HTMLButtonElement | null = null;
  protected _el_prompt: HTMLSpanElement | null = null;
  protected _el_stats: HTMLPreElement | null = null;
  protected _el_value: HTMLPreElement | null = null;

  _shp: SerialHubPort | null = null;

  render(): this {
    console.log('RENDER serialhub widget');
    this.el.id = this.id || UUID.uuid4();
    this.el.classList.add('xx-serialhub-widget');

    /* Create a couple sub-Elements for our custom widget */
    this._el_status = window.document.createElement('button');
    this._el_status.classList.add('xx-serialhub-status');
    this._el_prompt = window.document.createElement('span');
    this._el_prompt.classList.add('xx-serialhub-prompt');
    this._el_stats = window.document.createElement('pre');
    this._el_stats.classList.add('xx-serialhub-stats');
    this._el_value = window.document.createElement('pre');
    this._el_value.classList.add('xx-serialhub-value');

    /* Click events wrapped to capture "this" object */
    this._el_status.onclick = (ev: MouseEvent) => this.click_status(ev);
    this._el_value.onclick = (ev: MouseEvent) => this.click_value(ev);

    /* Append each of the sub-components to our main widget Element */
    this.el.append(
      this._el_status,
      this._el_prompt,
      this._el_stats,
      this._el_value
    );

    this.changed_status();
    this.changed_value();
    this.changed_stats();
    this.update_stats_title();
    this.model.on('change:status', this.changed_status, this);
    this.model.on('change:value', this.changed_value, this);
    this.model.on('change:request_options', this.changed_request_options, this);
    this.model.on('change:serial_options', this.changed_serial_options, this);
    this.model.on('change:pkt_recv_front', this.changed_stats, this);
    this.model.on('change:pkt_recv_back', this.changed_stats, this);
    this.model.on('change:pkt_send_front', this.changed_stats, this);
    this.model.on('change:pkt_send_back', this.changed_stats, this);

    this.model.on('msg:custom', this.msg_custom, this);

    const supported: boolean = SerialHubPort.isSupported();
    this.model.set('is_supported', supported);
    this.model.set('status', supported ? 'Supported' : 'Unsupported');
    if (supported) {
      this._el_prompt.textContent = '<<< Click to connect/disconnect a port';
    }

    this.touch();
    return this;
  }

  get_port_options(): [IRequestOptions, ISerialOptions] {
    return [
      this.model.get('request_options'),
      this.model.get('serial_options')
    ];
  }
  update_stats_title(): void {
    const [reqOpts, serOpts] = this.get_port_options();
    let title =
      'Request-Options: ' +
      JSON.stringify(reqOpts) +
      '\r\nSerial-Options: ' +
      JSON.stringify(serOpts);
    const serInfo: ISerialPortInfo | undefined = this._shp?.port?.getInfo();
    if (serInfo) {
      title += '\r\nPort-Info:' + JSON.stringify(serInfo);
    }
    if (this._el_prompt) {
      this._el_prompt.title = title;
    }
  }
  changed_request_options(): void {
    console.log('SET request_options:', this.model.get('request_options'));
    this.update_stats_title();
  }
  changed_serial_options(): void {
    console.log('SET serial_options:', this.model.get('serial_options'));
    this.update_stats_title();
  }
  changed_status(): void {
    if (this._el_status && this.model) {
      this._el_status.textContent = this.model.get('status');
    }
  }
  changed_value(): void {
    if (this._el_value && this.model) {
      this._el_value.textContent = this.model.get('value');
    }
  }
  changed_stats(): void {
    if (this._el_stats) {
      let stats = '';
      stats += ' RecvF:' + this.model.get('pkt_recv_front');
      stats += ' SendF:' + this.model.get('pkt_send_front');
      stats += '  (Front-End)\r\n';
      stats += ' RecvB:' + this.model.get('pkt_recv_back');
      stats += ' SendB:' + this.model.get('pkt_send_back');
      stats += '  (Back-End)';
      this._el_stats.textContent = stats;
    }
  }

  /* stats_zero set all frontend & backend stats to 0 */
  protected stats_zero(): void {
    this.model.set('pkt_recv_front', [0, 0]);
    this.model.set('pkt_send_front', [0, 0]);
    //this.model.send({ type: 'RSTS' }, {}); //Send message to reset backend stats
    this.model.set('pkt_recv_back', [0, 0]);
    this.model.set('pkt_send_back', [0, 0]);
    this.touch();
  }
  protected stats_inc_tuple(
    key: string,
    nBytes: number,
    nPackets = 1
  ): [number, number] {
    const [oByt, oPkt] = this.model.get(key);
    const nStats: [number, number] = [oByt + nBytes, oPkt + nPackets];
    this.model.set(key, nStats);
    this.touch();
    return nStats;
  }

  cb_read(this: SerialHubView, value: Uint8Array): void {
    console.log('DATA-IN', value.length, value);
    const nStat = this.stats_inc_tuple('pkt_recv_front', value.length);
    try {
      this.model.send({ type: 'RECV', pkt_recv_front: nStat }, {}, [value]);
    } catch (e) {
      console.log('FAILED send of serial data to backend.', e);
      //TODO: Shutdown the reader & connection on fatal errors
      throw e; //Rethrow exception
    }
  }

  cb_connect(this: SerialHubView): void {
    console.log('cb_connect', this._shp);
    this.update_stats_title(); //Update serialPortInfo since we connected
    this.stats_zero(); //Reset statistics on fresh connection
    this._shp?.readLoop((value: Uint8Array) => {
      this.cb_read(value);
    });
    console.log('DONE cb_connect');
  }

  widget_connect(): void {
    this._shp = new SerialHubPort(); //was SerialHubPort.createOneHub();
    //const reqOpts = { filters: [{usbVendorId: 0x2047}] }; // TI proper ; unused 0x0451 for "TUSB2046 Hub"
    //const serOpts = { baudRate: 115200 };
    const [reqOpts, serOpts] = this.get_port_options(); //Unpack options to local vars
    console.log('CONNECT options', reqOpts, serOpts);
    this._shp.connect(reqOpts, serOpts).then(
      (): void => {
        this.model.set('status', 'Connected');
        this.cb_connect();
      },
      (reason: any): void => {
        this.model.set('status', 'Disconnected');
        this._shp = null;
      }
    );
  }
  widget_disconnect(): void {
    console.log('DISconnect', this, this._shp);
    this._shp?.disconnect().then(
      (): void => {
        this.model.set('status', 'Disconnected');
        this._shp = null;
      },
      (reason: any): void => {
        this.model.set('status', 'Stuck');
      }
    );
  }
  click_status(this: SerialHubView, ev: MouseEvent): void {
    console.log('click_status', this, this.model, ev);
    if (this._shp) {
      this.widget_disconnect();
    } else {
      this.widget_connect();
    }
    console.log('click_status DONE', this._shp);
  }

  click_value(this: SerialHubView, ev: MouseEvent): void {
    if (!this || !this.model) {
      return;
    }
  }

  msg_custom(this: SerialHubView, mData: Dict<any>, mBuffs: DataView[]): void {
    //console.log(this, mData, mBuffs);
    const msgType = mData['type'];
    if (msgType === 'SEND') {
      console.log('MSG-SEND', mBuffs);
      if (this._shp) {
        const nWritten: number = this._shp.writeToStream(mBuffs);
        this.stats_inc_tuple('pkt_send_front', nWritten);
      }
    } else {
      console.log('UNKNOWN MESSAGE: ', msgType, mData, mBuffs);
    }
  }
}
