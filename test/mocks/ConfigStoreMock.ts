import {IConfigStore} from '../../src/config/IConfigStore';

export class ConfigStoreMock implements IConfigStore {
  private data = {};

  public get all() {
    return this.data;
  }

  public get path() {
    return 'ConfigStoreMock.path';
  }

  public get size() {
    return Object.keys(this.data).length;
  }

  public get(key: string) {
    return this.data[key];
  }

  public set(key: string, val: any): void {
    this.data[key] = val;
  }

  public has(key: string): boolean {
    return (this.data[key] !== undefined || this.data[key] !== null);
  }

  public delete(key: string): void {
    delete this.data[key];
  }

  public clear(): void {
    this.data = {};
  }
}
