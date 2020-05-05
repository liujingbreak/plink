#!/usr/bin/env node

import commander, {Command} from 'commander';
import pk from '../package.json';
import Path from 'path';
import api from '__api';
const cfg = require('dr-comp-package/wfh/lib/config.js') as typeof api.config;
const logConfig = require('dr-comp-package/wfh/lib/logConfig.js');
import {prepareLazyNodeInjector} from 'dr-comp-package/wfh/dist/package-runner';
import * as _Artifacts from './artifacts';
import * as sp from './_send-patch';
import chalk from 'chalk';
import fs from 'fs-extra';
import * as _prebuildPost from './prebuild-post';
// import {spawn} from 'dr-comp-package/wfh/dist/process-utils';
import _cliDeploy from './cli-deploy';
import log4js from 'log4js';
import _genKeypair from './cli-keypair';

const program = new Command().name('prebuild');

program.version(pk.version);
program.option('-c, --config <config-file>',
  'Read config files, if there are multiple files, the latter one overrides previous one',
  (curr, prev) => prev.concat(curr), [] as string[]);
program.option('--prop <property-path=value as JSON | literal>',
  '<property-path>=<value as JSON | literal> ... directly set configuration properties, property name is lodash.set() path-like string\n e.g.\n',
  (curr, prev) => prev.concat(curr), [] as string[]);
program.option('--secret <credential code>', 'credential code for deploy to "prod" environment');

// ----------- deploy ----------
const deployCmd = program.command('deploy <app> [ts-scripts#function-or-shell]')
.option('--static', 'as an static resource build', false)
// .option('--secret <secret>', 'credential word')
.action(async (app: string, scriptsFile?: string) => {
  const opt = deployCmd.opts();
  await cfg.init({
    c: (program.opts().config as string[]).length === 0 ? undefined : program.opts().config,
    prop: (program.opts().prop as string[])
  });
  logConfig(cfg());
  prepareLazyNodeInjector({});

  await (require('./cli-deploy').default as typeof _cliDeploy)(opt.static, opt.env, app, program.opts().secret || null, scriptsFile);
});
createEnvOption(deployCmd);


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

// ------ send --------
const sendCmd = createEnvOption(program.command('send <app-name> <zip-file>'))
.description('Send static resource to remote server')
.action(async (appName, zip) => {
  await cfg.init({
    c: (program.opts().config as string[]).length === 0 ? undefined : program.opts().config,
    prop: (program.opts().prop as string[])
  });
  logConfig(cfg());
  prepareLazyNodeInjector({});

  await (require('./_send-patch') as typeof sp).send(sendCmd.opts().env, appName, zip, program.opts().secret);
});


// ------ mockzip --------
const mockzipCmd = program.command('mockzip');
mockzipCmd.option('-d,--dir <dir>', 'create a mock zip file in specific directory');
mockzipCmd.action(async () => {
  await cfg.init({
    c: (program.opts().config as string[]).length === 0 ? undefined : program.opts().config,
    prop: (program.opts().prop as string[])
  });
  logConfig(cfg());

  const Artifacts: typeof _Artifacts = require('./artifacts');

  const fileContent = '' + new Date().toUTCString();

  const file = mockzipCmd.opts().dir ? Path.resolve(mockzipCmd.opts().dir, 'prebuild-mock.zip') : cfg.resolve('destDir', 'prebuild-mock.zip');
  fs.mkdirpSync(Path.dirname(file));

  await Artifacts.writeMockZip(file, fileContent);
  const log = log4js.getLogger('prebuild');
  // tslint:disable-next-line: no-console
  log.info('Mock zip:', file);
});

// ---------- keypair ------------
const keypairCmd = program.command('keypair [file-name]')
.description('Generate a new asymmetric key pair')
.action(async (fileName) => {
  const genKeypair = require('./cli-keypair').default as typeof _genKeypair;
  await genKeypair(fileName, keypairCmd.opts());
});



program.usage(program.usage() + chalk.blueBright(
  '\nPrebuild and deploy static resource to file server and compile node server side TS files'));
program.parseAsync(process.argv);

function createEnvOption(cmd: commander.Command, required = true): ReturnType<commander.Command['requiredOption']> {
  const func = required ? cmd.requiredOption : cmd.option;

  return func.call(cmd, '--env <local | dev | test | stage | prod>', 'target environment, e.g. "local", "dev", "test", "stage", "prod", default as all environment');
}

