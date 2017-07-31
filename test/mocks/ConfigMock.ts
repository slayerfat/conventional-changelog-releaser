import {IConfig} from '../../src/config/IConfig';
import {IPkgUpResultObject} from '../../src/config/IPkgResultObject';

export class ConfigMock implements IConfig {
  private config = {};

  public setConfig(name, value) {
    this.config[name] = value;
  }

  public getConfig(name: string): any {
    return this.config[name];
  }

  public setPackageJson(value: IPkgUpResultObject): void {
    this.setConfig('package.json', value);
    this.setPackageJsonVersion(value.pkg.version);
  }

  public getPackageJson(): IPkgUpResultObject {
    return this.getConfig('package.json');
  }

  public hasPackageJson(): boolean {
    return this.hasConfig('package.json');
  }

  public deletePackageJson(): void {
    this.deleteConfig('package.json');
  }

  public setPackageJsonVersion(version: string) {
    this.setConfig('package.json.version', version);
  }

  public getPackageJsonVersion(): string {
    return this.getConfig('package.json.version');
  }

  public setPackageJsonValidity(validity: boolean): void {
    this.setConfig('package.json.validity', validity);
  }

  public isPackageJsonValid(): boolean {
    return this.getConfig('package.json.validity');
  }

  public setPackageJsonExhaustStatus(status: boolean): void {
    this.setConfig('package.json.eStatus', status);
  }

  public isPackageJsonExhausted(): boolean {
    return this.getConfig('package.json.eStatus');
  }

  public setCurrentSemVer(value: string): void {
    this.setConfig('semver', value);
  }

  public getCurrentSemVer(): string {
    return this.getConfig('semver');
  }

  public hasCurrentSemVer(): boolean {
    return this.hasConfig('semver');
  }

  public deleteCurrentSemVer(): void {
    this.deleteConfig('semver');
  }

  public reset(): void {
    this.config = {};
  }

  public setConfigured(value: boolean) {
    this.setConfig('configured', value);
  }

  public isConfigured(): boolean {
    return this.getConfig('configured');
  }

  public setDevelopBranchName(value: string): void {
    this.setConfig('develop-branch-name', value);
  }

  public getDevelopBranchName(): string {
    return this.getConfig('develop-branch-name');
  }

  private hasConfig(name) {
    return this.config[name] !== undefined;
  }

  private deleteConfig(name) {
    delete this.config[name];
  }
}
