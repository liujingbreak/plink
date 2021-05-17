#!/usr/bin/env node
// import fs from 'fs';
import {CliExtension} from '@wfh/plink';
// import replacePatches, { ReplacementInf } from '@wfh/plink/wfh/dist/utils/patch-text';
import Path from 'path';
import commander from 'Commander';
import {saveCmdOptionsToEnv} from '../utils';
import {fork} from 'child_process';
// import walkPackagesAndSetupInjector from '@wfh/webpack-common/dist/initInjectors';
// import {initTsconfig} from './cli-init';
import * as _preload from '../preload';
import {config} from '@wfh/plink';
import plink from '__plink';
// import {ObjectAst} from '@wfh/plink/wfh/di st/utils/json-sync-parser';

const cli: CliExtension = (program) => {
  const buildCmd = program.command('cra-build <app|lib> <package-name>')
  .description('Compile react application or library (work with create-react-app v4.0.3)',{
    'app|lib': '"app" stands for building a complete application like create-react-app,\n' +
      '"lib" stands for building a library',
    'package-name': 'target package name, the "scope" name part can be omitted'
  })
  .option('-w, --watch', 'When build a library, watch file changes and compile', false)
  // .option('--tsd-only', 'In "lib" mode (building a library), only build out Typescript tsd file')
  // .option('--dev', 'set NODE_ENV to "development", enable react-scripts in dev mode', false)
  .option('-i, --include <module-path-regex>',
  '(multiple value), when argument is "lib", we will set external property of Webpack configuration for all request not begin with "." (except "@babel/runtimer"), ' +
  'meaning all external modules will not be included in the output bundle file, you need to explicitly provide a list in' +
  ' Regular expression (e.g. -i "^someLib/?" -i "^someLib2/?" -i ...) to make them be included in bundle file', arrayOptionFn, [])
  .option('--source-map', 'set environment variable GENERATE_SOURCEMAP to "true" (see https://create-react-app.dev/docs/advanced-configuration', false)
  .action(async (type, pkgName) => {
    await initEverything(buildCmd, type, pkgName);
    if (buildCmd.opts().sourceMap) {
      plink.logger.info('source map is enabled');
      process.env.GENERATE_SOURCEMAP = 'true';
    }
    require('react-scripts/scripts/build');
    // if (buildCmd.opts().tsdOnly) {
    //   await (await import('../tsd-generate')).buildTsd();
    // } else {
    //   require('react-scripts/scripts/build');
    // }
  });
  withClicOpt(buildCmd);

  program.command('cra-build-tsd <package-name...>')
    .description('Compile packages for only generating Typescript definition files. If you are creating a library, ' +
      'command "cra-build" will also generate tsd file along with client bundle', {
        'package-name': 'target package name, the "scope" name part can be omitted'
      })
    .action(async pkgNames => {
      // console.log(pkgNames);
      await (await import('../tsd-generate')).buildTsd(pkgNames);
    });

  const StartCmd = program.command('cra-start <package-name>')
  .description('Run CRA start script for react application or library (work with create-react-app v4.0.3)',{
    'package-name': 'target package name, the "scope" name part can be omitted'
  })
  .action(async (pkgName) => {
    await initEverything(StartCmd, 'app', pkgName);
    require('react-scripts/scripts/start');
  });
  withClicOpt(StartCmd);

  // const initCmd = program.command('cra-init')
  // .description('Initial workspace files based on files which are newly generated by create-react-app')
  // .action(async () => {
  //   const opt: GlobalOptions = {prop: [], config: []};
  //   await initConfigAsync(opt);
  //   // await initTsconfig();
  // });
  // // withGlobalOptions(initCmd);

  program.command('cra-analyze [webpck-output-path]')
  .alias('cra-analyse')
  .description('Run source-map-explorer', {
    'webpck-output-path': 'Normally this path should be <root-dir>dist/static/<output-path-basename>, under which there are files matches subpath "static/js/*.js"'
  })
  .action(async (outputPath: string) => {
    const smePkgDir = Path.dirname(require.resolve('source-map-explorer/package.json'));
    const smeBin: string = require(Path.resolve(smePkgDir, 'package.json')).bin['source-map-explorer'];

    await new Promise<any>((resolve, rej) => {
      const cp = fork(Path.resolve(smePkgDir, smeBin), [
        '--gzip', '--no-root',
        Path.resolve(outputPath ? outputPath : '', 'static/js/*.js')
      ], {stdio: ['inherit', 'inherit', 'inherit', 'ipc']});
      cp.on('error', err => {
        console.error(err);
        rej(err);
      });
      cp.on('exit', (sign, code) => {resolve(code);});
    });
  });
  // smeCmd.usage(smeCmd.usage() + '\n  app-base-path: ')
};

function withClicOpt(cmd: commander.Command) {
  cmd.option('--purl, --publicUrl <string>', 'set environment variable PUBLIC_URL for react-scripts', undefined);
}

function arrayOptionFn(curr: string, prev: string[] | undefined) {
  if (prev)
    prev.push(curr);
  return prev;
}

async function initEverything(buildCmd: commander.Command, type: 'app' | 'lib', pkgName: string) {
  // const cfg = await initConfigAsync(buildCmd.opts() as GlobalOptions);
  const cfg = config;
  // await initTsconfig();
  saveCmdOptionsToEnv(pkgName, buildCmd, type);
  if (process.env.PORT == null && cfg().port)
    process.env.PORT = cfg().port + '';
  // await walkPackagesAndSetupInjector(process.env.PUBLIC_URL || '/');
  if (!['app', 'lib'].includes(type)) {

    plink.logger.error(`type argument must be one of "${['app', 'lib']}"`);
    return;
  }
  const preload: typeof _preload = require('../preload');
  preload.poo();
}

export {cli as default};

