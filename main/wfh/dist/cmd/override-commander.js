"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withGlobalOptions = exports.withCwdOption = exports.CommandOverrider = exports.PlinkCommand = exports.PlinkCommandHelp = void 0;
/* eslint-disable @typescript-eslint/no-unsafe-assignment,  @typescript-eslint/no-unsafe-return */
const commander_1 = __importDefault(require("commander"));
const package_mgr_1 = require("../package-mgr");
const chalk_1 = __importDefault(require("chalk"));
const utils_1 = require("./utils");
const cli_slice_1 = require("./cli-slice");
const log4js_1 = __importDefault(require("log4js"));
const strip_ansi_1 = __importDefault(require("strip-ansi"));
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
            return Math.max(max, strip_ansi_1.default(helper.subcommandTerm(command)).length);
        }, 0);
    }
    longestOptionTermLengthForReal(cmd, helper) {
        return helper.visibleOptions(cmd).reduce((max, option) => {
            return Math.max(max, strip_ansi_1.default(helper.optionTerm(option)).length);
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
                // Support colorful characters
                const fullText = `${term}${' '.repeat(realTermWidth + itemIndentWidth - strip_ansi_1.default(term).length)}${description}`;
                return helper.wrap(fullText, helpWidth - itemIndentWidth, realTermWidth + itemSeparatorWidth);
            }
            return term;
        }
        function formatList(textArray) {
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
            return formatItem(helper.optionTerm(option), helper.optionDescription(option), option.optionStyler);
        });
        if (optionList.length > 0) {
            output.push('Options:', formatList(optionList), '');
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
            output.push('Commands:', formatList(commandList), '');
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
            return super.description(str, argsDescription);
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
        function actionCallback() {
            try {
                const { initConfig } = require('../utils/bootstrap-process');
                initConfig(this.opts());
                return fn.apply(this, arguments);
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
                debugger;
                filePath = require.resolve(pk.name + '/' + pkgFilePath);
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
    return cmd.option('--cwd <working dir>', 'Run command in a different worktree directory: [' +
        [...package_mgr_1.getState().workspaces.keys()].join(', ') + ']');
}
exports.withCwdOption = withCwdOption;
function withGlobalOptions(cmd) {
    if (package_mgr_1.getState().workspaces == null)
        console.log(package_mgr_1.getState());
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcnJpZGUtY29tbWFuZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL292ZXJyaWRlLWNvbW1hbmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxrR0FBa0c7QUFDbEcsMERBQWtDO0FBQ2xDLGdEQUFxRTtBQUNyRSxrREFBMEI7QUFDMUIsbUNBQXNDO0FBR3RDLDJDQUFnRDtBQUNoRCxvREFBNEI7QUFDNUIsNERBQW1DO0FBRW5DLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLDBCQUEwQixDQUFDLENBQUM7QUFVekQsTUFBYSxnQkFBaUIsU0FBUSxtQkFBUyxDQUFDLElBQUk7SUFDbEQsY0FBYyxDQUFDLEdBQXNCO1FBQ25DLE1BQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdEMsSUFBSSxHQUFHLFlBQVksWUFBWSxJQUFJLEdBQUcsQ0FBQyxVQUFVLEVBQUU7WUFDakQsT0FBTyxHQUFHLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQzVCO1FBQ0QsT0FBTyxHQUFHLENBQUM7SUFDYixDQUFDO0lBRUQsVUFBVSxDQUFDLE1BQXNCO1FBQy9CLE9BQU8sTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7SUFDaEYsQ0FBQztJQUVELGtDQUFrQyxDQUFDLEdBQXNCLEVBQUUsTUFBd0I7UUFDakYsT0FBTyxNQUFNLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsRUFBRTtZQUN6RCxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLG9CQUFTLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMs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QztJQUMvQixPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUM7QUE5QkQsOENBOEJDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50LCAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1yZXR1cm4gKi9cbmltcG9ydCBjb21tYW5kZXIgZnJvbSAnY29tbWFuZGVyJztcbmltcG9ydCB7V29ya3NwYWNlU3RhdGUsIFBhY2thZ2VJbmZvLCBnZXRTdGF0ZX0gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB7YXJyYXlPcHRpb25Gbn0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgKiBhcyBfYm9vdHN0cmFwIGZyb20gJy4uL3V0aWxzL2Jvb3RzdHJhcC1wcm9jZXNzJztcbmltcG9ydCB7IEdsb2JhbE9wdGlvbnMsIE91ckNvbW1hbmRNZXRhZGF0YSB9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtjbGlBY3Rpb25EaXNwYXRjaGVyfSBmcm9tICcuL2NsaS1zbGljZSc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgc3RyaXBBbnNpIGZyb20gJ3N0cmlwLWFuc2knO1xuXG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay5vdmVycmlkZS1jb21tYW5kZXInKTtcblxuaW50ZXJmYWNlIENvbW1hbmRDb250ZXh0IHtcbiAgY3VyckNsaWVDcmVhdG9yRmlsZTogc3RyaW5nO1xuICBjdXJyQ2xpQ3JlYXRvclBrZzogUGFja2FnZUluZm8gfCBudWxsO1xuICBtZXRhTWFwOiBXZWFrTWFwPFBsaW5rQ29tbWFuZCwgUGFydGlhbDxPdXJDb21tYW5kTWV0YWRhdGE+PjtcbiAgY3VyckNsaVBrZ01hdGFJbmZvczogT3VyQ29tbWFuZE1ldGFkYXRhW107XG4gIG5hbWVTdHlsZXI/OiAoY21kTmFtZTogc3RyaW5nKSA9PiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBQbGlua0NvbW1hbmRIZWxwIGV4dGVuZHMgY29tbWFuZGVyLkhlbHAge1xuICBzdWJjb21tYW5kVGVybShjbWQ6IGNvbW1hbmRlci5Db21tYW5kKTogc3RyaW5nIHtcbiAgICBjb25zdCBzdHIgPSBzdXBlci5zdWJjb21tYW5kVGVybShjbWQpO1xuICAgIGlmIChjbWQgaW5zdGFuY2VvZiBQbGlua0NvbW1hbmQgJiYgY21kLm5hbWVTdHlsZXIpIHtcbiAgICAgIHJldHVybiBjbWQubmFtZVN0eWxlcihzdHIpO1xuICAgIH1cbiAgICByZXR1cm4gc3RyO1xuICB9XG5cbiAgb3B0aW9uVGVybShvcHRpb246IFBsaW5rQ21kT3B0aW9uKSB7XG4gICAgcmV0dXJuIG9wdGlvbi5vcHRpb25TdHlsZXIgPyBvcHRpb24ub3B0aW9uU3R5bGVyKG9wdGlvbi5mbGFncykgOiBvcHRpb24uZmxhZ3M7XG4gIH1cblxuICBsb25nZXN0U3ViY29tbWFuZFRlcm1MZW5ndGhGb3JSZWFsKGNtZDogY29tbWFuZGVyLkNvbW1hbmQsIGhlbHBlcjogUGxpbmtDb21tYW5kSGVscCkge1xuICAgIHJldHVybiBoZWxwZXIudmlzaWJsZUNvbW1hbmRzKGNtZCkucmVkdWNlKChtYXgsIGNvbW1hbmQpID0+IHtcbiAgICAgIHJldHVybiBNYXRoLm1heChtYXgsIHN0cmlwQW5zaShoZWxwZXIuc3ViY29tbWFuZFRlcm0oY29tbWFuZCkpLmxlbmd0aCk7XG4gICAgfSwgMCk7XG4gIH1cblxuICBsb25nZXN0T3B0aW9uVGVybUxlbmd0aEZvclJlYWwoY21kOiBjb21tYW5kZXIuQ29tbWFuZCwgaGVscGVyOiBQbGlua0NvbW1hbmRIZWxwKSB7XG4gICAgcmV0dXJuIGhlbHBlci52aXNpYmxlT3B0aW9ucyhjbWQpLnJlZHVjZSgobWF4LCBvcHRpb24pID0+IHtcbiAgICAgIHJldHVybiBNYXRoLm1heChtYXgsIHN0cmlwQW5zaShoZWxwZXIub3B0aW9uVGVybShvcHRpb24pKS5sZW5ndGgpO1xuICAgIH0sIDApO1xuICB9XG5cbiAgLy8gc3ViY29tbWFuZERlc2NyaXB0aW9uKGNtZDogY29tbWFuZGVyLkNvbW1hbmQpIHtcbiAgLy8gICByZXR1cm4gc3RyaXBBbnNpKHN1cGVyLnN1YmNvbW1hbmREZXNjcmlwdGlvbihjbWQpKTtcbiAgLy8gfVxuXG4gIHJlYWxQYWRXaWR0aChjbWQ6IGNvbW1hbmRlci5Db21tYW5kLCBoZWxwZXI6IFBsaW5rQ29tbWFuZEhlbHApIHtcbiAgICByZXR1cm4gTWF0aC5tYXgoXG4gICAgICBoZWxwZXIubG9uZ2VzdE9wdGlvblRlcm1MZW5ndGhGb3JSZWFsKGNtZCwgaGVscGVyKSxcbiAgICAgIGhlbHBlci5sb25nZXN0U3ViY29tbWFuZFRlcm1MZW5ndGhGb3JSZWFsKGNtZCwgaGVscGVyKSxcbiAgICAgIGhlbHBlci5sb25nZXN0QXJndW1lbnRUZXJtTGVuZ3RoKGNtZCwgaGVscGVyKVxuICAgICk7XG4gIH1cblxuICBmb3JtYXRIZWxwKGNtZDogY29tbWFuZGVyLkNvbW1hbmQsIGhlbHBlcjogUGxpbmtDb21tYW5kSGVscCkge1xuICAgIC8vIGNvbnN0IHRlcm1XaWR0aCA9IGhlbHBlci5wYWRXaWR0aChjbWQsIGhlbHBlcik7IC8vIEl0IGlzIGJpZ2dlciB0aGFuIGFjdHVhbCB3aWR0aCBkdWUgdG8gY29sb3JmdWwgY2hhcmFjdGVyXG4gICAgY29uc3QgcmVhbFRlcm1XaWR0aCA9IGhlbHBlci5yZWFsUGFkV2lkdGgoY21kLCBoZWxwZXIpO1xuICAgIC8vIGNvbnNvbGUubG9nKCd0ZXJtV2lkdGg9JywgdGVybVdpZHRoKTtcbiAgICBjb25zdCBoZWxwV2lkdGggPSBoZWxwZXIuaGVscFdpZHRoIHx8IDgwO1xuICAgIGNvbnN0IGl0ZW1JbmRlbnRXaWR0aCA9IDI7XG4gICAgY29uc3QgaXRlbVNlcGFyYXRvcldpZHRoID0gMjsgLy8gYmV0d2VlbiB0ZXJtIGFuZCBkZXNjcmlwdGlvblxuICAgIGZ1bmN0aW9uIGZvcm1hdEl0ZW0odGVybTogc3RyaW5nLCBkZXNjcmlwdGlvbjogc3RyaW5nLCBzdHlsZXI/OiBQbGlua0NvbW1hbmRbJ25hbWVTdHlsZXInXSkge1xuICAgICAgaWYgKGRlc2NyaXB0aW9uKSB7XG4gICAgICAgIC8vIFN1cHBvcnQgY29sb3JmdWwgY2hhcmFjdGVyc1xuICAgICAgICBjb25zdCBmdWxsVGV4dCA9IGAke3Rlcm19JHsnICcucmVwZWF0KHJlYWxUZXJtV2lkdGggKyBpdGVtSW5kZW50V2lkdGggLSBzdHJpcEFuc2kodGVybSkubGVuZ3RoKX0ke2Rlc2NyaXB0aW9ufWA7XG4gICAgICAgIHJldHVybiBoZWxwZXIud3JhcChmdWxsVGV4dCwgaGVscFdpZHRoIC0gaXRlbUluZGVudFdpZHRoLCByZWFsVGVybVdpZHRoICsgaXRlbVNlcGFyYXRvcldpZHRoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0ZXJtO1xuICAgIH1cbiAgICBmdW5jdGlvbiBmb3JtYXRMaXN0KHRleHRBcnJheTogc3RyaW5nW10pIHtcbiAgICAgIHJldHVybiB0ZXh0QXJyYXkuam9pbignXFxuJykucmVwbGFjZSgvXi9nbSwgJyAnLnJlcGVhdChpdGVtSW5kZW50V2lkdGgpKTtcbiAgICB9XG5cbiAgICAvLyBVc2FnZVxuICAgIGNvbnN0IG91dHB1dCA9IFtgVXNhZ2U6ICR7aGVscGVyLmNvbW1hbmRVc2FnZShjbWQpfWAsICcnXTtcblxuICAgIC8vIERlc2NyaXB0aW9uXG4gICAgY29uc3QgY29tbWFuZERlc2NyaXB0aW9uID0gaGVscGVyLmNvbW1hbmREZXNjcmlwdGlvbihjbWQpO1xuICAgIGlmIChjb21tYW5kRGVzY3JpcHRpb24ubGVuZ3RoID4gMCkge1xuICAgICAgb3V0cHV0LnB1c2goY29tbWFuZERlc2NyaXB0aW9uLCAnJyk7XG4gICAgfVxuXG4gICAgLy8gQXJndW1lbnRzXG4gICAgY29uc3QgYXJndW1lbnRMaXN0ID0gaGVscGVyLnZpc2libGVBcmd1bWVudHMoY21kKS5tYXAoKGFyZ3VtZW50KSA9PiB7XG4gICAgICByZXR1cm4gZm9ybWF0SXRlbShhcmd1bWVudC50ZXJtLCBhcmd1bWVudC5kZXNjcmlwdGlvbik7XG4gICAgfSk7XG4gICAgaWYgKGFyZ3VtZW50TGlzdC5sZW5ndGggPiAwKSB7XG4gICAgICBvdXRwdXQucHVzaCgnQXJndW1lbnRzOicsIGZvcm1hdExpc3QoYXJndW1lbnRMaXN0KSwgJycpO1xuICAgIH1cblxuICAgIC8vIE9wdGlvbnNcbiAgICBjb25zdCBvcHRpb25MaXN0ID0gaGVscGVyLnZpc2libGVPcHRpb25zKGNtZCkubWFwKChvcHRpb24pID0+IHtcbiAgICAgIHJldHVybiBmb3JtYXRJdGVtKGhlbHBlci5vcHRpb25UZXJtKG9wdGlvbiksIGhlbHBlci5vcHRpb25EZXNjcmlwdGlvbihvcHRpb24pLFxuICAgICAgICAob3B0aW9uIGFzIFBsaW5rQ21kT3B0aW9uKS5vcHRpb25TdHlsZXIpO1xuICAgIH0pO1xuICAgIGlmIChvcHRpb25MaXN0Lmxlbmd0aCA+IDApIHtcbiAgICAgIG91dHB1dC5wdXNoKCdPcHRpb25zOicsIGZvcm1hdExpc3Qob3B0aW9uTGlzdCksICcnKTtcbiAgICB9XG5cbiAgICAvLyBDb21tYW5kc1xuICAgIGxldCBwa2dOYW1lID0gJyc7XG4gICAgY29uc3QgY29tbWFuZExpc3QgPSBoZWxwZXIudmlzaWJsZUNvbW1hbmRzKGNtZCkubWFwKChjbWQpID0+IHtcbiAgICAgIGxldCBoZWFkZXIgPSAnJztcbiAgICAgIGlmIChwa2dOYW1lICE9PSAoY21kIGFzIFBsaW5rQ29tbWFuZCkucGtnTmFtZSkge1xuICAgICAgICBwa2dOYW1lID0gKGNtZCBhcyBQbGlua0NvbW1hbmQpLnBrZ05hbWU7XG4gICAgICAgIGhlYWRlciA9IHBrZ05hbWUgPyBgXFxuJHtjaGFsay5pbnZlcnNlKGNoYWxrLmdyYXkoJ1Byb3ZpZGVkIGJ5IHBhY2thZ2UgJyArIHBrZ05hbWUgKyAnOiAnKSl9XFxuYCA6XG4gICAgICAgICAgJ1xcbic7XG4gICAgICB9XG4gICAgICBwa2dOYW1lID0gKGNtZCBhcyBQbGlua0NvbW1hbmQpLnBrZ05hbWU7XG4gICAgICByZXR1cm4gaGVhZGVyICsgZm9ybWF0SXRlbShoZWxwZXIuc3ViY29tbWFuZFRlcm0oY21kKSwgaGVscGVyLnN1YmNvbW1hbmREZXNjcmlwdGlvbihjbWQpLFxuICAgICAgICAoY21kIGFzIFBsaW5rQ29tbWFuZCkubmFtZVN0eWxlcik7XG4gICAgfSk7XG4gICAgaWYgKGNvbW1hbmRMaXN0Lmxlbmd0aCA+IDApIHtcbiAgICAgIG91dHB1dC5wdXNoKCdDb21tYW5kczonLCBmb3JtYXRMaXN0KGNvbW1hbmRMaXN0KSwgJycpO1xuICAgIH1cblxuICAgIHJldHVybiBvdXRwdXQuam9pbignXFxuJyk7XG4gIH1cblxuICAvLyB3cmFwKHN0cjogc3RyaW5nLCB3aWR0aDogbnVtYmVyLCBpbmRlbnQ6IG51bWJlciwgbWluQ29sdW1uV2lkdGggPSA0MCkge1xuICAvLyAgIC8vIERldGVjdCBtYW51YWxseSB3cmFwcGVkIGFuZCBpbmRlbnRlZCBzdHJpbmdzIGJ5IHNlYXJjaGluZyBmb3IgbGluZSBicmVha3NcbiAgLy8gICAvLyBmb2xsb3dlZCBieSBtdWx0aXBsZSBzcGFjZXMvdGFicy5cbiAgLy8gICBpZiAoc3RyLm1hdGNoKC9bXFxuXVxccysvKSkgcmV0dXJuIHN0cjtcbiAgLy8gICAvLyBEbyBub3Qgd3JhcCBpZiBub3QgZW5vdWdoIHJvb20gZm9yIGEgd3JhcHBlZCBjb2x1bW4gb2YgdGV4dCAoYXMgY291bGQgZW5kIHVwIHdpdGggYSB3b3JkIHBlciBsaW5lKS5cbiAgLy8gICBjb25zdCBjb2x1bW5XaWR0aCA9IHdpZHRoIC0gaW5kZW50O1xuICAvLyAgIGlmIChjb2x1bW5XaWR0aCA8IG1pbkNvbHVtbldpZHRoKSByZXR1cm4gc3RyO1xuXG4gIC8vICAgY29uc3QgbGVhZGluZ1N0ciA9IHN0ci5zdWJzdHIoMCwgaW5kZW50KTtcbiAgLy8gICBjb25zdCBjb2x1bW5UZXh0ID0gc3RyLnN1YnN0cihpbmRlbnQpO1xuXG4gIC8vICAgY29uc3QgaW5kZW50U3RyaW5nID0gJyAnLnJlcGVhdChpbmRlbnQpO1xuICAvLyAgIGNvbnN0IHJlZ2V4ID0gbmV3IFJlZ0V4cCgnLnsxLCcgKyAoY29sdW1uV2lkdGggLSAxKSArICd9KFtcXFxcc1xcdTIwMEJdfCQpfFteXFxcXHNcXHUyMDBCXSs/KFtcXFxcc1xcdTIwMEJdfCQpJywgJ2cnKTtcblxuICAvLyAgIGNvbnN0IGxpbmVzID0gY29sdW1uVGV4dC5tYXRjaChyZWdleCkgfHwgW107XG4gIC8vICAgcmV0dXJuIGxlYWRpbmdTdHIgKyBsaW5lcy5tYXAoKGxpbmUsIGkpID0+IHtcbiAgLy8gICAgIGlmIChsaW5lLnNsaWNlKC0xKSA9PT0gJ1xcbicpIHtcbiAgLy8gICAgICAgbGluZSA9IGxpbmUuc2xpY2UoMCwgbGluZS5sZW5ndGggLSAxKTtcbiAgLy8gICAgIH1cbiAgLy8gICAgIHJldHVybiAoKGkgPiAwKSA/IGluZGVudFN0cmluZyA6ICcnKSArIGxpbmUudHJpbVJpZ2h0KCk7XG4gIC8vICAgfSkuam9pbignXFxuJyk7XG4gIC8vIH1cbn1cbi8qKlxuICogRXh0ZW5kIGNvbW1hbmRlciwgY2hlY2sgY29tbWFuZGVyIEFQSSBhdCBodHRwczovL3d3dy5ucG1qcy5jb20vcGFja2FnZS9jb21tYW5kZXJcbiAqL1xuZXhwb3J0IGNsYXNzIFBsaW5rQ29tbWFuZCBleHRlbmRzIGNvbW1hbmRlci5Db21tYW5kIHtcbiAgbmFtZVN0eWxlcj86IChjbWROYW1lOiBzdHJpbmcpID0+IHN0cmluZztcbiAgb3B0aW9uU3R5bGVyPzogKGNtZE5hbWU6IHN0cmluZykgPT4gc3RyaW5nO1xuICBzdWJDbWRzOiBQbGlua0NvbW1hbmRbXSA9IFtdO1xuICAvKiogdmFsdWUgaXMgZmlsZSBwYXRoIGZvciBwa2cgbmFtZSAqL1xuICBsb2FkZWRDbWRNYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBwa2dOYW1lID0gJyc7XG5cbiAgY29uc3RydWN0b3IocHVibGljIGN0eDogQ29tbWFuZENvbnRleHQsIG5hbWU/OiBzdHJpbmcpIHtcbiAgICBzdXBlcihuYW1lKTtcbiAgfVxuXG4gIGFkZEdsb2JhbE9wdGlvbnNUb1N1YkNtZHMoKSB7XG4gICAgaWYgKHRoaXMuc3ViQ21kcyA9PSBudWxsKVxuICAgICAgcmV0dXJuO1xuICAgIGZvciAoY29uc3Qgc3ViQ21kIG9mIHRoaXMuc3ViQ21kcykge1xuICAgICAgd2l0aEdsb2JhbE9wdGlvbnMoc3ViQ21kKTtcbiAgICB9XG4gIH1cblxuICBjcmVhdGVDb21tYW5kKGNtZE5hbWU/OiBzdHJpbmcpOiBjb21tYW5kZXIuQ29tbWFuZCB7XG4gICAgY29uc3QgcGsgPSB0aGlzLmN0eC5jdXJyQ2xpQ3JlYXRvclBrZztcbiAgICBjb25zdCBmaWxlUGF0aCA9IHRoaXMuY3R4LmN1cnJDbGllQ3JlYXRvckZpbGU7XG4gICAgaWYgKGNtZE5hbWUgJiYgY21kTmFtZSAhPT0gJ2hlbHAnKSB7XG4gICAgICBpZiAodGhpcy5sb2FkZWRDbWRNYXAuaGFzKGNtZE5hbWUpKSB7XG4gICAgICAgIGlmIChmaWxlUGF0aClcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENvbmZsaWN0IGNvbW1hbmQgbmFtZSBcIiR7Y21kTmFtZX1cIiBmcm9tIGV4dGVuc2lvbnMgXCIke2ZpbGVQYXRofVwiIGFuZCBcIiR7dGhpcy5sb2FkZWRDbWRNYXAuZ2V0KGNtZE5hbWUpIX1cImApO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb25mbGljdCB3aXRoIGV4aXN0aW5nIFBsaW5rIGNvbW1hbmQgbmFtZSAke2NtZE5hbWV9YCk7XG4gICAgICB9XG4gICAgICB0aGlzLmxvYWRlZENtZE1hcC5zZXQoY21kTmFtZSwgZmlsZVBhdGggPyBmaWxlUGF0aCA6ICdAd2ZoL3BsaW5rJyk7XG4gICAgfVxuXG4gICAgY29uc3Qgc3ViQ21kID0gbmV3IFBsaW5rQ29tbWFuZCh0aGlzLmN0eCwgY21kTmFtZSk7XG4gICAgc3ViQ21kLm5hbWVTdHlsZXIgPSB0aGlzLmN0eC5uYW1lU3R5bGVyO1xuICAgIHN1YkNtZC5wa2dOYW1lID0gcGsgIT0gbnVsbCA/IHBrLm5hbWUgOiAnJztcbiAgICB0aGlzLnN1YkNtZHMucHVzaChzdWJDbWQpO1xuXG4gICAgLy8gc3ViQ21kLnNldENvbnRleHREYXRhKHRoaXMuY3VyckNsaWVDcmVhdG9yRmlsZSwgdGhpcy5jdXJyQ2xpQ3JlYXRvclBrZywgdGhpcy5tZXRhTWFwLCB0aGlzKTtcblxuICAgIGNvbnN0IG1ldGE6IFBhcnRpYWw8T3VyQ29tbWFuZE1ldGFkYXRhPiA9IHtcbiAgICAgIHBrZ05hbWU6IHBrID8gcGsubmFtZSA6ICdAd2ZoL3BsaW5rJyxcbiAgICAgIG5hbWU6IGNtZE5hbWUsXG4gICAgICBvcHRpb25zOiBbXSxcbiAgICAgIGRlc2M6ICcnXG4gICAgfTtcbiAgICB0aGlzLmN0eC5tZXRhTWFwLnNldChzdWJDbWQsIG1ldGEpO1xuICAgIHRoaXMuY3R4LmN1cnJDbGlQa2dNYXRhSW5mb3MucHVzaChtZXRhIGFzIE91ckNvbW1hbmRNZXRhZGF0YSk7XG4gICAgLy8gc3ViQ21kLmRlc2NyaXB0aW9uKG1ldGEuZGVzYyEpO1xuICAgIHJldHVybiBzdWJDbWQ7XG4gIH1cblxuICBkZXNjcmlwdGlvbihzdHI/OiBzdHJpbmcsXG4gICAgYXJnc0Rlc2NyaXB0aW9uPzogeyBbYXJnTmFtZTogc3RyaW5nXTogc3RyaW5nOyB9KSB7XG4gICAgaWYgKHN0ciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zdCBwbGlua01ldGEgPSB0aGlzLmN0eC5tZXRhTWFwLmdldCh0aGlzKSE7XG4gICAgICBwbGlua01ldGEuZGVzYyA9IHN0cjtcbiAgICAgIGlmIChhcmdzRGVzY3JpcHRpb24pIHtcbiAgICAgICAgcGxpbmtNZXRhLmFyZ0Rlc2MgPSBhcmdzRGVzY3JpcHRpb247XG4gICAgICB9XG4gICAgICByZXR1cm4gc3VwZXIuZGVzY3JpcHRpb24oc3RyLCBhcmdzRGVzY3JpcHRpb24pO1xuICAgIH1cbiAgICByZXR1cm4gc3VwZXIuZGVzY3JpcHRpb24oKSBhcyBhbnk7XG4gIH1cblxuICBhbGlhcyhhbGlhcz86IHN0cmluZykge1xuICAgIGlmIChhbGlhcykge1xuICAgICAgY29uc3QgcGxpbmtNZXRhID0gdGhpcy5jdHgubWV0YU1hcC5nZXQodGhpcykhO1xuICAgICAgcGxpbmtNZXRhLmFsaWFzID0gYWxpYXM7XG4gICAgfVxuICAgIHJldHVybiBzdXBlci5hbGlhcyhhbGlhcyBhcyBhbnkpIGFzIGFueTtcbiAgfVxuXG4gIGNyZWF0ZU9wdGlvbihmbGFnczogc3RyaW5nLCBkZXNjcmlwdGlvbj86IHN0cmluZywgLi4ucmVtYWluaW5nOiBhbnlbXSkge1xuICAgIGxldCBkZWZhdWx0VmFsdWU6IGFueTtcbiAgICBpZiAocmVtYWluaW5nLmxlbmd0aCA+IDEpIHtcbiAgICAgIGRlZmF1bHRWYWx1ZSA9IHJlbWFpbmluZ1tyZW1haW5pbmcubGVuZ3RoIC0gMV07XG4gICAgfVxuICAgIGNvbnN0IHBsaW5rTWV0YSA9IHRoaXMuY3R4Lm1ldGFNYXAuZ2V0KHRoaXMpITtcbiAgICBwbGlua01ldGEub3B0aW9ucyEucHVzaCh7XG4gICAgICBmbGFncywgZGVzYzogZGVzY3JpcHRpb24gfHwgJycsIGRlZmF1bHRWYWx1ZSwgaXNSZXF1aXJlZDogZmFsc2VcbiAgICB9KTtcbiAgICBjb25zdCBvcHQgPSBuZXcgUGxpbmtDbWRPcHRpb24oZmxhZ3MsIGRlc2NyaXB0aW9uKTtcbiAgICBvcHQub3B0aW9uU3R5bGVyID0gdGhpcy5vcHRpb25TdHlsZXI7XG4gICAgcmV0dXJuIG9wdDtcbiAgfVxuICBvcHRpb24oLi4uYXJnczogYW55W10pIHtcbiAgICAodGhpcy5fc2F2ZU9wdGlvbnMgYXMgYW55KShmYWxzZSwgLi4uYXJncyk7XG4gICAgcmV0dXJuIChzdXBlci5vcHRpb24gYXMgYW55KSguLi5hcmdzKTtcbiAgfVxuICByZXF1aXJlZE9wdGlvbiguLi5hcmdzOiBhbnlbXSkge1xuICAgICh0aGlzLl9zYXZlT3B0aW9ucyBhcyBhbnkpKHRydWUsIC4uLmFyZ3MpO1xuICAgIHJldHVybiAoc3VwZXIucmVxdWlyZWRPcHRpb24gYXMgYW55KSguLi5hcmdzKTtcbiAgfVxuICBhY3Rpb24oZm46ICguLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCB8IFByb21pc2U8dm9pZD4pIHtcbiAgICBmdW5jdGlvbiBhY3Rpb25DYWxsYmFjayh0aGlzOiBjb21tYW5kZXIuQ29tbWFuZCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3Qge2luaXRDb25maWd9ID0gcmVxdWlyZSgnLi4vdXRpbHMvYm9vdHN0cmFwLXByb2Nlc3MnKSBhcyB0eXBlb2YgX2Jvb3RzdHJhcDtcbiAgICAgICAgaW5pdENvbmZpZyh0aGlzLm9wdHMoKSBhcyBHbG9iYWxPcHRpb25zKTtcbiAgICAgICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGxvZy5lcnJvcihlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHN1cGVyLmFjdGlvbihhY3Rpb25DYWxsYmFjayk7XG4gIH1cbiAgY3JlYXRlSGVscCgpIHtcbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihuZXcgUGxpbmtDb21tYW5kSGVscCgpLCB0aGlzLmNvbmZpZ3VyZUhlbHAoKSk7XG4gIH1cbiAgX3NhdmVPcHRpb25zKGlzUmVxdWlyZWQ6IGJvb2xlYW4sIGZsYWdzOiBzdHJpbmcsIGRlc2M6IHN0cmluZywgLi4ucmVtYWluaW5nOiBhbnlbXSkge1xuICAgIGxldCBkZWZhdWx0VmFsdWU6IGFueTtcbiAgICBpZiAocmVtYWluaW5nLmxlbmd0aCA+IDEpIHtcbiAgICAgIGRlZmF1bHRWYWx1ZSA9IHJlbWFpbmluZ1tyZW1haW5pbmcubGVuZ3RoIC0gMV07XG4gICAgfVxuICAgIGNvbnN0IHBsaW5rTWV0YSA9IHRoaXMuY3R4Lm1ldGFNYXAuZ2V0KHRoaXMpITtcbiAgICBwbGlua01ldGEub3B0aW9ucyEucHVzaCh7XG4gICAgICBmbGFncywgZGVzYywgZGVmYXVsdFZhbHVlLCBpc1JlcXVpcmVkXG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IHR5cGUgQ2xpRXh0ZW5zaW9uID0gKHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kKSA9PiB2b2lkO1xuXG5jbGFzcyBQbGlua0NtZE9wdGlvbiBleHRlbmRzIGNvbW1hbmRlci5PcHRpb24ge1xuICBvcHRpb25TdHlsZXI/OiAoY21kTmFtZTogc3RyaW5nKSA9PiBzdHJpbmc7XG59XG5leHBvcnQgY2xhc3MgQ29tbWFuZE92ZXJyaWRlciB7XG4gIC8vIG5hbWVTdHlsZXI6IFBsaW5rQ29tbWFuZFsnbmFtZVN0eWxlciddO1xuICAvLyBwcml2YXRlIGN1cnJDbGllQ3JlYXRvckZpbGU6IHN0cmluZztcbiAgLy8gcHJpdmF0ZSBjdXJyQ2xpQ3JlYXRvclBrZzogUGFja2FnZUluZm8gfCBudWxsID0gbnVsbDtcbiAgLy8gcHJpdmF0ZSBjdXJyQ2xpUGtnTWF0YUluZm9zOiBPdXJDb21tYW5kTWV0YWRhdGFbXTtcbiAgLy8gcHJpdmF0ZSBhbGxTdWJDbWRzOiBPdXJBdWdtZW50ZWRDb21tYW5kZXJbXSA9IFtdO1xuICAvLyBwcml2YXRlIG1ldGFNYXAgPSBuZXcgV2Vha01hcDxjb21tYW5kZXIuQ29tbWFuZCwgUGFydGlhbDxPdXJDb21tYW5kTWV0YWRhdGE+PigpO1xuICBwcml2YXRlIHBrZ01ldGFzTWFwID0gbmV3IE1hcDxzdHJpbmcsIE91ckNvbW1hbmRNZXRhZGF0YVtdPigpO1xuICBwcml2YXRlIGN0eDogUGFydGlhbDxDb21tYW5kQ29udGV4dD4gPSB7XG4gICAgbWV0YU1hcDogbmV3IFdlYWtNYXA8Y29tbWFuZGVyLkNvbW1hbmQsIFBhcnRpYWw8T3VyQ29tbWFuZE1ldGFkYXRhPj4oKVxuICB9O1xuXG4gIHNldCBuYW1lU3R5bGVyKHY6IFBsaW5rQ29tbWFuZFsnbmFtZVN0eWxlciddKSB7XG4gICAgdGhpcy5jdHgubmFtZVN0eWxlciA9IHY7XG4gIH1cblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kLCB3cz86IFdvcmtzcGFjZVN0YXRlKSB7XG4gICAgdGhpcy5wcm9ncmFtLmNyZWF0ZUNvbW1hbmQgPSBQbGlua0NvbW1hbmQucHJvdG90eXBlLmNyZWF0ZUNvbW1hbmQ7XG5cbiAgICAodGhpcy5wcm9ncmFtIGFzIFBsaW5rQ29tbWFuZCkuY3R4ID0gdGhpcy5jdHggYXMgQ29tbWFuZENvbnRleHQ7XG4gICAgKHRoaXMucHJvZ3JhbSBhcyBQbGlua0NvbW1hbmQpLnN1YkNtZHMgPSBbXTtcbiAgICAodGhpcy5wcm9ncmFtIGFzIFBsaW5rQ29tbWFuZCkubG9hZGVkQ21kTWFwID0gbmV3IE1hcCgpO1xuICAgICh0aGlzLnByb2dyYW0gYXMgUGxpbmtDb21tYW5kKS5hZGRHbG9iYWxPcHRpb25zVG9TdWJDbWRzID0gUGxpbmtDb21tYW5kLnByb3RvdHlwZS5hZGRHbG9iYWxPcHRpb25zVG9TdWJDbWRzO1xuICAgIHRoaXMucHJvZ3JhbS5jcmVhdGVIZWxwID0gUGxpbmtDb21tYW5kLnByb3RvdHlwZS5jcmVhdGVIZWxwO1xuICB9XG5cbiAgZm9yUGFja2FnZShwazogUGFja2FnZUluZm8sIHBrZ0ZpbGVQYXRoOiBzdHJpbmcsIGZ1bmNOYW1lOiBzdHJpbmcpOiB2b2lkO1xuICBmb3JQYWNrYWdlKHBrOiBudWxsLCBjb21tYW5kQ3JlYXRpb246IChwcm9ncmFtOiBjb21tYW5kZXIuQ29tbWFuZCkgPT4gdm9pZCk6IHZvaWQ7XG4gIGZvclBhY2thZ2UocGs6IFBhY2thZ2VJbmZvIHwgbnVsbCxcbiAgICBwa2dGaWxlUGF0aDogc3RyaW5nIHwgKChwcm9ncmFtOiBjb21tYW5kZXIuQ29tbWFuZCkgPT4gdm9pZCksXG4gICAgZnVuY05hbWU/OiBzdHJpbmcpIHtcbiAgICBjb25zdCBjb21tYW5kTWV0YUluZm9zOiBPdXJDb21tYW5kTWV0YWRhdGFbXSA9IHRoaXMuY3R4LmN1cnJDbGlQa2dNYXRhSW5mb3MgPSBbXTtcbiAgICB0aGlzLmN0eC5jdXJyQ2xpQ3JlYXRvclBrZyA9IHBrO1xuXG4gICAgbGV0IGZpbGVQYXRoOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcblxuICAgIGlmICh0eXBlb2YgcGtnRmlsZVBhdGggPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHBrZ0ZpbGVQYXRoKHRoaXMucHJvZ3JhbSk7XG4gICAgICB0aGlzLnBrZ01ldGFzTWFwLnNldCgnQHdmaC9wbGluaycsIGNvbW1hbmRNZXRhSW5mb3MpO1xuICAgIH0gZWxzZSBpZiAocGspIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGRlYnVnZ2VyO1xuICAgICAgICBmaWxlUGF0aCA9IHJlcXVpcmUucmVzb2x2ZShway5uYW1lICsgJy8nICsgcGtnRmlsZVBhdGgpO1xuICAgICAgICB0aGlzLmN0eC5jdXJyQ2xpZUNyZWF0b3JGaWxlID0gZmlsZVBhdGg7XG4gICAgICAgIGNvbnN0IHN1YkNtZEZhY3Rvcnk6IENsaUV4dGVuc2lvbiA9IGZ1bmNOYW1lID8gcmVxdWlyZShmaWxlUGF0aClbZnVuY05hbWVdIDpcbiAgICAgICAgICByZXF1aXJlKGZpbGVQYXRoKTtcbiAgICAgICAgc3ViQ21kRmFjdG9yeSh0aGlzLnByb2dyYW0gYXMgUGxpbmtDb21tYW5kKTtcbiAgICAgICAgdGhpcy5wa2dNZXRhc01hcC5zZXQocGsubmFtZSwgY29tbWFuZE1ldGFJbmZvcyk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgIGxvZy53YXJuKGBGYWlsZWQgdG8gbG9hZCBjb21tYW5kIGxpbmUgZXh0ZW5zaW9uIGluIHBhY2thZ2UgJHtway5uYW1lfTogXCIke2UubWVzc2FnZSBhcyBzdHJpbmd9XCJgLCBlKTtcbiAgICAgIH0gZmluYWxseSB7XG4gICAgICAgIGZpbGVQYXRoID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5jdHguY3VyckNsaUNyZWF0b3JQa2cgPSBudWxsO1xuICB9XG5cbiAgYXBwZW5kR2xvYmFsT3B0aW9ucyhzYXZlVG9TdG9yZTogYm9vbGVhbikge1xuICAgICh0aGlzLnByb2dyYW0gYXMgUGxpbmtDb21tYW5kKS5hZGRHbG9iYWxPcHRpb25zVG9TdWJDbWRzKCk7XG4gICAgLy8gZm9yIChjb25zdCBjbWQgb2YgdGhpcy5hbGxTdWJDbWRzKSB7XG4gICAgLy8gICB3aXRoR2xvYmFsT3B0aW9ucyhjbWQpO1xuICAgIC8vIH1cbiAgICBpZiAoIXNhdmVUb1N0b3JlKVxuICAgICAgcmV0dXJuO1xuICAgIHByb2Nlc3MubmV4dFRpY2soKCkgPT4ge1xuICAgICAgZm9yIChjb25zdCBbcGtnLCBtZXRhc10gb2YgdGhpcy5wa2dNZXRhc01hcC5lbnRyaWVzKCkpIHtcbiAgICAgICAgY2xpQWN0aW9uRGlzcGF0Y2hlci5hZGRDb21tYW5kTWV0YSh7cGtnLCBtZXRhc30pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3aXRoQ3dkT3B0aW9uKGNtZDogY29tbWFuZGVyLkNvbW1hbmQpOiBjb21tYW5kZXIuQ29tbWFuZCB7XG4gIHJldHVybiBjbWQub3B0aW9uKCctLWN3ZCA8d29ya2luZyBkaXI+JywgJ1J1biBjb21tYW5kIGluIGEgZGlmZmVyZW50IHdvcmt0cmVlIGRpcmVjdG9yeTogWycgK1xuICAgIFsuLi5nZXRTdGF0ZSgpLndvcmtzcGFjZXMua2V5cygpXS5qb2luKCcsICcpICsgJ10nKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdpdGhHbG9iYWxPcHRpb25zKGNtZDogY29tbWFuZGVyLkNvbW1hbmQgfCBQbGlua0NvbW1hbmQpOiBjb21tYW5kZXIuQ29tbWFuZCB7XG4gIGlmIChnZXRTdGF0ZSgpLndvcmtzcGFjZXMgPT0gbnVsbClcbiAgICBjb25zb2xlLmxvZyhnZXRTdGF0ZSgpKTtcbiAgd2l0aEN3ZE9wdGlvbihjbWQpO1xuXG4gIGlmIChjbWQgaW5zdGFuY2VvZiBQbGlua0NvbW1hbmQpXG4gICAgY21kLm9wdGlvblN0eWxlciA9IHN0ciA9PiBjaGFsay5ncmF5KHN0cik7XG4gIChjbWQub3B0aW9uIGFzIGNvbW1hbmRlci5Db21tYW5kWydvcHRpb24nXSkoJy1jLCAtLWNvbmZpZyA8Y29uZmlnLWZpbGU+JyxcbiAgICAnUmVhZCBjb25maWcgZmlsZXMsIGlmIHRoZXJlIGFyZSBtdWx0aXBsZSBmaWxlcywgdGhlIGxhdHRlciBvbmUgb3ZlcnJpZGVzIHByZXZpb3VzIG9uZScsXG4gICAgKHZhbHVlLCBwcmV2KSA9PiB7XG4gICAgICBwcmV2LnB1c2goLi4udmFsdWUuc3BsaXQoJywnKSk7XG4gICAgICByZXR1cm4gcHJldjtcbiAgICAgIC8vIHJldHVybiBwcmV2LmNvbmNhdCh2YWx1ZS5zcGxpdCgnLCcpKTtcbiAgICB9LCBbXSBhcyBzdHJpbmdbXSk7XG5cbiAgKGNtZC5vcHRpb24gYXMgY29tbWFuZGVyLkNvbW1hbmRbJ29wdGlvbiddKSgnLS1wcm9wIDxleHByZXNzaW9uPicsXG4gICAgJzxwcm9wZXJ0eSBwYXRoPj08dmFsdWUgYXMgSlNPTiB8IGxpdGVyYWw+IC4uLiBkaXJlY3RseSBzZXQgY29uZmlndXJhdGlvbiBwcm9wZXJ0aWVzLCBwcm9wZXJ0eSBuYW1lIGlzIGxvZGFzaC5zZXQoKSBwYXRoLWxpa2Ugc3RyaW5nLiBlLmcuICcgK1xuICAgICctLXByb3AgcG9ydD04MDgwIC0tcHJvcCBkZXZNb2RlPWZhbHNlIC0tcHJvcCBAd2ZoL2Zvb2Jhci5hcGk9aHR0cDovL2xvY2FsaG9zdDo4MDgwICcgK1xuICAgICctLXByb3AgYXJyYXlsaWtlLnByb3BbMF09Zm9vYmFyICcgK1xuICAgICctLXByb3AgW1wiQHdmaC9mb28uYmFyXCIsXCJwcm9wXCIsMF09dHJ1ZScsXG4gICAgYXJyYXlPcHRpb25GbiwgW10gYXMgc3RyaW5nW10pXG4gIC5vcHRpb24oJy0tdmVyYm9zZScsICdTcGVjaWZ5IGxvZyBsZXZlbCBhcyBcImRlYnVnXCInLCBmYWxzZSlcbiAgLm9wdGlvbignLS1kZXYnLCAnQnkgdHVybmluZyBvbiB0aGlzIG9wdGlvbiwnICtcbiAgICAnIFBsaW5rIHNldHRpbmcgcHJvcGVydHkgXCJkZXZNb2RlXCIgd2lsbCBhdXRvbWF0Y2lhbGx5IHNldCB0byBgdHJ1ZWAsJyArXG4gICAgJyBhbmQgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgd2lsbCBhbHNvIGJlaW5nIHVwZGF0ZWQgdG8gXFwnZGV2ZWxvcGVtZW50XFwnIG9yIFxcJ3Byb2R1Y3Rpb24gY29ycmVzcG9uZGluZ2x5LiAnLFxuICAgIGZhbHNlKVxuICAub3B0aW9uKCctLWVudiA8c2V0dGluZyBlbnZpcm9ubWVudD4nLCAnQSBzdHJpbmcgZGVub3RlcyBydW50aW1lIGVudmlyb25tZW50IG5hbWUsIHBhY2thZ2Ugc2V0dGluZyBmaWxlIG1heSByZXR1cm4gZGlmZmVyZW50IHZhbHVlcyBiYXNlZCBvbiBpdHMgdmFsdWUgKGNsaU9wdGlvbnMuZW52KScpO1xuICBpZiAoY21kIGluc3RhbmNlb2YgUGxpbmtDb21tYW5kKVxuICAgIGNtZC5vcHRpb25TdHlsZXIgPSB1bmRlZmluZWQ7XG4gIHJldHVybiBjbWQ7XG59XG4iXX0=