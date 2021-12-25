// Copyright (c) cdr4eelz
// Distributed under the terms of the Modified BSD License.

import { Application, IPlugin } from '@lumino/application';

import { Widget } from '@lumino/widgets';

import { IJupyterWidgetRegistry } from '@jupyter-widgets/base';

import * as widgetExports from './widget';

import { MODULE_NAME, MODULE_VERSION } from './version';

const EXTENSION_ID = 'serialhub_plugin';
/*
namespace CommandIDs {
  export const connect = 'serialhub:connect'
  export const disconnect = 'serialhub:disconnect'
  export const test = 'serialhub:test'
}
*/

/**
 * The SerialHub plugin.
 */
const serialhubPlugin: IPlugin<Application<Widget>, void> = {
  id: EXTENSION_ID,
  requires: [IJupyterWidgetRegistry],
  activate: activateWidgetExtension,
  autoStart: true
}; // as unknown as IPlugin<Application<Widget>, void>;
// the "as unknown as ..." typecast above is solely to support JupyterLab 1
// and 2 in the same codebase and should be removed when we migrate to Lumino.

export default serialhubPlugin;

/**
 * Activate the widget extension.
 */
function activateWidgetExtension(
  app: Application<Widget>,
  registry: IJupyterWidgetRegistry
): void {
  console.log('Registering serialhub widget...', MODULE_VERSION, MODULE_NAME);
  registry.registerWidget({
    name: MODULE_NAME,
    version: MODULE_VERSION,
    exports: widgetExports
  });
}
