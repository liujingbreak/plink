#!/usr/bin/env node
import Path from 'path';
import {fork} from 'child_process';
import {CliExtension, findPackagesByNames, packageOfFileFactory} from '@wfh/plink';
import {config, log4File, plinkEnv, commander, dispatcher as plinkStoreDispatcher} from '@wfh/plink';
import {getSetting} from '../../isom/cra-scripts-setting';
import {saveCmdOptionsToEnv, BuildCliOpts} from '../utils';
import * as _preload from '../preload';
// import inspector from 'inspector';
// inspector.open(9222, '0.0.0.0', true);
const log = log4File(__filename);

const cli: CliExtension = (program) => {
  const buildCmd = program.command('cra-build')
    .description('Compile react application or library (work with create-react-app v5.0.1)')
    .argument('<app|lib|dll>', '"app" stands for building a complete application like create-react-app,\n' +
    '"lib" stands for building a library')
    .argument('[packages_or_entries...]', '(multiple) target packages, the "scope" name part can be omitted, or entry file path (for DLL), or module name (for DLL)')
    .option('-w, --watch', 'when argument is "lib", watch file changes and compile', false)
    .option('--ref-dll,--rd <manifest-file>', 'Reference to DLL manifest file, file can be absolute or relative path to "dist" directory', arrayOptionFn, [])
    .option('-i, --include <module-path-regex>',
      '(multiple value), when argument is "lib", we will set "external" property of Webpack configuration for all request not begin with "." (not relative path), ' +
    'meaning all non-relative modules will not be included in the output bundle file, you need to explicitly provide a list in' +
    ' Regular expression (e.g. -i \'^someLib(/|$)\' -i \'^someLib2(/|$)\' -i ...) ' +
    ' to make them be included in bundle file. To make specific module (React) external: -i \'^(?!react(-dom)?($|/))\'', arrayOptionFn, [])
    .option('--source-map', 'set environment variable GENERATE_SOURCEMAP to "true" (see https://create-react-app.dev/docs/advanced-configuration', false)
    .action((type, entries: string[]) => {
      if (process.cwd() !== Path.resolve(plinkEnv.workDir)) {
        process.chdir(Path.resolve(plinkEnv.workDir));
      }
      runReactScripts(buildCmd.name(), buildCmd.opts(), type, entries);

      require('react-scripts/scripts/build');
    });
  withClicOpt(buildCmd);

  program.command('cra-build-tsd <package-name>')
    .description('Compile packages for only generating Typescript definition files. If you are creating a library, ' +
      'command "cra-build" will also generate tsd file along with client bundle')
    .argument('package-name', 'target package name, the "scope" name part can be omitted')
    .action(async (pkgName): Promise<void> => {
      runReactScripts(StartCmd.name(), StartCmd.opts(), 'lib', pkgName);
      await (await import('../tsd-generate.js')).buildTsd([pkgName]);
    });


  const StartCmd = program.command('cra-start')
    .argument('<packages_or_entries...>', '(multiple) target packages, the "scope" name part can be omitted, or entry file path') .description('Run CRA start script for react application or library (work with create-react-app v5.0.1)')
    .option('--rd, --ref-dll <manifest-file>', 'Reference to DLL manifest file, file can be absolute or relative path to "dist" directory', (v, p) => {p.push(v); return p;}, [] as string[])
    .option('--use-poll, --poll', 'use Webpack watch option "poll"', false)
    .option('--no-ts-checker, --no-tsck', 'disable forked-ts-checker-webpack-plugin for Typescript', false)
    .action((entries) => {
      if (process.cwd() !== Path.resolve(plinkEnv.workDir)) {
        process.chdir(Path.resolve(plinkEnv.workDir));
      }
      runReactScripts(StartCmd.name(), StartCmd.opts(), 'app', entries);
      require('react-scripts/scripts/start');
    });
  withClicOpt(StartCmd);

  program.command('cra-open <url>')
    .argument('<url>', 'The URL')
    .description('Run react-dev-utils/openBrowser')
    .action(async url => {
      (await import('../cra-open-browser.cjs')).default.default(url);
    });

  program.command('cra-analyze')
    .alias('cra-analyse')
    .argument('[js-dir]', 'Normally this path should be <root-dir>dist/static/<output-path-basename>/static/js')
    .description('Run source-map-explorer')
    .action(async (outputPath: string) => {
      const smePkgDir = Path.dirname(require.resolve('source-map-explorer/package.json'));
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const smeBin = require(Path.resolve(smePkgDir, 'package.json')).bin['source-map-explorer'] as string;

      await new Promise<any>((resolve, rej) => {
        const cp = fork(Path.resolve(smePkgDir, smeBin), [
          '--gzip', '--no-root',
          Path.resolve(outputPath ? outputPath : '', '*.js')
        ], {stdio: ['inherit', 'inherit', 'inherit', 'ipc']});
        cp.on('error', err => {
          console.error(err);
          rej(err);
        });
        cp.on('exit', (_sign, code) => {resolve(code); });
      });
    });
};

function withClicOpt(cmd: commander.Command) {
  cmd.option('--purl, --publicUrl <string>', 'set environment variable PUBLIC_URL for react-scripts', undefined);
}

function arrayOptionFn(curr: string, prev: string[] | undefined) {
  if (prev)
    prev.push(curr);
  return prev;
}

function runReactScripts(cmdName: string, opts: BuildCliOpts, type: 'app' | 'lib' | 'dll', entries: string[]) {
  plinkStoreDispatcher.changeActionOnExit('none');
  if (entries.length === 0 && getSetting().entries?.length != null) {
    entries = getSetting().entries ?? [];
  }
  if (entries.length == 0) {
    throw new Error('Specifiy at least one "[packages_or_entries]" argument in command line or respective property in "-c" setting file');
  }
  const packageLocator = packageOfFileFactory();
  const cfg = config;
  const targetEntries = entries.map(entry => {
    const pkg = [...findPackagesByNames([entry])][0];
    if (pkg) {
      if (pkg.json.plink || pkg.json.dr) {
        // It is a Plink package
        return {pkg};
      } else {
        // It is a 3rd-party package
        return {file: entry};
      }
    } else {
      const file = Path.resolve(entry);
      const pkg = packageLocator.getPkgOfFile(file)?.orig;
      if (pkg && (pkg.json.plink || pkg.json.dr)) {
          return {pkg, file};
      } else {
        return {file};
      }
    }
  });
  saveCmdOptionsToEnv(cmdName, opts, type, targetEntries);
  if (process.env.PORT == null && cfg().port)
    process.env.PORT = cfg().port + '';

  if (!['app', 'lib', 'dll'].includes(type)) {
    log.error('type argument must be one of \'app\', \'lib\', \'dll\'');
    return;
  }
  const preload = require('../preload') as typeof _preload;
  preload.poo();
}

export {cli as default};

