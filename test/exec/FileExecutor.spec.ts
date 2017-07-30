import * as shell from 'shelljs';
import {expect} from 'chai';
import {FileExecutor} from '../../src/exec/FileExecutor';

// chai.expect shows as an unused expression
/* tslint:disable:no-unused-expression */

describe('FileExecutor', () => {
  let exec: FileExecutor;
  const files = {
    destination: 'destination',
    target:      'target',
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

  describe('read()', () => {
    it('should read data from file', (done) => {
      exec.write(files.target, JSON.stringify({data: 'value'}))
        .then(() => exec.read(files.target))
        .then((results) => {
          expect(results).to.exist;
          const object = JSON.parse(results);
          expect(object.data).to.not.be.undefined;
          expect(object.data).to.equal('value');

          done();
        }).catch(err => done(err));
    });
  });

  describe('write()', () => {
    it('should write data to file', (done) => {
      const command = `echo ${JSON.stringify('{"data": "value"}')} > ${files.target}`;

      shell.exec(command, {silent: true});

      exec.write(files.target, JSON.stringify({data: 'the answer is 42'}))
        .then(() => exec.read(files.target))
        .then(data => JSON.parse(data))
        .then((file) => {
          expect(file.data).to.exist;
          expect(file.data).to.equal('the answer is 42');

          done();
        }).catch(err => done(err));
    });
  });

  describe('copy()', () => {
    it('should copy a valid path', (done) => {
      expect(shell.test('-e', files.destination)).to.be.false;
      exec.copy(files.target, files.destination).then(() => {
        expect(shell.test('-e', files.destination)).to.be.true;

        done();
      }).catch(err => done(err));
    });
  });

  describe('remove()', () => {
    it('should remove a given path', () => {
      shell.touch('file');
      expect(shell.test('-e', 'file')).to.be.true;

      exec.remove('file');

      expect(shell.test('-e', 'file')).to.be.false;
    });
  });

  describe('backup()', () => {
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

  describe('restore()', () => {
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

  describe('isPresent()', () => {
    it('should find a given path', (done) => {
      const path = 'file';
      shell.touch(path);

      expect(shell.test('-e', path)).to.be.true;

      exec.isPresent(path)
        .then(result => {
          expect(result).to.be.true;

          return exec.isPresent('anotherFile');
        })
        .then(result => {
          expect(result).to.be.false;

          done();
        })
        .catch(err => done(err));
    });
  });
});
