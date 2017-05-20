import {ILogger} from '../../src/debug/ILogger';

export class LoggerMock implements ILogger {

  public info(message: string): void {
    console.log(message);
  }

  public warn(message: string): void {
    console.log(message);
  }

  public error(message: string): void {
    console.log(message);
  }

  public debug(message: string | any, data?: any): void {
    console.log(message);
  }
}
