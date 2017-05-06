import {DebugLogger} from './debug/DebugLogger';
import {MeowCliBootstrap} from './cli/MeowCliBootstrap';
import {Releaser} from './Releaser';
import * as PrettyError from 'pretty-error';

const debug = new DebugLogger('main');
debug.debug('starting');

// Makes pretty-error render all errors
PrettyError.start();

const debugRel = new DebugLogger('Releaser');
const cli      = new MeowCliBootstrap();
const rel      = new Releaser(cli, debugRel);

rel.init();
