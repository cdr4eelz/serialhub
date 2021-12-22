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

import { SerialHubPort } from './webseriallink';

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

      isSupported: false,
      status: 'Initializing...',
      value: 'Loading...',
      pkt_recv_front: 0,
      pkt_recv_back: 0,
      pkt_send_front: 0,
      pkt_send_back: 0
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
  _el_status: HTMLSpanElement | null = null;
  _el_stats: HTMLSpanElement | null = null;
  _el_value: HTMLPreElement | null = null;
  _shp: SerialHubPort | null = null;

  render(): this {
    this.el.id = this.id || UUID.uuid4();
    this.el.classList.add('xx-serialhub-widget');

    /* Create a couple sub-Elements for our custom widget */
    this._el_status = window.document.createElement('span');
    this._el_status.classList.add('xx-serialhub-status');
    this._el_stats = window.document.createElement('span');
    this._el_stats.classList.add('xx-serialhub-stats');
    this._el_value = window.document.createElement('pre');
    this._el_value.classList.add('xx-serialhub-value');

    /* Click events wrapped to capture "this" object */
    this._el_status.onclick = (ev: MouseEvent) => this.click_status(ev);
    this._el_value.onclick = (ev: MouseEvent) => this.click_value(ev);

    /* Maybe is more appropriate append() function availablie? */
    this.el.append(this._el_status, this._el_stats, this._el_value);

    this.changed_status();
    this.changed_value();
    this.changed_stats();
    this.model.on('change:status', this.changed_status, this);
    this.model.on('change:value', this.changed_value, this);
    this.model.on('change:pkt_recv_front', this.changed_stats, this);
    this.model.on('change:pkt_recv_back', this.changed_stats, this);
    this.model.on('change:pkt_send_front', this.changed_stats, this);
    this.model.on('change:pkt_send_back', this.changed_stats, this);

    this.model.on('msg:custom', this.msg_custom, this);

    this.model.set('isSupported', SerialHubPort.isSupported());
    this.model.set(
      'status',
      SerialHubPort.isSupported() ? 'Supported' : 'Unsupported'
    );
    this.touch();
    return this;
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
      stats += 'Rf:' + this.model.get('pkt_recv_front');
      stats += ' Rb:' + this.model.get('pkt_recv_back');
      stats += ' Sf:' + this.model.get('pkt_send_front');
      stats += ' Sb:' + this.model.get('pkt_send_back');
      this._el_stats.textContent = stats;
    }
  }

  click_status(this: SerialHubView, ev: MouseEvent): void {
    console.log('click_status', this, this.model, ev);
    this._shp = SerialHubPort.createHub((theSHP: SerialHubPort) => {
      console.log('theSHP', theSHP);
      theSHP.readLoop((value: any) => {
        console.log('DATA-IN', value);
        this.model.send({ type: 'RECV' }, {}, [value]);
        const cnt: number = this.model.get('pkt_recv_front') + 1;
        this.model.set('pkt_recv_front', cnt);
      });
    });
    console.log('DONE click', this._shp);
  }

  click_value(this: SerialHubView, ev: MouseEvent): void {
    if (!this || !this.model) {
      return;
    }
    this.model.send({ type: 'text', text: 'VALUE-6\n' }, {}, []);
    const encoder = new TextEncoder();
    const theData = encoder.encode('6');
    this._shp?.writeToStream([theData]);
    this.model.set('pkt_send_front', this.model.get('pkt_send_front') + 1);
  }

  msg_custom(this: SerialHubView, mData: Dict<any>, mBuffs: DataView[]): void {
    //console.log(this, mData, mBuffs);
    const msgType = mData['type'];
    if (msgType === 'SEND') {
      console.log('MSG-SEND', mBuffs);
      this._shp?.writeToStream(mBuffs);
      this.model.set('pkt_send_front', this.model.get('pkt_send_front') + 1);
    } else if (msgType === 'SEND2') {
      const encoder = new TextEncoder();
      const theData = encoder.encode(mData['text']);
      this._shp?.writeToStream([theData]);
      this.model.set('pkt_send_front', this.model.get('pkt_send_front') + 1);
    } else {
      console.log('UNKNOWN MESSAGE: ', msgType, mData, mBuffs);
    }
  }
}
