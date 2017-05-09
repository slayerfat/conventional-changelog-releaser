import {IPkgUpResultObject} from './IPkgResultObject';

export interface IConfig {
  /**
   * Sets the value of a package json object.
   *
   * @param {IPkgUpResultObject} value The result set from read-pkg-up.
   */
  setPackageJson(value: IPkgUpResultObject): void;

  /**
   * Gets the stored package.json object.
   *
   * @return {IPkgUpResultObject}
   */
  getPackageJson(): IPkgUpResultObject;

  /**
   * Checks if the stored package.json object exists.
   *
   * @return {IPkgUpResultObject}
   */
  hasPackageJson(): boolean;

  /**
   * Deletes the stored package.json object.
   *
   * @return {void}
   */
  deletePackageJson(): void;

  /**
   * Updates the stored package.json version.
   *
   * @param {string} version
   */
  setPackageJsonVersion(version: string);

  /**
   * Sets a valid semantic version value.
   *
   * @param {string} value
   */
  setCurrentSemVer(value: string): void;

  /**
   * Gets the current stored semantic version value.
   *
   * @return {string}
   */
  getCurrentSemVer(): string;

  /**
   * Checks if the current stored semantic version exists.
   *
   * @return {IPkgUpResultObject}
   */
  hasCurrentSemVer(): boolean;

  /**
   * Deletes the current stored semantic version.
   *
   * @return {void}
   */
  deleteCurrentSemVer(): void;
}
