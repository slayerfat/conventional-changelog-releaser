import * as shell from 'shelljs';
import {expect} from 'chai';
import {FileExecutor} from '../../src/exec/FileExecutor';
import {ChangelogNotFoundError} from '../../src/exceptions/ChangelogNotFoundError';
import {Changelog} from '../../src/changelog/Changelog';

// chai.expect shows as an unused expression
/* tslint:disable:no-unused-expression */

describe('Changelog', () => {
  let changelog: Changelog;
  const files = {
    destination: 'destination',
    target     : 'target',
  };

  shell.config.silent = false;

  beforeEach(() => {
    changelog = new Changelog(new FileExecutor());

    shell.mkdir('.tmp');
    shell.cd('.tmp');
    shell.touch(files.target);
  });

  afterEach(() => {
    shell.cd('../');
    shell.rm('-rf', '.tmp');
  });

  it('should be constructed', () => {
    expect(changelog).to.be.ok;
  });

  describe('backup', () => {
    it('should throw ChangelogNotFoundError if path not found', (done) => {
      changelog.backup()
        .then(() => done(new Error()))
        .catch(err => {
          expect(err.message).to.equal(ChangelogNotFoundError.getMessage());

          done();
        });
    });

    it('should find and copy changelog.md case-insensitive', (done) => {
      let originalPath = 'changelog.md';

      shell.touch(originalPath);

      changelog.backup()
        .then(() => {
          const path = `${changelog.getBackupPrefix()}.${originalPath}`;

          expect(shell.test('-e', path)).to.be.true;

          shell.rm([originalPath, path]);
          originalPath = 'Changelog.md';
          shell.touch(originalPath);

          return changelog.backup();
        })
        .then(() => {
          const path = `${changelog.getBackupPrefix()}.${originalPath}`;

          expect(shell.test('-e', path)).to.be.true;

          shell.rm([originalPath, path]);
          originalPath = 'CHANGELOG.md';
          shell.touch(originalPath);

          return changelog.backup();
        })
        .then(() => {
          const path = `${changelog.getBackupPrefix()}.${originalPath}`;

          expect(shell.test('-e', path)).to.be.true;

          done();
        })
        .catch(err => done(err));
    });
  });
});
