import {IFlagsObject} from '../../src/cli/IFlagsObject';
import {MeowCliBootstrap} from '../../src/cli/MeowCliBootstrap';

export class CliBootstrapMock extends MeowCliBootstrap {
  private inputs: string[] = [];

  private flags: IFlagsObject = {
    'auto':       true,
    'commit':     true,
    'log-append': true,
    'log-preset': 'angular',
    'prefix':     true,
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

  public setFlag(name, value): void {
    this.flags[name] = value;
  }

  public setInput(name, value): void {
    this.inputs[name] = value;
  }

  public setReleaseType(type: string): void {
    this.setFlag('release', type);
  }
}
