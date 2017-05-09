import {IFlagsObject} from './IFlagsObject';

export interface ICliBootstrap {

  /**
   * Starts the CLI bootstrap.
   */
  init();

  /**
   * Get all the user inputs as an array.
   *
   * @returns {string[]}
   */
  getInputs(): string[];

  /**
   * Get all the flags send by user in the CLI.
   *
   * @returns {Object}
   */
  getFlags(): IFlagsObject;

  /**
   * Gets one flag in the CLI.
   *
   * @param {string} name The name of the flag.
   * @returns {*}
   */
  getFlag(name: string): any;

  /**
   * Gets the help text set by this class.
   *
   * @param code
   */
  showHelp(code?: number): void;

  /**
   * Gets the auto flag from the cli.
   *
   * @return {boolean}
   */
  isAuto(): boolean;

  /**
   * Gets the forced flag from the cli.
   *
   * @return {boolean}
   */
  isForced(): boolean;

  /**
   * Gets the release type from the cli.
   *
   * @return {string}
   */
  getRelease(): string;

  /**
   * Gets the prefix flag from the cli.
   *
   * @return {boolean}
   */
  hasPrefix(): boolean;

  /**
   * Gets the commit flag from the cli.
   *
   * @return {boolean}
   */
  shouldCommit(): boolean;

  /**
   * Gets the reset flag from the cli.
   *
   * @return {boolean}
   */
  isReset(): boolean;
}
