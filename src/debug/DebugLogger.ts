import * as debug from 'debug';
import * as winston from 'winston';
import {ILogger} from './ILogger';

export class DebugLogger implements ILogger {
  private logger: debug.IDebugger;
  private winston: winston.Winston = winston;

  constructor(private namespace: string) {
    this.logger = debug(namespace);
    this.winston.cli();
  }

  public debug(message: string | any, data?: any): void {
    if (data === undefined || data === null) {
      this.logger(message);
      return;
    }

    this.logger(message, data);
  }

  public info(message: string) {
    this.winston.info(message);
  }

  public warn(message: string) {
    this.winston.warn(message);
  }

  public error(message: string) {
    this.winston.error(message);
  }

  public getWinstonInstance() {
    return this.winston;
  }
}
