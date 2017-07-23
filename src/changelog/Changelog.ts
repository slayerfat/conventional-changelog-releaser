import {FileExecutor} from '../exec/FileExecutor';
import {ChangelogNotFoundError} from '../exceptions/ChangelogNotFoundError';
import {access, createWriteStream} from 'fs';
import * as conLog from 'conventional-changelog';

export class Changelog {
  public static errors = {
    backupNotFound: 'The changelog backup file was not found.',
  };

  private conLog = conLog;

  constructor(private fileExec: FileExecutor) {
    //
  }

  /**
   * Updates the changelog according to the preset, defaults to angular.
   *
   * @param {string} preset Possible values: 'angular', 'atom', 'codemirror', 'ember',
   * 'eslint', 'express', 'jquery', 'jscs', 'jshint'
   */
  public async update(preset = 'angular'): Promise<void> {
    return this.getFilePath().then(path => {
      return new Promise<void>((resolve, reject) => {
        const changelogStream = createWriteStream(path);
        const onErrorCB       = (err) => reject(err);

        changelogStream.on('error', onErrorCB);

        this.conLog({preset})
          .on('error', err => onErrorCB)
          .on('end', () => resolve())
          .pipe(changelogStream);
      });
    });
  }

  /**
   * Returns the underlying FileExecutor.
   *
   * @return {FileExecutor}
   */
  public getFileExec(): FileExecutor {
    return this.fileExec;
  }

  /**
   * Gives the string prefix used to prepend file path.
   *
   * @return {string}
   */
  public getBackupPrefix() {
    return this.fileExec.getBackupPrefix();
  }

  /**
   * Tries to copy a changelog from the cwd as a backup.
   *
   * @return {Promise<void>}
   */
  public async backup(): Promise<void> {
    try {
      const path = await this.getFilePath();

      await FileExecutor.copy(path, `${this.fileExec.getBackupPrefix()}.${path}`);
    } catch (err) {
      throw err;
    }
  }

  /**
   * Tries to copy a changelog from the cwd as a backup.
   *
   * @return {Promise<void>}
   */
  public async restore(): Promise<void> {
    try {
      const target = await this.getFilePath();
      const source = `${this.fileExec.getBackupPrefix()}.${target}`;

      await FileExecutor.copy(source, target);
      await FileExecutor.remove(source);
    } catch (err) {
      if (/^ENOENT/.test(err.message)) {
        throw new ChangelogNotFoundError(Changelog.errors.backupNotFound);
      }

      throw err;
    }
  }

  /**
   * Determines if any changelog preset exist on the cwd.
   *
   * @return {Promise<string>}
   */
  public async getFilePath(): Promise<string> {
    const promises = ['changelog.md', 'Changelog.md', 'CHANGELOG.md'].map(path => {
      return new Promise((resolve, reject) => {
        access(path, err => {
          if (!err) {
            return resolve({path, exist: true});
          } else if (err.code === 'ENOENT') {
            return resolve({path, exist: false});
          }

          reject(err);
        });
      });
    });

    return Promise.all(promises).then((results: Array<{ path: string, exist: boolean }>) => {
      const existingPaths = results.filter(result => result.exist === true);

      if (existingPaths.length === 0) {
        throw new ChangelogNotFoundError();
      }

      return existingPaths.map(result => result.path)[0];
    });
  }
}
