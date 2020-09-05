import commander from 'commander';
// import * as tp from './cmd/types';
import {initConfigAsync, withGlobalOptions, GlobalOptions} from './utils/bootstrap-server';
const pk = require('../../package');

interface PackageMgr {
  runServer: (argv: any) => Promise<() => Promise<void>>;
}

process.title = 'Plink - server';

const program = new commander.Command()
.arguments('[args...]')
.action(async (args: string[]) => {
  // tslint:disable-next-line: no-console
  console.log('\nPlink version:', pk.version);

  const serverStarted = new Promise<() => Promise<void>>(async resolve => {
    await initConfigAsync(program.opts() as GlobalOptions, () => {
      return serverStarted.then(shutdown => shutdown());
    });

    const {runServer} = require('../lib/packageMgr') as PackageMgr;
    const shutdown = await runServer(program.opts());
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
