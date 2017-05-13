import {IExecutor} from './IExecutor';
import {IExecReturnObject} from './IExecReturnObject';

export class ChildProcessPromiseExecutor implements IExecutor {
  private exec: (c: string) => Promise<IExecReturnObject> = require('child-process-promise').exec;

  public perform(command: string): Promise<IExecReturnObject> {
    return this.exec(command);
  }
}
