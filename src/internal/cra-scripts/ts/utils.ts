/* eslint-disable no-console */
import util, {isRegExp} from 'util';
import Path from 'path';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import _ from 'lodash';
import {gt} from 'semver';
import {config, PlinkSettings, log4File, ConfigHandlerMgr} from '@wfh/plink';
import * as _craPaths from './cra-scripts-paths';
import {CommandOption} from './build-options';
import {ReactScriptsHandler} from './types';
const log = log4File(__filename);

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
    value.forEach((row: any) => {
      out += indent + '    ' + printConfigValue(row, level + 1);
      out += ',\n';
    });
    out += indent + '  ]';
  } else if (typeof value === 'function') {
    out += value.name + '()';
  } else if (isRegExp(value)) {
    out += `${value.toString()}`;
  } else if (util.isObject(value)) {
    const proto = Object.getPrototypeOf(value);
    if (proto && proto.constructor !== Object) {
      out += `new ${proto.constructor.name as string}()`;
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
    (process.env as any).NODE_ENV = 'development';
  }
  return cmdOption;
}

export type BuildCliOpts = {
  watch: boolean;
  include?: string[];
  publicUrl?: string;
  sourceMap?: boolean;
  poll: boolean;
  refDll?: string[];
  tsck: CommandOption['tsck'];
} & NonNullable<PlinkSettings['cliOptions']>;

export function saveCmdOptionsToEnv(cmdName: string, opts: BuildCliOpts, buildType: 'app' | 'lib' | 'dll', entries: CommandOption['buildTargets']): CommandOption {
  const cmdOptions: CommandOption = {
    cmd: cmdName,
    buildType,
    buildTargets: entries,
    watch: opts.watch,
    refDllManifest: opts.refDll ? opts.refDll.map(item => Path.isAbsolute(item)? item : config.resolve('destDir', item)) : undefined,
    devMode: !!opts.dev,
    publicUrl: opts.publicUrl,
    // external: opts.external,
    includes: opts.include,
    webpackEnv: opts.dev ? 'development' : 'production',
    usePoll: opts.poll,
    tsck: opts.tsck
  };
  if (opts.publicUrl) {
    (process.env as any).PUBLIC_URL = opts.publicUrl;
  }
  if (opts.sourceMap) {
    log.info('source map is enabled');
    process.env.GENERATE_SOURCEMAP = 'true';
  }
  process.env.REACT_APP_cra_build = JSON.stringify(cmdOptions);

  // stateFactory.configureStore();
  // config.initSync(cmd.opts() as GlobalOptions);
  return cmdOptions;
}

export function craVersionCheck() {
  const craPackage = require(Path.resolve('node_modules/react-scripts/package.json')) as {version: string};
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (!gt(craPackage.version, '3.4.0')) {
    throw new Error(`react-scripts version must be greater than 3.4.0, current installed version is ${craPackage.version}`);
  }
}

export function runTsConfigHandlers(compilerOptions: any) {
  const {getConfigFileInPackage} = require('./cra-scripts-paths') as typeof _craPaths;
  const configFileInPackage = getConfigFileInPackage();
  const cmdOpt = getCmdOptions();

  config.configHandlerMgrChanged(mgr => mgr.runEachSync<ReactScriptsHandler>((cfgFile, result, handler) => {
    if (handler.tsCheckCompilerOptions != null) {
      log.info('Execute TS compiler option overrides', cfgFile);
      handler.tsCheckCompilerOptions(compilerOptions, cmdOpt);
    }
  }, 'create-react-app ts compiler config'));

  if (configFileInPackage) {
    const cfgMgr = new ConfigHandlerMgr([configFileInPackage]);
    cfgMgr.runEachSync<ReactScriptsHandler>((cfgFile, result, handler) => {
      if (handler.tsCheckCompilerOptions != null) {
        log.info('Execute TS checker compiler option overrides from ', cfgFile);
        handler.tsCheckCompilerOptions(compilerOptions, cmdOpt);
      }
    }, 'create-react-app ts checker compiler config');
  }
}

export function runTsConfigHandlers4LibTsd() {
  const compilerOptions = {paths: {}};
  const {getConfigFileInPackage} = require('./cra-scripts-paths') as typeof _craPaths;
  const configFileInPackage = getConfigFileInPackage();
  const cmdOpt = getCmdOptions();
  const log = log4File(__filename);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  config.configHandlerMgrChanged(mgr => mgr.runEachSync<ReactScriptsHandler>((cfgFile, _result, handler) => {
    if (handler.libTsdCompilerOptions != null) {
      log.info('Execute TSD compiler option overrides', cfgFile);
      handler.libTsdCompilerOptions(compilerOptions, cmdOpt);
    }
  }, 'create-react-app ts compiler config'));

  if (configFileInPackage) {
    const cfgMgr = new ConfigHandlerMgr([configFileInPackage]);
    cfgMgr.runEachSync<ReactScriptsHandler>((cfgFile, result, handler) => {
      if (handler.libTsdCompilerOptions != null) {
        log.info('Execute TSD compiler option overrides from ', cfgFile);
        handler.libTsdCompilerOptions(compilerOptions, cmdOpt);
      }
    }, 'create-react-app ts compiler config');
  }
  return compilerOptions;
}

export function createCliPrinter(msgPrefix: string) {
  const flushed$ = new rx.Subject<void>();
  const progressMsg$ = new rx.Subject<any[]>();
  const [cols, rows] = process.stdout.getWindowSize();
  let linesOfLastMsg = 0;
  rx.combineLatest(import('string-width'), progressMsg$)
    .pipe(
      op.concatMap(([{default: strWidth}, msg]) => {
        const textLines = cliLineWrapByWidth(util.format(msgPrefix, ...msg), cols, strWidth);
        const clearLinesDone = [] as Promise<any>[];
        if (linesOfLastMsg > textLines.length) {
          const numOfRowsToClear = linesOfLastMsg - textLines.length;
          const rowIdx = rows - linesOfLastMsg;
          for (let i = 0; i < numOfRowsToClear; i++) {
            clearLinesDone.push(
              new Promise<void>(resolve => process.stdout.cursorTo(0, i + rowIdx, resolve)),
              new Promise<void>(resolve => process.stdout.clearLine(0, resolve))
            );
          }
        }
        linesOfLastMsg = textLines.length;
        return rx.merge(...clearLinesDone, ...textLines.map((text, lineIdx) => Promise.all([
          new Promise<void>(resolve => process.stdout.cursorTo(0, rows - textLines.length + lineIdx, resolve)),
          new Promise<void>(resolve => process.stdout.write(text, (_err) => resolve())),
          new Promise<void>(resolve => process.stdout.clearLine(1, resolve))
        ])));
      }),
      op.map(() => flushed$.next())
    ).subscribe();

  return (...s: (string | number)[]) => {
    const flushed = flushed$.pipe(
      op.take(1)
    ).toPromise();

    progressMsg$.next(s);
    return flushed;
  };
}

export function cliLineWrapByWidth(str: string, columns: number, calStrWidth: (str: string) => number) {
  return str.split(/\n\r?/).reduce((lines, line) => {
    lines.push(...cliLineWrap(line, columns, calStrWidth));
    return lines;
  }, [] as string[]);
}

function cliLineWrap(str: string, columns: number, calStrWidth: (str: string) => number) {
  const lines = [] as string[];
  let offset = 0;
  let lastWidthData: [string, number, number] | undefined;

  while (offset < str.length) {
    // look for closest end position
    const end = findClosestEnd(str.slice(offset), columns) + 1;
    const lineEnd = offset + end;
    lines.push(str.slice(offset, lineEnd));
    offset = lineEnd;
  }

  function findClosestEnd(str: string, target: number) {
    let low = 0, high = str.length;
    while (high > low) {
      const mid = low + ((high - low) >> 1);
      const len = quickWidth(str, mid + 1);
      // console.log('binary range', str, 'low', low, 'high', high, 'mid', mid, 'len', len);
      if (target < len) {
        high = mid;
      } else if (len < target) {
        low = mid + 1;
      } else {
        return mid;
      }
    }
    // console.log('binary result', high);
    // Normal binary search should return "hight", because it returns the non-existing index for insertion,
    // but we are looking for an existing index number of whose value (ranking) is smaller than or equal to "target",
    // so "minus 1" is needed here
    return high - 1;
  }

  /**
   * @param end - excluded, same as parameter "end" in string.prototype.slice(start, end)
   */
  function quickWidth(str: string, end: number) {
    if (lastWidthData && lastWidthData[0] === str) {
      const lastEnd = lastWidthData[1];
      if (end > lastEnd) {
        lastWidthData[2] = lastWidthData[2] + calStrWidth(str.slice(lastEnd, end));
        lastWidthData[1] = end;
      } else if (end < lastEnd) {
        lastWidthData[2] = lastWidthData[2] - calStrWidth(str.slice(end, lastEnd));
        lastWidthData[1] = end;
      }
      return lastWidthData[2];
    }
    return calStrWidth(str.slice(0, end));
  }
  return lines;
}
