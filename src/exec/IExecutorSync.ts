export interface IExecutorSync {

  /**
   * Executes a command as a promise.
   *
   * @param {string} command
   * @return {string}
   */
  perform(command: string): string;
}
