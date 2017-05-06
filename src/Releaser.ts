import {ICliBootstrap} from './cli/ICliBootstrap';
import {ILogger} from './debug/ILogger';
import {prompt} from 'inquirer';

export class Releaser {
  private exec: (command: string) => Promise<any>;

  /**
   * Removes the new line chars \n from a stdout result.
   *
   * @param results
   * @returns {string}
   */
  private static removeNewLine(results): string {
    return results.stdout.replace(/\n/, '');
  }

  constructor(private cli: ICliBootstrap, private logger: ILogger) {
    this.cli.init();
    this.logger.debug('starting');
    this.exec = require('child-process-promise').exec;
  }

  /**
   * Shows the CLI help message.
   *
   * @param code
   */
  public showHelp(code?: number) {
    return this.cli.showHelp(code);
  }

  /**
   * Checks the branch and bumps it accordingly.
   */
  public init(): void {
    this.isBranchPristine().then(isBranchPristine => {
      if (isBranchPristine && !this.isForcedMode()) {
        this.logger.error('No new commits since last tag, aborting.');
        process.exit(0);
      }

      this.logger.debug('init done');
      this.logger.info('Success, the bump was completed.');
    });
  }

  /**
   * Checks if the current branch has no new commits since last tag.
   * In other words, checks if there are new commits after the most recent tag.
   *
   * @returns {Promise<boolean>}
   */
  private isBranchPristine(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.tagsExist().then(tagsExist => {
        const getTagPromise = this.exec('git rev-list --tags --no-walk --max-count=1');

        this.logger.debug('executing git rev-list');

        // assume no tags means pristine
        if (!tagsExist) {
          this.logger.debug('No tags are found.');
          // noinspection ReservedWordAsName
          return prompt({
            default: false,
            message: 'No tags found, continue bump?',
            name:    'continue',
            type:    'confirm',
          }).then(results => {
            if (!results.continue) {
              this.logger.info('Cancelling bump.');

              return process.exit(0);
            }

            return getTagPromise;
          });
        }

        return getTagPromise;
      }).then(Releaser.removeNewLine)
        .then(tag => this.exec(`git rev-list ${tag}..HEAD --count`))
        .then(Releaser.removeNewLine)
        .then(count => resolve((parseInt(count, 10) === 0)))
        .catch(err => reject(err));
    });
  }

  /**
   * Checks if tags exist in a branch.
   *
   * @returns {Promise<boolean>}
   */
  private tagsExist(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.exec('git tag')
        .then(results => resolve((results.stdout.length > 0)))
        .catch(err => reject(err));
    });
  }

  /**
   * Checks if if running in forced mode.
   *
   * @returns {boolean}
   */
  private isForcedMode(): boolean {
    return this.cli.getFlag('forced');
  }
}
