/**
 * Helper type interface for the read-pkg-up module.
 * This is a basic representation of the results.
 */
export interface IPkgUpResultObject {
  pkg: {[name: string]: string};
  path: string;
}
