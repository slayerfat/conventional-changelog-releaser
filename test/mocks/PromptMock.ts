import {IPrompt} from '../../src/prompt/IPrompt';
import {AbstractMockWithResponses} from './AbstractMockWithResponses';

export class PromptMock extends AbstractMockWithResponses implements IPrompt {

  public confirm(message: string): Promise<boolean> {
    const results = this.findResponse('confirm', {message});

    return Promise.resolve(results.response);
  }

  public list(message: string, choices: string[]): Promise<string> {
    const results = this.findResponse('list', {message});

    return Promise.resolve(results.response);
  }
}
