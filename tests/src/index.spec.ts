// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  // Add any needed widget imports here (or from controls)
} from '@jupyter-widgets/base';

import {
  createTestModel
} from './utils.spec';

import {
  SerialHubModel, SerialHubView
} from '../../src/'


describe('SerialHub', () => {

  describe('SerialHubModel', () => {

    it('should be createable', () => {
      let model = createTestModel(SerialHubModel);
      expect(model).to.be.an(SerialHubModel);
      expect(model.get('value')).to.be('serial-on-your-hub');
    });

    it('should be createable with a value', () => {
      let state = { value: 'Foo Bar!' }
      let model = createTestModel(SerialHubModel, state);
      expect(model).to.be.an(SerialHubModel);
      expect(model.get('value')).to.be('Foo Bar!');
    });

  });

});
