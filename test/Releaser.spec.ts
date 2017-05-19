import {expect} from 'chai';
import * as shell from 'shelljs';
import {writeFileSync} from 'fs';
import {Releaser} from '../src/Releaser';
import {LoggerMock} from './mocks/LoggerMock';
import {ConfigMock} from './mocks/ConfigMock';
import {BumpFinderMock} from './mocks/BumpFinderMock';
import {ExecutorMock} from './mocks/ExecutorMock';
import {PromptMock} from './mocks/PromptMock';
import {CliBootstrapMock} from './mocks/MeowCLIMock';
import {SemVerMock} from './mocks/SemVerMock';
import {readPkgUp as TReadPkgUp} from '../src/others/types';
import {ChildProcessPromiseExecutor} from '../src/exec/ChildProcessPromiseExecutor';
import {ICliBootstrap} from '../src/cli/ICliBootstrap';
import {ILogger} from '../src/debug/ILogger';
import {IConfig} from '../src/config/IConfig';
import {IBumpFinder} from '../src/bumpFinder/IBumpFinder';
import {IExecutor} from '../src/exec/IExecutor';
import {IPrompt} from '../src/prompt/IPrompt';
import {ISemVer} from '../src/semver/ISemVer';

describe('Releaser CLI', () => {
  let releaser: Releaser;

  function makeNewPkgUpFunction(file?: any) {
    return (options) => {
      return Promise.resolve(file || {});
    };
  }

  function makeNewReleaser(options?: {
    cli?: ICliBootstrap,
    logger?: ILogger,
    config?: IConfig,
    bump?: IBumpFinder,
    exec?: IExecutor,
    prompt?: IPrompt,
    semver?: ISemVer,
    pkgUp?: TReadPkgUp,
  }) {
    let {cli, logger, config, bump, exec, prompt, semver, pkgUp} = options;

    cli    = cli || new CliBootstrapMock();
    logger = logger || new LoggerMock();
    config = config || new ConfigMock();
    bump   = bump || new BumpFinderMock();
    exec   = exec || new ExecutorMock();
    prompt = prompt || new PromptMock();
    semver = semver || new SemVerMock();
    pkgUp  = pkgUp || makeNewPkgUpFunction();

    return new Releaser(cli, logger, config, bump, exec, prompt, semver, pkgUp);
  }

  beforeEach(() => {
    // shell.config.silent = true;
    shell.rm('-rf', '.tmp');
    shell.mkdir('.tmp');
    shell.cd('.tmp');
    shell.exec('git init');
    writeFileSync('test', '');
    shell.exec('git add --all && git commit -m "initial commit"');

    releaser = makeNewReleaser({exec: new ChildProcessPromiseExecutor()});
  });

  afterEach(() => shell.cd('../'));

  after(() => shell.rm('-rf', '.tmp'));

  it('should be constructed', () => {
    expect(releaser).to.be.ok;
  });

  it('should bump to v0.0.1 if no package.json or tag is found', done => {
    releaser.init().then(() => {
      done();
    }).catch(err => done(err));
  });
});
