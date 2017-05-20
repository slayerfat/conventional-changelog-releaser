import * as shell from 'shelljs';
import {BumpFinderMock} from './mocks/BumpFinderMock';
import {CliBootstrapMock} from './mocks/MeowCLIMock';
import {ConfigMock} from './mocks/ConfigMock';
import {expect} from 'chai';
import {IBumpFinder} from '../src/bumpFinder/IBumpFinder';
import {ICliBootstrap} from '../src/cli/ICliBootstrap';
import {IConfig} from '../src/config/IConfig';
import {ILogger} from '../src/debug/ILogger';
import {IPrompt} from '../src/prompt/IPrompt';
import {ISemVer} from '../src/semver/ISemVer';
import {LoggerMock} from './mocks/LoggerMock';
import {PromptMock} from './mocks/PromptMock';
import {readPkgUp as TReadPkgUp} from '../src/others/types';
import {Releaser} from '../src/Releaser';
import {SemVer} from '../src/semver/SemVer';
import {writeFileSync} from 'fs';
import {GitExecutorSync} from '../src/exec/GitExecutorSync';

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
    shell.config.silent = true;
    shell.rm('-rf', '.tmp');
    shell.mkdir('.tmp');
    shell.cd('.tmp');
    shell.exec('git init');
    writeFileSync('test', '');
    shell.exec('git add --all && git commit -m "initial commit"');

    releaser = makeNewReleaser({});
  });

  afterEach(() => shell.cd('../'));

  after(() => shell.rm('-rf', '.tmp'));

  it('should be constructed', () => {
    expect(releaser).to.be.ok;
  });

  describe('No tag and no package.json are found', () => {
    it('should bump to v0.1.0 if user continues', done => {
      releaser.init().then(() => {
        expect(gitExec.isTagPresent('v0.1.0')).to.be.true;

        done();
      }).catch(err => done(err));
    });

    xit('should abort if user cancels', done => {
      releaser.init().then(() => {
        done();
      }).catch(err => done(err));
    });
  });
});
