import {isMainThread, threadId} from 'worker_threads';
import chalk from 'chalk';
import {createCommands} from './cmd/cli';

const startTime = new Date().getTime();

process.on('exit', (code) => {
  // eslint-disable-next-line no-console
  console.log((process.send || !isMainThread ? `[P${process.pid}.T${threadId}] ` : '') +
    chalk.green(`${code !== 0 ? 'Failed' : 'Done'} in ${new Date().getTime() - startTime} ms`));
});

void createCommands(startTime);
