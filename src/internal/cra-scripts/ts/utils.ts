// tslint:disable: no-console
import util, { isRegExp } from 'util';
import {CommandOption} from './build-options';
import fs from 'fs';
import Path from 'path';

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
  return {
    buildTarget: process.env.REACT_APP_cra_build_target as any,
    buildType: process.env.REACT_APP_cra_build_type as any
  };
}

export function saveCmdArgToEnv() {
  const argv = process.argv.slice(2);
  // console.log(`saveCmdArgToEnv() ${process.argv}`);
  if (argv.length > 0) {
    process.env.REACT_APP_cra_build_type = argv[0];
  }
  if (argv.length > 1) {
    process.env.REACT_APP_cra_build_target = argv[1];
  }
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
