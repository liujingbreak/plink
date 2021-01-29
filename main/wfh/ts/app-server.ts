import commander from 'commander';
import {GlobalOptions, initConfigAsync, initProcess} from './index';
import * as _runner from './package-runner';
import logConfig from './log-config';

const pk = require('../../package.json');

process.title = 'Plink - server';

const program = new commander.Command()
.arguments('[args...]')
.action(async (args: string[]) => {
  // tslint:disable-next-line: no-console
  console.log('\nPlink version:', pk.version);

  const serverStarted = new Promise<() => Promise<void>>(async resolve => {
    initProcess(() => {
      return serverStarted.then(shutdown => shutdown());
    });
    const setting = await initConfigAsync(program.opts() as GlobalOptions);
    logConfig(setting());
    const {runServer} = require('./package-runner') as typeof _runner;
    const shutdown = await runServer();
    resolve(shutdown);
  });
});

program.parseAsync(process.argv)
.catch(e => {
  console.error(e, e.stack);
  process.exit(1);
});
