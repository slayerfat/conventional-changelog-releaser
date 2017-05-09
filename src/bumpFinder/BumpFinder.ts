import {IBumpFinder} from './IBumpFinder';

export class BumpFinder implements IBumpFinder {
  private releaseType: string;

  constructor(finder, preset = 'angular') {
    finder({preset}, (err, result) => {
      if (err) throw err;

      this.releaseType = result.releaseType;
    });
  }

  public getBumpType(): string {
    return this.releaseType;
  }
}
