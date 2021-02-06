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
  private currClieCreatorFile: string;
  private currCliCreatorPkg: PackageInfo | null = null;
  private currCliPkgMataInfos: OurCommandMetadata[];
  private allSubCmds: OurAugmentedCommander[] = [];
  private metaMap = new WeakMap<commander.Command, Partial<OurCommandMetadata>>();
  private pkgMetasMap = new Map<string, OurCommandMetadata[]>();

  constructor(private program: commander.Command, ws?: WorkspaceState) {
    this.origPgmCommand = program.command;
    const self = this;

    function command(this: commander.Command, nameAndArgs: string, ...restArgs: any[]) {
      const pk = self.currCliCreatorPkg;
      const filePath = self.currClieCreatorFile;
      const cmdName = /^\S+/.exec(nameAndArgs)![0];
      if (self.loadedCmdMap.has(cmdName)) {
        if (filePath)
          throw new Error(`Conflict command name ${cmdName} from extensions "${filePath}" and "${self.loadedCmdMap.get(cmdName)}"`);
        else
          throw new Error(`Conflict with existing Plink command name ${cmdName}`);
      }

      self.loadedCmdMap.set(cmdName, filePath ? filePath : '@wfh/plink');

      const subCmd: commander.Command = self.origPgmCommand.call(this, nameAndArgs, ...restArgs);
      const meta: Partial<OurCommandMetadata> = {
        pkgName: pk ? pk.name : '@wfh/plink',
        nameAndArgs,
        options: [],
        desc: pk == null ? '' : chalk.blue(`[${pk.name}]`)
      };
      self.metaMap.set(subCmd, meta);
      self.currCliPkgMataInfos.push(meta as OurCommandMetadata);

      subCmd.description(meta.desc!);

      const originDescFn = subCmd.description;

      // subCmd.description = description as any;

      const originActionFn = subCmd.action;
      subCmd.action = action;

      const originAliasFn = subCmd.alias;
      subCmd.alias = alias;

      const originOptionFn = subCmd.option;
      subCmd.option = createOptionFn(false, originOptionFn);
      (subCmd as OurAugmentedCommander)._origOption = originOptionFn;

      const originReqOptionFn = subCmd.requiredOption;
      subCmd.requiredOption = createOptionFn(true, originReqOptionFn);

      subCmd.description = function description(str?: string,
        argsDescription?: { [argName: string]: string; }) {
        if (str) {
          if (pk)
            str = chalk.blue(`[${pk.name}]`) + ' ' + str;

          const plinkMeta = self.metaMap.get(this)!;
          plinkMeta.desc = str;
          if (argsDescription) {
            plinkMeta.argDesc = argsDescription;
          }
        }
        // console.log(str);
        return originDescFn.call(subCmd, str, argsDescription) as any;
      };

      function alias(this: commander.Command, alias?: string) {
        if (alias) {
          const plinkMeta = self.metaMap.get(this)!;
          plinkMeta.alias = alias;
        }
        return originAliasFn.apply(this, arguments);
      }

      function createOptionFn(isRequired: boolean, originOptionFn: commander.Command['option'] | commander.Command['requiredOption']) {
        return function(this: commander.Command, flags: string, desc: string, ...remaining: any[]) {
          let defaultValue: any;
          if (remaining.length > 1) {
            defaultValue = remaining[remaining.length - 1];
          }
          const plinkMeta = self.metaMap.get(this)!;
          plinkMeta.options!.push({
            flags, desc, defaultValue, isRequired
          });

          return originOptionFn.call(this, flags, desc, ...remaining);
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
                  layout: {type: 'pattern', pattern: (process.send ? '%z' : '') + '%[[%p] %c%] - %m'}
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
      self.allSubCmds.push(subCmd as OurAugmentedCommander);
      return subCmd;
    }
    this.program.command = command as any;
  }

  forPackage(pk: PackageInfo, pkgFilePath: string, funcName: string): void;
  forPackage(pk: null, commandCreation: (program: commander.Command) => void): void;
  forPackage(pk: PackageInfo | null,
    pkgFilePath: string | ((program: commander.Command) => void),
    funcName?: string) {
    const commandMetaInfos = this.currCliPkgMataInfos = [];
    this.currCliCreatorPkg = pk;

    let filePath: string | null = null;

    if (typeof pkgFilePath === 'function') {
      pkgFilePath(this.program);
      this.pkgMetasMap.set('@wfh/plink', commandMetaInfos);
    } else if (pk) {
      try {
        filePath = require.resolve(pk.name + '/' + pkgFilePath);
        this.currClieCreatorFile = filePath;
        const subCmdFactory: CliExtension = funcName ? require(filePath)[funcName] :
          require(filePath);
        subCmdFactory(this.program);
        this.pkgMetasMap.set(pk.name, commandMetaInfos);
      } catch (e) {
        // tslint:disable-next-line: no-console
        log.warn(`Failed to load command line extension in package ${pk.name}: "${e.message}"`, e);
      } finally {
        filePath = null;
      }
    }
  }

  appendGlobalOptions(saveToStore: boolean) {
    for (const cmd of this.allSubCmds) {
      withGlobalOptions(cmd);
    }
    if (!saveToStore)
      return;
    process.nextTick(() => {
      for (const [pkg, metas] of this.pkgMetasMap.entries()) {
        cliActionDispatcher.addCommandMeta({pkg, metas});
      }
    });
  }
}

export function withGlobalOptions(program: OurAugmentedCommander | commander.Command): commander.Command {
  if ((program as OurAugmentedCommander)._origOption == null) {
    (program as OurAugmentedCommander)._origOption = program.option;
  }
  (program as OurAugmentedCommander)._origOption('-c, --config <config-file>',
    hlDesc('Read config files, if there are multiple files, the latter one overrides previous one'),
    (value, prev) => {
      prev.push(...value.split(','));
      return prev;
      // return prev.concat(value.split(','));
    }, [] as string[]);
  (program as OurAugmentedCommander)._origOption('--prop <expression>',
    hlDesc('<property-path>=<value as JSON | literal> ... directly set configuration properties, property name is lodash.set() path-like string\n e.g.\n' +
    '--prop port=8080 --prop devMode=false --prop @wfh/foobar.api=http://localhost:8080\n' +
    '--prop arraylike.prop[0]=foobar\n' +
    '--prop ["@wfh/foo.bar","prop",0]=true'),
    arrayOptionFn, [] as string[])
  .option('--verbose', hlDesc('Specify log level as "debug"'), false)
  .option('--dev', hlDesc('By turning on this option,' +
    ' Plink setting property "devMode" will automatcially set to `true`,' +
    ' and process.env.NODE_ENV will also being updated to \'developement\' or \'production correspondingly. '), false)
  .option('--env <setting-env>', hlDesc('customized environment value, package setting file may return different values based on its value (cliOptions.env)'));

  // .option('--log-stat', hlDesc('Print internal Redux state/actions for debug'));

  return program;
}
