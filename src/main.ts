#!/usr/bin/env node

import * as ConfigStore from 'configstore';
import * as CRBFinder from 'conventional-recommended-bump';
import * as PrettyError from 'pretty-error';
import * as readPkgUp from 'read-pkg-up';
import {BumpFinder} from './bumpFinder/BumpFinder';
import {ConfigStoreConfig} from './config/ConfigStoreConfig';
import {DebugLogger} from './debug/DebugLogger';
import {GitExecutorSync} from './exec/GitExecutorSync';
import {InquirerPrompt} from './prompt/InquirerPrompt';
import {MeowCliBootstrap} from './cli/MeowCliBootstrap';
import {Releaser} from './Releaser';
import {SemVer} from './semver/SemVer';
import {UserAbortedError} from './exceptions/UserAbortedError';
import {FileExecutor} from './exec/FileExecutor';
import {Changelog} from './changelog/Changelog';

const debug = new DebugLogger('main');
debug.debug('starting');

// Makes pretty-error render all errors
PrettyError.start();

const rel = new Releaser(
  new MeowCliBootstrap(),
  new DebugLogger(Releaser.name),
  new ConfigStoreConfig(new ConfigStore(Releaser.name)),
  new BumpFinder(CRBFinder),
  new GitExecutorSync(),
  new InquirerPrompt(),
  new SemVer(),
  readPkgUp,
  new Changelog(new FileExecutor()),
);

rel.init()
  .then(() => debug.debug('cli finished successfully'))
  .catch(reason => {
    if (reason instanceof UserAbortedError) {
      return this.logger.info('Aborting.');
    } else if (reason === Releaser.errors.noNewCommit) {
      return this.logger.warn(Releaser.errors.noNewCommit);
    }

    throw reason;
  });
