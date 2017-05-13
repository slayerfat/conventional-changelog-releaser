import {IExecReturnObject} from './IExecReturnObject';

export interface IExecutor {

  /**
   * Executes a command as a promise.
   *
   * @param {string} command
   * @param {boolean} removeLine Removes the new line char from the output (true by default).
   * @return {Promise<IExecReturnObject | string>}
   */
  perform(command: string): Promise<IExecReturnObject>;
}
