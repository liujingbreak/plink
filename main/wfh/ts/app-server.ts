import commander from 'commander';
import runWithPreserveSymlink from './fork-for-preserve-symlink';
import * as overrideCmd from './cmd/override-commander';
import logConfig from './log-config';
import * as _runner from './package-runner';
import * as bootstrapProc from './utils/bootstrap-process';

runWithPreserveSymlink('@wfh/plink/wfh/dist/app-server.js', {stateExitAction: 'none', handleShutdownMsg: true}, () => {
  const {version} = require('../../package.json') as {version: string};

  /** Emitted function will be executed during server shutdown phase */
  process.title = 'Plink - server';

  const program = new commander.Command()
  .arguments('[args...]')
  .action(() => {
    // eslint-disable-next-line no-console
    console.log('\nPlink version:', version);
    const {initConfig, exitHooks} = require('./utils/bootstrap-process') as typeof bootstrapProc;
    const setting = initConfig(program.opts());
    logConfig(setting());
    const {runServer} = require('./package-runner') as typeof _runner;
    const shutdown = runServer().shutdown;

    exitHooks.push(shutdown);
  });

  const {withGlobalOptions} = require('./cmd/override-commander') as typeof overrideCmd;
  withGlobalOptions(program);

  program.parseAsync(process.argv)
  .catch((e: Error) => {
    console.error(e, e.stack);
    process.exit(1);
  });
});


