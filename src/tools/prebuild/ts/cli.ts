import {Command} from 'commander';
import pk from '../package.json';
import Path from 'path';
const cfg = require('dr-comp-package/wfh/lib/config.js');
import {runSinglePackage} from 'dr-comp-package/wfh/dist/package-runner';

const program = new Command();

program.version(pk.version);
program.usage('Run prebuild and deploy scripts');
program.option('-c, --config <config-file>',
  'Read config files, if there are multiple files, the latter one overrides previous one',
  (curr, prev) => prev.concat(curr), [] as string[]);
  program.option('--prop <property-path=value as JSON | literal>',
  '<property-path>=<value as JSON | literal> ... directly set configuration properties, property name is lodash.set() path-like string\n e.g.\n',
  (curr, prev) => prev.concat(curr), [] as string[]);

const deployCmd = program.command('deploy <env> <app> [scripts-file#function]')
.option('--static', 'as an static resource build', true)
.action(async (env, app, scriptsFile) => {
  await cfg.init({c: (program.opts().config as string[]).length === 0 ? undefined : program.opts().config});
  // console.log(Path.resolve(__dirname, '_send-patch.js'));
  await runSinglePackage({
    target: Path.resolve(__dirname, '_send-patch.js') + '#test',
    arguments: [deployCmd.opts().static]
  });
});

program.parseAsync(process.argv);
