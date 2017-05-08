import * as ConfigStore from 'configstore';
import * as PrettyError from 'pretty-error';
import {ConfigStoreConfig} from './config/ConfigStoreConfig';
import {DebugLogger} from './debug/DebugLogger';
import {MeowCliBootstrap} from './cli/MeowCliBootstrap';
import {Releaser} from './Releaser';

const debug = new DebugLogger('main');
debug.debug('starting');

// Makes pretty-error render all errors
PrettyError.start();

const debugRel = new DebugLogger('Releaser');
const cli      = new MeowCliBootstrap();
const config   = new ConfigStoreConfig(new ConfigStore(Releaser.name));
const rel      = new Releaser(cli, debugRel, config);

rel.init();
