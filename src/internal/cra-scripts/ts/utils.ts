// tslint:disable: no-console
import util, { isRegExp } from 'util';
import {CommandOption} from './build-options';
import Path from 'path';
import _ from 'lodash';
import {gt} from 'semver';
import commander from 'Commander';
import * as _craPaths from './cra-scripts-paths';
import {config, log4File, ConfigHandlerMgr, findPackagesByNames} from '@wfh/plink';
import {ReactScriptsHandler} from './types';

export const getReportDir = () => config.resolve('destDir', 'cra-scripts.report');

export function drawPuppy(slogon: string, message?: string) {
  if (!slogon) {
    slogon = 'Congrads! Time to publish your shit!';
  }

  const line = '-'.repeat(slogon.length);
  console.log('\n   ' + line + '\n' +
    ` < ${slogon} >\n` +
    '   ' + line + '\n' +
    '\t\\   ^__^\n\t \\  (oo)\\_______\n\t    (__)\\       )\\/\\\n\t        ||----w |\n\t        ||     ||');
  if (message) {
    console.log(message);
  }
}

export function printConfig(c: any, level = 0): string {
  const indent = '  '.repeat(level);
  let out = '{\n';
  for (const prop of Object.keys(c)) {
    const value = c[prop];
    out += indent + `  ${JSON.stringify(prop)}: ${printConfigValue(value, level)},\n`;
  }
  out += indent + '}';
  return out;
}

function printConfigValue(value: any, level: number): string {
  let out = '';
  const indent = '  '.repeat(level);
  if (util.isString(value) || util.isNumber(value) || util.isBoolean(value)) {
    out += JSON.stringify(value) + '';
  } else if (Array.isArray(value)) {
    out += '[\n';
    (value as any[]).forEach((row: any) => {
      out += indent + '    ' + printConfigValue(row, level + 1);
      out += ',\n';
    });
    out += indent + '  ]';
  } else if (util.isFunction(value)) {
    out += value.name + '()';
  } else if (isRegExp(value)) {
    out += `${value.toString()}`;
  } else if (util.isObject(value)) {
    const proto = Object.getPrototypeOf(value);
    if (proto && proto.constructor !== Object) {
      out += `new ${proto.constructor.name}()`;
    } else {
      out += printConfig(value, level + 1);
    }
  } else {
    out += ' unknown';
  }
  return out;
}


// TODO: move to a Redux store
export function getCmdOptions(): CommandOption {
  const cmdOption: CommandOption = JSON.parse(process.env.REACT_APP_cra_build!);
  if (cmdOption.devMode || cmdOption.watch) {
    (process.env as any).NODE_ENV = 'development';
  }
  return cmdOption;
}

export function saveCmdOptionsToEnv(pkgName: string, cmd: commander.Command, buildType: 'app' | 'lib'): CommandOption {
  const opts = cmd.opts();
  const completeName = [...findPackagesByNames([pkgName])][0]!.name;
  const cmdOptions: CommandOption = {
    buildType,
    buildTarget: completeName,
    watch: opts.watch,
    devMode: opts.dev,
    publicUrl: opts.publicUrl,
    includes: opts.include,
    webpackEnv: opts.dev ? 'development' : 'production'
  };
  if (cmd.opts().publicUrl) {
    (process.env as any).PUBLIC_URL = cmd.opts().publicUrl;
  }
  process.env.REACT_APP_cra_build = JSON.stringify(cmdOptions);

  // stateFactory.configureStore();
  // config.initSync(cmd.opts() as GlobalOptions);
  return cmdOptions;
}

// function withClicOpt(cmd: commander.Command) {
//   cmd.option('-w, --watch', 'Watch file changes and compile', false)
//   .option('--dev', 'set NODE_ENV to "development", enable react-scripts in dev mode', false)
//   .option('--purl, --publicUrl <string>', 'set environment variable PUBLIC_URL for react-scripts', '/');
//   withGlobalOptions(cmd);
// }


export function craVersionCheck() {
  const craPackage = require(Path.resolve('node_modules/react-scripts/package.json'));
  if (!gt(craPackage.version, '3.4.0')) {
    throw new Error(`react-scripts version must be greater than 3.4.0, current installed version is ${craPackage.version}`);
  }
}

export function runTsConfigHandlers(compilerOptions: any) {
  const {getConfigFileInPackage}: typeof _craPaths = require('./cra-scripts-paths');
  const configFileInPackage = getConfigFileInPackage();
  const cmdOpt = getCmdOptions();
  const log = log4File(__filename);
  config.configHandlerMgrChanged(mgr => mgr.runEachSync<ReactScriptsHandler>((cfgFile, result, handler) => {
    if (handler.tsCompilerOptions != null) {
      log.info('Execute TS compiler option overrides', cfgFile);
      handler.tsCompilerOptions(compilerOptions, cmdOpt);
    }
  }, 'create-react-app ts compiler config'));

  if (configFileInPackage) {
    const cfgMgr = new ConfigHandlerMgr([configFileInPackage]);
    cfgMgr.runEachSync<ReactScriptsHandler>((cfgFile, result, handler) => {
      if (handler.tsCompilerOptions != null) {
        log.info('Execute TS compiler option overrides from ', cfgFile);
        handler.tsCompilerOptions(compilerOptions, cmdOpt);
      }
    }, 'create-react-app ts compiler config');
  }
}
