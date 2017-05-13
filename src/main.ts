#!/usr/bin/env node

import * as ConfigStore from 'configstore';
import * as CRBFinder from 'conventional-recommended-bump';
import * as PrettyError from 'pretty-error';
import {BumpFinder} from './bumpFinder/BumpFinder';
import {ConfigStoreConfig} from './config/ConfigStoreConfig';
import {DebugLogger} from './debug/DebugLogger';
import {MeowCliBootstrap} from './cli/MeowCliBootstrap';
import {Releaser} from './Releaser';
import {ChildProcessPromiseExecutor} from './exec/ChildProcessPromiseExecutor';

const debug = new DebugLogger('main');
debug.debug('starting');

// Makes pretty-error render all errors
PrettyError.start();

const finder   = new BumpFinder(CRBFinder);
const debugRel = new DebugLogger('Releaser');
const cli      = new MeowCliBootstrap();
const config   = new ConfigStoreConfig(new ConfigStore(Releaser.name));
const exec     = new ChildProcessPromiseExecutor();
const rel      = new Releaser(cli, debugRel, config, finder, exec);

rel.init()
  .then(() => debug.debug('cli finished successfully'))
  .catch(err => debug.error(err));
