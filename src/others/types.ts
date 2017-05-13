import {IPkgUpResultObject} from '../config/IPkgResultObject';

export type readPkgUp = (options: {
  cwd: string,
  normalize?: boolean,
}) => Promise<IPkgUpResultObject>;
