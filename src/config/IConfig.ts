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
   * Deletes the stored package.json object.
   *
   * @return {void}
   */
  deletePackageJson(): void;

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
}
