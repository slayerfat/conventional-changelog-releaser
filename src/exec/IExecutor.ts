import {IExecReturnObject} from './IExecReturnObject';

export interface IExecutor {

  /**
   * Executes a command as a promise.
   *
   * @param {string} command
   * @return {Promise<IExecReturnObject | string>}
   */
  perform(command: string): Promise<IExecReturnObject>;
}
