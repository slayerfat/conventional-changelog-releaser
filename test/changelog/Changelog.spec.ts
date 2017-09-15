import * as shell from 'shelljs';
import {expect} from 'chai';
import {FileExecutor} from '../../src/exec/FileExecutor';
import {ChangelogNotFoundError} from '../../src/exceptions/ChangelogNotFoundError';
import {Changelog} from '../../src/changelog/Changelog';
import {makeFreshGitDir} from '../helpers/makeFreshGitDir';

// chai.expect shows as an unused expression
/* tslint:disable:no-unused-expression */

describe('Changelog', () => {
  let changelog: Changelog;

  beforeEach(() => {
    changelog = new Changelog(new FileExecutor());

    makeFreshGitDir();
  });

  afterEach(() => {
    shell.cd('../');
    shell.rm('-rf', '.tmp');
  });

  context('constructor', () => it('should be constructed', () => expect(changelog).to.be.ok));

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

  describe('restore', () => {
    it('should throw ChangelogNotFoundError original not found', (done) => {
      shell.touch('changelog.md');

      changelog.restore()
        .then(() => done(new Error()))
        .catch(err => {
          expect(err.message).to.equal(Changelog.errors.backupNotFound);

          done();
        });
    });

    it('should restore the file and delete the backup afterwards', (done) => {
      const path         = 'changelog.md';
      const originalPath = 'original.changelog.md';

      shell.touch(path);

      changelog.backup()
        .then(() => changelog.restore())
        .then(() => {
          expect(shell.test('-e', path)).to.be.true;
          expect(shell.test('-e', originalPath)).to.be.false;

          done();
        })
        .catch(err => done(err));
    });
  });

  describe('update()', () => {
    it('should add new valid information to an existing changelog', (done) => {
      shell.touch('changelog.md');
      shell.exec('git add --all && git commit -m "feat(test): changelog added"');

      changelog.update().then(() => {
        const command = shell.cat('changelog.md') as any;
        expect(command.stdout).to.match(/changelog added/);
        expect(command.stdout).to.not.match(/Bug Fixes/);

        done();
      }).catch(err => done(err));
    });

    it('should allow different presets', (done) => {
      shell.touch('changelog.md');
      shell.exec('git add --all && git commit -m ":memo: Add changelog"');

      changelog.update({preset: 'atom'}).then(() => {
        const command = shell.cat('changelog.md') as any;
        expect(command.stdout).to.match(/Add changelog/);
        expect(command.stdout).to.not.match(/Features/);

        done();
      }).catch(err => done(err));
    });
  });
});
