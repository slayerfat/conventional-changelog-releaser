export class ChangelogNotFoundError extends Error {
  private static defaultState = {
    code   : 1,
    message: 'CHANGELOG.md (case-insensitive) not found.',
  };

  public code: number;

  /**
   * Gets the default error message.
   *
   * @return {string}
   */
  public static getMessage() {
    return this.defaultState.message;
  }

  constructor(message?: string, code?: number) {
    super(message || ChangelogNotFoundError.defaultState.message);

    this.code = code || ChangelogNotFoundError.defaultState.code;

    Object.setPrototypeOf(this, ChangelogNotFoundError.prototype);
  }
}
