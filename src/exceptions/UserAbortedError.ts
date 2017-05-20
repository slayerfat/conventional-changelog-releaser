export class UserAbortedError extends Error {
  private static defaultState = {
    code:    1,
    message: 'User aborted the execution',
  };

  /**
   * Gets the default error message.
   *
   * @return {string}
   */
  public static getMessage() {
    return this.defaultState.message;
  }

  public code: number;

  constructor(message?: string, code?: number) {
    super(message || UserAbortedError.defaultState.message);

    this.code = code || UserAbortedError.defaultState.code;

    Object.setPrototypeOf(this, UserAbortedError.prototype);
  }
}
