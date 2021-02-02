import commander from 'commander';
import {WorkspaceState, PackageInfo} from '../package-mgr';
import chalk from 'chalk';
import {hlDesc, arrayOptionFn} from './utils';
import * as _bootstrap from '../utils/bootstrap-process';
import { GlobalOptions, OurCommandMetadata, OurAugmentedCommander, CliExtension } from './types';
import {cliActionDispatcher} from './cli-slice';
import log4js from 'log4js';
const log = log4js.getLogger('plink.override-commander');

export class CommandOverrider {
  private loadedCmdMap = new Map<string, string>();
  private origPgmCommand: commander.Command['command'];

  constructor(private program: commander.Command, ws?: WorkspaceState) {
    this.origPgmCommand = program.command;
  }

  forPackage(pk: PackageInfo, pkgFilePath: string, funcName: string): void;
  forPackage(pk: null, commandCreation: (program: commander.Command) => void): void;
  forPackage(pk: PackageInfo | null,
    pkgFilePath: string | ((program: commander.Command) => void),
    funcName?: string) {
    const self = this;
    const commandMetaInfos: OurCommandMetadata[] = [];
    let filePath: string | null = null;

    function command(this: commander.Command, nameAndArgs: string, ...restArgs: any[]) {

      const cmdName = /^\S+/.exec(nameAndArgs)![0];
      if (self.loadedCmdMap.has(cmdName)) {
        if (filePath)
          throw new Error(`Conflict command name ${cmdName} from extensions "${filePath}" and "${this.loadedCmdMap.get(cmdName)}"`);
        else
          throw new Error(`Conflict with existing Plink command name ${cmdName}`);
      }

      self.loadedCmdMap.set(cmdName, filePath ? filePath : '@wfh/plink');

      const subCmd: commander.Command = self.origPgmCommand.call(this, nameAndArgs, ...restArgs);
      const meta: Partial<OurCommandMetadata> = (subCmd as OurAugmentedCommander)._plinkMeta = {
        pkgName: pk ? pk.name : '@wfh/plink',
        nameAndArgs,
        options: [],
        desc: pk == null ? '' : chalk.blue(`[${pk.name}]`)
      };
      commandMetaInfos.push(meta as OurCommandMetadata);

      subCmd.description(meta.desc!);

      const originDescFn = subCmd.description;

      subCmd.description = description as any;

      const originActionFn = subCmd.action;
      subCmd.action = action;

      const originAliasFn = subCmd.alias;
      subCmd.alias = alias;

      const originOptionFn = subCmd.option;
      subCmd.option = createOptionFn(false, originOptionFn);

      const originReqOptionFn = subCmd.requiredOption;
      subCmd.requiredOption = createOptionFn(true, originReqOptionFn);

      function description(this: commander.Command, str: string, ...remainder: any[]) {
        if (pk)
          str = chalk.blue(`[${pk.name}]`) + ' ' + str;
        (this as OurAugmentedCommander)._plinkMeta.desc = str;
        return originDescFn.call(this, str, ...remainder);
      }

      function alias(this: commander.Command, alias?: string) {
        if (alias)
          (this as OurAugmentedCommander)._plinkMeta.alias = alias;
        return originAliasFn.apply(this, arguments);
      }

      function createOptionFn(isRequired: boolean, originOptionFn: commander.Command['option'] | commander.Command['requiredOption']) {
        return function(this: commander.Command, flags: string, desc: string, ...remaining: any[]) {
          let defaultValue: any;
          if (remaining.length > 1) {
            defaultValue = remaining[remaining.length - 1];
          }
          (this as OurAugmentedCommander)._plinkMeta.options!.push({
            flags, desc, defaultValue, isRequired
          });
          return originOptionFn.apply(this, arguments);
        };
      }

      function action(this: commander.Command, cb: (...args: any[]) => any) {
        function actionCallback() {
          const {initConfig} = require('../utils/bootstrap-process') as typeof _bootstrap;
          if ((subCmd.opts() as GlobalOptions).verbose) {
            log4js.configure({
              appenders: {
                out: {
                  type: 'stdout',
                  layout: {type: 'pattern', pattern: '%[[%p] %c%] - %m'}
                }
              },
              categories: {
                default: {appenders: ['out'], level: 'debug'},
                plink: {appenders: ['out'], level: 'debug'}
              }
            });
          }
          initConfig(subCmd.opts() as GlobalOptions);
          return cb.apply(this, arguments);
        }

        return originActionFn.call(this, actionCallback);
      }

      withGlobalOptions(subCmd);
      return subCmd;
    }

    this.program.command = command as any;

    if (typeof pkgFilePath === 'function') {
      pkgFilePath(this.program);
      cliActionDispatcher.addCommandMeta({pkg: '@wfh/plink', metas: commandMetaInfos});
    } else if (pk) {
      try {
        filePath = require.resolve(pk.name + '/' + pkgFilePath);
        const subCmdFactory: CliExtension = funcName ? require(filePath)[funcName] :
          require(filePath);
        subCmdFactory(this.program);
        cliActionDispatcher.addCommandMeta({pkg: pk.name, metas: commandMetaInfos});
      } catch (e) {
        // tslint:disable-next-line: no-console
        log.warn(`Failed to load command line extension in package ${pk.name}: "${e.message}"`, e);
      } finally {
        filePath = null;
      }
    }
  }
}

export function withGlobalOptions(program: commander.Command): commander.Command {
  program.option('-c, --config <config-file>',
    hlDesc('Read config files, if there are multiple files, the latter one overrides previous one'),
    (value, prev) => { prev.push(...value.split(',')); return prev;}, [] as string[])
  .option('--prop <expression>',
    hlDesc('<property-path>=<value as JSON | literal> ... directly set configuration properties, property name is lodash.set() path-like string\n e.g.\n' +
    '--prop port=8080 --prop devMode=false --prop @wfh/foobar.api=http://localhost:8080\n' +
    '--prop arraylike.prop[0]=foobar\n' +
    '--prop ["@wfh/foo.bar","prop",0]=true'),
    arrayOptionFn, [] as string[])
  .option('--verbose', hlDesc('Set log level to "debug"'), false);
  // .option('--log-stat', hlDesc('Print internal Redux state/actions for debug'));

  return program;
}
