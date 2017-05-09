import * as meow from 'meow';
import * as minimist from 'minimist';
import {ICliBootstrap} from './ICliBootstrap';
import {IFlagsObject} from './IFlagsObject';

/**
 * @link https://www.npmjs.com/package/meow
 * @link https://github.com/substack/minimist#var-argv--parseargsargs-opts
 */
export class MeowCliBootstrap implements ICliBootstrap {

  /**
   * The results after meow parses the user inputs.
   * @link https://www.npmjs.com/package/meow
   */
  private cli: meow.Result;

  /**
   * This text is shown as standard CLI behaviour.
   *
   * @type {string}
   * @private
   */
  private helpText = `
    Usage
      $ ccr <input>

    Options
      -a,  --auto         Checks the commits and uses the appropriate bump type, defaults to true.
      -c,  --commit       Commits the bump in version control, defaults to true.
      -f,  --forced       Tries to bump without significant changes in the current repository.
      -h,  --help         This help message.
      -i,  --identifier   The pre-release identifier, defaults to none, example: v0.0.1-epsilon.0.
      -n,  --npm-publish  Tries to publish the new version to npm.
      -p,  --pre          Bumps as a pre-release, example: v1.0.1-0.
      -P,  --prefix       The tag prefix, adds v before the tag, example: v0.0.1, defaults to true.
      -r,  --release      The release type: major, minor, patch, etc. Ignored on auto-check.

    Examples
      Assuming the current branch is release/1.1.2 with no new features:
      $ ccr -p
        Bump to v1.1.2-0 completed.
      $ ccr -c false
        Bump to v1.1.2 completed, no commits made.

      Assuming the current branch is develop and no tag is present with no new features:
      $ ccr
        Bump to v0.0.1-0 completed.
      $ ccr -i alpha
        Bump to v0.0.1-alpha.0 completed.
      $ ccr -i gamma
        Bump to v0.0.1-gamma.0 completed.

      Assuming the current branch is develop and tag 2.0.0 is present with non features commits:
      $ ccr
        Bump to v2.0.1-0 completed.
  `;

  // noinspection TsLint
  /**
   * The options used by meow to parse the flags and other elements.
   *
   * @link https://www.npmjs.com/package/meow#meowoptions-minimistoptions
   * @type {minimist.Opts}
   * @private
   */
  private minimistOptions: minimist.Opts = {
    alias:   {
      a: 'auto',
      c: 'commit',
      d: 'dry',
      f: 'forced',
      h: 'help',
      i: 'identifier',
      n: 'npm-publish',
      p: 'pre',
      P: 'prefix',
      r: 'release',
    },
    boolean: ['auto', 'commit', 'npm-publish', 'prefix'],
    default: {
      auto: true,
      commit:     true,
      prefix:     true,
    },
  };

  public init() {
    this.cli = meow(this.helpText, this.minimistOptions);
  }

  public getInputs(): string[] {
    return this.cli.input;
  }

  public getFlags(): IFlagsObject {
    return this.cli.flags;
  }

  public getFlag(name: string) {
    return this.cli.flags[name];
  }

  public showHelp(code?: number): void {
    throw this.cli.showHelp(code);
  }
}
