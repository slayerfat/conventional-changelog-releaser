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
import {FileExecutor} from '../src/exec/FileExecutor';

// chai.expect shows as an unused expression
/* tslint:disable:no-unused-expression */

describe('Releaser CLI', () => {
  let releaser: Releaser;
  let prompt;
  const gitExec  = new GitExecutorSync();
  const messages = {
    noTag:      'No tags are found. Create first tag?',
    noValidTag: 'No valid semver tags found, continue?',
  };

  function makeNewPkgUpFunction(file?: IPkgUpResultObject) {
    return () => Promise.resolve(file || {} as IPkgUpResultObject);
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
    fPrompt?: IPrompt,
    semver?: ISemVer,
    pkgUp?: TReadPkgUp,
    fileExec?: FileExecutor,
  }) {
    let {cli, logger, config, bump, exec, fPrompt, semver, pkgUp, fileExec} = options;

    cli      = cli || new CliBootstrapMock();
    logger   = logger || new LoggerMock();
    config   = config || new ConfigMock();
    bump     = bump || new BumpFinderMock();
    fPrompt  = fPrompt || new PromptMock();
    pkgUp    = pkgUp || makeNewPkgUpFunction();
    fileExec = fileExec || new FileExecutor();

    // non-mocks
    exec   = exec || gitExec;
    semver = semver || new SemVer();

    return new Releaser(cli, logger, config, bump, exec, fPrompt, semver, pkgUp, fileExec);
  }

  beforeEach(() => {
    makeFreshGitDir();

    releaser = makeNewReleaser({});
    prompt   = new PromptMock();
  });

  afterEach(() => shell.cd('../'));

  after(() => shell.rm('-rf', '.tmp'));

  it('should be constructed', () => {
    expect(releaser).to.be.ok;
  });

  describe('case: no tag and no package.json', () => {
    it('should bump to minor (v0.1.0) if user continues', done => {
      prompt.setResponse('confirm', {message: messages.noValidTag}, true);
      prompt.setResponse('confirm', {message: messages.noTag}, true);

      releaser = makeNewReleaser({fPrompt: prompt});

      releaser.init().then(() => {
        expect(gitExec.isTagPresent('v0.1.0')).to.be.true;

        done();
      }).catch(err => done(err));
    });

    it('should abort if user cancels at "no valid semver tags found" prompt', done => {
      prompt.setResponse('confirm', {message: messages.noValidTag}, false);

      releaser = makeNewReleaser({fPrompt: prompt});

      releaser.init().catch(err => {
        expect(err.message).to.equal(UserAbortedError.getMessage());

        done();
      });
    });

    it('should abort if user cancels at "create first tag" prompt', done => {
      prompt.setResponse('confirm', {message: messages.noValidTag}, true);
      prompt.setResponse('confirm', {message: messages.noTag}, false);

      releaser = makeNewReleaser({fPrompt: prompt});

      releaser.init().catch(err => {
        expect(err.message).to.equal(UserAbortedError.getMessage());

        done();
      });
    });
  });

  describe('case: tag and no package.json', () => {
    it('should ask user about valid non-prefixed semver with prefix flag as true', done => {
      gitExec.createTag('0.1.0');
      prompt.setResponse('confirm', {message: messages.noValidTag}, true);
      // 0.1.0 since by default we start as a feature (minor) bump.
      const message = 'Tag v0.1.0 is not present in repository, continue?';
      prompt.setResponse('confirm', {message}, true);

      releaser = makeNewReleaser({fPrompt: prompt});

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

      releaser = makeNewReleaser({fPrompt: prompt, cli});

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
  });

  describe('case: no tag and package', () => {
    let pkgUp;
    let pkgMessage;

    beforeEach(() => {
      pkgUp      = makeNewPkgUpFunction(makeNewPkgUpFileObject({version: '3.0.0'}));
      pkgMessage = `Package.json found in ${shell.pwd().toString()}, is this file correct?`;
    });

    describe('package.json found prompt', () => {
      it('should prompt user about file discovery', (done) => {
        prompt.setResponse('list', {message: pkgMessage}, 'Yes');
        // this should be ignored
        prompt.setResponse('confirm', {message: messages.noTag}, false);

        releaser = makeNewReleaser({fPrompt: prompt, pkgUp});

        releaser.init().then(() => {
          expect(gitExec.isTagPresent('v3.0.0')).to.be.true;

          done();
        }).catch(err => done(err));
      });

      it('should prompt user about file discovery and continue "no" option selected', (done) => {
        prompt.setResponse('list', {message: pkgMessage}, 'No');
        prompt.setResponse('confirm', {message: messages.noValidTag}, false);

        releaser = makeNewReleaser({fPrompt: prompt, pkgUp});

        releaser.init().catch(err => {
          expect(err.message).to.equal(UserAbortedError.getMessage());

          done();
        });
      });

      it('should allow user to abort in file discovery', (done) => {
        prompt.setResponse('list', {message: pkgMessage}, 'Abort');
        // this should be ignored
        prompt.setResponse('confirm', {message: messages.noValidTag}, true);

        releaser = makeNewReleaser({fPrompt: prompt, pkgUp});

        releaser.init().catch(err => {
          expect(err.message).to.equal(UserAbortedError.getMessage());

          done();
        });
      });
    });

    it('should bump to current package.json version', (done) => {
      prompt.setResponse('list', {message: pkgMessage}, 'Yes');

      const pkgUp2  = makeNewPkgUpFunction(makeNewPkgUpFileObject({version: '5.1.0'}));
      const prompt2 = new PromptMock();
      prompt2.setResponse('list', {message: pkgMessage}, 'Yes');
      prompt2.setResponse(
        'confirm',
        {message: 'Tag v5.1.0 is not present in repository, continue?'},
        true,
      );

      const pkgUp3  = makeNewPkgUpFunction(makeNewPkgUpFileObject({version: '9.2.3'}));
      const prompt3 = new PromptMock();
      prompt3.setResponse('list', {message: pkgMessage}, 'Yes');
      prompt3.setResponse(
        'confirm',
        {message: 'Tag v9.2.3 is not present in repository, continue?'},
        true,
      );

      releaser        = makeNewReleaser({fPrompt: prompt, pkgUp});
      const releaser2 = makeNewReleaser({fPrompt: prompt2, pkgUp: pkgUp2});
      const releaser3 = makeNewReleaser({fPrompt: prompt3, pkgUp: pkgUp3});

      expect(gitExec.isTagPresent('v3.0.0')).to.be.false;

      releaser.init()
        .then(() => {
          expect(gitExec.isTagPresent('v3.0.0')).to.be.true;

          shell.exec('touch something && git add --all && git commit -m "a commit"');
          expect(gitExec.isTagPresent('v3.1.0')).to.be.false;
          expect(gitExec.isTagPresent('v5.1.0')).to.be.false;

          return releaser2.init();
        })
        .then(() => {
          expect(gitExec.isTagPresent('v3.1.0')).to.be.false;
          expect(gitExec.isTagPresent('v5.1.0')).to.be.true;
          expect(gitExec.isTagPresent('v9.2.3')).to.be.false;
          shell.exec('touch file && git add --all && git commit -m "another commit"');

          return releaser3.init();
        })
        .then(() => expect(gitExec.isTagPresent('v9.2.3')).to.be.true)
        .then(() => done())
        .catch(err => done(err));
    });
  });

  describe('case: tag and package', () => {
    let pkgUp;
    let pkgMessage;

    beforeEach(() => {
      pkgUp      = makeNewPkgUpFunction(makeNewPkgUpFileObject({version: '15.0.0'}));
      pkgMessage = `Package.json found in ${shell.pwd().toString()}, is this file correct?`;

      prompt.setResponse(
        'confirm',
        {message: 'Tag v15.0.0 is not present in repository, continue?'},
        true,
      );
    });

    it('should abort if no new commits present since last valid semver tag', (done) => {
      prompt.setResponse('list', {message: pkgMessage}, 'Yes');
      gitExec.createTag('1.0.0');
      gitExec.createTag('v1.0.0');
      gitExec.createTag('something');
      gitExec.createTag('v.1something');

      releaser = makeNewReleaser({fPrompt: prompt, pkgUp});

      releaser.init()
        .then(() => done('Should abort to noNewCommit error'))
        .catch(err => {
          expect(err.message).to.equal(Releaser.errors.noNewCommit);

          done();
        });
    });

    it('should bump to current package.json version', (done) => {
      prompt.setResponse('list', {message: pkgMessage}, 'Yes');
      gitExec.createTag('1.0.0');
      gitExec.createTag('v1.0.0');
      gitExec.createTag('something');
      gitExec.createTag('v.1something');

      shell.exec('touch file && git add --all && git commit -m "a commit"');

      releaser = makeNewReleaser({fPrompt: prompt, pkgUp});

      releaser.init()
        .then(() => {
          expect(gitExec.isTagPresent('v1.1.0')).to.be.false;
          expect(gitExec.isTagPresent('v2.0.0')).to.be.false;
          expect(gitExec.isTagPresent('v15.0.0')).to.be.true;

          done();
        })
        .catch(err => done(err));
    });
  });
});
