import * as shell from 'shelljs';
import {BumpFinderMock} from './mocks/BumpFinderMock';
import {CliBootstrapMock} from './mocks/MeowCLIMock';
import {ConfigMock} from './mocks/ConfigMock';
import {expect} from 'chai';
import {GitExecutorSync} from '../src/exec/GitExecutorSync';
import {IBumpFinder} from '../src/bumpFinder/IBumpFinder';
import {ICliBootstrap} from '../src/cli/ICliBootstrap';
import {IConfig} from '../src/config/IConfig';
import {ILogger} from '../src/debug/ILogger';
import {IPrompt} from '../src/prompt/IPrompt';
import {ISemVer} from '../src/semver/ISemVer';
import {LoggerMock} from './mocks/LoggerMock';
import {makeFreshGitDir} from './helpers/makeFreshGitDir';
import {PromptMock} from './mocks/PromptMock';
import {readPkgUp as TReadPkgUp} from '../src/others/types';
import {Releaser} from '../src/Releaser';
import {SemVer} from '../src/semver/SemVer';
import {UserAbortedError} from '../src/exceptions/UserAbortedError';

// chai.expect shows as an unused expression
/* tslint:disable:no-unused-expression */

describe('Releaser CLI', () => {
  let releaser: Releaser;
  const gitExec = new GitExecutorSync();

  function makeNewPkgUpFunction(file?: any) {
    return () => Promise.resolve(file || {});
  }

  function makeNewReleaser(options?: {
    cli?: ICliBootstrap,
    logger?: ILogger,
    config?: IConfig,
    bump?: IBumpFinder,
    exec?: GitExecutorSync,
    prompt?: IPrompt,
    semver?: ISemVer,
    pkgUp?: TReadPkgUp,
  }) {
    let {cli, logger, config, bump, exec, prompt, semver, pkgUp} = options;

    cli    = cli || new CliBootstrapMock();
    logger = logger || new LoggerMock();
    config = config || new ConfigMock();
    bump   = bump || new BumpFinderMock();
    prompt = prompt || new PromptMock();
    pkgUp  = pkgUp || makeNewPkgUpFunction();

    // non-mocks
    exec   = exec || gitExec;
    semver = semver || new SemVer();

    return new Releaser(cli, logger, config, bump, exec, prompt, semver, pkgUp);
  }

  beforeEach(() => {
    makeFreshGitDir();

    releaser = makeNewReleaser({});
  });

  afterEach(() => shell.cd('../'));

  after(() => shell.rm('-rf', '.tmp'));

  it('should be constructed', () => {
    expect(releaser).to.be.ok;
  });

  describe('No tag and no package.json are found', () => {
    let prompt;

    beforeEach(() => prompt = new PromptMock());

    it('should bump to minor (v0.1.0) if user continues', done => {
      prompt.setResponse('confirm', {message: 'No valid semver tags found, continue?'}, true);
      prompt.setResponse('confirm', {message: 'No tags are found. Create first tag?'}, true);

      releaser = makeNewReleaser({prompt});

      releaser.init().then(() => {
        expect(gitExec.isTagPresent('v0.1.0')).to.be.true;

        done();
      }).catch(err => done(err));
    });

    it('should abort if user cancels at no valid semver tags found prompt', done => {
      prompt.setResponse('confirm', {message: 'No valid semver tags found, continue?'}, false);

      releaser = makeNewReleaser({prompt});

      releaser.init().catch(err => {
        expect(err.message).to.equal(UserAbortedError.getMessage());

        done();
      });
    });

    it('should abort if user cancels at create first tag prompt', done => {
      prompt.setResponse('confirm', {message: 'No valid semver tags found, continue?'}, true);
      prompt.setResponse('confirm', {message: 'No tags are found. Create first tag?'}, false);

      releaser = makeNewReleaser({prompt});

      releaser.init().catch(err => {
        expect(err.message).to.equal(UserAbortedError.getMessage());

        done();
      });
    });
  });

  describe('invalid tag and no package.json are found', () => {
    let prompt;

    beforeEach(() => prompt = new PromptMock());

    xit('should ask user when tag is not present in repository', done => {
      gitExec.createTag('0.1.0');

      releaser = makeNewReleaser({prompt});

      releaser.init().then(() => {
        expect(gitExec.isTagPresent('v0.1.0')).to.be.true;

        done();
      }).catch(err => done(err));
    });
  });
});
