#!/usr/bin/env node

import * as ConfigStore from 'configstore';
import * as CRBFinder from 'conventional-recommended-bump';
import * as PrettyError from 'pretty-error';
import {BumpFinder} from './bumpFinder/BumpFinder';
import {ChildProcessPromiseExecutor} from './exec/ChildProcessPromiseExecutor';
import {ConfigStoreConfig} from './config/ConfigStoreConfig';
import {DebugLogger} from './debug/DebugLogger';
import {InquirerPrompt} from './prompt/InquirerPrompt';
import {MeowCliBootstrap} from './cli/MeowCliBootstrap';
import {Releaser} from './Releaser';

const debug = new DebugLogger('main');
debug.debug('starting');

// Makes pretty-error render all errors
PrettyError.start();

const cli      = new MeowCliBootstrap();
const config   = new ConfigStoreConfig(new ConfigStore(Releaser.name));
const debugRel = new DebugLogger(Releaser.name);
const exec     = new ChildProcessPromiseExecutor();
const finder   = new BumpFinder(CRBFinder);
const prompt   = new InquirerPrompt();
const rel      = new Releaser(cli, debugRel, config, finder, exec, prompt);

rel.init()
  .then(() => debug.debug('cli finished successfully'))
  .catch(err => debug.error(err));
