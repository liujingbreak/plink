// tslint:disable: no-console
import util, { isRegExp } from 'util';
import {CommandOption} from './build-options';
import Path from 'path';
import _ from 'lodash';
import {gt} from 'semver';
import commander from 'Commander';
import {stateFactory, withGlobalOptions, GlobalOptions} from 'dr-comp-package/wfh/dist';
import config from 'dr-comp-package/wfh/dist/config';
import logConfig from 'dr-comp-package/wfh/dist/log-config';

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

export function getCmdOptions(): CommandOption {
  const cmdOption: CommandOption = JSON.parse(process.env.REACT_APP_cra_build!);
  if (cmdOption.devMode || cmdOption.watch) {
    process.env.NODE_ENV = 'development';
  }
  return cmdOption;
}


export function saveCmdArgToEnv() {
  // console.log('[saveCmdArgToEnv]', process.argv);
  process.title = 'Plink';
  const pk = require('../package.json');
  const program = new commander.Command('cra-scripts')
  .action(() => {
    program.outputHelp();
    process.exit(0);
  });
  program.version(pk.version, '-v, --vers', 'output the current version');
  program.usage('react-scripts -r dr-comp-package/register -r @bk/cra-scripts build ' + program.usage());

  const libCmd = program.command('lib <package-name>')
  .description('Compile library')
  .action(pkgName => {
    saveCmdOptionsToEnv(pkgName, libCmd, 'lib');
  });
  withClicOpt(libCmd);

  const appCmd = program.command('app <package-name>')
  .description('Compile appliaction')
  .action(pkgName => {
    saveCmdOptionsToEnv(pkgName, appCmd, 'app');
  });
  withClicOpt(appCmd);

  program.parse(process.argv);

}

function saveCmdOptionsToEnv(pkgName: string, cmd: commander.Command, buildType: 'app' | 'lib'): CommandOption {
  const cmdOptions: CommandOption = {
    buildType,
    buildTarget: pkgName,
    watch: cmd.opts().watch,
    devMode: cmd.opts().dev,
    publicUrl: cmd.opts().publicUrl
  };
  process.env.PUBLIC_URL = cmd.opts().publicUrl;
  console.log('process.env.PUBLIC_URL=', process.env.PUBLIC_URL);
  process.env.REACT_APP_cra_build = JSON.stringify(cmdOptions);

  stateFactory.configureStore();
  const setting = config.initSync(cmd.opts() as GlobalOptions);
  logConfig(setting);
  return cmdOptions;
}

function withClicOpt(cmd: commander.Command) {
  cmd.option('-w, --watch', 'Watch file changes and compile', false)
  .option('--dev', 'set NODE_ENV to "development", enable react-scripts in dev mode', false)
  .option('--purl, --publicUrl <string>', 'set environment variable PUBLIC_URL for react-scripts', '/');
  withGlobalOptions(cmd);
}


export function craVersionCheck() {
  const craPackage = require(Path.resolve('node_modules/react-scripts/package.json'));
  if (!gt(craPackage.version, '3.4.0')) {
    throw new Error(`react-scripts version must be greater than 3.4.0, current installed version is ${craPackage.version}`);
  }
}
