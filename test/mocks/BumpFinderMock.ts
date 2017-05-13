import {IBumpFinder} from '../../src/bumpFinder/IBumpFinder';
export class BumpFinderMock implements IBumpFinder {
  constructor(private type = 'mocked') {
    //
  }

  public getBumpType(): string {
    return this.type;
  }
}
