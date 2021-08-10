import {config, log4File} from '@wfh/plink';
const log = log4File(__filename);
// Chalk is useful for printing colorful text in a terminal
// import chalk from 'chalk';

export function colorCmp(argument1: string[], opts: {file: string}) {
  log.info('Command is executing with options:', opts);
  log.info('Command is executing with configuration:', config());
  // TODO: Your command job implementation here
}
