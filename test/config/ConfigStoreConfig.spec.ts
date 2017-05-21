import {ConfigStoreConfig} from '../../src/config/ConfigStoreConfig';
import {ConfigStoreMock} from '../mocks/ConfigStoreMock';
import {expect} from 'chai';

describe('configStoreConfig', () => {
  let config: ConfigStoreConfig;

  beforeEach(() => config = new ConfigStoreConfig(new ConfigStoreMock()));

  describe('setCurrentSemVer', () => {
    it('should store without prefix', () => {
      config.setCurrentSemVer('v0.0.1');

      expect(config.getCurrentSemVer()).to.equal('0.0.1');
    });
  });

  describe('setPackageJsonVersion', () => {
    it('should store without prefix', () => {
      config.setPackageJsonVersion('v0.0.1');

      expect(config.getPackageJsonVersion()).to.equal('0.0.1');
    });
  });
});
