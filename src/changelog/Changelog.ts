import {FileExecutor} from '../exec/FileExecutor';
import {ChangelogNotFoundError} from '../exceptions/ChangelogNotFoundError';
import {access} from 'fs';

export class Changelog {
  constructor(private fileExec: FileExecutor) {
    //
  }

  public getFileExec(): FileExecutor {
    return this.fileExec;
  }

  public getBackupPrefix() {
    return this.fileExec.getBackupPrefix();
  }

  /**
   * Tries to copy a changelog from the cwd as a backup.
   *
   * @return {Promise<void>}
   */
  public async backup(): Promise<void> {
    const path = await this.getFilePath();

    try {
      await FileExecutor.copy(path, `${this.fileExec.getBackupPrefix()}.${path}`);
    } catch (err) {
      throw err;
    }
  }

  /**
   * Determines if any changelog preset exist on the cwd.
   *
   * @return {Promise<string>}
   */
  private async getFilePath(): Promise<string> {
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
