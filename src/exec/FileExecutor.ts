import {createReadStream, createWriteStream, unlinkSync, access} from 'fs';
import {ChangelogNotFoundError} from '../exceptions/ChangelogNotFoundError';

export class FileExecutor {

  /**
   * Prefix used to copy / backup / restore related files.
   *
   * @type {string}
   */
  private prefix = 'original';

  /**
   * Copies a file from the source to the destination path using node FS.
   *
   * @param {string} source The source path
   * @param {string} destination The destination path
   * @return {Promise<void>}
   */
  public static async copy(source: string, destination: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const readStream  = createReadStream(source);
      const writeStream = createWriteStream(destination);

      readStream.on('end', () => resolve());

      readStream.on('error', (err) => reject(err));
      writeStream.on('error', (err) => reject(err));

      readStream.pipe(writeStream);
    });
  }

  /**
   * Removes a given file from the current dir.
   *
   * @param {string} target The target file path
   */
  public static remove(target: string): void {
    try {
      unlinkSync(target);
    } catch (err) {
      // no reason yet to poke at it yet.
      throw err;
    }
  }

  public getPrefix() {
    return this.prefix;
  }

  /**
   * Creates a backup copy of the given target.
   *
   * @param {string} target The target path
   * @return {Promise<void>}
   */
  public async backup(target: string): Promise<void> {
    try {
      await FileExecutor.copy(target, `${this.prefix}.${target}`);
    } catch (err) {
      throw err;
    }
  }

  /**
   * Tries to copy a changelog from the cwd as a backup.
   *
   * @return {Promise<void>}
   */
  public async backupChangelog(): Promise<void> {
    const path = await this.getChangelogPath();

    try {
      await FileExecutor.copy(path, `${this.prefix}.${path}`);
    } catch (err) {
      throw err;
    }
  }

  /**
   * Restores a given target appending a prefix and deletes the backup.
   *
   * @param {string} target The file path
   * @return {Promise<void>}
   */
  public async restore(target: string): Promise<void> {
    try {
      await FileExecutor.copy(`${this.prefix}.${target}`, target);
      await FileExecutor.remove(`${this.prefix}.${target}`);
    } catch (err) {
      throw err;
    }
  }

  /**
   * Determines if any changelog preset exist on the cwd.
   *
   * @return {Promise<string>}
   */
  private async getChangelogPath(): Promise<string> {
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
