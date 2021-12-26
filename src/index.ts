// Copyright (c) cdr4eelz
// Distributed under the terms of the Modified BSD License.

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

/**
 * Initialization data for the serialhub extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'serialhub:plugin',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension serialhub is NOW activated!');
  }
};

export default plugin;

export * from './version';
export * from './widget';
export * from './webserialtypes';
export * from './serialhubport';
