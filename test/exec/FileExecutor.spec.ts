import * as shell from 'shelljs';
import {expect} from 'chai';
import {FileExecutor} from '../../src/exec/FileExecutor';
import {ChangelogNotFoundError} from '../../src/exceptions/ChangelogNotFoundError';

// chai.expect shows as an unused expression
/* tslint:disable:no-unused-expression */

describe('FileExecutor', () => {
  let exec: FileExecutor;
  const files = {
    destination: 'destination',
    target     : 'target',
  };

  shell.config.silent = false;

  beforeEach(() => {
    exec = new FileExecutor();

    shell.mkdir('.tmp');
    shell.cd('.tmp');
    shell.touch(files.target);
  });

  afterEach(() => {
    shell.cd('../');
    shell.rm('-rf', '.tmp');
  });

  it('should be constructed', () => {
    expect(exec).to.be.ok;
  });

  describe('copy', () => {
    it('should copy a valid path', (done) => {
      expect(shell.test('-e', files.destination)).to.be.false;
      FileExecutor.copy(files.target, files.destination).then(() => {
        expect(shell.test('-e', files.destination)).to.be.true;

        done();
      }).catch(err => done(err));
    });
  });

  describe('remove', () => {
    it('should remove a given path', () => {
      shell.touch('file');
      expect(shell.test('-e', 'file')).to.be.true;

      FileExecutor.remove('file');

      expect(shell.test('-e', 'file')).to.be.false;
    });
  });

  describe('backup', () => {
    it('should backup a given file according to prefix', (done) => {
      expect(shell.test('-e', files.target)).to.be.true;
      exec.backup(files.target).then(() => {
        const path = `${exec.getBackupPrefix()}.${files.target}`;

        expect(shell.test('-e', path)).to.be.true;

        shell.rm(path);

        done();
      }).catch(err => done(err));
    });
  });

  describe('restore', () => {
    it('should restore a given file removing backup', (done) => {
      exec.backup(files.target)
        .then(() => {
          shell.rm(files.target);

          return exec.restore(files.target);
        })
        .then(() => {
          expect(shell.test('-e', files.target)).to.be.true;
          expect(shell.test('-e', `${exec.getBackupPrefix()}.${files.target}`)).to.be.false;

          done();
        })
        .catch(err => done(err));
    });
  });
});
