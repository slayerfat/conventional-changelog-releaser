import {IFlagsObject} from '../../src/cli/IFlagsObject';
import {MeowCliBootstrap} from '../../src/cli/MeowCliBootstrap';

export class CliBootstrapMock extends MeowCliBootstrap {
  private inputs: string[] = [];

  private flags: IFlagsObject = {
    auto:   true,
    commit: true,
    prefix: true,
  };

  public init() {
    //
  }

  public getInputs(): string[] {
    return this.inputs;
  }

  public getFlags(): IFlagsObject {
    return this.flags;
  }

  public getFlag(name: string): any {
    return this.flags[name];
  }

  public showHelp(code?: number): void {
    process.stdout.write('mocked');
    process.exit(0);
  }

  public setFlag(name, value) {
    // this.
  }

  public setInput(name, value) {
    //
  }
}
