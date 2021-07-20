#!/usr/bin/env node
// import commander from 'commander';
import Path from 'path';
import cfg from '@wfh/plink/wfh/dist/config';
import * as _Artifacts from './artifacts';
import * as sp from './_send-patch';
import fs from 'fs-extra';
import * as _prebuildPost from './prebuild-post';
// import {spawn} from '@wfh/plink/wfh/dist/process-utils';
import _cliDeploy from './cli-deploy';
import log4js from 'log4js';
import _genKeypair from './cli-keypair';
import {CliExtension, GlobalOptions} from '@wfh/plink';
import * as _unzip from './cli-unzip';
import plink from '__plink';

const cliExt: CliExtension = (program) => {

  // ----------- deploy ----------
  const deployCmd = program.command('deploy <app-name> [ts-scripts#function-or-shell]')
  .description('Deploy (for Plink internally)')
  .option('--push,--static', 'push to remote file server after build script execution finished', false)
  .option('--no-push-branch', 'Do not push to release branch or create tag', false)
  // .option('--secret <secret>', 'credential word')
  .option('--secret <credential code>', 'credential code for deploy to "prod" environment')
  .option('--cc <commit comment>', 'The commit comment of the deployment commit')
  .option('--force', 'Force overwriting remote zip assets without SHA1 checksum comparison, by default remote server will reject file of existing same SHA1',
    false)
  .action(async (app: string, scriptsFile?: string) => {
    const opt = deployCmd.opts() as GlobalOptions & {static: boolean; force: boolean; secret?: string; pushBranch: boolean;};
    if (opt.env == null) {
      plink.logger.error(' option "--env <local | dev | test | stage | prod>" must be provided');
      return;
    }
    const cliDeploy = (require('./cli-deploy').default as typeof _cliDeploy);
    await cliDeploy(opt.static, opt.env || 'local', app, opt.pushBranch, opt.force , opt.secret || null, scriptsFile,
      deployCmd.opts().cc);
  });
  // createEnvOption(deployCmd);
  // -------- githash ----------
  const githashCmd = program.command('githash')
    .description('List git hash information of each static resource zip file in directory "install-<env>"')
    .action(async () => {
      const Artifacts = require('./artifacts') as typeof _Artifacts;
      if (githashCmd.opts().env) {
        // eslint-disable-next-line no-console
        console.log(await Artifacts.stringifyListVersions(githashCmd.opts().env));
      } else {
        // eslint-disable-next-line no-console
        console.log(await Artifacts.stringifyListAllVersions());
      }
    });
  // withGlobalOptions(githashCmd);

  // ------ send --------
  const sendCmd = program.command('send <app-name> <zipFileOrDir>')
    .description('Send static resource to remote server')
    .option('--con <number of concurrent request>', 'Send file with concurrent process for multiple remote server nodes', '1')
    .option('--nodes <number of remote nodes>', 'Number of remote server nodes', '1')
    .option('--secret <credential code>', 'credential code for deploy to "prod" environment')
    .option('--force', 'Force overwriting remote zip assets without SHA1 checksum comparison, by default remote server will reject file of existing same SHA1',
      false)
    .action(async (appName: string, zip: string) => {
      await (require('./_send-patch') as typeof sp).send(sendCmd.opts().env, appName, zip,
      parseInt(sendCmd.opts().con, 10),
      parseInt(sendCmd.opts().nodes, 10),
      sendCmd.opts().force,
      sendCmd.opts().secret);
    });
  // withGlobalOptions(sendCmd);

  // ------ mockzip --------
  const mockzipCmd = program.command('mockzip')
    .option('-d,--dir <dir>', 'create a mock zip file in specific directory')
    .action(async () => {
      const Artifacts = require('./artifacts') as typeof _Artifacts;

      const fileContent = '' + new Date().toUTCString();

      const file = mockzipCmd.opts().dir ? Path.resolve(mockzipCmd.opts().dir, 'prebuild-mock.zip') : cfg.resolve('destDir', 'prebuild-mock.zip');
      fs.mkdirpSync(Path.dirname(file));

      await Artifacts.writeMockZip(file, fileContent);
      const log = log4js.getLogger('prebuild');
      // eslint-disable-next-line no-console
      log.info('Mock zip:', file);
    });
  // withGlobalOptions(mockzipCmd);

  // ---------- keypair ------------
  const keypairCmd = program.command('keypair [file-name]')
    .description('Generate a new asymmetric key pair')
    .action(async (fileName) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const genKeypair = require('./cli-keypair').default as typeof _genKeypair;
      await genKeypair(fileName, keypairCmd.opts());
    });

  program.command('functions <file>')
    .description('List exported functions for *.ts, *.d.ts, *.js file')
    .action(async file => {
      (await import('./cli-ts-ast-util')).listExportedFunction(file);
    });
};

export {cliExt as default};


// function createEnvOption(cmd: commander.Command, required = true): ReturnType<commander.Command['requiredOption']> {
//   const func = required ? cmd.requiredOption : cmd.option;
//   return func.call(cmd, '--env <local | dev | test | stage | prod>', 'target environment, e.g. "local", "dev", "test", "stage", "prod", default as all environment');
// }

