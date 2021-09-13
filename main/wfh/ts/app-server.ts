import commander from 'commander';
import {GlobalOptions, initConfig, initProcess, initAsChildProcess} from './index';
import * as _runner from './package-runner';
import logConfig from './log-config';
import {withGlobalOptions} from './cmd/override-commander';
import {forkFile} from './fork-for-preserve-symlink';

if (process.env.NODE_PRESERVE_SYMLINKS !== '1' && process.execArgv.indexOf('--preserve-symlinks') < 0) {
  let storeSettingDispatcher: ReturnType<typeof initProcess> | undefined;
  if (process.send) {
    // current process is forked
    initAsChildProcess(true);
  } else {
    storeSettingDispatcher = initProcess();
  }
  if (storeSettingDispatcher)
    storeSettingDispatcher.changeActionOnExit('none');
  void forkFile('@wfh/plink/wfh/dist/app-server.js');
} else {
  const {version} = require('../../package.json') as {version: string};

  process.title = 'Plink - server';

  let shutdown: () => Promise<any>;

  const program = new commander.Command()
  .arguments('[args...]')
  .action((args: string[]) => {
    // eslint-disable-next-line no-console
    console.log('\nPlink version:', version);
    const setting = initConfig(program.opts() as GlobalOptions);
    logConfig(setting());
    const {runServer} = require('./package-runner') as typeof _runner;
    shutdown = runServer().shutdown;
    // await started;
  });

  if (process.send) {
    // current process is forked
    initAsChildProcess(true, () => shutdown());
  } else {
    initProcess(true, () => {
      return shutdown();
    });
  }

  withGlobalOptions(program);

  program.parseAsync(process.argv)
  .catch((e: Error) => {
    console.error(e, e.stack);
    process.exit(1);
  });

}
