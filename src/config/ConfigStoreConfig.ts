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

  public getPackageJson(): IPkgUpResultObject {
    return this.config.get('packageJson');
  }

  public deletePackageJson() {
    return this.config.delete('packageJson');
  }

  public setCurrentSemVer(value: string): void {
    this.config.set('currentSemVer', value);
  }

  public getCurrentSemVer(): string {
    return this.config.get('currentSemVer');
  }
}
