import {ISemVer} from '../../src/semver/ISemVer';

export class SemVerMock implements ISemVer {
  private responses: Array<{v: string, response: string}> = [];

  public valid(v: string, loose?: boolean): string {
    return null;
  }

  public inc(v: string, release: string, loose?: boolean): string {
    return null;
  }

  public rCompare(v1: string, v2: string, loose?: boolean): number {
    return null;
  }
}
