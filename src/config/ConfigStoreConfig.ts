import {IConfig} from './IConfig';
import {IPkgUpResultObject} from './IPkgResultObject';
import {IConfigStore} from './IConfigStore';

export class ConfigStoreConfig implements IConfig {
  constructor(private config: IConfigStore) {
    //
  }

  public setPackageJson(value: IPkgUpResultObject): void {
    this.config.set('packageJson', value);
  }

  public setPackageJsonVersion(version: string) {
    this.config.set('packageJson.pkg.version', version.replace(/^v/, ''));
  }

  public setPackageJsonValidity(validity: boolean): void {
    this.config.set('packageJson.valid', validity);
  }

  public setPackageJsonExhaustStatus(status: boolean): void {
    this.config.set('packageJson.exhausted', status);
  }

  public isPackageJsonValid(): boolean {
    return this.config.get('packageJson.valid');
  }

  public isPackageJsonExhausted(): boolean {
    return this.config.get('packageJson.exhausted');
  }

  public getPackageJson(): IPkgUpResultObject {
    return this.config.get('packageJson');
  }

  public hasPackageJson(): boolean {
    return this.config.has('packageJson');
  }

  public deletePackageJson() {
    return this.config.delete('packageJson');
  }

  public setCurrentSemVer(value: string): void {
    this.config.set('currentSemVer', value.replace(/^v/, ''));
  }

  public getCurrentSemVer(): string {
    return this.config.get('currentSemVer');
  }

  public hasCurrentSemVer(): boolean {
    return this.config.has('currentSemVer');
  }

  public deleteCurrentSemVer(): void {
    return this.config.delete('currentSemVer');
  }

  public reset(): void {
    this.config.clear();
  }
}
