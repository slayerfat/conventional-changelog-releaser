import {ICliBootstrap} from '../../src/cli/ICliBootstrap';
import {IFlagsObject} from '../../src/cli/IFlagsObject';
import {MeowCliBootstrap} from '../../src/cli/MeowCliBootstrap';

export class CliBootstrapMock extends MeowCliBootstrap {
  private inputs: string[];

  private flags: IFlagsObject;

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
    if (this.flags[name] === undefined) {
      throw new Error(`Flag ${name} is not defined.`);
    }

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
