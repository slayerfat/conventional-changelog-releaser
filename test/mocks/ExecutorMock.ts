import {IExecutor} from '../../src/exec/IExecutor';
import {IExecReturnObject} from '../../src/exec/IExecReturnObject';

export class ExecutorMock implements IExecutor {

  /**
   * A group of responses, each command may result in different responses.
   *
   * @type {Array}
   */
  private responses: IExtendedExecReturnObject[] = [];

  public setResponse(response: IExtendedExecReturnObject) {
    this.responses.push(response);
  }

  public perform(command: string): Promise<IExecReturnObject> {
    const results = this.responses
      .filter(response => response.command === command);

    if (results.length === 0) throw new Error(`Empty response, make sure ${command} is set.`);

    return new Promise(resolve => resolve(results[0]));
  }
}

interface IExtendedExecReturnObject extends IExecReturnObject {
  command: string;
}
