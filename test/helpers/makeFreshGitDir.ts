import * as shell from 'shelljs';
import {writeFileSync} from 'fs';

/**
 * From the cwd recreates a temp folder and init git.
 *
 * @param {object} options
 * @param {boolean} options.silent
 */
export function makeFreshGitDir(options: {silent?: boolean} = {silent: true}) {
  shell.config.silent = options.silent;

  shell.rm('-rf', '.tmp');
  shell.mkdir('.tmp');
  shell.cd('.tmp');
  shell.exec('git init');
  writeFileSync('test', '');
  shell.exec('git add --all && git commit -m "initial commit"');
}
