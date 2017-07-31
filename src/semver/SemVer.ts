import {ISemVer} from './ISemVer';
import * as semver from 'semver';

export class SemVer implements ISemVer {
  public valid(v: string, loose?: boolean): string {
    return semver.valid(v, loose);
  }

  public inc(v: string, release: string, identifier?: string): string {
    return semver.inc(v, release as any, identifier as any);
  }

  public rCompare(v1: string, v2: string, loose?: boolean): number {
    return semver.rcompare(v1, v2, loose);
  }
}
