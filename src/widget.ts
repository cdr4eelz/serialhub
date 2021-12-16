// Copyright (c) cdr4eelz
// Distributed under the terms of the Modified BSD License.

import {
  DOMWidgetModel, DOMWidgetView, ISerializers, Dict
} from '@jupyter-widgets/base';

import {
  MODULE_NAME, MODULE_VERSION
} from './version';

// Import the CSS
//import '../css/widget.css'
import '../style/widget.css'


import * as utils from '@jupyter-widgets/base';
import {
    UUID
} from '@lumino/coreutils';

import { SerialHubPort } from './webseriallink';

export
class SerialHubModel extends DOMWidgetModel {
  defaults() {
    return {...super.defaults(),
      _model_name: SerialHubModel.model_name,
      _model_module: SerialHubModel.model_module,
      _model_module_version: SerialHubModel.model_module_version,
      _view_name: SerialHubModel.view_name,
      _view_module: SerialHubModel.view_module,
      _view_module_version: SerialHubModel.view_module_version,

      isSupported: false,
      status: 'Initializing...',
      value: 'Loading...',
    };
  }
  
  private static _mytempid: string = utils.uuid();
  static get mytempid(): string {
    return SerialHubModel._mytempid;
  }

  
  static serializers: ISerializers = {
    ...DOMWidgetModel.serializers,
    // Add any extra serializers here
  }

  static model_name = 'SerialHubModel';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;
  static view_name = 'SerialHubView';   // Set to null if no view
  static view_module = MODULE_NAME;   // Set to null if no view
  static view_module_version = MODULE_VERSION;
}


export
class SerialHubView extends DOMWidgetView {
  _el_status: HTMLDivElement | null = null;
  _el_value: HTMLPreElement | null = null;

  render() : this {
    this.el.id = this.id || UUID.uuid4();
    this.el.classList.add('xx-serialhub-widget');

    /* Create a couple sub-Elements for our custom widget */
    this._el_status = window.document.createElement("div");
    this._el_status.classList.add('xx-serialhub-status');
    this._el_value = window.document.createElement("pre");
    this._el_value.classList.add('xx-serialhub-value');

    /* Click events wrapped to capture "this" object */
    this._el_status.onclick = (ev: MouseEvent) => this.click_status(ev);
    this._el_value.onclick = (ev: MouseEvent) => this.click_value(ev);

    /* Maybe is more appropriate append() function availablie? */
    this.$el.append(this._el_status, this._el_value);

    this.changed_status();
    this.changed_value();
    this.model.on('change:status', this.changed_status, this);
    this.model.on('change:value', this.changed_value, this);

    this.model.on('msg:custom', this.msg_custom, this);

    this.model.set('isSupported', SerialHubPort.isSupported());
    this.model.set('status', (SerialHubPort.isSupported()) ? 'Supported' : 'Unsupported');
    this.touch();

    return this;
  }

  changed_status() : void {
    if (!this._el_status) return;
    this._el_status.textContent = this.model.get('status');
  }
  changed_value() : void {
    if (!this._el_value) return;
    this._el_value.textContent = this.model.get('value');
  }

  click_status(this:SerialHubView, ev:MouseEvent) {
    //console.log(this, arguments, this.model);
    let SHP = SerialHubPort.test( (value: any) => {
      console.log(value);
      this.model.send({'type':"binary"}, {}, [value]);
    });
    console.log("DONE", SHP);
  }

  click_value(this: SerialHubView, ev: MouseEvent) {
    if (!this || !this.model) return;
    this.model.send({'type':"text", 'text':"DATA\n"}, {}, []);
    (window as any).serPort.writeToStream("6");
  }

  msg_custom(this: SerialHubView, mData: Dict<any>, mBuffs: DataView[]): void {
    console.log(this, mData, mBuffs);
    let msgType = mData['type'];
    if (msgType == 'text') {
      (window as any).serPort.writeToStream(mData['text']);
    }
  }

}
