export interface IPrompt {

  /**
   * Prompts a new question to the user.
   *
   * @param {string=} message The prompt message.
   * @return {Promise<boolean>}
   */
  confirm(message: string): Promise<boolean>;

  /**
   * Prompts a list of choices to the user.
   *
   * @param {string=} message The prompt message.
   * @param {string[]} choices The choices the user has.
   * @return {Promise<string>} The choice string from the user.
   */
  list(message: string, choices: string[]): Promise<string>;
}
