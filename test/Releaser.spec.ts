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
import {Changelog} from '../src/changelog/Changelog';
import {ChangelogNotFoundError} from '../src/exceptions/ChangelogNotFoundError';

// chai.expect shows as an unused expression
// tslint:disable:no-unused-expression

describe('Releaser CLI', function() {
  this.slow(10000);
  let releaser: Releaser;
  let prompt: PromptMock;

  const gitExec = new GitExecutorSync();

  const loggingLogger = new LoggerMock();
  loggingLogger.setShouldLog(true);

  const pkgJsonPath = shell.pwd().toString().concat('/.tmp/package.json');

  const messages = {
    branch:     'Is this repo using a develop branch?',
    branchName: 'Whats the develop branch name? [develop]',
    bumpType:   'What type of increment do you want?',
    noTag:      'No tags are found. Create first tag?',
    noValidTag: 'No valid semver tags found, continue?',
    pkgMsg:     `Package.json found in ${pkgJsonPath}, is this file correct?`,
  };

  function makeNewPkgUpFunction(file?: IPkgUpResultObject) {
    return () => Promise.resolve(file || {} as IPkgUpResultObject);
  }

  function makeNewPkgUpFileObject(
    pkg    = {version: '1.0.0'},
    create = false,
    path   = pkgJsonPath,
  ): IPkgUpResultObject {
    if (create === true) {
      shell.touch(path);
    }

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
    changelog?: Changelog,
  }) {
    let {cli, logger, config, bump, exec, fPrompt, semver, pkgUp, changelog} = options;

    cli       = cli || new CliBootstrapMock();
    logger    = logger || new LoggerMock();
    config    = config || new ConfigMock();
    bump      = bump || new BumpFinderMock();
    fPrompt   = fPrompt || new PromptMock();
    pkgUp     = pkgUp || makeNewPkgUpFunction();
    changelog = changelog || new Changelog(new FileExecutor());

    // non-mocks
    exec   = exec || gitExec;
    semver = semver || new SemVer();

    return new Releaser(cli, logger, config, bump, exec, fPrompt, semver, pkgUp, changelog);
  }

  beforeEach(() => {
    makeFreshGitDir();
    shell.touch('changelog.md');

    releaser = makeNewReleaser({});
    prompt   = new PromptMock();
  });

  afterEach(() => shell.cd('../'));

  after(() => shell.rm('-rf', '.tmp'));

  it('should be constructed', () => {
    expect(releaser).to.be.ok;
  });

  context('No tag and no package.json present', () => {
    beforeEach(() => {
      prompt.setResponse('list', {message: messages.bumpType}, 'automatic');
      prompt.setResponse('confirm', {message: messages.branch}, false);
    });

    it('should bump to minor (v0.1.0) if user continues', done => {
      prompt.setResponse('confirm', {message: messages.noValidTag}, true);
      prompt.setResponse('confirm', {message: messages.noTag}, true);

      releaser = makeNewReleaser({fPrompt: prompt});

      releaser.init().then(() => {
        expect(gitExec.isTagPresent('v0.1.0')).to.be.true;
        expect(() => prompt.checkResponses()).to.not.throw();

        done();
      }).catch(err => done(err));
    });

    it('should abort if user cancels at "no valid semver tags found" prompt', done => {
      prompt.setResponse('confirm', {message: messages.noValidTag}, false);

      releaser = makeNewReleaser({fPrompt: prompt});

      releaser.init().catch(err => {
        expect(err.message).to.equal(UserAbortedError.getMessage());

        expect(() => prompt.checkResponses()).to.not.throw();

        done();
      });
    });

    it('should abort if user cancels at "create first tag" prompt', done => {
      prompt.setResponse('confirm', {message: messages.noValidTag}, true);
      prompt.setResponse('confirm', {message: messages.noTag}, false);

      releaser = makeNewReleaser({fPrompt: prompt});

      releaser.init().catch(err => {
        expect(err.message).to.equal(UserAbortedError.getMessage());

        expect(() => prompt.checkResponses()).to.not.throw();

        done();
      });
    });
  });

  context('Tag and no package.json present', () => {
    beforeEach(() => {
      prompt.setResponse('list', {message: messages.bumpType}, 'automatic');
      prompt.setResponse('confirm', {message: messages.branch}, false);
    });

    it('should ask user about valid non-prefixed semver with prefix flag as true', done => {
      gitExec.createTag('0.1.0');

      // 0.1.0 since by default we start as a feature (minor) bump.
      const message = 'Tag v0.1.0 is not present in repository, continue?';
      prompt.setResponse('confirm', {message}, true);

      releaser = makeNewReleaser({fPrompt: prompt});

      releaser.init().then(() => {
        expect(gitExec.isTagPresent('v0.1.0')).to.be.true;

        expect(() => prompt.checkResponses()).to.not.throw();

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
        expect(() => prompt.checkResponses()).to.not.throw();

        done();
      }).catch(err => done(err));
    });

    it('should read release flag before auto-bump', done => {
      prompt.setResponse('confirm', {message: messages.noValidTag}, true);
      prompt.setResponse('confirm', {message: messages.noTag}, true);
      prompt.setResponse('confirm', {message: 'messages.noTag'}, true);

      const cli = new CliBootstrapMock();
      cli.setFlag('release', 'major');

      releaser = makeNewReleaser({fPrompt: prompt, cli});

      releaser.init().then(() => {
        expect(gitExec.isTagPresent('v1.0.0')).to.be.true;
        expect(() => prompt.checkResponses()).to.throw(/What type of increment do you want/);

        done();
      }).catch(err => done(err));
    });

    it('should bump with suffix if identifier is set', done => {
      prompt.setResponse('confirm', {message: messages.noValidTag}, true);
      prompt.setResponse('confirm', {message: messages.noTag}, true);

      const cli = new CliBootstrapMock();
      cli.setFlag('identifier', 'omega');
      cli.setFlag('release', 'preminor');

      releaser = makeNewReleaser({fPrompt: prompt, cli});

      releaser.init().then(() => {
        expect(gitExec.isTagPresent('v0.1.0-omega.0')).to.be.true;
        expect(() => prompt.checkResponses()).to.throw(/What type of increment do you want/);

        done();
      }).catch(err => done(err));
    });

    it('should throw no new commits when prefix is set to false with valid tag', done => {
      gitExec.createTag('0.1.0');

      const cli = new CliBootstrapMock();
      cli.setFlag('prefix', false);

      releaser = makeNewReleaser({fPrompt: prompt, cli});

      releaser.init().catch(err => {
        expect(err.message).to.equal(Releaser.errors.noNewCommit);
        expect(() => prompt.checkResponses()).to.not.throw();

        done();
      });
    });
  });

  context('No tag but package.json is present', () => {
    let pkgUp;

    beforeEach(() => {
      pkgUp = makeNewPkgUpFunction(makeNewPkgUpFileObject({version: '3.0.0'}));

      prompt.setResponse('confirm', {message: messages.branch}, false);
      prompt.setResponse('list', {message: messages.bumpType}, 'automatic');
    });

    describe('package.json found prompt', () => {
      it('should prompt user about file discovery', (done) => {
        prompt.setResponse('list', {message: messages.pkgMsg}, 'Yes');
        releaser = makeNewReleaser({fPrompt: prompt, pkgUp});

        releaser.init().then(() => {
          expect(gitExec.isTagPresent('v3.1.0')).to.be.true;
          expect(() => prompt.checkResponses()).to.not.throw();

          done();
        }).catch(err => done(err));
      });

      it('should prompt user about file discovery and continue "no" option selected', (done) => {
        prompt.setResponse('list', {message: messages.pkgMsg}, 'No');
        prompt.setResponse('confirm', {message: messages.noValidTag}, false);

        releaser = makeNewReleaser({fPrompt: prompt, pkgUp});

        releaser.init().catch(err => {
          expect(err.message).to.equal(UserAbortedError.getMessage());
          expect(() => prompt.checkResponses()).to.not.throw();

          done();
        });
      });

      it('should allow user to abort in file discovery', (done) => {
        prompt.setResponse('list', {message: messages.pkgMsg}, 'Abort');

        releaser = makeNewReleaser({fPrompt: prompt, pkgUp});

        releaser.init().catch(err => {
          expect(err.message).to.equal(UserAbortedError.getMessage());
          expect(() => prompt.checkResponses()).to.throw(/Is this repo using a develop branch/);

          done();
        });
      });
    });

    it('should bump to current package.json version', (done) => {
      prompt.setResponse('list', {message: messages.pkgMsg}, 'Yes');

      pkgUp         = makeNewPkgUpFunction(makeNewPkgUpFileObject({version: '3.0.0'}, true));
      const file    = makeNewPkgUpFileObject({version: '5.1.0'}, true);
      const pkgUp2  = makeNewPkgUpFunction(file);
      const prompt2 = new PromptMock();

      prompt2.setResponse('list', {message: messages.pkgMsg}, 'Yes');
      prompt2.setResponse('list', {message: messages.bumpType}, 'automatic');
      prompt2.setResponse('confirm', {message: messages.branch}, false);
      prompt2.setResponse(
        'confirm',
        {message: 'Tag v5.1.0 is not present in repository, continue?'},
        true,
      );

      const pkgUp3  = makeNewPkgUpFunction(makeNewPkgUpFileObject({version: '9.2.3'}, true));
      const prompt3 = new PromptMock();
      prompt3.setResponse('list', {message: messages.pkgMsg}, 'Yes');
      prompt3.setResponse('confirm', {message: messages.branch}, false);
      prompt3.setResponse('list', {message: messages.bumpType}, 'automatic');
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
          expect(gitExec.isTagPresent('v3.1.0')).to.be.true;

          shell.exec('touch something && git add --all && git commit -m "a commit"');

          expect(gitExec.isTagPresent('v5.1.0')).to.be.false;
          expect(gitExec.isTagPresent('v5.2.0')).to.be.false;
          expect(() => prompt.checkResponses()).to.not.throw();

          return releaser2.init();
        })
        .then(() => {
          expect(gitExec.isTagPresent('v3.2.0')).to.be.false;
          expect(gitExec.isTagPresent('v5.2.0')).to.be.true;
          expect(gitExec.isTagPresent('v9.2.3')).to.be.false;
          expect(() => prompt2.checkResponses()).to.not.throw();

          shell.exec('touch file && git add --all && git commit -m "another commit"');

          return releaser3.init();
        })
        .then(() => {
          expect(gitExec.isTagPresent('v9.3.0')).to.be.true;
          expect(() => prompt3.checkResponses()).to.not.throw();
        })
        .then(() => done())
        .catch(err => done(err));
    });

    it('should update package.json version', (done) => {
      prompt.setResponse('list', {message: messages.pkgMsg}, 'Yes');

      pkgUp    = makeNewPkgUpFunction(makeNewPkgUpFileObject({version: '87.0.0'}, true));
      releaser = makeNewReleaser({fPrompt: prompt, pkgUp});

      expect(gitExec.isTagPresent('v87.1.0')).to.be.false;

      const fileExecutor = new FileExecutor();

      releaser.init()
        .then(() => fileExecutor.read('package.json'))
        .then(file => JSON.parse(file))
        .then(file => {
          expect(gitExec.isTagPresent('v87.1.0')).to.be.true;
          expect(file.version).to.be.equal('87.1.0');

          shell.exec('touch something && git add --all && git commit -m "a commit"');

          expect(gitExec.isTagPresent('v5.1.0')).to.be.false;
          expect(gitExec.isTagPresent('v5.2.0')).to.be.false;
          expect(() => prompt.checkResponses()).to.not.throw();

          done();
        })
        .catch(err => done(err));
    });
  });

  context('Tag and package present', () => {
    let pkgUp;

    beforeEach(() => {
      pkgUp = makeNewPkgUpFunction(makeNewPkgUpFileObject({version: '15.0.0'}));

      prompt.setResponse('list', {message: messages.pkgMsg}, 'Yes');
      prompt.setResponse('confirm', {message: messages.branch}, false);
      prompt.setResponse('list', {message: messages.bumpType}, 'automatic');
    });

    it('should abort if no new commits present since last valid semver tag', (done) => {
      prompt.setResponse(
        'confirm',
        {message: 'Tag v15.0.0 is not present in repository, continue?'},
        true,
      );

      gitExec.createTag('1.0.0');
      gitExec.createTag('v1.0.0');
      gitExec.createTag('something');
      gitExec.createTag('v.1something');

      releaser = makeNewReleaser({fPrompt: prompt, pkgUp});

      releaser.init()
        .then(() => done('Should abort to noNewCommit error'))
        .catch(err => {
          expect(err.message).to.equal(Releaser.errors.noNewCommit);
          expect(() => prompt.checkResponses()).to.not.throw();

          done();
        });
    });

    it('should bump to current package.json version', (done) => {
      gitExec.createTag('1.0.0');
      gitExec.createTag('v1.0.0');
      gitExec.createTag('something');
      gitExec.createTag('v.1something');

      prompt.setResponse(
        'confirm',
        {message: 'Tag v15.0.0 is not present in repository, continue?'},
        true,
      );

      shell.exec('touch file && git add --all && git commit -m "a commit"');

      releaser = makeNewReleaser({fPrompt: prompt, pkgUp});

      releaser.init()
        .then(() => {
          expect(gitExec.isTagPresent('v1.1.0')).to.be.false;
          expect(gitExec.isTagPresent('v2.0.0')).to.be.false;
          expect(gitExec.isTagPresent('v15.1.0')).to.be.true;
          expect(() => prompt.checkResponses()).to.not.throw();

          done();
        })
        .catch(err => done(err));
    });

    describe('package.json operations', () => {
      let cli;
      let fileExec;

      beforeEach(() => {
        cli      = new CliBootstrapMock();
        fileExec = new FileExecutor();

        shell.touch('package.json');
      });

      it('should update the version as default', done => {
        cli.setFlag('pkg-version', true);

        releaser = makeNewReleaser({fPrompt: prompt, cli, pkgUp});

        const pkgData = JSON.stringify({version: '0.0.0'});

        fileExec.write('package.json', pkgData)
          .then(() => releaser.init())
          .then(() => fileExec.read('package.json'))
          .then(data => JSON.parse(data))
          .then((file) => {
            expect(gitExec.isAnyTagPresent()).to.be.true;
            expect(gitExec.isTagPresent('v15.1.0')).to.be.true;
            expect(file).to.not.be.undefined;
            expect(file.version).to.equal('15.1.0');
            expect(() => prompt.checkResponses()).to.not.throw();

            done();
          }).catch(err => done(err));
      });

      it('should not alter file if flag set to false', done => {
        cli.setFlag('pkg-version', false);

        releaser = makeNewReleaser({fPrompt: prompt, cli, pkgUp});

        const pkgData = JSON.stringify({version: '99.99.77'});

        fileExec.write('package.json', pkgData)
          .then(() => releaser.init())
          .then(() => fileExec.read('package.json'))
          .then(data => JSON.parse(data))
          .then((file) => {
            expect(gitExec.isAnyTagPresent()).to.be.true;
            expect(gitExec.isTagPresent('v15.1.0')).to.be.true;
            expect(file).to.not.be.undefined;
            expect(file.version).to.equal('99.99.77');
            expect(() => prompt.checkResponses()).to.not.throw();

            done();
          }).catch(err => done(err));
      });
    });
  });

  describe('changelog related operations', () => {
    let cli: CliBootstrapMock;

    beforeEach(() => {
      cli = new CliBootstrapMock();
      cli.setFlag('log', true);

      prompt.setResponse('confirm', {message: messages.branch}, false);
      prompt.setResponse('list', {message: messages.bumpType}, 'automatic');
    });

    it('should throw error and abort if no changelog is found', (done) => {
      shell.rm('changelog.md');
      prompt.setResponse('confirm', {message: messages.noValidTag}, true);
      prompt.setResponse('confirm', {message: messages.noTag}, true);

      releaser = makeNewReleaser({fPrompt: prompt, cli});

      releaser.init()
        .then(() => done(new Error()))
        .catch(err => {
          expect(err.message).to.equal(ChangelogNotFoundError.getMessage());
          expect(gitExec.isAnyTagPresent()).to.be.false;
          expect(() => prompt.checkResponses()).to.not.throw();

          done();
        });
    });

    it('should not abort if log flag is false', (done) => {
      shell.rm('changelog.md');
      prompt.setResponse('confirm', {message: messages.noValidTag}, true);
      prompt.setResponse('confirm', {message: messages.noTag}, true);

      cli.setFlag('log', false);

      releaser = makeNewReleaser({fPrompt: prompt, cli});

      releaser.init()
        .then(() => {
          expect(() => prompt.checkResponses()).to.not.throw();
          done();
        })
        .catch(err => done(err));
    });

    it('should update the changelog on bump', (done) => {
      shell.touch('file');
      shell.exec('git add --all && git commit -m "feat(test): file added"');

      prompt.setResponse('confirm', {message: messages.noValidTag}, true);
      prompt.setResponse('confirm', {message: messages.noTag}, true);

      releaser = makeNewReleaser({fPrompt: prompt, cli});

      releaser.init().then(() => {
        const command = shell.cat('changelog.md') as any;
        expect(command.stdout).to.match(/file added/);
        expect(() => prompt.checkResponses()).to.not.throw();

        done();
      }).catch(err => done(err));
    });

    it('should not delete previous data on changelog file', (done) => {
      prompt.setResponse('confirm', {message: messages.noValidTag}, true);
      prompt.setResponse('confirm', {message: messages.noTag}, true);

      releaser = makeNewReleaser({fPrompt: prompt, cli});

      new FileExecutor().write('changelog.md', 'VALID DATA\n')
        .then(() => shell.exec('git add --all && git commit -m "feat(changelog): added info"'))
        .then(() => releaser.init())
        .then(() => {
          const command = shell.cat('changelog.md') as any;
          expect(command.stdout).to.match(/VALID DATA/);
          expect(command.stdout).to.match(/added info/);
          expect(() => prompt.checkResponses()).to.not.throw();

          done();
        }).catch(err => done(err));
    });

    it('should discard previous data on changelog file if flag is set', (done) => {
      prompt.setResponse('confirm', {message: messages.noValidTag}, true);
      prompt.setResponse('confirm', {message: messages.noTag}, true);

      cli.setFlag('log-append', false);

      releaser = makeNewReleaser({fPrompt: prompt, cli});

      new FileExecutor().write('changelog.md', 'VALID DATA')
        .then(() => shell.exec('git add --all && git commit -m "feat(changelog): added info"'))
        .then(() => releaser.init())
        .then(() => {
          const command = shell.cat('changelog.md') as any;
          expect(command.stdout).to.not.match(/VALID DATA/);
          expect(command.stdout).to.match(/added info/);
          expect(() => prompt.checkResponses()).to.not.throw();

          done();
        }).catch(err => done(err));
    });

    it('should update changelog file in another preset convention', (done) => {
      shell.exec('git add --all && git commit -m ":memo: Add changelog"');

      prompt.setResponse('confirm', {message: messages.noValidTag}, true);
      prompt.setResponse('confirm', {message: messages.noTag}, true);

      cli.setFlag('log-preset', 'atom');

      releaser = makeNewReleaser({fPrompt: prompt, cli});

      releaser.init()
        .then(() => {
          const command = shell.cat('changelog.md') as any;
          expect(command.stdout).to.match(/:memo: Add changelog/);
          expect(command.stdout).to.not.match(/Features/);
          expect(() => prompt.checkResponses()).to.not.throw();

          done();
        }).catch(err => done(err));
    });
  });

  describe('commit related operations', () => {
    let cli;

    beforeEach(() => {
      cli = new CliBootstrapMock();
      cli.setFlag('log', true);
      cli.setFlag('commit', true);

      shell.touch('file');
      shell.exec('git add --all && git commit -m "feat(test): file added"');

      prompt.setResponse('confirm', {message: messages.noValidTag}, true);
      prompt.setResponse('confirm', {message: messages.noTag}, true);
      prompt.setResponse('confirm', {message: messages.branch}, false);
      prompt.setResponse('list', {message: messages.bumpType}, 'automatic');
    });

    it('should commit on bump as default', done => {
      releaser = makeNewReleaser({fPrompt: prompt, cli});

      releaser.init().then(() => {
        expect(shell.cat('changelog.md').toString().length).to.be.greaterThan(0);
        expect(gitExec.isAnyTagPresent()).to.be.true;
        expect(gitExec.isTagPresent('v0.1.0')).to.be.true;
        expect(shell.test('-e', 'original.changelog.md')).to.be.false;
        expect(() => prompt.checkResponses()).to.not.throw();

        done();
      }).catch(err => done(err));
    });

    it('should alter but not commit', done => {
      cli.setFlag('commit', false);

      releaser = makeNewReleaser({fPrompt: prompt, cli});

      releaser.init().then(() => {
        expect(shell.cat('changelog.md').toString().length).to.be.greaterThan(0);
        expect(gitExec.isAnyTagPresent()).to.be.false;
        expect(shell.test('-e', 'original.changelog.md')).to.be.false;
        expect(() => prompt.checkResponses()).to.not.throw();

        done();
      }).catch(err => done(err));
    });
  });

  describe('configuration related operations', () => {
    beforeEach(() => {
      prompt.setResponse('confirm', {message: messages.noValidTag}, true);
      prompt.setResponse('confirm', {message: messages.noTag}, true);
    });

    it('should not prompt user if already configured', done => {
      const config = new ConfigMock();
      config.setConfigured(true);

      const cli = new CliBootstrapMock();
      cli.setReleaseType('automatic');

      releaser = makeNewReleaser({config, fPrompt: prompt, cli});

      releaser.init()
        .then(() => {
          expect(gitExec.isAnyTagPresent()).to.be.true;
          expect(() => prompt.checkResponses()).to.not.throw();

          done();
        })
        .catch(err => done(err));
    });

    it('should ask for bump type even if already configured', done => {
      prompt.setResponse('list', {message: messages.bumpType}, 'automatic');
      const config = new ConfigMock();
      config.setConfigured(true);

      releaser = makeNewReleaser({config, fPrompt: prompt});

      releaser.init()
        .then(() => {
          expect(gitExec.isAnyTagPresent()).to.be.true;
          expect(() => prompt.checkResponses()).to.not.throw();

          done();
        })
        .catch(err => done(err));
    });

    it('should ask the user for the develop branch name at start', done => {
      prompt.setResponse('confirm', {message: messages.branch}, true);
      prompt.setResponse('input', {message: messages.branchName}, 'test');
      prompt.setResponse('list', {message: messages.bumpType}, 'automatic');

      shell.exec('git checkout -b test');

      releaser = makeNewReleaser({fPrompt: prompt});

      releaser.init()
        .then(() => {
          expect(gitExec.isAnyTagPresent()).to.be.true;
          expect(gitExec.getCurrentBranchName()).to.equal('test');
          expect(gitExec.isTagPresent('v0.1.0-0')).to.be.true;
          expect(() => prompt.checkResponses()).to.not.throw();

          done();
        })
        .catch(err => done(err));
    });

    it('should ask the user for the bump type', done => {
      prompt.setResponse('confirm', {message: messages.branch}, false);
      prompt.setResponse('list', {message: messages.bumpType}, 'major');

      releaser = makeNewReleaser({fPrompt: prompt});

      releaser.init()
        .then(() => {
          expect(gitExec.isTagPresent('v1.0.0')).to.be.true;
          expect(() => prompt.checkResponses()).to.not.throw();

          done();
        })
        .catch(err => done(err));
    });
  });
});
