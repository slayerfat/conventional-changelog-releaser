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

describe('Releaser CLI', () => {
  let releaser: Releaser;

  const readPkgUp: TReadPkgUp = (options) => {
    throw new Error('readPkgUp must be implemented');
  };

  function makeReleaser({
    cli = new CliBootstrapMock(),
    logger = new LoggerMock(),
    config = new ConfigMock(),
    bump = new BumpFinderMock(),
    exec = new ExecutorMock(),
    prompt = new PromptMock(),
    pkgUp = readPkgUp,
    semver = new SemVerMock(),
  }) {
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

    releaser = makeReleaser({});
  });

  afterEach(() => shell.cd('../'));

  after(() => shell.rm('-rf', '.tmp'));

  it('should be constructed', () => {
    expect(releaser).to.be.ok;
  });

  xit('should bump to v0.0.1 if no package.json or tag is found', done => {
    releaser = makeReleaser({});
    releaser.init().then(() => {
      done();
    }).catch(err => done(err));
  });
});
