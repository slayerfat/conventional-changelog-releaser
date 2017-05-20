import {IExecutorSync} from './IExecutorSync';
import {execSync} from 'child_process';

export class ChildProcessExecutorSync implements IExecutorSync {

  public perform(command: string): string {
    return execSync(command).toString();
  }
}
