/* eslint-disable @typescript-eslint/no-unsafe-assignment,  @typescript-eslint/no-unsafe-return */
import commander from 'commander';
import {WorkspaceState, PackageInfo, getState} from '../package-mgr';
import chalk from 'chalk';
import {arrayOptionFn} from './utils';
import * as _bootstrap from '../utils/bootstrap-process';
import { GlobalOptions, OurCommandMetadata } from './types';
import {cliActionDispatcher} from './cli-slice';
import log4js from 'log4js';
import stripAnsi from 'strip-ansi';
import Path from 'path';
import {plinkEnv} from '../utils/misc';
export {commander};

const log = log4js.getLogger('plink.override-commander');

interface CommandContext {
  currClieCreatorFile: string;
  currCliCreatorPkg: PackageInfo | null;
  metaMap: WeakMap<PlinkCommand, Partial<OurCommandMetadata>>;
  currCliPkgMataInfos: OurCommandMetadata[];
  nameStyler?: (cmdName: string) => string;
}

export class PlinkCommandHelp extends commander.Help {
  subcommandTerm(cmd: commander.Command): string {
    const str = super.subcommandTerm(cmd);
    if (cmd instanceof PlinkCommand && cmd.nameStyler) {
      return cmd.nameStyler(str);
    }
    return str;
  }

  optionTerm(option: PlinkCmdOption) {
    return option.optionStyler ? option.optionStyler(option.flags) : option.flags;
  }

  longestSubcommandTermLengthForReal(cmd: commander.Command, helper: PlinkCommandHelp) {
    return helper.visibleCommands(cmd).reduce((max, command) => {
      return Math.max(max, stripAnsi(helper.subcommandTerm(command)).length);
    }, 0);
  }

  longestOptionTermLengthForReal(cmd: commander.Command, helper: PlinkCommandHelp) {
    return helper.visibleOptions(cmd).reduce((max, option) => {
      return Math.max(max, stripAnsi(helper.optionTerm(option)).length);
    }, 0);
  }

  // subcommandDescription(cmd: commander.Command) {
  //   return stripAnsi(super.subcommandDescription(cmd));
  // }

  realPadWidth(cmd: commander.Command, helper: PlinkCommandHelp) {
    return Math.max(
      helper.longestOptionTermLengthForReal(cmd, helper),
      helper.longestSubcommandTermLengthForReal(cmd, helper),
      helper.longestArgumentTermLength(cmd, helper)
    );
  }

  formatHelp(cmd: commander.Command, helper: PlinkCommandHelp) {
    // const termWidth = helper.padWidth(cmd, helper); // It is bigger than actual width due to colorful character
    const realTermWidth = helper.realPadWidth(cmd, helper);
    // console.log('termWidth=', termWidth);
    const helpWidth = helper.helpWidth || 80;
    const itemIndentWidth = 2;
    const itemSeparatorWidth = 2; // between term and description
    function formatItem(term: string, description: string, styler?: PlinkCommand['nameStyler']) {
      if (description) {
        // Support colorful characters
        const fullText = `${term}${' '.repeat(realTermWidth + itemIndentWidth - stripAnsi(term).length)}${description}`;
        return helper.wrap(fullText, helpWidth - itemIndentWidth, realTermWidth + itemSeparatorWidth);
      }
      return term;
    }
    function formatList(textArray: string[]) {
      return textArray.join('\n').replace(/^/gm, ' '.repeat(itemIndentWidth));
    }

    // Usage
    const output = [`Usage: ${helper.commandUsage(cmd)}`, ''];

    // Description
    const commandDescription = helper.commandDescription(cmd);
    if (commandDescription.length > 0) {
      output.push(commandDescription, '');
    }

    // Arguments
    const argumentList = helper.visibleArguments(cmd).map((argument) => {
      return formatItem(argument.term, argument.description);
    });
    if (argumentList.length > 0) {
      output.push('Arguments:', formatList(argumentList), '');
    }

    // Options
    const optionList = helper.visibleOptions(cmd).map((option) => {
      return formatItem(helper.optionTerm(option), helper.optionDescription(option),
        (option as PlinkCmdOption).optionStyler);
    });
    if (optionList.length > 0) {
      output.push('Options:', formatList(optionList), '');
    }

    // Commands
    let pkgName = '';
    const commandList = helper.visibleCommands(cmd).map((cmd) => {
      let header = '';
      if (pkgName !== (cmd as PlinkCommand).pkgName) {
        pkgName = (cmd as PlinkCommand).pkgName;
        header = pkgName ? `\n${chalk.inverse(chalk.gray('Provided by package ' + pkgName + ': '))}\n` :
          '\n';
      }
      pkgName = (cmd as PlinkCommand).pkgName;
      return header + formatItem(helper.subcommandTerm(cmd), helper.subcommandDescription(cmd),
        (cmd as PlinkCommand).nameStyler);
    });
    if (commandList.length > 0) {
      output.push('Commands:', formatList(commandList), '');
    }

    return output.join('\n');
  }

  // wrap(str: string, width: number, indent: number, minColumnWidth = 40) {
  //   // Detect manually wrapped and indented strings by searching for line breaks
  //   // followed by multiple spaces/tabs.
  //   if (str.match(/[\n]\s+/)) return str;
  //   // Do not wrap if not enough room for a wrapped column of text (as could end up with a word per line).
  //   const columnWidth = width - indent;
  //   if (columnWidth < minColumnWidth) return str;

  //   const leadingStr = str.substr(0, indent);
  //   const columnText = str.substr(indent);

  //   const indentString = ' '.repeat(indent);
  //   const regex = new RegExp('.{1,' + (columnWidth - 1) + '}([\\s\u200B]|$)|[^\\s\u200B]+?([\\s\u200B]|$)', 'g');

  //   const lines = columnText.match(regex) || [];
  //   return leadingStr + lines.map((line, i) => {
  //     if (line.slice(-1) === '\n') {
  //       line = line.slice(0, line.length - 1);
  //     }
  //     return ((i > 0) ? indentString : '') + line.trimRight();
  //   }).join('\n');
  // }
}
/**
 * Extend commander, check commander API at https://www.npmjs.com/package/commander
 */
export class PlinkCommand extends commander.Command {
  nameStyler?: (cmdName: string) => string;
  optionStyler?: (cmdName: string) => string;
  subCmds: PlinkCommand[] = [];
  /** value is file path for pkg name */
  loadedCmdMap = new Map<string, string>();
  pkgName = '';

  constructor(public ctx: CommandContext, name?: string) {
    super(name);
  }

  addGlobalOptionsToSubCmds() {
    if (this.subCmds == null)
      return;
    for (const subCmd of this.subCmds) {
      withGlobalOptions(subCmd);
    }
  }

  createCommand(cmdName?: string): commander.Command {
    const pk = this.ctx.currCliCreatorPkg;
    const filePath = this.ctx.currClieCreatorFile;
    if (cmdName && cmdName !== 'help') {
      if (this.loadedCmdMap.has(cmdName)) {
        if (filePath)
          throw new Error(`Conflict command name "${cmdName}" from extensions "${filePath}" and "${this.loadedCmdMap.get(cmdName)!}"`);
        else
          throw new Error(`Conflict with existing Plink command name ${cmdName}`);
      }
      this.loadedCmdMap.set(cmdName, filePath ? filePath : '@wfh/plink');
    }

    const subCmd = new PlinkCommand(this.ctx, cmdName);
    subCmd.nameStyler = this.ctx.nameStyler;
    subCmd.pkgName = pk != null ? pk.name : '';
    this.subCmds.push(subCmd);

    // subCmd.setContextData(this.currClieCreatorFile, this.currCliCreatorPkg, this.metaMap, this);

    const meta: Partial<OurCommandMetadata> = {
      pkgName: pk ? pk.name : '@wfh/plink',
      name: cmdName,
      options: [],
      desc: ''
    };
    this.ctx.metaMap.set(subCmd, meta);
    this.ctx.currCliPkgMataInfos.push(meta as OurCommandMetadata);
    // subCmd.description(meta.desc!);
    return subCmd;
  }

  description(str?: string,
    argsDescription?: { [argName: string]: string; }) {
    if (str !== undefined) {
      const plinkMeta = this.ctx.metaMap.get(this)!;
      plinkMeta.desc = str;
      if (argsDescription) {
        plinkMeta.argDesc = argsDescription;
      }
      return super.description(str, argsDescription);
    }
    return super.description() as any;
  }

  alias(alias?: string) {
    if (alias) {
      const plinkMeta = this.ctx.metaMap.get(this)!;
      plinkMeta.alias = alias;
    }
    return super.alias(alias as any) as any;
  }

  createOption(flags: string, description?: string, ...remaining: any[]) {
    let defaultValue: any;
    if (remaining.length > 1) {
      defaultValue = remaining[remaining.length - 1];
    }
    const plinkMeta = this.ctx.metaMap.get(this)!;
    plinkMeta.options!.push({
      flags, desc: description || '', defaultValue, isRequired: false
    });
    const opt = new PlinkCmdOption(flags, description);
    opt.optionStyler = this.optionStyler;
    return opt;
  }
  option(...args: any[]) {
    (this._saveOptions as any)(false, ...args);
    return (super.option as any)(...args);
  }
  requiredOption(...args: any[]) {
    (this._saveOptions as any)(true, ...args);
    return (super.requiredOption as any)(...args);
  }
  action(fn: (...args: any[]) => void | Promise<void>) {
    function actionCallback(this: commander.Command) {
      try {
        const {initConfig} = require('../utils/bootstrap-process') as typeof _bootstrap;
        initConfig(this.opts() as GlobalOptions);
        return fn.apply(this, arguments);
      } catch (e) {
        log.error(e);
      }
    }
    return super.action(actionCallback);
  }
  createHelp() {
    return Object.assign(new PlinkCommandHelp(), this.configureHelp());
  }
  _saveOptions(isRequired: boolean, flags: string, desc: string, ...remaining: any[]) {
    let defaultValue: any;
    if (remaining.length > 1) {
      defaultValue = remaining[remaining.length - 1];
    }
    const plinkMeta = this.ctx.metaMap.get(this)!;
    plinkMeta.options!.push({
      flags, desc, defaultValue, isRequired
    });
  }
}

export type CliExtension = (program: PlinkCommand) => void;

class PlinkCmdOption extends commander.Option {
  optionStyler?: (cmdName: string) => string;
}
export class CommandOverrider {
  // nameStyler: PlinkCommand['nameStyler'];
  // private currClieCreatorFile: string;
  // private currCliCreatorPkg: PackageInfo | null = null;
  // private currCliPkgMataInfos: OurCommandMetadata[];
  // private allSubCmds: OurAugmentedCommander[] = [];
  // private metaMap = new WeakMap<commander.Command, Partial<OurCommandMetadata>>();
  private pkgMetasMap = new Map<string, OurCommandMetadata[]>();
  private ctx: Partial<CommandContext> = {
    metaMap: new WeakMap<commander.Command, Partial<OurCommandMetadata>>()
  };

  set nameStyler(v: PlinkCommand['nameStyler']) {
    this.ctx.nameStyler = v;
  }

  constructor(private program: commander.Command, ws?: WorkspaceState) {
    this.program.createCommand = PlinkCommand.prototype.createCommand;

    (this.program as PlinkCommand).ctx = this.ctx as CommandContext;
    (this.program as PlinkCommand).subCmds = [];
    (this.program as PlinkCommand).loadedCmdMap = new Map();
    (this.program as PlinkCommand).addGlobalOptionsToSubCmds = PlinkCommand.prototype.addGlobalOptionsToSubCmds;
    this.program.createHelp = PlinkCommand.prototype.createHelp;
  }

  forPackage(pk: PackageInfo, pkgFilePath: string, funcName: string): void;
  forPackage(pk: null, commandCreation: (program: commander.Command) => void): void;
  forPackage(pk: PackageInfo | null,
    pkgFilePath: string | ((program: commander.Command) => void),
    funcName?: string) {
    const commandMetaInfos: OurCommandMetadata[] = this.ctx.currCliPkgMataInfos = [];
    this.ctx.currCliCreatorPkg = pk;

    let filePath: string | null = null;

    if (typeof pkgFilePath === 'function') {
      pkgFilePath(this.program);
      this.pkgMetasMap.set('@wfh/plink', commandMetaInfos);
    } else if (pk) {
      try {
        filePath = Path.resolve(plinkEnv.workDir, 'node_modules', pk.name + '/' + pkgFilePath);
        this.ctx.currClieCreatorFile = filePath;
        const subCmdFactory: CliExtension = funcName ? require(filePath)[funcName] :
          require(filePath);
        subCmdFactory(this.program as PlinkCommand);
        this.pkgMetasMap.set(pk.name, commandMetaInfos);
      } catch (e) {
        // eslint-disable-next-line no-console
        log.warn(`Failed to load command line extension in package ${pk.name}: "${e.message as string}"`, e);
      } finally {
        filePath = null;
      }
    }
    this.ctx.currCliCreatorPkg = null;
  }

  appendGlobalOptions(saveToStore: boolean) {
    (this.program as PlinkCommand).addGlobalOptionsToSubCmds();
    // for (const cmd of this.allSubCmds) {
    //   withGlobalOptions(cmd);
    // }
    if (!saveToStore)
      return;
    process.nextTick(() => {
      for (const [pkg, metas] of this.pkgMetasMap.entries()) {
        cliActionDispatcher.addCommandMeta({pkg, metas});
      }
    });
  }
}

export function withCwdOption(cmd: commander.Command): commander.Command {
  return cmd.option('--space,--cwd <working dir>', 'Run command in a different worktree directory: [' +
    [...getState().workspaces.keys()].join(', ') + ']');
}

export function withGlobalOptions(cmd: commander.Command | PlinkCommand): commander.Command {
  if (getState().workspaces == null)
    console.log(getState());
  withCwdOption(cmd);

  if (cmd instanceof PlinkCommand)
    cmd.optionStyler = str => chalk.gray(str);
  (cmd.option as commander.Command['option'])('-c, --config <config-file>',
    'Read config files, if there are multiple files, the latter one overrides previous one',
    (value, prev) => {
      prev.push(...value.split(','));
      return prev;
      // return prev.concat(value.split(','));
    }, [] as string[]);

  (cmd.option as commander.Command['option'])('--prop <expression>',
    '<property path>=<value as JSON | literal> ... directly set configuration properties, property name is lodash.set() path-like string. e.g. ' +
    '--prop port=8080 --prop devMode=false --prop @wfh/foobar.api=http://localhost:8080 ' +
    '--prop arraylike.prop[0]=foobar ' +
    '--prop ["@wfh/foo.bar","prop",0]=true',
    arrayOptionFn, [] as string[])
  .option('--verbose', 'Specify log level as "debug"', false)
  .option('--dev', 'By turning on this option,' +
    ' Plink setting property "devMode" will automatcially set to `true`,' +
    ' and process.env.NODE_ENV will also being updated to \'developement\' or \'production correspondingly. ',
    false)
  .option('--env <setting environment>', 'A string denotes runtime environment name, package setting file may return different values based on its value (cliOptions.env)');
  if (cmd instanceof PlinkCommand)
    cmd.optionStyler = undefined;
  return cmd;
}
