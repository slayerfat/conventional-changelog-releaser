import {IBumpFinder} from '../../src/bumpFinder/IBumpFinder';
export class BumpFinderMock implements IBumpFinder {
  private type = 'minor';

  public getBumpType(): string {
    return this.type;
  }

  public setBumpType(t: string) {
    this.type = t;
  }
}
