import commander from 'commander';
import {withGlobalOptions, GlobalOptions, initConfigAsync, initProcess} from './index';
import * as _runner from './package-runner';

const pk = require('../../package');

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
    await initConfigAsync(program.opts() as GlobalOptions);

    const {runServer} = require('./package-runner') as typeof _runner;
    const shutdown = await runServer();
    resolve(shutdown);
  });
});

// program.version(version || pk.version, '-v, --vers', 'output the current version');
withGlobalOptions(program);

program.parseAsync(process.argv)
.catch(e => {
  console.error(e, e.stack);
  process.exit(1);
});
