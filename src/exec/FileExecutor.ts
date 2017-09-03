import {createReadStream, createWriteStream, unlinkSync, access, writeFile, readFile} from 'fs';

export class FileExecutor {

  /**
   * Prefix used to copy / backup / restore related files.
   *
   * @type {string}
   */
  private backupPrefix = 'original';

  /**
   * Copies a file from the source to the destination path using node FS.
   *
   * @param {string} source The source path
   * @param {string} destination The destination path
   * @return {Promise<void>}
   */
  public copy(source: string, destination: string): Promise<void> {
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
   * Reads the file contents using node.
   *
   * @param file
   * @param {string} encoding
   * @return {Promise<any>}
   */
  public read(file, encoding = 'utf8'): Promise<any> {
    return new Promise((resolve, reject) => {
      readFile(file, encoding, (err, data) => {
        if (err) {
          reject(err);
        }

        resolve(data);
      });
    });
  }

  /**
   * Writes data to a file using node fs.writeFile method.
   *
   * @param file
   * @param data
   * @param options
   * @return {Promise<any>}
   */
  public write(file, data, options?: {
    encoding?: string;
    mode?: number;
    flag?: string;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      writeFile(file, data, options, (err) => {
        if (err) {
          reject(err);
        }

        resolve();
      });
    });
  }

  /**
   * Removes a given file from the current dir.
   *
   * @param {string} target The target file path
   */
  public remove(target: string): void {
    try {
      unlinkSync(target);
    } catch (err) {
      // no reason yet to poke at it yet.
      throw err;
    }
  }

  /**
   * Checks if a path exists in the filesystem.
   *
   * @param {string} path
   * @return {Promise<boolean>}
   */
  public isPresent(path: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      access(path, err => {
        if (!err) {
          return resolve(true);
        } else if (err.code === 'ENOENT') {
          return resolve(false);
        }

        reject(err);
      });
    });
  }

  /**
   * Gives the string prefix used to prepend the path to manipulate.
   *
   * @return {string}
   */
  public getBackupPrefix() {
    return this.backupPrefix;
  }

  /**
   * Creates a backup copy of the given target.
   *
   * @param {string} target The target path
   * @return {Promise<void>}
   */
  public backup(target: string): Promise<void> {
    return this.copy(target, `${this.backupPrefix}.${target}`);
  }

  /**
   * Restores a given target appending a backupPrefix and deletes the backup.
   *
   * @param {string} target The file path
   * @return {Promise<void>}
   */
  public async restore(target: string): Promise<void> {
    try {
      await this.copy(`${this.backupPrefix}.${target}`, target);
      await this.remove(`${this.backupPrefix}.${target}`);
    } catch (err) {
      throw err;
    }
  }
}
