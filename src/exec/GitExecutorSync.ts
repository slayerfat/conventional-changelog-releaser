import {ChildProcessExecutorSync} from './ChildProcessExecutorSync';

export class GitExecutorSync extends ChildProcessExecutorSync {

  /**
   * This regex matches tags with a valid semver.
   *
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
   * @type {RegExp}
   */
  public static validSemVerRegex = /^v?\d+\.\d+\.\d+-?(?:\d*|\w*\.\d+)$/;

  /**
   * This regex matches tags with a valid semver and no prefix.
   *
   * ^ asserts position at start of a line
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
   * @type {RegExp}
   */
  public static noPrefixValidSemVerRegex = /^\d+\.\d+\.\d+-?(?:\d*|\w*\.\d+)$/;

  /**
   * This regex matches tags with a valid semver with prefix.
   *
   * ^ asserts position at start of a line
   * v matches the 'variable prefix' literally (case sensitive)
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
   * @type {RegExp}
   */
  public static prefixedValidSemVerRegex = /^v\d+\.\d+\.\d+-?(?:\d*|\w*\.\d+)$/;

  public perform(command: string): string {
    return super.perform(command).replace('\n', '');
  }

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
   * Gets a hash from a given label.
   *
   * @param {string} label The label to get the hash from.
   * @returns {string}
   */
  public getHashFromLabel(label: string): string {
    try {
      return this.perform(`git show-ref -s ${label}`);
    } catch (err) {
      if (/Command failed/.test(err.message)) {
        throw new Error(`Label ${label} not found.`);
      }

      throw err;
    }
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
    this.perform(`git tag ${label}`);
  }

  /**
   * Gets all the valid semantic version tags.
   *
   * @param {RegExp} regex
   *
   * @return {string[]}
   */
  public getAllTagsWithRegex(regex = GitExecutorSync.validSemVerRegex): string[] {
    return super.perform('git tag').split('\n')
      .filter(tag => tag.length > 1)
      .filter(tag => regex.test(tag));
  }

  /**
   * Checks if the given tag is present in the repository.
   * This could be if the package.json or internal config versions have no related tag
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
