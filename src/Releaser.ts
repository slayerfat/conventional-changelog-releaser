import {GitExecutorSync} from './exec/GitExecutorSync';
import {IBumpFinder} from './bumpFinder/IBumpFinder';
import {ICliBootstrap} from './cli/ICliBootstrap';
import {IConfig} from './config/IConfig';
import {IExecutor} from './exec/IExecutor';
import {ILogger} from './debug/ILogger';
import {IPkgUpResultObject} from './config/IPkgResultObject';
import {IPrompt} from './prompt/IPrompt';
import {ISemVer} from './semver/ISemVer';
import {readPkgUp} from './others/types';
import {resolve as pathResolve, dirname, relative, sep} from 'path';
import {UserAbortedError} from './exceptions/UserAbortedError';
import {Changelog} from './changelog/Changelog';

const enum BRANCH_STATUSES {
  FIRST_TAG   = 1,
  INVALID_TAG = 2,
  NO_TAG      = 3,
  VALID       = 4,
  PRISTINE    = 5,
}

export class Releaser {

  /**
   * The error strings this class can throw.
   *
   * @type {object}
   */
  public static errors = {
    exhaustedDir: 'Exhausted all directories within repository.',
    invalidTag:   'No valid semver tag found in repository.',
    noNewCommit:  'No new commits since last valid semver tag, aborting.',
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
   * The first tag value, used on first bump.
   *
   * @type {string}
   */
  private firstLabel = '0.1.0';

  /**
   * Construct a new Releaser with the given parameters.
   *
   * @param {ICliBootstrap} cli The CLI wrapper.
   * @param {ILogger} logger A Logger implementation.
   * @param {IConfig} config A config implementation.
   * @param {IBumpFinder} bumpFinder The implementation of a bumpFinder.
   * @param {IExecutor} gitExec A GitExecutorSync instance.
   * @param {IPrompt} prompt A shell prompt implementation.
   * @param {ISemVer} semver The semver wrapper.
   * @param {readPkgUp} readPkgUp A shell prompt implementation.
   * @param {Changelog} changelog A changelog file wrapper.
   */
  constructor(
    private cli: ICliBootstrap,
    private logger: ILogger,
    private config: IConfig,
    private bumpFinder: IBumpFinder,
    private gitExec: GitExecutorSync,
    private prompt: IPrompt,
    private semver: ISemVer,
    // tslint:disable-next-line no-shadowed-variable
    private readPkgUp: readPkgUp,
    private changelog: Changelog,
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
    this.repoRootPath = this.gitExec.findBranchRootDir();

    if (this.cli.isReset()) this.config.reset();
    if (this.cli.isFindJsonMode()) this.config.setPackageJsonExhaustStatus(false);
  }

  /**
   * Checks if the branch has any commits since last tag made.
   *
   * @return {Promise<boolean>}
   */
  private async getBranchStatus(): Promise<number> {
    if (this.gitExec.isAnyTagPresent() === false) {
      return BRANCH_STATUSES.NO_TAG;
    }

    let currentTag = this.updateLabelPrefix(this.getCurrentTag());

    // checks if current tag from either package.json or config
    // is present in repository, if not ask user to continue or abort
    if (!this.isTagPresent(currentTag)) {
      const answer = await this.prompt.confirm(
        `Tag ${currentTag} is not present in repository, continue?`,
      );

      if (answer === false) throw new UserAbortedError();

      const existingTags = this.cli.hasPrefix() ?
        this.gitExec.getAllTagsWithRegex(GitExecutorSync.prefixedValidSemVerRegex) :
        this.gitExec.getAllTagsWithRegex(GitExecutorSync.noPrefixValidSemVerRegex);

      if (existingTags.length === 0) {
        return BRANCH_STATUSES.FIRST_TAG;
      }

      currentTag = existingTags.pop();
    }

    let hash;

    try {
      hash = this.gitExec.getHashFromLabel(currentTag);
    } catch (err) {
      // tag label not found
      if (err.code === 1) {
        throw new Error(Releaser.errors.noTag);
      }

      throw err;
    }

    if (this.gitExec.getCommitsCountFromHash(hash) === 0) {
      return BRANCH_STATUSES.PRISTINE;
    }

    return BRANCH_STATUSES.VALID;
  }

  /**
   * Gets the current tag from the config.
   *
   * @return {string}
   */
  private getCurrentTag(): string {
    return this.config.isPackageJsonValid() ?
      this.config.getPackageJsonVersion() : this.config.getCurrentSemVer();
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
      if (err.message === Releaser.errors.exhaustedDir ||
        err.message === Releaser.errors.noPackage) {
        this.logger.debug('No file found, skipping.');

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
        if (this.config.isPackageJsonValid()) {
          const label = this.updateLabelPrefix(this.config.getPackageJsonVersion());

          return this.handleBumpLabelCommit(label);
        }

        return this.handleBumpLabelCommit();
      case BRANCH_STATUSES.FIRST_TAG:
        return this.handleBumpLabelCommit(this.updateLabelPrefix(this.firstLabel));
      case BRANCH_STATUSES.NO_TAG:
        if (this.config.isPackageJsonValid()) {
          const label = this.updateLabelPrefix(this.config.getPackageJsonVersion());

          return this.handleBumpLabelCommit(label);
        }

        const answer = await this.prompt.confirm(`${Releaser.errors.noTag} Create first tag?`);

        if (answer === false) throw new UserAbortedError();

        return this.handleBumpLabelCommit(this.updateLabelPrefix(this.firstLabel));
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
      [this.config.getPackageJsonVersion()] : this.gitExec.getAllTagsWithRegex();

    if (tags.length === 0) {
      this.config.deleteCurrentSemVer();

      const answer = await this.prompt.confirm('No valid semver tags found, continue?');

      if (answer === false) throw new UserAbortedError();
    }

    this.setLatestSemVerInConfig(tags);
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

    this.config.setCurrentSemVer(this.firstLabel);
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

    return this.updateLabelPrefix(label);
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

  /**
   * Handles a new commit bump event.
   *
   * @param label
   */
  private async handleBumpLabelCommit(label?: string): Promise<void> {
    label = label || this.constructNewLabel(this.getCurrentTag(), this.getBumpType());

    return Promise.resolve()
      .then(() => this.updateChangelog(label))
      .then(() => this.createTag(label))
      .then(() => this.updatePkgJsonVersion(label));
  }

  /**
   * Creates a new tag checking if should be prefixed.
   *
   * @param {string} label The label to tag
   */
  private createTag(label: string): void {
    if (this.config.isPackageJsonValid()) {
      this.config.setPackageJsonVersion(label);
    }

    this.config.setCurrentSemVer(label);

    if (this.cli.shouldCommit() === false) {
      return this.logger.info(`Bump to ${label} completed, not committing.`);
    }

    if (!this.semver.valid(label)) {
      throw new Error(`Invalid label ${label}, will not continue.`);
    }

    const updatedLabel = this.updateLabelPrefix(label);

    this.logger.info(`Creating new tag as '${updatedLabel}'.`);

    return this.gitExec.createTag(updatedLabel);
  }

  /**
   * Search the label with git, with or without prefix.
   *
   * @param {string} label The label to search
   * @return {boolean}
   */
  private isTagPresent(label: string): boolean {
    return this.gitExec.isTagPresent(this.updateLabelPrefix(label));
  }

  /**
   * Adds or removes the prefix according to the prefix flag.
   *
   * @param {string} label The label to alter
   * @param {boolean} isPrefixed The prefix flag
   * @return {string}
   */
  private updateLabelPrefix(label: string, isPrefixed = this.cli.hasPrefix()): string {
    if (!GitExecutorSync.validSemVerRegex.test(label)) {
      throw new Error(`Invalid label ${label} given, wont update.`);
    } else if (isPrefixed) {
      if (/^v/.test(label)) {
        return label;
      }

      return 'v'.concat(label);
    }

    return label.replace(/^v/, '');
  }

  /**
   * Updates the local changelog file.
   *
   * @param {string} label
   * @return {Promise<void>}
   */
  private updateChangelog(label: string): Promise<void> {
    if (!this.cli.isInLogMode()) {
      return;
    }

    return this.changelog.backup()
      .then(() => this.changelog.update())
      .then(() => {
        if (this.cli.shouldCommit() === false) {
          return this.logger.info(`Bump to ${label} completed, no commits made.`);
        }

        // commit the changes
        return this.changelog.getFilePath().then(path => {
          const options = {
            files:   {paths: [path]},
            message: `docs(changelog): bump to ${label}`,
          };

          const results = this.gitExec.commit(options);

          this.logger.debug('changelog commit results:', results);
          this.logger.debug(results);
          this.logger.info(`Changelog committed with message: '${options.message}'.`);
        });
      })
      .then(() => this.changelog.deleteFile({backup: true}));

  }

  /**
   * Updates the version of the local package.json file.
   *
   * @param {string} label
   * @return {Promise<void>}
   */
  private updatePkgJsonVersion(label: string): Promise<void> {
    if (this.cli.shouldUpdatePackageVersion() === false) {
      this.logger.debug('Skipping package.json version update, flag not set.');

      return;
    } else if (!this.config.isPackageJsonValid()) {
      this.logger.debug('Skipping package.json version update, invalid file.');

      return;
    }

    const file       = this.config.getPackageJson();
    file.pkg.version = this.updateLabelPrefix(label, false);

    this.changelog.getFileExec()
      .write(file.path + '/package.json', JSON.stringify(file.pkg))
      .then(() => this.logger.info(`Package updated with version '${label}'.`));
  }
}
