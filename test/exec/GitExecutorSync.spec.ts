import * as shell from 'shelljs';
import {expect} from 'chai';
import {GitExecutorSync} from '../../src/exec/GitExecutorSync';
import {makeFreshGitDir} from '../helpers/makeFreshGitDir';

// chai.expect shows as an unused expression
/* tslint:disable:no-unused-expression */

describe('GitExecutorSync', () => {
  let exec: GitExecutorSync;
  beforeEach(() => {
    makeFreshGitDir();

    exec = new GitExecutorSync();
  });

  afterEach(() => shell.cd('../'));

  after(() => shell.rm('-rf', '.tmp'));

  context('constructor', () => it('should be constructed', () => expect(exec).to.be.ok));

  describe('isTagPresent', () => {
    it('should be false if no tag present', () => {
      expect(exec.isTagPresent('test')).to.be.false;
    });

    it('should be true if the tag given is present', () => {
      shell.exec('git tag test');
      expect(exec.isTagPresent('test')).to.be.true;
    });
  });

  describe('createTag', () => {
    it('should create a new tag', () => {
      const label = 'new-tag';

      expect(exec.isTagPresent(label)).to.be.false;
      exec.createTag(label);
      expect(exec.isTagPresent(label)).to.be.true;
    });
  });

  describe('isAnyTagPresent', () => {
    it('should return false if no tag present', () => {
      expect(exec.isAnyTagPresent()).to.be.false;
    });

    it('should return true if tag present', () => {
      exec.createTag('test');
      expect(exec.isAnyTagPresent()).to.be.true;
    });
  });

  describe('getHashFromLabel', () => {
    it('should return a hash from a given label', () => {
      exec.createTag('test');
      expect(exec.getHashFromLabel('test')).to.be.a('string');
    });

    it('should return an error with proper message if no label is found', () => {
      expect(() => exec.getHashFromLabel('test')).to.throw(Error, /Label test not found\./);
    });
  });

  describe('getCommitsCountFromHash', () => {
    it('should return 0 if no tag exist', () => {
      exec.createTag('test');
      const hash = exec.getHashFromLabel('test');

      expect(exec.getCommitsCountFromHash(hash)).to.equal(0);
    });
  });

  describe('findBranchRootDir', () => {
    it('should give the cwd', () => {
      expect(exec.findBranchRootDir()).to.equal(shell.pwd().toString());
    });
  });

  describe('getAllTagsWithRegex', () => {
    it('should get an array with no tags if none exist', () => {
      const tags = exec.getAllTagsWithRegex();
      expect(tags).to.be.a('array');
      expect(tags).with.lengthOf(0);
    });

    it('should get empty array if no valid semver tag exist', () => {
      exec.createTag('test');
      exec.createTag('another-test');

      const tags = exec.getAllTagsWithRegex();

      expect(tags).to.be.a('array');
      expect(tags).with.lengthOf(0);
    });

    it('should get an array of valid semver tags by default', () => {
      exec.createTag('0.0.1');
      exec.createTag('0.0.2');

      const tags = exec.getAllTagsWithRegex();

      expect(tags).to.be.a('array');
      expect(tags).with.lengthOf(2);
    });

    it('should get an array of tags according to regex', () => {
      exec.createTag('0.0.1');
      exec.createTag('0.0.2');
      exec.createTag('test');
      exec.createTag('another');

      const tags = exec.getAllTagsWithRegex(/test/);

      expect(tags).to.be.a('array');
      expect(tags).with.lengthOf(1);
    });
  });

  describe('getCurrentBranchName', () => {
    it('should return the current branch name', () => {
      expect(exec.getCurrentBranchName()).to.equal('master');
    });
  });

  describe('commit', () => {
    it('should throw error on incomplete params', () => {
      const options = {message: 'test commit', files: {flags: [''], paths: ['']}};

      expect(() => exec.commit(options))
        .to.throw(Error, /Either flags or paths are expected to commit, but none found\./);
    });

    it('should add files and commit', () => {
      shell.touch('file');
      const options = {message: 'test commit message', files: {flags: ['--all'], paths: ['']}};

      expect(exec.commit(options)).to.match(/test commit message/);

      shell.touch('anotherFile');
      options.message     = 'another commit';
      options.files.flags = [''];
      options.files.paths = ['anotherFile'];

      expect(exec.commit(options)).to.match(/another commit/);
    });

    it('should create a new commit', () => {
      shell.touch('file');
      exec.perform('git add file');
      const options = {message: 'test commit message'};

      expect(exec.commit(options)).to.match(/test commit message/);
    });
  });
});
