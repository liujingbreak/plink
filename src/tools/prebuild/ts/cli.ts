#!/usr/bin/env node
import commander, {Command} from 'commander';
import pk from '../package.json';
import Path from 'path';
import cfg from 'dr-comp-package/wfh/dist/config';
import * as _Artifacts from './artifacts';
import * as sp from './_send-patch';
import chalk from 'chalk';
import fs from 'fs-extra';
import * as _prebuildPost from './prebuild-post';
// import {spawn} from 'dr-comp-package/wfh/dist/process-utils';
import _cliDeploy from './cli-deploy';
import log4js from 'log4js';
import _genKeypair from './cli-keypair';
import {withGlobalOptions, initConfigAsync, GlobalOptions} from 'dr-comp-package/wfh/dist/utils/bootstrap-server';

// import * as tsAstQuery from './ts-ast-query';
import * as _unzip from './cli-unzip';
// import * as astUtil from './cli-ts-ast-util';

const program = new Command().name('prebuild');

program.version(pk.version);
// program.option('-c, --config <config-file>',
//   'Read config files, if there are multiple files, the latter one overrides previous one',
//   (curr, prev) => prev.concat(curr), [] as string[]);
// program.option('--prop <property-path=value as JSON | literal>',
//   '<property-path>=<value as JSON | literal> ... directly set configuration properties, property name is lodash.set() path-like string\n e.g.\n',
//   (curr, prev) => prev.concat(curr), [] as string[]);
program.option('--secret <credential code>', 'credential code for deploy to "prod" environment');

// ----------- deploy ----------
const deployCmd = program.command('deploy <app> [ts-scripts#function-or-shell]')
.option('--static', 'as an static resource build', false)
.option('--no-push-branch', 'push to release branch', false)
// .option('--secret <secret>', 'credential word')
.option('--secret <credential code>', 'credential code for deploy to "prod" environment')
.action(async (app: string, scriptsFile?: string) => {
  const opt = deployCmd.opts();
  await initConfigAsync(deployCmd.opts() as GlobalOptions);
  (await import('dr-comp-package/wfh/dist/package-runner')).prepareLazyNodeInjector({});

  const cliDeploy = (require('./cli-deploy').default as typeof _cliDeploy);
  await cliDeploy(opt.static, opt.env, app, deployCmd.opts().pushBranch, deployCmd.opts().secret || null, scriptsFile);
});
createEnvOption(deployCmd);
withGlobalOptions(deployCmd);

// -------- githash ----------
const githashCmd = createEnvOption(program.command('githash'), false)
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
withGlobalOptions(githashCmd);

// ------ send --------
const sendCmd = createEnvOption(program.command('send <app-name> <zip-file>'))
.description('Send static resource to remote server')
.option('--secret <credential code>', 'credential code for deploy to "prod" environment')
.action(async (appName, zip) => {
  await initConfigAsync(sendCmd.opts() as GlobalOptions);
  (await import('dr-comp-package/wfh/dist/package-runner')).prepareLazyNodeInjector({});

  await (require('./_send-patch') as typeof sp).send(sendCmd.opts().env, appName, zip, sendCmd.opts().secret);
});
withGlobalOptions(sendCmd);

// ------ mockzip --------
const mockzipCmd = program.command('mockzip');
mockzipCmd.option('-d,--dir <dir>', 'create a mock zip file in specific directory');
mockzipCmd.action(async () => {
  await initConfigAsync(mockzipCmd.opts() as GlobalOptions);

  const Artifacts: typeof _Artifacts = require('./artifacts');

  const fileContent = '' + new Date().toUTCString();

  const file = mockzipCmd.opts().dir ? Path.resolve(mockzipCmd.opts().dir, 'prebuild-mock.zip') : cfg.resolve('destDir', 'prebuild-mock.zip');
  fs.mkdirpSync(Path.dirname(file));

  await Artifacts.writeMockZip(file, fileContent);
  const log = log4js.getLogger('prebuild');
  // tslint:disable-next-line: no-console
  log.info('Mock zip:', file);
});
withGlobalOptions(mockzipCmd);

// ---------- keypair ------------
const keypairCmd = program.command('keypair [file-name]')
.description('Generate a new asymmetric key pair')
.action(async (fileName) => {
  const genKeypair = require('./cli-keypair').default as typeof _genKeypair;
  await genKeypair(fileName, keypairCmd.opts());
});

const tsAstCmd = program.command('ts-ast <ts-file>')
.option('--no-type', 'do not print AST type', false)
.option('-q|--query <selector>', 'query selector', undefined)
.description('Print Typescript AST structure')
.action(async filename => {
  const astQ = await import('./ts-ast-query');
  // const printFile: (typeof tsAstQuery)['printFile'] = require('./ts-ast-query').printFile;
  astQ.printFile(filename, tsAstCmd.opts().query, tsAstCmd.opts().type as boolean);
});

program.command('functions <file>')
.description('List exported functions for *.ts, *.d.ts, *.js file')
.action(async file => {
  (await import('./cli-ts-ast-util')).listExportedFunction(file);
});

// -------- listzip --------
program.command('listzip <file>')
.description('List zip file content and size')
.action(async file => {
  const {listZip}: typeof _unzip = require('./cli-unzip');
  await listZip(file);
});

program.description(chalk.cyanBright(
  'Prebuild and deploy static resource to file server and compile node server side TS files'));
program.parseAsync(process.argv)
.catch(e => {
  console.error(e);
  process.exit(1);
});


function createEnvOption(cmd: commander.Command, required = true): ReturnType<commander.Command['requiredOption']> {
  const func = required ? cmd.requiredOption : cmd.option;

  return func.call(cmd, '--env <local | dev | test | stage | prod>', 'target environment, e.g. "local", "dev", "test", "stage", "prod", default as all environment');
}

