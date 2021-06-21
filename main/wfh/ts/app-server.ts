import commander from 'commander';
import {GlobalOptions, initConfig, initProcess} from './index';
import * as _runner from './package-runner';
import logConfig from './log-config';
import {withGlobalOptions} from './cmd/override-commander';

const {version} = require('../../package.json') as {version: string};

process.title = 'Plink - server';

const program = new commander.Command()
.arguments('[args...]')
.action((args: string[]) => {
  // eslint-disable-next-line no-console
  console.log('\nPlink version:', version);

  initProcess(() => {
    return shutdown();
  });
  const setting = initConfig(program.opts() as GlobalOptions);
  logConfig(setting());
  const {runServer} = require('./package-runner') as typeof _runner;
  const {shutdown} = runServer();
  // await started;
});

withGlobalOptions(program);

program.parseAsync(process.argv)
.catch((e: Error) => {
  console.error(e, e.stack);
  process.exit(1);
});
