import {ISemVer} from '../../src/semver/ISemVer';
import {AbstractMockWithResponses, IMockResponse} from './AbstractMockWithResponses';

export class SemVerMock extends AbstractMockWithResponses implements ISemVer {

  public valid(label: string, loose?: boolean): string {
    const results = this.findResponse('valid', {label});

    return results.response;
  }

  public inc(v: string, release: string, loose?: boolean): string {
    return null;
  }

  public rCompare(v1: string, v2: string, loose?: boolean): number {
    return null;
  }
}
