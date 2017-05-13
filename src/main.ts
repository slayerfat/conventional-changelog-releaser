#!/usr/bin/env node

import * as ConfigStore from 'configstore';
import * as readPkgUp from 'read-pkg-up';
import * as CRBFinder from 'conventional-recommended-bump';
import * as PrettyError from 'pretty-error';
import {BumpFinder} from './bumpFinder/BumpFinder';
import {ChildProcessPromiseExecutor} from './exec/ChildProcessPromiseExecutor';
import {ConfigStoreConfig} from './config/ConfigStoreConfig';
import {DebugLogger} from './debug/DebugLogger';
import {InquirerPrompt} from './prompt/InquirerPrompt';
import {MeowCliBootstrap} from './cli/MeowCliBootstrap';
import {Releaser} from './Releaser';
import {SemVer} from './semver/SemVer';

const debug = new DebugLogger('main');
debug.debug('starting');

// Makes pretty-error render all errors
PrettyError.start();

const rel = new Releaser(
  new MeowCliBootstrap(),
  new DebugLogger(Releaser.name),
  new ConfigStoreConfig(new ConfigStore(Releaser.name)),
  new BumpFinder(CRBFinder),
  new ChildProcessPromiseExecutor(),
  new InquirerPrompt(),
  new SemVer(),
  readPkgUp,
);

rel.init()
  .then(() => debug.debug('cli finished successfully'))
  .catch(err => debug.error(err));
