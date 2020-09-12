// tslint:disable: no-console
import util, { isRegExp } from 'util';
import {CommandOption} from './build-options';
import fs from 'fs';
import Path from 'path';
import _ from 'lodash';
import {gt} from 'semver';
import commander from 'Commander';

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

export const getCmdOptions = _.memoize(_getCmdOptions);

function _getCmdOptions(): CommandOption {
  const buildTarget = process.env.REACT_APP_cra_build_target as any;
  const buildType = process.env.REACT_APP_cra_build_type as any;
  const argvMap = cliArgvMap();
  console.log('[command argv]', Array.from(argvMap.entries()).map(en => Array.from(en)));
  if (argvMap.get('dev') || argvMap.get('watch')) {
    process.env.NODE_ENV = 'development';
  }

  return {
    buildTarget,
    buildType,
    watch: buildType === 'lib' && !!argvMap.get('watch'),
    argv: argvMap
  };
}

function cliArgvMap(): Map<string, string|boolean> {
  const argvMap = new Map<string, string|boolean>();
  const argv = process.argv.slice(2);
  for (let i = 0, l = argv.length; i < l; i++) {
    if (argv[i].startsWith('-')) {
      const key = argv[i].slice(argv[i].lastIndexOf('-') + 1);
      if ( i >= argv.length - 1 || (argv[i + 1] && argv[i + 1].startsWith('-'))) {
        argvMap.set(key, true);
      } else {
        argvMap.set(key, argv[++i]);
      }
    }
  }
  return argvMap;
}

export function saveCmdArgToEnv() {
  process.title = 'Plink';
  const pk = require('../package.json');
  const program = new commander.Command('react-scripts')
  .action(() => {
    program.outputHelp();
    process.exit(0);
  });
  program.version(pk.version, '-v, --vers', 'output the current version');

  program.command('lib <package-name>')
  .description('Compile library')
  .action(pkgName => {
    process.env.REACT_APP_cra_build_type = 'lib';
    process.env.REACT_APP_cra_build_target = pkgName;
  });

  program.command('app <package-name>')
  .description('Compile appliaction')
  .action(pkgName => {
    process.env.REACT_APP_cra_build_target = pkgName;
  });

  program.parse(process.argv);
  // const argv = process.argv.slice(2);
  // console.log(`saveCmdArgToEnv() ${process.argv}`);
  // if (argv.length > 0) {
  //   process.env.REACT_APP_cra_build_type = argv[0];
  // }
  // if (argv.length > 1) {
  //   process.env.REACT_APP_cra_build_target = argv[1];
  // }
}

export function findDrcpProjectDir() {
  const target = 'dr-comp-package/package.json';
  const paths = require.resolve.paths(target);
  for (let p of paths!) {
    if (fs.existsSync(Path.resolve(p, target))) {
      if (/[\\/]node_modules$/.test(p)) {
        if (fs.lstatSync(p).isSymbolicLink())
          p = fs.realpathSync(p);
        return p.slice(0, - '/node_modules'.length);
      }
      return p;
    }
  }
}

export function craVersionCheck() {
  const craPackage = require(Path.resolve('node_modules/react-scripts/package.json'));
  if (!gt(craPackage.version, '3.4.0')) {
    throw new Error(`react-scripts version must be greater than 3.4.0, current installed version is ${craPackage.version}`);
  }
}
