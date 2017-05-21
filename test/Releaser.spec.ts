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
import {IPkgUpResultObject} from '../src/config/IPkgResultObject';

// chai.expect shows as an unused expression
/* tslint:disable:no-unused-expression */

describe('Releaser CLI', () => {
  let releaser: Releaser;
  const gitExec = new GitExecutorSync();

  function makeNewPkgUpFunction(file?: IPkgUpResultObject) {
    return () => Promise.resolve(file || {});
  }

  function makeNewPkgUpFileObject(
    pkg  = {version: '1.0.0'},
    path = shell.pwd().toString(),
  ): IPkgUpResultObject {
    return {length: 1, path, pkg};
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

  describe('No tag and no package.json', () => {
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

    it('should abort if user cancels at "no valid semver tags found" prompt', done => {
      prompt.setResponse('confirm', {message: 'No valid semver tags found, continue?'}, false);

      releaser = makeNewReleaser({prompt});

      releaser.init().catch(err => {
        expect(err.message).to.equal(UserAbortedError.getMessage());

        done();
      });
    });

    it('should abort if user cancels at "create first tag" prompt', done => {
      prompt.setResponse('confirm', {message: 'No valid semver tags found, continue?'}, true);
      prompt.setResponse('confirm', {message: 'No tags are found. Create first tag?'}, false);

      releaser = makeNewReleaser({prompt});

      releaser.init().catch(err => {
        expect(err.message).to.equal(UserAbortedError.getMessage());

        done();
      });
    });
  });

  describe('invalid tag', () => {
    let prompt;

    beforeEach(() => prompt = new PromptMock());

    it('should ask user about valid non-prefixed semver with prefix flag as true', done => {
      gitExec.createTag('0.1.0');
      prompt.setResponse('confirm', {message: 'No valid semver tags found, continue?'}, true);
      // 0.1.0 since by default we start as a feature (minor) bump.
      const message = 'Tag v0.1.0 is not present in repository, continue?';
      prompt.setResponse('confirm', {message}, true);

      releaser = makeNewReleaser({prompt});

      releaser.init().then(() => {
        expect(gitExec.isTagPresent('v0.1.0')).to.be.true;

        done();
      }).catch(err => done(err));
    });

    it('should ask user about valid prefixed semver with prefix flag as false', done => {
      gitExec.createTag('v0.1.0');

      const cli = new CliBootstrapMock();
      cli.setFlag('prefix', false);

      // 0.1.0 since by default we start as a feature (minor) bump.
      const message = 'Tag 0.1.0 is not present in repository, continue?';
      prompt.setResponse('confirm', {message}, true);

      releaser = makeNewReleaser({prompt, cli});

      releaser.init().then(() => {
        expect(gitExec.isTagPresent('v0.1.0')).to.be.true;

        done();
      }).catch(err => done(err));
    });

    it('should throw no new commits when prefix is set to false with valid tag', done => {
      gitExec.createTag('0.1.0');

      const cli = new CliBootstrapMock();
      cli.setFlag('prefix', false);

      releaser = makeNewReleaser({cli});

      releaser.init().catch(err => {
        expect(err.message).to.equal(Releaser.errors.noNewCommit);

        done();
      });
    });

    xit('should check package.json first', done => {
      gitExec.createTag('invalid-tag');

      const pkgUp = makeNewPkgUpFunction(makeNewPkgUpFileObject());

      releaser = makeNewReleaser({prompt, pkgUp});

      releaser.init().then(() => {
        expect(gitExec.isTagPresent('v0.1.0')).to.be.true;

        done();
      }).catch(err => done(err));
    });
  });
});
