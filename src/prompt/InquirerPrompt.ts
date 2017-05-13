import {IPrompt} from './IPrompt';
import {prompt, Question} from 'inquirer';

export class InquirerPrompt implements IPrompt {

  /**
   * The question name identifier.
   *
   * @type {string}
   */
  private questionName = 'answer';

  public confirm(message: string): Promise<boolean> {
    const question = {
      default: false,
      message,
      name:    this.questionName,
      type:    'confirm',
    };

    return prompt(question)
      .then(answer => Promise.resolve(answer[this.questionName]));
  }

  public list(message: string, choices: string[]): Promise<string> {
    const question = {
      choices,
      message,
      name: this.questionName,
      type: 'list',
    };

    return prompt(question)
      .then(answer => Promise.resolve(answer[this.questionName]));
  }
}
