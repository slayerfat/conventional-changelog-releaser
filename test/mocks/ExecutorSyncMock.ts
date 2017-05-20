import {IExecutorSync} from '../../src/exec/IExecutorSync';
import {AbstractMockWithResponses} from './AbstractMockWithResponses';

export class ExecutorSyncMock extends AbstractMockWithResponses implements IExecutorSync {

  public perform(command: string): string {
    const results = this.findResponse('perform', {command});

    return results.response;
  }
}
