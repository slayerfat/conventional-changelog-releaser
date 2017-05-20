import {IBumpFinder} from './bumpFinder/IBumpFinder';
import {ICliBootstrap} from './cli/ICliBootstrap';
import {IConfig} from './config/IConfig';
import {IExecutorSync} from './exec/IExecutorSync';
import {IExecutor} from './exec/IExecutor';
import {ILogger} from './debug/ILogger';
import {IPkgUpResultObject} from './config/IPkgResultObject';
import {IPrompt} from './prompt/IPrompt';
import {ISemVer} from './semver/ISemVer';
import {readPkgUp} from './others/types';
import {resolve as pathResolve, dirname, relative, sep} from 'path';
import {UserAbortedError} from './exceptions/UserAbortedError';

const enum BRANCH_STATUSES {
  FORCED_BUMP = 1,
  INVALID_TAG = 2,
  NO_TAG      = 3,
  VALID       = 4,
  PRISTINE    = 5,
}

export class Releaser {

  public static errors = {
    exhaustedDir: 'Exhausted all directories within repository.',
    invalidTag:   'No valid semver tag found in repository.',
    noNewCommit:  'No new commits since last tag, aborting.',
    noPackage:    'No package.json found.',
    noTag:        'No tags are found.',
  };

  /**
   * The root path of the related repository.
   *
   * @type {string}
   */
  private repoRootPath: string;

  /**
   * The path that is currently being searched.
   *
   * @type {string}
   */
  private currentSearchPath: string;

  /**
   * Construct a new Releaser with the given parameters.
   *
   * @param {ICliBootstrap} cli The CLI wrapper.
   * @param {ILogger} logger A Logger implementation.
   * @param {IConfig} config A config implementation.
   * @param {IBumpFinder} bumpFinder The implementation of a bumpFinder.
   * @param {IExecutor} executor A shell exec implementation.
   * @param {IPrompt} prompt A shell prompt implementation.
   * @param {ISemVer} semver The semver wrapper.
   * @param {readPkgUp} readPkgUp A shell prompt implementation.
   */
  constructor(
    private cli: ICliBootstrap,
    private logger: ILogger,
    private config: IConfig,
    private bumpFinder: IBumpFinder,
    private executor: IExecutorSync,
    private prompt: IPrompt,
    private semver: ISemVer,
    private readPkgUp: readPkgUp,
  ) {
    this.currentSearchPath = process.cwd();
  }

  /**
   * Checks the branch and bumps it accordingly.
   *
   * @return Promise<void>
   */
  public async init(): Promise<void> {
    this.logger.debug('starting');

    this.cli.init();
    this.setDefaultConfig();

    if (!this.config.isPackageJsonExhausted()) {
      await this.setPackageJsonInConfig();
    }

    await this.syncSemVerVersions();

    if (this.config.isPackageJsonValid() || this.config.hasCurrentSemVer()) {
      return await this.bump();
    }

    throw new Error('Unknown config state.');
  }

  /**
   * Sets the default configuration state.
   *
   * @return void
   */
  private setDefaultConfig(): void {
    this.repoRootPath = this.findBranchRootDir();

    if (this.cli.isReset()) this.config.reset();
    if (this.cli.isFindJsonMode()) this.config.setPackageJsonExhaustStatus(false);
  }

  /**
   * Checks if the branch has any commits since last tag made.
   *
   * @return {Promise<boolean>}
   */
  private async getBranchStatus(): Promise<number> {
    if (this.isAnyTagPresent() === false) {
      return BRANCH_STATUSES.NO_TAG;
    }

    const currentTag = this.getCurrentTagFromConfig();

    if (!this.isTagPresent(currentTag)) {
      const answer = await this.prompt.confirm(
        `Tag ${currentTag} is not present in repository, continue?`,
      );

      if (answer === false) throw new UserAbortedError();

      // TODO fix BRANCH_STATUSES.FORCED_BUMP
      return BRANCH_STATUSES.FORCED_BUMP;
    }

    const hash  = this.getHashFromTag(currentTag);
    const count = this.executor.perform(`git rev-list ${hash}..HEAD --count`);

    if ((parseInt(count, 10) === 0)) {
      return BRANCH_STATUSES.PRISTINE;
    }

    return BRANCH_STATUSES.VALID;
  }

  /**
   * Gets the current tag from the config.
   *
   * @return {string}
   */
  private getCurrentTagFromConfig(prefixed = this.cli.hasPrefix()): string {
    const version = this.config.isPackageJsonValid() ?
      this.config.getPackageJsonVersion() : this.config.getCurrentSemVer();

    return prefixed ? 'v'.concat(version) : version;
  }

  /**
   * Sets a valid package.json file in config.
   *
   * @return {Promise<void>}
   */
  private async setPackageJsonInConfig(): Promise<void> {
    try {
      const file   = await this.findPackageJsonFile();
      const answer = await this.askUserIfPackageJsonFileIsCorrect(file);
      await this.handleIsPackageJsonFileIsCorrectResponse(answer);
    } catch (err) {
      if (err === Releaser.errors.exhaustedDir || Releaser.errors.noPackage) {
        return this.logger.debug(err);
      }

      throw err;
    }
  }

  /**
   * Finds a file from the perspective of the directory given.
   *
   * @param {string=} cwd The directory to start from.
   * @return {Promise<IPkgUpResultObject>}
   */
  private async findPackageJsonFile(cwd = this.currentSearchPath): Promise<IPkgUpResultObject> {
    const file = await this.readPkgUp({cwd});

    if (typeof file !== 'object' || Object.keys(file).length === 0) {
      throw new Error(Releaser.errors.noPackage);
    }

    return file;
  }

  /**
   * Ask the user if the given file is valid or not.
   *
   * @param {IPkgUpResultObject} file The file in question.
   * @return {Promise<string>} The user's answer, yes, no, and optionally abort.
   */
  private askUserIfPackageJsonFileIsCorrect(file: IPkgUpResultObject): Promise<string> {
    this.config.setPackageJson(file);
    let message: string;
    const choices = ['Yes', 'No'];

    if (file === null) {
      message = 'No package.json found, keep looking?';
    } else {
      message = `Package.json found in ${file.path}, is this file correct?`;
      choices.push('Abort');
    }

    return this.prompt.list(message, choices);
  }

  /**
   * Handles an user prompt response about the findings of a particular package.json file.
   *
   * @param {string} answer The answer the user gave.
   * @return {Promise<void>}
   */
  private async handleIsPackageJsonFileIsCorrectResponse(answer: string): Promise<void> {
    if (this.config.isPackageJsonExhausted()) {
      throw new Error(Releaser.errors.exhaustedDir);
    }

    switch (answer) {
      case 'Yes':
        this.config.setPackageJsonValidity(true);
        this.config.setPackageJsonExhaustStatus(true);
        break;
      case 'No':
        const packageJson = this.config.getPackageJson();
        this.config.deletePackageJson();

        this.currentSearchPath = dirname(packageJson.path);

        // splits the relative path between the directories, ex: ['..', '..'] or ['']
        // https://nodejs.org/api/path.html#path_path_relative_from_to
        const pathSplit = relative(this.currentSearchPath, this.repoRootPath).split(sep);

        // '' means the directories are equal, no '..' means the dir is outside the root
        if (pathSplit[0] === '' || pathSplit[0] !== '..') {
          this.config.setPackageJsonExhaustStatus(true);
          this.config.setPackageJsonValidity(false);

          throw new Error(Releaser.errors.exhaustedDir);
        }

        this.currentSearchPath = pathResolve(this.currentSearchPath, '../');

        const file     = await this.findPackageJsonFile(this.currentSearchPath);
        const response = await this.askUserIfPackageJsonFileIsCorrect(file);

        return await this.handleIsPackageJsonFileIsCorrectResponse(response);
      case 'Abort':
        throw new UserAbortedError();
      default:
        throw new Error('Unknown answer.');
    }
  }

  /**
   * Checks if tags exist in a branch.
   *
   * @returns {boolean}
   */
  private isAnyTagPresent(): boolean {
    return (this.executor.perform('git tag').length > 0);
  }

  /**
   * Gets a hash from a given tag.
   *
   * @param {string} tag The tag to get the hash from.
   * @returns {Promise<string>}
   */
  private getHashFromTag(tag: string): string {
    try {
      return this.executor.perform(`git show-ref -s ${tag}`);
    } catch (err) {
      // tag label not found
      if (err.code === 1) {
        // TODO fix branch status error
        throw new Error(BRANCH_STATUSES.INVALID_TAG.toString());
      }

      throw err;
    }
  }

  /**
   * Uses git to find the root directory of the current path.
   * @link http://stackoverflow.com/a/957978
   *
   * @return {Promise<string>}
   */
  private findBranchRootDir(): string {
    return this.executor.perform('git rev-parse --show-toplevel');
  }

  /**
   * Creates a new tag with the given label and prefix.
   *
   * @param {string} label The tag label.
   * @return {void}
   */
  private createTag(label: string): void {
    try {
      this.executor.perform(`git tag ${label}`);
    } catch (err) {
      // TODO find new error object in executor
      if (err.code === 128 && /already exists/.test(err.stderr)) {
        throw new Error(err.stderr);
      }

      throw err;
    }
  }

  /**
   * Bumps the current branch to the next semver number.
   *
   * @return {Promise<void>}
   */
  private async bump(): Promise<void> {
    const status = await this.getBranchStatus();

    switch (status) {
      case BRANCH_STATUSES.PRISTINE:
        if (!this.cli.isForced()) {
          throw new Error(Releaser.errors.noNewCommit);
        }

        return this.handleBumpLabelCommit();
      case BRANCH_STATUSES.VALID:
      case BRANCH_STATUSES.FORCED_BUMP:
        return this.handleBumpLabelCommit();
      case BRANCH_STATUSES.NO_TAG:
        const answer = await this.prompt.confirm(`${Releaser.errors.noTag} Create first tag?`);

        if (answer === false) throw new UserAbortedError();

        return this.handleBumpLabelCommit();
      case BRANCH_STATUSES.INVALID_TAG:
        throw new Error(Releaser.errors.invalidTag);
      default:
        throw new Error('Unknown branch status.');
    }
  }

  /**
   * Sync the package.json version with current semver in config.
   *
   * @return {Promise<boolean>}
   */
  private async syncSemVerVersions(): Promise<void> {
    const tags = this.config.isPackageJsonValid() ?
      [this.config.getPackageJsonVersion()] : this.getAllSemVerTags();

    if (tags.length === 0) {
      this.config.deleteCurrentSemVer();

      const answer = await this.prompt.confirm('No valid semver tags found, continue?');

      if (answer === false) throw new UserAbortedError();
    }

    this.setLatestSemVerInConfig(tags);
  }

  /**
   * Gets all the valid semantic version tags.
   *
   * @return {string[]}
   */
  private getAllSemVerTags(): string[] {
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
     *
     * @type {RegExp}
     */
    const regex = /^v?\d+\.\d+\.\d+-?(?:\d*|\w*\.\d+)$/;

    return this.executor.perform('git tag').split('\n')
      .filter(tag => tag.length > 1)
      .filter(tag => regex.test(tag));
  }

  /**
   * Sets the last valid semantic version tag into the config file.
   *
   * @return {void}
   */
  private setLatestSemVerInConfig(tags: string[]): void {
    if (tags.length > 0) {
      const sorted = tags.sort(this.semver.rCompare);
      this.config.setCurrentSemVer(sorted[0]);

      return;
    }

    this.config.setCurrentSemVer('0.0.1');
  }

  /**
   * Makes a new label from current one.
   *
   * @param {string} name The label name.
   * @param {string} type The type to construct from (minor, major, etc).
   * @return {string}
   */
  private constructNewLabel(name: string, type: string) {
    const label = this.incrementSemVer(name, type);

    return this.cli.hasPrefix() ? 'v'.concat(label) : label;
  }

  /**
   * Checks if the given tag is present in the repository.
   *
   * @link http://stackoverflow.com/a/43156178
   * @param label
   * @return {Promise<any>}
   */
  private isTagPresent(label: string): boolean {
    return (this.executor.perform(`git tag -l ${label}`).length > 0);
  }

  /**
   * Gets the bump type (minor, major, etc).
   *
   * @return {string}
   */
  private getBumpType(): string {
    return this.cli.isAuto() ?
      this.bumpFinder.getBumpType() : this.cli.getRelease();
  }

  /**
   * Returns the current branch name.
   *
   * @return {Promise<any>}
   */
  private getCurrentBranchName(): string {
    return this.executor.perform('git rev-parse --abbrev-ref HEAD');
  }

  /**
   * Uses semver to increment a tag version.
   *
   * @param {string} label The current label.
   * @param {string} type
   * @param {string=} suffix
   * @return {string}
   */
  private incrementSemVer(label: string, type: string, suffix?: string): string {
    if (!this.semver.valid(label)) {
      throw new Error(`The provided label ${label} does not follow semver.`);
    }

    switch (type) {
      case 'prerelease':
        return this.semver.inc(label, type, suffix as any);
      case 'major':
      case 'minor':
      case 'patch':
      case 'premajor':
      case 'preminor':
      case 'prepatch':
        return this.semver.inc(label, type);
      default:
        throw new Error(`Invalid type ${type} provided.`);
    }
  }

  private handleBumpLabelCommit(): void {
    const label = this.constructNewLabel(this.getCurrentTagFromConfig(), this.getBumpType());

    this.createTag(label);

    if (this.config.isPackageJsonValid()) {
      this.config.setPackageJsonVersion(label);
    }

    this.config.setCurrentSemVer(label);

    // TODO implement shouldCommit
    if (this.cli.shouldCommit() === true) {
      this.logger.info(`Bump to ${label} completed.`);

      return;
    }

    this.logger.info(`Bump to ${label} completed, no commits made.`);
  }
}
