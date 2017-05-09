export interface IBumpFinder {
  /**
   * Checks the commits and find the most appropriate bump type.
   *
   * @return {string}
   */
  getBumpType(): string;
}
