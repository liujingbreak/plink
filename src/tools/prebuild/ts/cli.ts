import {Command} from 'commander';
import pk from '../package.json';
import Path from 'path';
import api from '__api';
const cfg = require('dr-comp-package/wfh/lib/config.js') as typeof api.config;
const logConfig = require('dr-comp-package/wfh/lib/logConfig.js');
import {runSinglePackage, prepareLazyNodeInjector} from 'dr-comp-package/wfh/dist/package-runner';
import * as _Artifacts from './artifacts';
import * as sp from './_send-patch';
import chalk from 'chalk';
import fs from 'fs-extra';

const program = new Command();

program.version(pk.version);
program.option('-c, --config <config-file>',
  'Read config files, if there are multiple files, the latter one overrides previous one',
  (curr, prev) => prev.concat(curr), [] as string[]);
program.option('--prop <property-path=value as JSON | literal>',
  '<property-path>=<value as JSON | literal> ... directly set configuration properties, property name is lodash.set() path-like string\n e.g.\n',
  (curr, prev) => prev.concat(curr), [] as string[]);
program.option('--secret', 'secret code for deploy to "prod" environment');

const deployCmd = program.command('deploy <env> <app> [scripts-file#function]')
.option('--static', 'as an static resource build', true)
.action(async (env, app, scriptsFile) => {
  await cfg.init({c: (program.opts().config as string[]).length === 0 ? undefined : program.opts().config});
  logConfig(cfg());
  // console.log(Path.resolve(__dirname, '_send-patch.js'));
  await runSinglePackage({
    target: Path.resolve(__dirname, '_send-patch.js') + '#test',
    arguments: [deployCmd.opts().static]
  });
});
program.usage(program.usage() + chalk.blueBright(
    '\nPrebuild and deploy static resource to file server and compile node server side TS files'));

const githashCmd = program.command('githash')
.option('--env', 'target environment, e.g. "local", "dev", "test", "stage", "prod", default as all environment')
// .option('-a,--all', 'list git hash info for all environment artifacts')
.action(async () => {
  const Artifacts: typeof _Artifacts = require('./artifacts');
  if (githashCmd.opts().env) {
    // tslint:disable-next-line: no-console
    console.log(await Artifacts.stringifyListVersions(githashCmd.opts().env));
  } else {
    // tslint:disable-next-line: no-console
    console.log(await Artifacts.stringifyListAllVersions());
  }
});

// ------ send --------
const sendCmd = program.command('send <app-name> <zip-file> [secret]')
.requiredOption('--env <local | dev | test | stage | prod>', 'Deploy target, e.g. one of  "local", "dev", "test", "stage", "prod"')
.action(async (appName, zip, secret) => {
  await cfg.init({c: (program.opts().config as string[]).length === 0 ? undefined : program.opts().config});
  logConfig(cfg());
  prepareLazyNodeInjector({});

  (require('./_send-patch') as typeof sp).send(sendCmd.opts().env, appName, zip, program.opts().secret);
});
sendCmd.usage(sendCmd.usage() + '\nSend static resource to remote server');

// ------ mockzip --------
const mockzipCmd = program.command('mockzip');
mockzipCmd.option('-d', 'create a mock zip file in specific directory');
mockzipCmd.action(async () => {
  await cfg.init({c: (program.opts().config as string[]).length === 0 ? undefined : program.opts().config});
  logConfig(cfg());
  const Artifacts: typeof _Artifacts = require('./artifacts');

  const fileContent = '' + new Date().toUTCString();

  const file = mockzipCmd.opts().d ? mockzipCmd.opts().d : cfg.resolve('destDir', 'prebuild-mock.zip');
  fs.mkdirpSync(cfg.resolve('destDir'));

  await Artifacts.writeMockZip(file, fileContent);
  // tslint:disable-next-line: no-console
  console.log('Mock zip:', file);
});

program.parseAsync(process.argv);
