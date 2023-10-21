#!/usr/bin/env node
import * as _cli from './cmd/cli';
import runWithPreserveSymlink from './fork-for-preserve-symlink';

void runWithPreserveSymlink('@wfh/plink/wfh/dist/_cmd-bootstrap', {
  stateExitAction: 'save',
  handleShutdownMsg: false
});

