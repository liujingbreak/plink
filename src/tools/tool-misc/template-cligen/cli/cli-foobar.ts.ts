import {config} from '@wfh/plink';
import plink from '__plink';
// Chalk is useful for printing colorful text in a terminal
// import chalk from 'chalk';

export async function $__foobarId__$(argument1: string[], opts: {file: string}) {
  plink.logger.info('Command is executing with options:', opts);
  plink.logger.info('Command is executing with configuration:', config());
  // TODO: Your command job implementation here
}
