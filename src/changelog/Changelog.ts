import {FileExecutor} from '../exec/FileExecutor';
import {ChangelogNotFoundError} from '../exceptions/ChangelogNotFoundError';
import {access, createWriteStream} from 'fs';
import * as conLog from 'conventional-changelog-core';

/**
 * @see https://github.com/conventional-changelog-archived-repos/conventional-changelog-core
 */
export class Changelog {
  public static errors = {
    backupNotFound: 'The changelog backup file was not found.',
  };

  private conLog = conLog;

  /**
   * Basic error handling on file path.
   *
   * @param {Error} err The error object
   */
  private static handleChangelogPathError(err: Error) {
    if (/^ENOENT/.test(err.message)) {
      throw new ChangelogNotFoundError(Changelog.errors.backupNotFound);
    }

    throw err;
  }

  constructor(private fileExec: FileExecutor) {
    //
  }

  /**
   * Updates the changelog according to the preset, defaults to angular.
   *
   * @param {object} options
   * @param {string} options.preset Possible values:
   *                                'angular', 'atom', 'codemirror', 'ember',
   *                                'eslint', 'express', 'jquery', 'jscs', 'jshint'.
   * @param {boolean} options.append Should the log be appended to existing data.
   * @param {object} options.context
   * @param {boolean} options.context.version The version version to use, defaults to pkg.json.
   * @param {object} options.pkg
   * @param {boolean} options.pkg.path The package.json file path, defaults to closest.
   */
  public async update(options: {
    append?: boolean;
    context?: {version?: string};
    pkg?: {path?: string};
    preset?: string;
  } = {
    append: true,
    preset: 'angular',
  }): Promise<void> {
    // https://nodejs.org/api/fs.html#fs_fs_createreadstream_path_options
    const wsOptions: {flags?: string} = {};

    if (options.append === true) {
      wsOptions.flags = 'a';
    }

    return this.getFilePath().then(path => {
      return new Promise<void>((resolve, reject) => {
        const changelogStream = createWriteStream(path, {flags: wsOptions.flags});
        const onErrorCB       = (err) => reject(err);

        changelogStream.on('error', onErrorCB);

        const {preset, append, context} = options;

        this.conLog({preset, append}, context)
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

      await this.fileExec.copy(path, `${this.fileExec.getBackupPrefix()}.${path}`);
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

      await this.fileExec.copy(source, target);
      await this.fileExec.remove(source);
    } catch (err) {
      Changelog.handleChangelogPathError(err);
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

    return Promise.all(promises).then((results: Array<{path: string, exist: boolean}>) => {
      const existingPaths = results.filter(result => result.exist === true);

      if (existingPaths.length === 0) {
        throw new ChangelogNotFoundError();
      }

      return existingPaths.map(result => result.path)[0];
    });
  }

  /**
   * Deletes the changelog file from the media, original (backup) and current.
   *
   * @param {object} options
   * @param {boolean=} options.current
   * @param {boolean=} options.backup The backup or original file.
   * @return {Promise<void>}
   */
  public async deleteFile(options: {current?: boolean, backup?: boolean}): Promise<void> {
    const paths             = [];
    const target            = await this.getFilePath();
    const {current, backup} = options;

    try {
      if (current) {
        paths.push(target);
      }

      if (backup) {
        paths.push(`${this.fileExec.getBackupPrefix()}.${target}`);
      }

      paths.forEach(path => this.fileExec.remove(path));
    } catch (err) {
      Changelog.handleChangelogPathError(err);
    }
  }

  /**
   * Creates a new changelog file with optional data.
   *
   * @param {string} path
   * @param {string} data
   * @return {Promise<void>}
   */
  public async createNew(path = 'changelog.md', data = ''): Promise<void> {
    return this.fileExec.write(path, data);
  }
}
