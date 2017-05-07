import * as readPkgUp from 'read-pkg-up';
import * as semver from 'semver';
import {ICliBootstrap} from './cli/ICliBootstrap';
import {IConfig} from './config/IConfig';
import {ILogger} from './debug/ILogger';
import {IPkgUpResultObject} from './config/IPkgResultObject';
import {prompt, Questions} from 'inquirer';
import {resolve as pathResolve, dirname, relative, sep} from 'path';
import {UserAbortedError} from './exceptions/UserAbortedError';

const ERRORS = {
  exhaustedDir: 'Exhausted all directories within repository.',
  noNewCommit:  'No new commits since last tag, aborting.',
  noPackage:    'No package.json found.',
  noTag:        'No tags are found.',
};

const enum BRANCH_STATUS {
  INVALID_TAG  = 1,
  NO_TAG       = 2,
  NOT_PRISTINE = 3,
  PRISTINE     = 4,
}

export class Releaser {

  /**
   * Executes a command as a promise.
   *
   * @type {function}
   */
  private exec: (command: string) => Promise<any>;

  /**
   * This git command returns the hash of the latest tag in the repository.
   *
   * @type {string}
   */
  private gitTagHashCommand = 'git rev-list --tags --no-walk --max-count=1';

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
   * Removes the new line chars \n from a stdout result.
   *
   * @param results
   * @returns {string}
   */
  private static removeNewLine(results): string {
    if (typeof results !== 'object') {
      throw new Error('The results must be an object.');
    }

    const {stdout} = results;

    if (!stdout) {
      throw new Error('The results must have the stdout property.');
    }

    return results.stdout.replace(/\n/, '');
  }

  /**
   * Returns a question related to the package.json given as an argument.
   *
   * @param {IPkgUpResultObject} file The result from a pkg-up exec.
   * @returns {Questions} The user's answer, yes, no, and optionally abort.
   */
  private static constructPackageJsonQuestion(file: IPkgUpResultObject): Questions {
    const question = {
      choices: ['Yes', 'No'],
      message: null,
      name:    'continue',
      type:    'list',
    };

    if (file === null) {
      question.message = 'No package.json found, keep looking?';
    } else {
      question.message = `Package.json found in ${file.path}, is this file correct?`;
      question.choices.push('Abort');
    }

    return question;
  }

  /**
   * Construct a new Releaser with the given parameters.
   *
   * @param {ICliBootstrap} cli The CLI wrapper.
   * @param {ILogger} logger A Logger implementation.
   * @param {IConfig} config A config implementation.
   */
  constructor(private cli: ICliBootstrap, private logger: ILogger, private config: IConfig) {
    this.cli.init();
    this.logger.debug('starting');

    this.exec = require('child-process-promise').exec;

    this.currentSearchPath = process.cwd();

    this.findBranchRootDir().then(results => this.repoRootPath = results);
  }

  /**
   * Checks the branch and bumps it accordingly.
   *
   * @return void
   */
  public init(): void {
    this.startConfigurationFiles()
      // .then(() => this.getBranchStatus())
      // .then(status => {
      //   switch (status) {
      //     case BRANCH_STATUS.PRISTINE:
      //       this.logger.debug('pristine case');
      //
      //       if (!this.isForcedMode()) {
      //         this.logger.debug('not forced');
      //
      //         throw new Error(ERRORS.noNewCommit);
      //       }
      //
      //       this.bump();
      //
      //       break;
      //     case BRANCH_STATUS.NOT_PRISTINE:
      //       this.bump();
      //
      //       break;
      //     case BRANCH_STATUS.NO_TAG:
      //       this.logger.debug('no tag case');
      //
      //       return this.askUserToCreateNewTag()
      //         .then(answer => {
      //           if (answer === true) {
      //             this.bump();
      //
      //             return Promise.resolve(true);
      //           }
      //
      //           return Promise.reject(new UserAbortedError());
      //         });
      //     default:
      //       throw new Error('Unknown branch status.');
      //   }
      // })
      .then(bumpResult => {
        this.logger.debug('init completed');
        this.logger.debug(bumpResult);
      })
      .catch(reason => {
        this.logger.debug('errors in init!');
        if (reason instanceof UserAbortedError) {
          return this.logger.debug('user aborted.');
        } else if (reason === ERRORS.exhaustedDir) {
          return this.logger.error(`Can't continue: ${ERRORS.exhaustedDir}`);
        }

        throw reason;
      });
  }

  /**
   * Checks if the current branch has no new commits since last tag.
   * In other words, checks if there are new commits after the most recent tag.
   *
   * @returns {Promise<boolean>}
   */
  private getBranchStatus(): Promise<number> {
    return Promise.resolve()
      .then(() => this.isAnyTagPresent())
      .then(tagIsPresent => {
        if (!tagIsPresent) {
          return Promise.reject(BRANCH_STATUS.NO_TAG);
        }

        return this.exec(this.gitTagHashCommand);
      })
      .then(Releaser.removeNewLine)
      .then(commit => this.exec(`git describe --tags ${commit}`))
      .then(Releaser.removeNewLine)
      .then(tag => {
        if (!semver.valid(tag)) {
          return Promise.reject(BRANCH_STATUS.INVALID_TAG);
        }

        return this.exec(this.gitTagHashCommand);
      })
      .then(Releaser.removeNewLine)
      .then(commit => this.exec(`git rev-list ${commit}..HEAD --count`))
      .then(Releaser.removeNewLine)
      .then(count => {
        if (parseInt(count, 10) === 0) {
          return Promise.resolve(BRANCH_STATUS.PRISTINE);
        }

        return Promise.resolve(BRANCH_STATUS.NOT_PRISTINE);
      })
      .catch(err => {
        if (err instanceof Error) {
          throw err;
        }

        return Promise.resolve(err);
      });
  }

  /**
   * Prompts a new yes or no question to the user.
   * TODO: refactor as a helper
   *
   * @return {Promise<boolean>}
   */
  private askUserToCreateNewTag(): Promise<boolean> {
    const question = {
      default: false,
      message: 'No tags found, continue bump?',
      name:    'continue',
      type:    'confirm',
    };

    return Promise.resolve()
      .then(() => prompt(question))
      .then(answer => Promise.resolve(answer.continue));
  }

  /**
   * Sets the necessary config files.
   *
   * @return {Promise<void>}
   */
  private startConfigurationFiles(): Promise<void> {
    return this.findPackageJsonFile()
      .then(file => this.askUserIfPackageJsonFileIsCorrect(file))
      .then(answer => this.handleIsPackageJsonFileIsCorrectResponse(answer))
      .then(() => this.setLatestSemVerInConfig());
  }

  /**
   * Finds a file from the perspective of the directory given.
   *
   * @param {string=} cwd The directory to start from.
   * @return {Promise<IPkgUpResultObject>}
   */
  private findPackageJsonFile(cwd = this.currentSearchPath): Promise<IPkgUpResultObject> {
    return Promise.resolve()
      .then(() => readPkgUp({cwd}))
      .then(file => {
        if (typeof file !== 'object' || file.length === 0) {
          return Promise.reject(ERRORS.noPackage);
        }

        return file;
      });
  }

  /**
   * Ask the user if the given file is valid or not.
   *
   * @param {IPkgUpResultObject} file The file in question.
   * @return {Promise<string>} The user's answer, yes, no, and optionally abort.
   */
  private askUserIfPackageJsonFileIsCorrect(file: IPkgUpResultObject): Promise<string> {
    this.config.setPackageJson(file);
    const question = Releaser.constructPackageJsonQuestion(file);

    return prompt(question).then(answer => answer.continue);
  }

  /**
   * Handles an user prompt response about the findings of a particular package.json file.
   *
   * @param {string} answer The answer the user gave.
   * @return {Promise<void>}
   */
  private handleIsPackageJsonFileIsCorrectResponse(answer: string): Promise<void> {
    return Promise.resolve()
      .then(() => {
        switch (answer) {
          case 'Yes':
            if (!semver.valid(this.config.getPackageJson().pkg.version)) {
              throw new Error('Current version in package.json does not follow semver.');
            }
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
              return Promise.reject(ERRORS.exhaustedDir);
            }

            this.currentSearchPath = pathResolve(this.currentSearchPath, '../');

            return this.findPackageJsonFile(this.currentSearchPath)
              .then(file => this.askUserIfPackageJsonFileIsCorrect(file))
              .then(response => this.handleIsPackageJsonFileIsCorrectResponse(response));
          case 'Abort':
            throw new UserAbortedError();
          default:
            throw new Error('Unknown answer.');
        }
      });
  }

  /**
   * Checks if tags exist in a branch.
   *
   * @returns {Promise<boolean>}
   */
  private isAnyTagPresent(): Promise<boolean> {
    return this.exec('git tag')
      .then(results => (results.stdout.length > 0));
  }

  /**
   * Gets a hash from a given tag.
   *
   * @param {string} tag The tag to get the hash from.
   * @returns {Promise<string>}
   */
  private getHashFromTag(tag: string): Promise<string> {
    return this.exec(`git show-ref -s ${tag}`)
      .then(Releaser.removeNewLine);
  }

  /**
   * Checks if if running in forced mode.
   *
   * @returns {boolean}
   */
  private isForcedMode(): boolean {
    return this.cli.getFlag('forced');
  }

  /**
   * Uses git to find the root directory of the current path.
   * @link http://stackoverflow.com/a/957978
   *
   * @return {Promise<string>}
   */
  private findBranchRootDir(): Promise<string> {
    return this.exec('git rev-parse --show-toplevel')
      .then(Releaser.removeNewLine);
  }

  /**
   * Creates the first tag as 0.0.1 in the repository.
   *
   * @return {Promise<any>}
   */
  private createFirstTag(): Promise<void> {
    return this.createTag('0.0.1', this.cli.getFlag('prefix'));
  }

  /**
   * Creates a new tag with the given label and prefix.
   *
   * @param {string} label The tag label.
   * @param {string=} prefix The tag prefix, ex: v0.0.1.
   * @return {Promise<void>}
   */
  private createTag(label: string, prefix?: string): Promise<void> {
    const tagLabel = prefix ? prefix.concat(label) : label;
    this.logger.debug(`creating new tag as ${tagLabel}`);

    return this.exec(`git tag ${tagLabel}`);
  }

  private bump() {
    this.logger.debug('bump!');
  }

  /**
   * Sets the last valid semantic version tag into the config file.
   *
   * @return {Promise<boolean>}
   */
  private setLatestSemVerInConfig(): Promise<void> {
    return this.getAllSemVerTags().then(tags => {
      if (tags.length === 0) {
        return Promise.reject(ERRORS.noTag);
      }

      const sorted = tags.sort(semver.rcompare);
      this.config.setCurrentSemVer(sorted[0]);
    });
  }

  /**
   * Gets all the valid semantic version tags.
   *
   * @return {Promise<string[]>}
   */
  private getAllSemVerTags(): Promise<string[]> {
    // https://github.com/benjamingr/RegExp.escape
    const prefix = this.cli.getFlag('prefix').replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

    /**
     * This regex matches tags with a valid semver.
     *
     * ^ asserts position at start of a line
     * prefix? matches the 'variable prefix' literally (case sensitive)
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
    const regex     = new RegExp(`^${prefix}?\\d+\\.\\d+\\.\\d+-?(?:\\d*|\\w*\\.\\d+)$`);
    const validTags = [];

    return Promise.resolve()
      .then(() => this.exec('git tag'))
      .then(value => {
        const tags = value.stdout.split('\n')
          .filter(tag => tag.length > 1);

        tags.forEach(tag => {
          if (regex.test(tag)) {
            validTags.push(tag);
          }
        });

        return validTags;
      });
  }
}
