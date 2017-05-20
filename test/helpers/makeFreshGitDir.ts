import * as shell from 'shelljs';
import {writeFileSync} from 'fs';

/**
 * From the cwd recreates a temp folder and init git.
 *
 * @param {boolean} silent
 */
export function makeFreshGitDir(silent = true) {
  shell.config.silent = silent;
  shell.rm('-rf', '.tmp');
  shell.mkdir('.tmp');
  shell.cd('.tmp');
  shell.exec('git init');
  writeFileSync('test', '');
  shell.exec('git add --all && git commit -m "initial commit"');
}
