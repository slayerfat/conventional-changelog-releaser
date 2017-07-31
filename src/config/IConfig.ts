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
   * Gets the stored package.json version.
   *
   * @return {string}
   */
  getPackageJsonVersion(): string;

  /**
   * Sets the existing package.json as valid or invalid.
   *
   * @return void
   */
  setPackageJsonValidity(validity: boolean): void;

  /**
   * Gets the existing package.json validity status.
   *
   * @return void
   */
  isPackageJsonValid(): boolean;

  /**
   * Sets the existing package.json as searched or not;
   * This means the system did not found a valid package.json
   * or the user didn't select from the files found in the search.
   *
   * @return void
   */
  setPackageJsonExhaustStatus(status: boolean): void;

  /**
   * Gets the existing package.json exhaust status.
   *
   * @return void
   */
  isPackageJsonExhausted(): boolean;

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

  /**
   * Resets the config file.
   *
   * @return void
   */
  reset(): void;

  /**
   * Sets the configured flag by the user.
   *
   * @param {boolean} value
   */
  setConfigured(value: boolean);

  /**
   * Tells if the configuration has been set for the first time.
   *
   * @return {boolean}
   */
  isConfigured(): boolean;

  /**
   * Sets the develop branch name from the user.
   *
   * @param {string} value
   */
  setDevelopBranchName(value: string): void;

  /**
   * Gets the develop branch name set by the user.
   *
   * @return {string}
   */
  getDevelopBranchName(): string;
}
