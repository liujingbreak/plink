import commander from 'commander';
import {WorkspaceState, PackageInfo} from '../package-mgr';
import chalk from 'chalk';
import {hlDesc, arrayOptionFn} from './utils';
import * as _bootstrap from '../utils/bootstrap-process';
import { GlobalOptions } from './types';
import log4js from 'log4js';

export function overrideCommand(program: commander.Command, ws?: WorkspaceState) {
  const loadedCmdMap = new Map<string, string>();
  const origPgmCommand = program.command;
  let filePath: string | null = null;

  let pk: PackageInfo | undefined;
  const commandMetaInfos = new Map<string, OurCommandMetadata>();

  function command(this: commander.Command, nameAndArgs: string, ...restArgs: any[]) {

    const cmdName = /^\S+/.exec(nameAndArgs)![0];
    if (loadedCmdMap.has(cmdName)) {
      throw new Error(`Conflict command name ${cmdName} from extensions "${filePath}" and "${loadedCmdMap.get(cmdName)}"`);
    }

    loadedCmdMap.set(cmdName, filePath!);

    const subCmd: ReturnType<typeof origPgmCommand> = origPgmCommand.call(this, nameAndArgs, ...restArgs);
    (subCmd as OurAugmentedCommander)._plinkMeta = {
      nameAndArgs,
      options: []
    };
    commandMetaInfos.set(pk ? pk.name : '@wfh/plink',
      (subCmd as OurAugmentedCommander)._plinkMeta as OurCommandMetadata);

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

    function description(this: ReturnType<typeof origPgmCommand>, str: string, ...remainder: any[]) {
      if (pk)
        str = chalk.blue(`[${pk.name}]`) + ' ' + str;
      (this as OurAugmentedCommander)._plinkMeta.desc = str;
      return originDescFn.call(this, str, ...remainder);
    }

    function alias(this: ReturnType<typeof origPgmCommand>, alias?: string) {
      if (alias)
        (this as OurAugmentedCommander)._plinkMeta.alias = alias;
      return originAliasFn.apply(this, arguments);
    }

    function createOptionFn(isRequired: boolean, originOptionFn: commander.Command['option'] | commander.Command['requiredOption']) {
      return function(this: ReturnType<typeof origPgmCommand>, flags: string, desc: string, ...remaining: any[]) {
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

    function action(this: ReturnType<typeof origPgmCommand>, cb: (...args: any[]) => any) {
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
        cb.apply(this, arguments);
      }

      return originActionFn.call(this, actionCallback);
    }


    withGlobalOptions(subCmd);
    return subCmd;
  }

  program.command = command as any;

  return {
    forPackage(pkg: PackageInfo, cmdExecutionFile: string) {
      pk = pkg;
      filePath = cmdExecutionFile;
    },
    commandMetaInfos
  };
}

function withGlobalOptions(program: commander.Command): commander.Command {
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

interface OurCommandMetadata {
  nameAndArgs: string;
  alias?: string;
  desc: string;
  usage: string;
  options: OurCommandOption[];
}

interface OurCommandOption<T = string> {
  flags: string;
  desc: string;
  defaultValue: string | boolean | T[] | T;
  // isArray: boolean;
  isRequired: boolean;
}

interface OurAugmentedCommander extends commander.Command {
  _plinkMeta: Partial<OurCommandMetadata>;
}
