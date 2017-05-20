import {IPrompt} from '../../src/prompt/IPrompt';

export class PromptMock implements IPrompt {
  private response: any = true;

  public setResponse(response) {
    this.response = response;
  }

  public confirm(message: string): Promise<boolean> {
    return Promise.resolve(this.response);
  }

  public list(message: string, choices: string[]): Promise<string> {
    return Promise.resolve(this.response);
  }
}
