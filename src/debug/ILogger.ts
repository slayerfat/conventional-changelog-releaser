export interface ILogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string | any, data?: any): void;
}
