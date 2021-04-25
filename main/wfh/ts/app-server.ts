import commander from 'commander';
import {GlobalOptions, initConfig, initProcess} from './index';
import * as _runner from './package-runner';
import logConfig from './log-config';
import {withGlobalOptions} from './cmd/override-commander';

const pk = require('../../package.json');

process.title = 'Plink - server';

const program = new commander.Command()
.arguments('[args...]')
.action(async (args: string[]) => {
  // tslint:disable-next-line: no-console
  console.log('\nPlink version:', pk.version);

  initProcess(() => {
    return shutdown();
  });
  const setting = initConfig(program.opts() as GlobalOptions);
  logConfig(setting());
  const {runServer} = require('./package-runner') as typeof _runner;
  const {started, shutdown} = runServer();
  await started;
});

withGlobalOptions(program);

program.parseAsync(process.argv)
.catch(e => {
  console.error(e, e.stack);
  process.exit(1);
});
