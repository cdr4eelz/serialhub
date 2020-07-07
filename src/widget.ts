// Copyright (c) cdr4eelz
// Distributed under the terms of the Modified BSD License.

import {
  DOMWidgetModel, DOMWidgetView, ISerializers
} from '@jupyter-widgets/base';

import {
  MODULE_NAME, MODULE_VERSION
} from './version';

// Import the CSS
import '../css/widget.css'


import * as utils from '@jupyter-widgets/base';


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
      value: 'serial-hub',
      xtra: 'font-weight: bolder',
    };
  }
  
  static myjunk: string = utils.uuid();

  
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
  render() {
    this.el.classList.add('serialhub-widget');

    this.value_changed();  this.xtra_changed();
    this.model.on('change:value', this.value_changed, this);
    this.model.on('change:xtra', this.xtra_changed, this);
  }

  value_changed() {
    this.el.textContent = this.model.get('value');
  }
  xtra_changed() {
    this.el.style = this.model.get('xtra');
  }
}
