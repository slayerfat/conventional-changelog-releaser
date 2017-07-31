export interface ISemVer {

  /**
   * Return the parsed version, or null if it's not valid.
   */
  valid(v: string, loose?: boolean): string;

  /**
   * Return the version incremented by the release type (major, minor, patch, or prerelease)
   * or null if it's not valid
   *
   * @param v
   * @param release
   * @param identifier
   */
  inc(v: string, release: string, identifier?: string): string;

  /**
   * The reverse of compare.
   * Sorts an array of versions in descending order when passed to Array.sort().
   */
  rCompare(v1: string, v2: string, loose?: boolean): number;
}
