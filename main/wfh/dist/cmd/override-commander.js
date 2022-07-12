"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withGlobalOptions = exports.withCwdOption = exports.CommandOverrider = exports.PlinkCommand = exports.PlinkCommandHelp = exports.commander = void 0;
/* eslint-disable @typescript-eslint/no-unsafe-assignment,  @typescript-eslint/no-unsafe-return */
const path_1 = __importDefault(require("path"));
const commander_1 = __importDefault(require("commander"));
exports.commander = commander_1.default;
const chalk_1 = __importDefault(require("chalk"));
const log4js_1 = __importDefault(require("log4js"));
const strip_ansi_1 = __importDefault(require("strip-ansi"));
const package_mgr_1 = require("../package-mgr");
const misc_1 = require("../utils/misc");
const utils_1 = require("./utils");
const cli_slice_1 = require("./cli-slice");
const log = log4js_1.default.getLogger('plink.override-commander');
class PlinkCommandHelp extends commander_1.default.Help {
    subcommandTerm(cmd) {
        const str = super.subcommandTerm(cmd);
        if (cmd instanceof PlinkCommand && cmd.nameStyler) {
            return cmd.nameStyler(str);
        }
        return str;
    }
    optionTerm(option) {
        return option.optionStyler ? option.optionStyler(option.flags) : option.flags;
    }
    longestSubcommandTermLengthForReal(cmd, helper) {
        return helper.visibleCommands(cmd).reduce((max, command) => {
            return Math.max(max, (0, strip_ansi_1.default)(helper.subcommandTerm(command)).length);
        }, 0);
    }
    longestOptionTermLengthForReal(cmd, helper) {
        return helper.visibleOptions(cmd).reduce((max, option) => {
            return Math.max(max, (0, strip_ansi_1.default)(helper.optionTerm(option)).length);
        }, 0);
    }
    // subcommandDescription(cmd: commander.Command) {
    //   return stripAnsi(super.subcommandDescription(cmd));
    // }
    realPadWidth(cmd, helper) {
        return Math.max(helper.longestOptionTermLengthForReal(cmd, helper), helper.longestSubcommandTermLengthForReal(cmd, helper), helper.longestArgumentTermLength(cmd, helper));
    }
    formatHelp(cmd, helper) {
        // const termWidth = helper.padWidth(cmd, helper); // It is bigger than actual width due to colorful character
        const realTermWidth = helper.realPadWidth(cmd, helper);
        // console.log('termWidth=', termWidth);
        const helpWidth = helper.helpWidth || 80;
        const itemIndentWidth = 2;
        const itemSeparatorWidth = 2; // between term and description
        function formatItem(term, description, styler) {
            if (description) {
                if (description) {
                    const fullText = `${term}${' '.repeat(realTermWidth + itemIndentWidth - (0, strip_ansi_1.default)(term).length)}${description}`;
                    return helper.wrap(fullText, helpWidth - itemIndentWidth, realTermWidth + itemSeparatorWidth);
                }
                return term;
                // Support colorful characters
                // const fullText = `${term}${' '.repeat(realTermWidth + itemIndentWidth - stripAnsi(term).length)}${description}`;
                // return helper.wrap(fullText, helpWidth - itemIndentWidth, realTermWidth + itemSeparatorWidth);
            }
            return term;
        }
        function formatList(textArray) {
            return textArray.join('\n').replace(/^/gm, ' '.repeat(itemIndentWidth));
        }
        // Usage
        let output = [`Usage: ${helper.commandUsage(cmd)}`, ''];
        // Description
        const commandDescription = helper.commandDescription(cmd);
        if (commandDescription.length > 0) {
            output = output.concat([commandDescription, '']);
        }
        // Arguments
        const argumentList = helper.visibleArguments(cmd).map((argument) => {
            return formatItem(helper.argumentTerm(argument), helper.argumentDescription(argument));
        });
        if (argumentList.length > 0) {
            output = output.concat(['Arguments:', formatList(argumentList), '']);
        }
        // Options
        const optionList = helper.visibleOptions(cmd).map((option) => {
            return formatItem(helper.optionTerm(option), helper.optionDescription(option), option.optionStyler);
        });
        if (optionList.length > 0) {
            output = output.concat(['Options:', formatList(optionList), '']);
        }
        // Commands
        let pkgName = '';
        const commandList = helper.visibleCommands(cmd).map((cmd) => {
            let header = '';
            if (pkgName !== cmd.pkgName) {
                pkgName = cmd.pkgName;
                header = pkgName ? `\n${chalk_1.default.inverse(chalk_1.default.gray('Provided by package ' + pkgName + ': '))}\n` :
                    '\n';
            }
            pkgName = cmd.pkgName;
            return header + formatItem(helper.subcommandTerm(cmd), helper.subcommandDescription(cmd), cmd.nameStyler);
        });
        if (commandList.length > 0) {
            output = output.concat(['Commands:', formatList(commandList), '']);
        }
        return output.join('\n');
    }
}
exports.PlinkCommandHelp = PlinkCommandHelp;
/**
 * Extend commander, check commander API at https://www.npmjs.com/package/commander
 */
class PlinkCommand extends commander_1.default.Command {
    constructor(ctx, name) {
        super(name);
        this.ctx = ctx;
        this.subCmds = [];
        /** value is file path for pkg name */
        this.loadedCmdMap = new Map();
        this.pkgName = '';
    }
    addGlobalOptionsToSubCmds() {
        if (this.subCmds == null)
            return;
        for (const subCmd of this.subCmds) {
            withGlobalOptions(subCmd);
        }
    }
    createCommand(cmdName) {
        const pk = this.ctx.currCliCreatorPkg;
        const filePath = this.ctx.currClieCreatorFile;
        if (cmdName && cmdName !== 'help') {
            if (this.loadedCmdMap.has(cmdName)) {
                if (filePath)
                    throw new Error(`Conflict command name "${cmdName}" from extensions "${filePath}" and "${this.loadedCmdMap.get(cmdName)}"`);
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
        const meta = {
            pkgName: pk ? pk.name : '@wfh/plink',
            name: cmdName,
            options: [],
            desc: ''
        };
        this.ctx.metaMap.set(subCmd, meta);
        this.ctx.currCliPkgMataInfos.push(meta);
        // subCmd.description(meta.desc!);
        return subCmd;
    }
    description(str, argsDescription) {
        if (str !== undefined) {
            const plinkMeta = this.ctx.metaMap.get(this);
            plinkMeta.desc = str;
            if (argsDescription) {
                plinkMeta.argDesc = argsDescription;
            }
            return argsDescription ? super.description(str, argsDescription) : super.description(str);
        }
        return super.description();
    }
    alias(alias) {
        if (alias) {
            const plinkMeta = this.ctx.metaMap.get(this);
            plinkMeta.alias = alias;
        }
        return super.alias(alias);
    }
    createOption(flags, description, ...remaining) {
        let defaultValue;
        if (remaining.length > 1) {
            defaultValue = remaining[remaining.length - 1];
        }
        const plinkMeta = this.ctx.metaMap.get(this);
        plinkMeta.options.push({
            flags, desc: description || '', defaultValue, isRequired: false
        });
        const opt = new PlinkCmdOption(flags, description);
        opt.optionStyler = this.optionStyler;
        return opt;
    }
    option(...args) {
        this._saveOptions(false, ...args);
        return super.option(...args);
    }
    requiredOption(...args) {
        this._saveOptions(true, ...args);
        return super.requiredOption(...args);
    }
    action(fn) {
        function actionCallback(...args) {
            try {
                const { initConfig } = require('../utils/bootstrap-process');
                initConfig(this.opts());
                return fn.apply(this, args);
            }
            catch (e) {
                log.error(e);
            }
        }
        return super.action(actionCallback);
    }
    createHelp() {
        return Object.assign(new PlinkCommandHelp(), this.configureHelp());
    }
    _saveOptions(isRequired, flags, desc, ...remaining) {
        let defaultValue;
        if (remaining.length > 1) {
            defaultValue = remaining[remaining.length - 1];
        }
        const plinkMeta = this.ctx.metaMap.get(this);
        plinkMeta.options.push({
            flags, desc, defaultValue, isRequired
        });
    }
}
exports.PlinkCommand = PlinkCommand;
class PlinkCmdOption extends commander_1.default.Option {
}
class CommandOverrider {
    constructor(program, ws) {
        this.program = program;
        // nameStyler: PlinkCommand['nameStyler'];
        // private currClieCreatorFile: string;
        // private currCliCreatorPkg: PackageInfo | null = null;
        // private currCliPkgMataInfos: OurCommandMetadata[];
        // private allSubCmds: OurAugmentedCommander[] = [];
        // private metaMap = new WeakMap<commander.Command, Partial<OurCommandMetadata>>();
        this.pkgMetasMap = new Map();
        this.ctx = {
            metaMap: new WeakMap()
        };
        this.program.createCommand = PlinkCommand.prototype.createCommand;
        this.program.ctx = this.ctx;
        this.program.subCmds = [];
        this.program.loadedCmdMap = new Map();
        this.program.addGlobalOptionsToSubCmds = PlinkCommand.prototype.addGlobalOptionsToSubCmds;
        this.program.createHelp = PlinkCommand.prototype.createHelp;
    }
    set nameStyler(v) {
        this.ctx.nameStyler = v;
    }
    forPackage(pk, pkgFilePath, funcName) {
        const commandMetaInfos = this.ctx.currCliPkgMataInfos = [];
        this.ctx.currCliCreatorPkg = pk;
        let filePath = null;
        if (typeof pkgFilePath === 'function') {
            pkgFilePath(this.program);
            this.pkgMetasMap.set('@wfh/plink', commandMetaInfos);
        }
        else if (pk) {
            try {
                filePath = path_1.default.resolve(misc_1.plinkEnv.workDir, 'node_modules', pk.name + '/' + pkgFilePath);
                this.ctx.currClieCreatorFile = filePath;
                const subCmdFactory = funcName ? require(filePath)[funcName] :
                    require(filePath);
                subCmdFactory(this.program);
                this.pkgMetasMap.set(pk.name, commandMetaInfos);
            }
            catch (e) {
                // eslint-disable-next-line no-console
                log.warn(`Failed to load command line extension in package ${pk.name}: "${e.message}"`, e);
            }
            finally {
                filePath = null;
            }
        }
        this.ctx.currCliCreatorPkg = null;
    }
    appendGlobalOptions(saveToStore) {
        this.program.addGlobalOptionsToSubCmds();
        // for (const cmd of this.allSubCmds) {
        //   withGlobalOptions(cmd);
        // }
        if (!saveToStore)
            return;
        process.nextTick(() => {
            for (const [pkg, metas] of this.pkgMetasMap.entries()) {
                cli_slice_1.cliActionDispatcher.addCommandMeta({ pkg, metas });
            }
        });
    }
}
exports.CommandOverrider = CommandOverrider;
function withCwdOption(cmd) {
    if (cmd instanceof PlinkCommand)
        cmd.optionStyler = str => chalk_1.default.gray(str);
    const cmdObj = cmd.option('--space,--cwd <working dir>', 'Run command in a different worktree directory: [' +
        [...(0, package_mgr_1.getState)().workspaces.keys()].join(', ') + ']');
    if (cmd instanceof PlinkCommand)
        cmd.optionStyler = undefined;
    return cmdObj;
}
exports.withCwdOption = withCwdOption;
function withGlobalOptions(cmd) {
    if ((0, package_mgr_1.getState)().workspaces == null)
        // eslint-disable-next-line no-console
        console.log((0, package_mgr_1.getState)());
    withCwdOption(cmd);
    if (cmd instanceof PlinkCommand)
        cmd.optionStyler = str => chalk_1.default.gray(str);
    cmd.option('-c, --config <config-file>', 'Read config files, if there are multiple files, the latter one overrides previous one', (value, prev) => {
        prev.push(...value.split(','));
        return prev;
        // return prev.concat(value.split(','));
    }, []);
    cmd.option('--prop <expression>', '<property path>=<value as JSON | literal> ... directly set configuration properties, property name is lodash.set() path-like string. e.g. ' +
        '--prop port=8080 --prop devMode=false --prop @wfh/foobar.api=http://localhost:8080 ' +
        '--prop arraylike.prop[0]=foobar ' +
        '--prop ["@wfh/foo.bar","prop",0]=true', utils_1.arrayOptionFn, [])
        .option('--verbose', 'Specify log level as "debug"', false)
        .option('--dev', 'By turning on this option,' +
        ' Plink setting property "devMode" will automatcially set to `true`,' +
        ' and process.env.NODE_ENV will also being updated to \'developement\' or \'production correspondingly. ', false)
        .option('--env <setting environment>', 'A string denotes runtime environment name, package setting file may return different values based on its value (cliOptions.env)');
    if (cmd instanceof PlinkCommand)
        cmd.optionStyler = undefined;
    return cmd;
}
exports.withGlobalOptions = withGlobalOptions;
//# sourceMappingURL=override-commander.js.map