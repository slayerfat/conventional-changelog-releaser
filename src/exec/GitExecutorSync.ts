import {ChildProcessExecutorSync} from './ChildProcessExecutorSync';
export class GitExecutorSync extends ChildProcessExecutorSync {

  /**
   * Gets the number of commits from the hash given to HEAD.
   *
   * @param {string} hash The commit hash to find from HEAD.
   * @return {number}
   */
  public getCommitsCountFromHash(hash: string): number {
    return parseInt(this.perform(`git rev-list ${hash}..HEAD --count`), 10);
  }

  /**
   * Checks if any tag exist in the repository.
   *
   * @returns {boolean}
   */
  public isAnyTagPresent(): boolean {
    return (this.perform('git tag').length > 0);
  }

  /**
   * Gets a hash from a given tag.
   *
   * @param {string} tag The tag to get the hash from.
   * @returns {string}
   */
  public getHashFromTag(tag: string): string {
    return this.perform(`git show-ref -s ${tag}`);
  }

  /**
   * Uses git to find the root directory of the current path.
   * @link http://stackoverflow.com/a/957978
   *
   * @return {string}
   */
  public findBranchRootDir(): string {
    return this.perform('git rev-parse --show-toplevel');
  }

  /**
   * Creates a new tag with the given label.
   *
   * @param {string} label The tag label.
   * @return {void}
   */
  public createTag(label: string): void {
    try {
      this.perform(`git tag ${label}`);
    } catch (err) {
      // TODO find new error object in executor
      if (err.code === 128 && /already exists/.test(err.stderr)) {
        throw new Error(err.stderr);
      }

      throw err;
    }
  }

  /**
   * Gets all the valid semantic version tags.
   *
   * @param {RegExp} regex This regex matches tags with a valid semver.
   * ^ asserts position at start of a line
   * v? matches the 'variable prefix' literally (case sensitive)
   * \d+ matches a digit (equal to [0-9])
   * \. matches the character . literally (case sensitive)
   * \d+ matches a digit (equal to [0-9])
   * \. matches the character . literally (case sensitive)
   * \d+ matches a digit (equal to [0-9])
   * \-? matches the character - literally (case sensitive)
   * Non-capturing group (?:\d*|\w*\.\d+)
   *    1st Alternative \d*
   *      \d* matches a digit (equal to [0-9])
   *    2nd Alternative \w*\.\d+
   *      \w* matches any word character (equal to [a-zA-Z0-9_])
   *      \. matches the character . literally (case sensitive)
   *      \d+ matches a digit (equal to [0-9])
   *
   * @return {string[]}
   */
  public getAllSemVerTags(regex = /^v?\d+\.\d+\.\d+-?(?:\d*|\w*\.\d+)$/): string[] {
    return this.perform('git tag').split('\n')
      .filter(tag => tag.length > 1)
      .filter(tag => regex.test(tag));
  }

  /**
   * Checks if the given tag is present in the repository.
   *
   * @link http://stackoverflow.com/a/43156178
   * @param {string} label
   * @return {boolean}
   */
  public isTagPresent(label: string): boolean {
    return (this.perform(`git tag -l ${label}`).length > 0);
  }

  /**
   * Returns the current branch name.
   *
   * @return {string}
   */
  public getCurrentBranchName(): string {
    return this.perform('git rev-parse --abbrev-ref HEAD');
  }
}
