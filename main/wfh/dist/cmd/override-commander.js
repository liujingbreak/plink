"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withGlobalOptions = exports.CommandOverrider = exports.PlinkCommand = exports.PlinkCommandHelp = void 0;
const commander_1 = __importDefault(require("commander"));
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
            const { initConfig } = require('../utils/bootstrap-process');
            if (this.opts().verbose) {
                log4js_1.default.configure({
                    appenders: {
                        out: {
                            type: 'stdout',
                            layout: { type: 'pattern', pattern: (process.send ? '%z' : '') + '%[[%p] %c%] - %m' }
                        }
                    },
                    categories: {
                        default: { appenders: ['out'], level: 'debug' },
                        plink: { appenders: ['out'], level: 'debug' }
                    }
                });
            }
            initConfig(this.opts());
            return fn.apply(this, arguments);
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
                filePath = require.resolve(pk.name + '/' + pkgFilePath);
                this.ctx.currClieCreatorFile = filePath;
                const subCmdFactory = funcName ? require(filePath)[funcName] :
                    require(filePath);
                subCmdFactory(this.program);
                this.pkgMetasMap.set(pk.name, commandMetaInfos);
            }
            catch (e) {
                // tslint:disable-next-line: no-console
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
function withGlobalOptions(cmd) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcnJpZGUtY29tbWFuZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL292ZXJyaWRlLWNvbW1hbmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSwwREFBa0M7QUFFbEMsa0RBQTBCO0FBQzFCLG1DQUFzQztBQUd0QywyQ0FBZ0Q7QUFDaEQsb0RBQTRCO0FBQzVCLDREQUFtQztBQUVuQyxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0FBVXpELE1BQWEsZ0JBQWlCLFNBQVEsbUJBQVMsQ0FBQyxJQUFJO0lBQ2xELGNBQWMsQ0FBQyxHQUFzQjtRQUNuQyxNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3RDLElBQUksR0FBRyxZQUFZLFlBQVksSUFBSSxHQUFHLENBQUMsVUFBVSxFQUFFO1lBQ2pELE9BQU8sR0FBRyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUM1QjtRQUNELE9BQU8sR0FBRyxDQUFDO0lBQ2IsQ0FBQztJQUVELFVBQVUsQ0FBQyxNQUFzQjtRQUMvQixPQUFPLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO0lBQ2hGLENBQUM7SUFFRCxrQ0FBa0MsQ0FBQyxHQUFzQixFQUFFLE1BQXdCO1FBQ2pGLE9BQU8sTUFBTSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLEVBQUU7WUFDekQsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxvQkFBUyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztR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R0FBRyxDQUFDO0FBQ2IsQ0FBQztBQTFCRCw4Q0EwQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY29tbWFuZGVyIGZyb20gJ2NvbW1hbmRlcic7XG5pbXBvcnQge1dvcmtzcGFjZVN0YXRlLCBQYWNrYWdlSW5mb30gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB7YXJyYXlPcHRpb25Gbn0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgKiBhcyBfYm9vdHN0cmFwIGZyb20gJy4uL3V0aWxzL2Jvb3RzdHJhcC1wcm9jZXNzJztcbmltcG9ydCB7IEdsb2JhbE9wdGlvbnMsIE91ckNvbW1hbmRNZXRhZGF0YSB9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtjbGlBY3Rpb25EaXNwYXRjaGVyfSBmcm9tICcuL2NsaS1zbGljZSc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgc3RyaXBBbnNpIGZyb20gJ3N0cmlwLWFuc2knO1xuXG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay5vdmVycmlkZS1jb21tYW5kZXInKTtcblxuaW50ZXJmYWNlIENvbW1hbmRDb250ZXh0IHtcbiAgY3VyckNsaWVDcmVhdG9yRmlsZTogc3RyaW5nO1xuICBjdXJyQ2xpQ3JlYXRvclBrZzogUGFja2FnZUluZm8gfCBudWxsO1xuICBtZXRhTWFwOiBXZWFrTWFwPFBsaW5rQ29tbWFuZCwgUGFydGlhbDxPdXJDb21tYW5kTWV0YWRhdGE+PjtcbiAgY3VyckNsaVBrZ01hdGFJbmZvczogT3VyQ29tbWFuZE1ldGFkYXRhW107XG4gIG5hbWVTdHlsZXI/OiAoY21kTmFtZTogc3RyaW5nKSA9PiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBQbGlua0NvbW1hbmRIZWxwIGV4dGVuZHMgY29tbWFuZGVyLkhlbHAge1xuICBzdWJjb21tYW5kVGVybShjbWQ6IGNvbW1hbmRlci5Db21tYW5kKTogc3RyaW5nIHtcbiAgICBjb25zdCBzdHIgPSBzdXBlci5zdWJjb21tYW5kVGVybShjbWQpO1xuICAgIGlmIChjbWQgaW5zdGFuY2VvZiBQbGlua0NvbW1hbmQgJiYgY21kLm5hbWVTdHlsZXIpIHtcbiAgICAgIHJldHVybiBjbWQubmFtZVN0eWxlcihzdHIpO1xuICAgIH1cbiAgICByZXR1cm4gc3RyO1xuICB9XG5cbiAgb3B0aW9uVGVybShvcHRpb246IFBsaW5rQ21kT3B0aW9uKSB7XG4gICAgcmV0dXJuIG9wdGlvbi5vcHRpb25TdHlsZXIgPyBvcHRpb24ub3B0aW9uU3R5bGVyKG9wdGlvbi5mbGFncykgOiBvcHRpb24uZmxhZ3M7XG4gIH1cblxuICBsb25nZXN0U3ViY29tbWFuZFRlcm1MZW5ndGhGb3JSZWFsKGNtZDogY29tbWFuZGVyLkNvbW1hbmQsIGhlbHBlcjogUGxpbmtDb21tYW5kSGVscCkge1xuICAgIHJldHVybiBoZWxwZXIudmlzaWJsZUNvbW1hbmRzKGNtZCkucmVkdWNlKChtYXgsIGNvbW1hbmQpID0+IHtcbiAgICAgIHJldHVybiBNYXRoLm1heChtYXgsIHN0cmlwQW5zaShoZWxwZXIuc3ViY29tbWFuZFRlcm0oY29tbWFuZCkpLmxlbmd0aCk7XG4gICAgfSwgMCk7XG4gIH1cblxuICBsb25nZXN0T3B0aW9uVGVybUxlbmd0aEZvclJlYWwoY21kOiBjb21tYW5kZXIuQ29tbWFuZCwgaGVscGVyOiBQbGlua0NvbW1hbmRIZWxwKSB7XG4gICAgcmV0dXJuIGhlbHBlci52aXNpYmxlT3B0aW9ucyhjbWQpLnJlZHVjZSgobWF4LCBvcHRpb24pID0+IHtcbiAgICAgIHJldHVybiBNYXRoLm1heChtYXgsIHN0cmlwQW5zaShoZWxwZXIub3B0aW9uVGVybShvcHRpb24pKS5sZW5ndGgpO1xuICAgIH0sIDApO1xuICB9XG5cbiAgLy8gc3ViY29tbWFuZERlc2NyaXB0aW9uKGNtZDogY29tbWFuZGVyLkNvbW1hbmQpIHtcbiAgLy8gICByZXR1cm4gc3RyaXBBbnNpKHN1cGVyLnN1YmNvbW1hbmREZXNjcmlwdGlvbihjbWQpKTtcbiAgLy8gfVxuXG4gIHJlYWxQYWRXaWR0aChjbWQ6IGNvbW1hbmRlci5Db21tYW5kLCBoZWxwZXI6IFBsaW5rQ29tbWFuZEhlbHApIHtcbiAgICByZXR1cm4gTWF0aC5tYXgoXG4gICAgICBoZWxwZXIubG9uZ2VzdE9wdGlvblRlcm1MZW5ndGhGb3JSZWFsKGNtZCwgaGVscGVyKSxcbiAgICAgIGhlbHBlci5sb25nZXN0U3ViY29tbWFuZFRlcm1MZW5ndGhGb3JSZWFsKGNtZCwgaGVscGVyKSxcbiAgICAgIGhlbHBlci5sb25nZXN0QXJndW1lbnRUZXJtTGVuZ3RoKGNtZCwgaGVscGVyKVxuICAgICk7XG4gIH1cblxuICBmb3JtYXRIZWxwKGNtZDogY29tbWFuZGVyLkNvbW1hbmQsIGhlbHBlcjogUGxpbmtDb21tYW5kSGVscCkge1xuICAgIC8vIGNvbnN0IHRlcm1XaWR0aCA9IGhlbHBlci5wYWRXaWR0aChjbWQsIGhlbHBlcik7IC8vIEl0IGlzIGJpZ2dlciB0aGFuIGFjdHVhbCB3aWR0aCBkdWUgdG8gY29sb3JmdWwgY2hhcmFjdGVyXG4gICAgY29uc3QgcmVhbFRlcm1XaWR0aCA9IGhlbHBlci5yZWFsUGFkV2lkdGgoY21kLCBoZWxwZXIpO1xuICAgIC8vIGNvbnNvbGUubG9nKCd0ZXJtV2lkdGg9JywgdGVybVdpZHRoKTtcbiAgICBjb25zdCBoZWxwV2lkdGggPSBoZWxwZXIuaGVscFdpZHRoIHx8IDgwO1xuICAgIGNvbnN0IGl0ZW1JbmRlbnRXaWR0aCA9IDI7XG4gICAgY29uc3QgaXRlbVNlcGFyYXRvcldpZHRoID0gMjsgLy8gYmV0d2VlbiB0ZXJtIGFuZCBkZXNjcmlwdGlvblxuICAgIGZ1bmN0aW9uIGZvcm1hdEl0ZW0odGVybTogc3RyaW5nLCBkZXNjcmlwdGlvbjogc3RyaW5nLCBzdHlsZXI/OiBQbGlua0NvbW1hbmRbJ25hbWVTdHlsZXInXSkge1xuICAgICAgaWYgKGRlc2NyaXB0aW9uKSB7XG4gICAgICAgIC8vIFN1cHBvcnQgY29sb3JmdWwgY2hhcmFjdGVyc1xuICAgICAgICBjb25zdCBmdWxsVGV4dCA9IGAke3Rlcm19JHsnICcucmVwZWF0KHJlYWxUZXJtV2lkdGggKyBpdGVtSW5kZW50V2lkdGggLSBzdHJpcEFuc2kodGVybSkubGVuZ3RoKX0ke2Rlc2NyaXB0aW9ufWA7XG4gICAgICAgIHJldHVybiBoZWxwZXIud3JhcChmdWxsVGV4dCwgaGVscFdpZHRoIC0gaXRlbUluZGVudFdpZHRoLCByZWFsVGVybVdpZHRoICsgaXRlbVNlcGFyYXRvcldpZHRoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0ZXJtO1xuICAgIH1cbiAgICBmdW5jdGlvbiBmb3JtYXRMaXN0KHRleHRBcnJheTogc3RyaW5nW10pIHtcbiAgICAgIHJldHVybiB0ZXh0QXJyYXkuam9pbignXFxuJykucmVwbGFjZSgvXi9nbSwgJyAnLnJlcGVhdChpdGVtSW5kZW50V2lkdGgpKTtcbiAgICB9XG5cbiAgICAvLyBVc2FnZVxuICAgIGNvbnN0IG91dHB1dCA9IFtgVXNhZ2U6ICR7aGVscGVyLmNvbW1hbmRVc2FnZShjbWQpfWAsICcnXTtcblxuICAgIC8vIERlc2NyaXB0aW9uXG4gICAgY29uc3QgY29tbWFuZERlc2NyaXB0aW9uID0gaGVscGVyLmNvbW1hbmREZXNjcmlwdGlvbihjbWQpO1xuICAgIGlmIChjb21tYW5kRGVzY3JpcHRpb24ubGVuZ3RoID4gMCkge1xuICAgICAgb3V0cHV0LnB1c2goY29tbWFuZERlc2NyaXB0aW9uLCAnJyk7XG4gICAgfVxuXG4gICAgLy8gQXJndW1lbnRzXG4gICAgY29uc3QgYXJndW1lbnRMaXN0ID0gaGVscGVyLnZpc2libGVBcmd1bWVudHMoY21kKS5tYXAoKGFyZ3VtZW50KSA9PiB7XG4gICAgICByZXR1cm4gZm9ybWF0SXRlbShhcmd1bWVudC50ZXJtLCBhcmd1bWVudC5kZXNjcmlwdGlvbik7XG4gICAgfSk7XG4gICAgaWYgKGFyZ3VtZW50TGlzdC5sZW5ndGggPiAwKSB7XG4gICAgICBvdXRwdXQucHVzaCgnQXJndW1lbnRzOicsIGZvcm1hdExpc3QoYXJndW1lbnRMaXN0KSwgJycpO1xuICAgIH1cblxuICAgIC8vIE9wdGlvbnNcbiAgICBjb25zdCBvcHRpb25MaXN0ID0gaGVscGVyLnZpc2libGVPcHRpb25zKGNtZCkubWFwKChvcHRpb24pID0+IHtcbiAgICAgIHJldHVybiBmb3JtYXRJdGVtKGhlbHBlci5vcHRpb25UZXJtKG9wdGlvbiksIGhlbHBlci5vcHRpb25EZXNjcmlwdGlvbihvcHRpb24pLFxuICAgICAgICAob3B0aW9uIGFzIFBsaW5rQ21kT3B0aW9uKS5vcHRpb25TdHlsZXIpO1xuICAgIH0pO1xuICAgIGlmIChvcHRpb25MaXN0Lmxlbmd0aCA+IDApIHtcbiAgICAgIG91dHB1dC5wdXNoKCdPcHRpb25zOicsIGZvcm1hdExpc3Qob3B0aW9uTGlzdCksICcnKTtcbiAgICB9XG5cbiAgICAvLyBDb21tYW5kc1xuICAgIGxldCBwa2dOYW1lID0gJyc7XG4gICAgY29uc3QgY29tbWFuZExpc3QgPSBoZWxwZXIudmlzaWJsZUNvbW1hbmRzKGNtZCkubWFwKChjbWQpID0+IHtcbiAgICAgIGxldCBoZWFkZXIgPSAnJztcbiAgICAgIGlmIChwa2dOYW1lICE9PSAoY21kIGFzIFBsaW5rQ29tbWFuZCkucGtnTmFtZSkge1xuICAgICAgICBwa2dOYW1lID0gKGNtZCBhcyBQbGlua0NvbW1hbmQpLnBrZ05hbWU7XG4gICAgICAgIGhlYWRlciA9IHBrZ05hbWUgPyBgXFxuJHtjaGFsay5pbnZlcnNlKGNoYWxrLmdyYXkoJ1Byb3ZpZGVkIGJ5IHBhY2thZ2UgJyArIHBrZ05hbWUgKyAnOiAnKSl9XFxuYCA6XG4gICAgICAgICAgJ1xcbic7XG4gICAgICB9XG4gICAgICBwa2dOYW1lID0gKGNtZCBhcyBQbGlua0NvbW1hbmQpLnBrZ05hbWU7XG4gICAgICByZXR1cm4gaGVhZGVyICsgZm9ybWF0SXRlbShoZWxwZXIuc3ViY29tbWFuZFRlcm0oY21kKSwgaGVscGVyLnN1YmNvbW1hbmREZXNjcmlwdGlvbihjbWQpLFxuICAgICAgICAoY21kIGFzIFBsaW5rQ29tbWFuZCkubmFtZVN0eWxlcik7XG4gICAgfSk7XG4gICAgaWYgKGNvbW1hbmRMaXN0Lmxlbmd0aCA+IDApIHtcbiAgICAgIG91dHB1dC5wdXNoKCdDb21tYW5kczonLCBmb3JtYXRMaXN0KGNvbW1hbmRMaXN0KSwgJycpO1xuICAgIH1cblxuICAgIHJldHVybiBvdXRwdXQuam9pbignXFxuJyk7XG4gIH1cblxuICAvLyB3cmFwKHN0cjogc3RyaW5nLCB3aWR0aDogbnVtYmVyLCBpbmRlbnQ6IG51bWJlciwgbWluQ29sdW1uV2lkdGggPSA0MCkge1xuICAvLyAgIC8vIERldGVjdCBtYW51YWxseSB3cmFwcGVkIGFuZCBpbmRlbnRlZCBzdHJpbmdzIGJ5IHNlYXJjaGluZyBmb3IgbGluZSBicmVha3NcbiAgLy8gICAvLyBmb2xsb3dlZCBieSBtdWx0aXBsZSBzcGFjZXMvdGFicy5cbiAgLy8gICBpZiAoc3RyLm1hdGNoKC9bXFxuXVxccysvKSkgcmV0dXJuIHN0cjtcbiAgLy8gICAvLyBEbyBub3Qgd3JhcCBpZiBub3QgZW5vdWdoIHJvb20gZm9yIGEgd3JhcHBlZCBjb2x1bW4gb2YgdGV4dCAoYXMgY291bGQgZW5kIHVwIHdpdGggYSB3b3JkIHBlciBsaW5lKS5cbiAgLy8gICBjb25zdCBjb2x1bW5XaWR0aCA9IHdpZHRoIC0gaW5kZW50O1xuICAvLyAgIGlmIChjb2x1bW5XaWR0aCA8IG1pbkNvbHVtbldpZHRoKSByZXR1cm4gc3RyO1xuXG4gIC8vICAgY29uc3QgbGVhZGluZ1N0ciA9IHN0ci5zdWJzdHIoMCwgaW5kZW50KTtcbiAgLy8gICBjb25zdCBjb2x1bW5UZXh0ID0gc3RyLnN1YnN0cihpbmRlbnQpO1xuXG4gIC8vICAgY29uc3QgaW5kZW50U3RyaW5nID0gJyAnLnJlcGVhdChpbmRlbnQpO1xuICAvLyAgIGNvbnN0IHJlZ2V4ID0gbmV3IFJlZ0V4cCgnLnsxLCcgKyAoY29sdW1uV2lkdGggLSAxKSArICd9KFtcXFxcc1xcdTIwMEJdfCQpfFteXFxcXHNcXHUyMDBCXSs/KFtcXFxcc1xcdTIwMEJdfCQpJywgJ2cnKTtcblxuICAvLyAgIGNvbnN0IGxpbmVzID0gY29sdW1uVGV4dC5tYXRjaChyZWdleCkgfHwgW107XG4gIC8vICAgcmV0dXJuIGxlYWRpbmdTdHIgKyBsaW5lcy5tYXAoKGxpbmUsIGkpID0+IHtcbiAgLy8gICAgIGlmIChsaW5lLnNsaWNlKC0xKSA9PT0gJ1xcbicpIHtcbiAgLy8gICAgICAgbGluZSA9IGxpbmUuc2xpY2UoMCwgbGluZS5sZW5ndGggLSAxKTtcbiAgLy8gICAgIH1cbiAgLy8gICAgIHJldHVybiAoKGkgPiAwKSA/IGluZGVudFN0cmluZyA6ICcnKSArIGxpbmUudHJpbVJpZ2h0KCk7XG4gIC8vICAgfSkuam9pbignXFxuJyk7XG4gIC8vIH1cbn1cbi8qKlxuICogRXh0ZW5kIGNvbW1hbmRlciwgY2hlY2sgY29tbWFuZGVyIEFQSSBhdCBodHRwczovL3d3dy5ucG1qcy5jb20vcGFja2FnZS9jb21tYW5kZXJcbiAqL1xuZXhwb3J0IGNsYXNzIFBsaW5rQ29tbWFuZCBleHRlbmRzIGNvbW1hbmRlci5Db21tYW5kIHtcbiAgbmFtZVN0eWxlcj86IChjbWROYW1lOiBzdHJpbmcpID0+IHN0cmluZztcbiAgb3B0aW9uU3R5bGVyPzogKGNtZE5hbWU6IHN0cmluZykgPT4gc3RyaW5nO1xuICBzdWJDbWRzOiBQbGlua0NvbW1hbmRbXSA9IFtdO1xuICAvKiogdmFsdWUgaXMgZmlsZSBwYXRoIGZvciBwa2cgbmFtZSAqL1xuICBsb2FkZWRDbWRNYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBwa2dOYW1lOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IocHVibGljIGN0eDogQ29tbWFuZENvbnRleHQsIG5hbWU/OiBzdHJpbmcpIHtcbiAgICBzdXBlcihuYW1lKTtcbiAgfVxuXG4gIGFkZEdsb2JhbE9wdGlvbnNUb1N1YkNtZHMoKSB7XG4gICAgaWYgKHRoaXMuc3ViQ21kcyA9PSBudWxsKVxuICAgICAgcmV0dXJuO1xuICAgIGZvciAoY29uc3Qgc3ViQ21kIG9mIHRoaXMuc3ViQ21kcykge1xuICAgICAgd2l0aEdsb2JhbE9wdGlvbnMoc3ViQ21kKTtcbiAgICB9XG4gIH1cblxuICBjcmVhdGVDb21tYW5kKGNtZE5hbWU/OiBzdHJpbmcpOiBjb21tYW5kZXIuQ29tbWFuZCB7XG4gICAgY29uc3QgcGsgPSB0aGlzLmN0eC5jdXJyQ2xpQ3JlYXRvclBrZztcbiAgICBjb25zdCBmaWxlUGF0aCA9IHRoaXMuY3R4LmN1cnJDbGllQ3JlYXRvckZpbGU7XG4gICAgaWYgKGNtZE5hbWUgJiYgY21kTmFtZSAhPT0gJ2hlbHAnKSB7XG4gICAgICBpZiAodGhpcy5sb2FkZWRDbWRNYXAuaGFzKGNtZE5hbWUpKSB7XG4gICAgICAgIGlmIChmaWxlUGF0aClcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENvbmZsaWN0IGNvbW1hbmQgbmFtZSBcIiR7Y21kTmFtZX1cIiBmcm9tIGV4dGVuc2lvbnMgXCIke2ZpbGVQYXRofVwiIGFuZCBcIiR7dGhpcy5sb2FkZWRDbWRNYXAuZ2V0KGNtZE5hbWUpfVwiYCk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENvbmZsaWN0IHdpdGggZXhpc3RpbmcgUGxpbmsgY29tbWFuZCBuYW1lICR7Y21kTmFtZX1gKTtcbiAgICAgIH1cbiAgICAgIHRoaXMubG9hZGVkQ21kTWFwLnNldChjbWROYW1lLCBmaWxlUGF0aCA/IGZpbGVQYXRoIDogJ0B3ZmgvcGxpbmsnKTtcbiAgICB9XG5cbiAgICBjb25zdCBzdWJDbWQgPSBuZXcgUGxpbmtDb21tYW5kKHRoaXMuY3R4LCBjbWROYW1lKTtcbiAgICBzdWJDbWQubmFtZVN0eWxlciA9IHRoaXMuY3R4Lm5hbWVTdHlsZXI7XG4gICAgc3ViQ21kLnBrZ05hbWUgPSBwayAhPSBudWxsID8gcGsubmFtZSA6ICcnO1xuICAgIHRoaXMuc3ViQ21kcy5wdXNoKHN1YkNtZCk7XG5cbiAgICAvLyBzdWJDbWQuc2V0Q29udGV4dERhdGEodGhpcy5jdXJyQ2xpZUNyZWF0b3JGaWxlLCB0aGlzLmN1cnJDbGlDcmVhdG9yUGtnLCB0aGlzLm1ldGFNYXAsIHRoaXMpO1xuXG4gICAgY29uc3QgbWV0YTogUGFydGlhbDxPdXJDb21tYW5kTWV0YWRhdGE+ID0ge1xuICAgICAgcGtnTmFtZTogcGsgPyBway5uYW1lIDogJ0B3ZmgvcGxpbmsnLFxuICAgICAgbmFtZTogY21kTmFtZSxcbiAgICAgIG9wdGlvbnM6IFtdLFxuICAgICAgZGVzYzogJydcbiAgICB9O1xuICAgIHRoaXMuY3R4Lm1ldGFNYXAuc2V0KHN1YkNtZCwgbWV0YSk7XG4gICAgdGhpcy5jdHguY3VyckNsaVBrZ01hdGFJbmZvcy5wdXNoKG1ldGEgYXMgT3VyQ29tbWFuZE1ldGFkYXRhKTtcbiAgICAvLyBzdWJDbWQuZGVzY3JpcHRpb24obWV0YS5kZXNjISk7XG4gICAgcmV0dXJuIHN1YkNtZDtcbiAgfVxuXG4gIGRlc2NyaXB0aW9uKHN0cj86IHN0cmluZyxcbiAgICBhcmdzRGVzY3JpcHRpb24/OiB7IFthcmdOYW1lOiBzdHJpbmddOiBzdHJpbmc7IH0pIHtcbiAgICBpZiAoc3RyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnN0IHBsaW5rTWV0YSA9IHRoaXMuY3R4Lm1ldGFNYXAuZ2V0KHRoaXMpITtcbiAgICAgIHBsaW5rTWV0YS5kZXNjID0gc3RyO1xuICAgICAgaWYgKGFyZ3NEZXNjcmlwdGlvbikge1xuICAgICAgICBwbGlua01ldGEuYXJnRGVzYyA9IGFyZ3NEZXNjcmlwdGlvbjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzdXBlci5kZXNjcmlwdGlvbihzdHIsIGFyZ3NEZXNjcmlwdGlvbik7XG4gICAgfVxuICAgIHJldHVybiBzdXBlci5kZXNjcmlwdGlvbigpIGFzIGFueTtcbiAgfVxuXG4gIGFsaWFzKGFsaWFzPzogc3RyaW5nKSB7XG4gICAgaWYgKGFsaWFzKSB7XG4gICAgICBjb25zdCBwbGlua01ldGEgPSB0aGlzLmN0eC5tZXRhTWFwLmdldCh0aGlzKSE7XG4gICAgICBwbGlua01ldGEuYWxpYXMgPSBhbGlhcztcbiAgICB9XG4gICAgcmV0dXJuIHN1cGVyLmFsaWFzKGFsaWFzIGFzIGFueSkgYXMgYW55O1xuICB9XG5cbiAgY3JlYXRlT3B0aW9uKGZsYWdzOiBzdHJpbmcsIGRlc2NyaXB0aW9uPzogc3RyaW5nLCAuLi5yZW1haW5pbmc6IGFueVtdKSB7XG4gICAgbGV0IGRlZmF1bHRWYWx1ZTogYW55O1xuICAgIGlmIChyZW1haW5pbmcubGVuZ3RoID4gMSkge1xuICAgICAgZGVmYXVsdFZhbHVlID0gcmVtYWluaW5nW3JlbWFpbmluZy5sZW5ndGggLSAxXTtcbiAgICB9XG4gICAgY29uc3QgcGxpbmtNZXRhID0gdGhpcy5jdHgubWV0YU1hcC5nZXQodGhpcykhO1xuICAgIHBsaW5rTWV0YS5vcHRpb25zIS5wdXNoKHtcbiAgICAgIGZsYWdzLCBkZXNjOiBkZXNjcmlwdGlvbiB8fCAnJywgZGVmYXVsdFZhbHVlLCBpc1JlcXVpcmVkOiBmYWxzZVxuICAgIH0pO1xuICAgIGNvbnN0IG9wdCA9IG5ldyBQbGlua0NtZE9wdGlvbihmbGFncywgZGVzY3JpcHRpb24pO1xuICAgIG9wdC5vcHRpb25TdHlsZXIgPSB0aGlzLm9wdGlvblN0eWxlcjtcbiAgICByZXR1cm4gb3B0O1xuICB9XG4gIG9wdGlvbiguLi5hcmdzOiBhbnlbXSkge1xuICAgICh0aGlzLl9zYXZlT3B0aW9ucyBhcyBhbnkpKGZhbHNlLCAuLi5hcmdzKTtcbiAgICByZXR1cm4gKHN1cGVyLm9wdGlvbiBhcyBhbnkpKC4uLmFyZ3MpO1xuICB9XG4gIHJlcXVpcmVkT3B0aW9uKC4uLmFyZ3M6IGFueVtdKSB7XG4gICAgKHRoaXMuX3NhdmVPcHRpb25zIGFzIGFueSkodHJ1ZSwgLi4uYXJncyk7XG4gICAgcmV0dXJuIChzdXBlci5yZXF1aXJlZE9wdGlvbiBhcyBhbnkpKC4uLmFyZ3MpO1xuICB9XG4gIGFjdGlvbihmbjogKC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkIHwgUHJvbWlzZTx2b2lkPikge1xuICAgIGZ1bmN0aW9uIGFjdGlvbkNhbGxiYWNrKCkge1xuICAgICAgY29uc3Qge2luaXRDb25maWd9ID0gcmVxdWlyZSgnLi4vdXRpbHMvYm9vdHN0cmFwLXByb2Nlc3MnKSBhcyB0eXBlb2YgX2Jvb3RzdHJhcDtcbiAgICAgIGlmICgodGhpcy5vcHRzKCkgYXMgR2xvYmFsT3B0aW9ucykudmVyYm9zZSkge1xuICAgICAgICBsb2c0anMuY29uZmlndXJlKHtcbiAgICAgICAgICBhcHBlbmRlcnM6IHtcbiAgICAgICAgICAgIG91dDoge1xuICAgICAgICAgICAgICB0eXBlOiAnc3Rkb3V0JyxcbiAgICAgICAgICAgICAgbGF5b3V0OiB7dHlwZTogJ3BhdHRlcm4nLCBwYXR0ZXJuOiAocHJvY2Vzcy5zZW5kID8gJyV6JyA6ICcnKSArICclW1slcF0gJWMlXSAtICVtJ31cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIGNhdGVnb3JpZXM6IHtcbiAgICAgICAgICAgIGRlZmF1bHQ6IHthcHBlbmRlcnM6IFsnb3V0J10sIGxldmVsOiAnZGVidWcnfSxcbiAgICAgICAgICAgIHBsaW5rOiB7YXBwZW5kZXJzOiBbJ291dCddLCBsZXZlbDogJ2RlYnVnJ31cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgaW5pdENvbmZpZyh0aGlzLm9wdHMoKSBhcyBHbG9iYWxPcHRpb25zKTtcbiAgICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICByZXR1cm4gc3VwZXIuYWN0aW9uKGFjdGlvbkNhbGxiYWNrKTtcbiAgfVxuICBjcmVhdGVIZWxwKCkge1xuICAgIHJldHVybiBPYmplY3QuYXNzaWduKG5ldyBQbGlua0NvbW1hbmRIZWxwKCksIHRoaXMuY29uZmlndXJlSGVscCgpKTtcbiAgfVxuICBfc2F2ZU9wdGlvbnMoaXNSZXF1aXJlZDogYm9vbGVhbiwgZmxhZ3M6IHN0cmluZywgZGVzYzogc3RyaW5nLCAuLi5yZW1haW5pbmc6IGFueVtdKSB7XG4gICAgbGV0IGRlZmF1bHRWYWx1ZTogYW55O1xuICAgIGlmIChyZW1haW5pbmcubGVuZ3RoID4gMSkge1xuICAgICAgZGVmYXVsdFZhbHVlID0gcmVtYWluaW5nW3JlbWFpbmluZy5sZW5ndGggLSAxXTtcbiAgICB9XG4gICAgY29uc3QgcGxpbmtNZXRhID0gdGhpcy5jdHgubWV0YU1hcC5nZXQodGhpcykhO1xuICAgIHBsaW5rTWV0YS5vcHRpb25zIS5wdXNoKHtcbiAgICAgIGZsYWdzLCBkZXNjLCBkZWZhdWx0VmFsdWUsIGlzUmVxdWlyZWRcbiAgICB9KTtcbiAgfVxufVxuXG5leHBvcnQgdHlwZSBDbGlFeHRlbnNpb24gPSAocHJvZ3JhbTogY29tbWFuZGVyLkNvbW1hbmQpID0+IHZvaWQ7XG5cbmNsYXNzIFBsaW5rQ21kT3B0aW9uIGV4dGVuZHMgY29tbWFuZGVyLk9wdGlvbiB7XG4gIG9wdGlvblN0eWxlcj86IChjbWROYW1lOiBzdHJpbmcpID0+IHN0cmluZztcbn1cbmV4cG9ydCBjbGFzcyBDb21tYW5kT3ZlcnJpZGVyIHtcbiAgLy8gbmFtZVN0eWxlcjogUGxpbmtDb21tYW5kWyduYW1lU3R5bGVyJ107XG4gIC8vIHByaXZhdGUgY3VyckNsaWVDcmVhdG9yRmlsZTogc3RyaW5nO1xuICAvLyBwcml2YXRlIGN1cnJDbGlDcmVhdG9yUGtnOiBQYWNrYWdlSW5mbyB8IG51bGwgPSBudWxsO1xuICAvLyBwcml2YXRlIGN1cnJDbGlQa2dNYXRhSW5mb3M6IE91ckNvbW1hbmRNZXRhZGF0YVtdO1xuICAvLyBwcml2YXRlIGFsbFN1YkNtZHM6IE91ckF1Z21lbnRlZENvbW1hbmRlcltdID0gW107XG4gIC8vIHByaXZhdGUgbWV0YU1hcCA9IG5ldyBXZWFrTWFwPGNvbW1hbmRlci5Db21tYW5kLCBQYXJ0aWFsPE91ckNvbW1hbmRNZXRhZGF0YT4+KCk7XG4gIHByaXZhdGUgcGtnTWV0YXNNYXAgPSBuZXcgTWFwPHN0cmluZywgT3VyQ29tbWFuZE1ldGFkYXRhW10+KCk7XG4gIHByaXZhdGUgY3R4OiBQYXJ0aWFsPENvbW1hbmRDb250ZXh0PiA9IHtcbiAgICBtZXRhTWFwOiBuZXcgV2Vha01hcDxjb21tYW5kZXIuQ29tbWFuZCwgUGFydGlhbDxPdXJDb21tYW5kTWV0YWRhdGE+PigpXG4gIH07XG5cbiAgc2V0IG5hbWVTdHlsZXIodjogUGxpbmtDb21tYW5kWyduYW1lU3R5bGVyJ10pIHtcbiAgICB0aGlzLmN0eC5uYW1lU3R5bGVyID0gdjtcbiAgfVxuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcHJvZ3JhbTogY29tbWFuZGVyLkNvbW1hbmQsIHdzPzogV29ya3NwYWNlU3RhdGUpIHtcbiAgICB0aGlzLnByb2dyYW0uY3JlYXRlQ29tbWFuZCA9IFBsaW5rQ29tbWFuZC5wcm90b3R5cGUuY3JlYXRlQ29tbWFuZDtcblxuICAgICh0aGlzLnByb2dyYW0gYXMgUGxpbmtDb21tYW5kKS5jdHggPSB0aGlzLmN0eCBhcyBDb21tYW5kQ29udGV4dDtcbiAgICAodGhpcy5wcm9ncmFtIGFzIFBsaW5rQ29tbWFuZCkuc3ViQ21kcyA9IFtdO1xuICAgICh0aGlzLnByb2dyYW0gYXMgUGxpbmtDb21tYW5kKS5sb2FkZWRDbWRNYXAgPSBuZXcgTWFwKCk7XG4gICAgKHRoaXMucHJvZ3JhbSBhcyBQbGlua0NvbW1hbmQpLmFkZEdsb2JhbE9wdGlvbnNUb1N1YkNtZHMgPSBQbGlua0NvbW1hbmQucHJvdG90eXBlLmFkZEdsb2JhbE9wdGlvbnNUb1N1YkNtZHM7XG4gICAgdGhpcy5wcm9ncmFtLmNyZWF0ZUhlbHAgPSBQbGlua0NvbW1hbmQucHJvdG90eXBlLmNyZWF0ZUhlbHA7XG4gIH1cblxuICBmb3JQYWNrYWdlKHBrOiBQYWNrYWdlSW5mbywgcGtnRmlsZVBhdGg6IHN0cmluZywgZnVuY05hbWU6IHN0cmluZyk6IHZvaWQ7XG4gIGZvclBhY2thZ2UocGs6IG51bGwsIGNvbW1hbmRDcmVhdGlvbjogKHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kKSA9PiB2b2lkKTogdm9pZDtcbiAgZm9yUGFja2FnZShwazogUGFja2FnZUluZm8gfCBudWxsLFxuICAgIHBrZ0ZpbGVQYXRoOiBzdHJpbmcgfCAoKHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kKSA9PiB2b2lkKSxcbiAgICBmdW5jTmFtZT86IHN0cmluZykge1xuICAgIGNvbnN0IGNvbW1hbmRNZXRhSW5mb3M6IE91ckNvbW1hbmRNZXRhZGF0YVtdID0gdGhpcy5jdHguY3VyckNsaVBrZ01hdGFJbmZvcyA9IFtdO1xuICAgIHRoaXMuY3R4LmN1cnJDbGlDcmVhdG9yUGtnID0gcGs7XG5cbiAgICBsZXQgZmlsZVBhdGg6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuXG4gICAgaWYgKHR5cGVvZiBwa2dGaWxlUGF0aCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcGtnRmlsZVBhdGgodGhpcy5wcm9ncmFtKTtcbiAgICAgIHRoaXMucGtnTWV0YXNNYXAuc2V0KCdAd2ZoL3BsaW5rJywgY29tbWFuZE1ldGFJbmZvcyk7XG4gICAgfSBlbHNlIGlmIChwaykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgZmlsZVBhdGggPSByZXF1aXJlLnJlc29sdmUocGsubmFtZSArICcvJyArIHBrZ0ZpbGVQYXRoKTtcbiAgICAgICAgdGhpcy5jdHguY3VyckNsaWVDcmVhdG9yRmlsZSA9IGZpbGVQYXRoO1xuICAgICAgICBjb25zdCBzdWJDbWRGYWN0b3J5OiBDbGlFeHRlbnNpb24gPSBmdW5jTmFtZSA/IHJlcXVpcmUoZmlsZVBhdGgpW2Z1bmNOYW1lXSA6XG4gICAgICAgICAgcmVxdWlyZShmaWxlUGF0aCk7XG4gICAgICAgIHN1YkNtZEZhY3RvcnkodGhpcy5wcm9ncmFtIGFzIFBsaW5rQ29tbWFuZCk7XG4gICAgICAgIHRoaXMucGtnTWV0YXNNYXAuc2V0KHBrLm5hbWUsIGNvbW1hbmRNZXRhSW5mb3MpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgbG9nLndhcm4oYEZhaWxlZCB0byBsb2FkIGNvbW1hbmQgbGluZSBleHRlbnNpb24gaW4gcGFja2FnZSAke3BrLm5hbWV9OiBcIiR7ZS5tZXNzYWdlfVwiYCwgZSk7XG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICBmaWxlUGF0aCA9IG51bGw7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuY3R4LmN1cnJDbGlDcmVhdG9yUGtnID0gbnVsbDtcbiAgfVxuXG4gIGFwcGVuZEdsb2JhbE9wdGlvbnMoc2F2ZVRvU3RvcmU6IGJvb2xlYW4pIHtcbiAgICAodGhpcy5wcm9ncmFtIGFzIFBsaW5rQ29tbWFuZCkuYWRkR2xvYmFsT3B0aW9uc1RvU3ViQ21kcygpO1xuICAgIC8vIGZvciAoY29uc3QgY21kIG9mIHRoaXMuYWxsU3ViQ21kcykge1xuICAgIC8vICAgd2l0aEdsb2JhbE9wdGlvbnMoY21kKTtcbiAgICAvLyB9XG4gICAgaWYgKCFzYXZlVG9TdG9yZSlcbiAgICAgIHJldHVybjtcbiAgICBwcm9jZXNzLm5leHRUaWNrKCgpID0+IHtcbiAgICAgIGZvciAoY29uc3QgW3BrZywgbWV0YXNdIG9mIHRoaXMucGtnTWV0YXNNYXAuZW50cmllcygpKSB7XG4gICAgICAgIGNsaUFjdGlvbkRpc3BhdGNoZXIuYWRkQ29tbWFuZE1ldGEoe3BrZywgbWV0YXN9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gd2l0aEdsb2JhbE9wdGlvbnMoY21kOiBjb21tYW5kZXIuQ29tbWFuZCB8IFBsaW5rQ29tbWFuZCk6IGNvbW1hbmRlci5Db21tYW5kIHtcbiAgaWYgKGNtZCBpbnN0YW5jZW9mIFBsaW5rQ29tbWFuZClcbiAgICBjbWQub3B0aW9uU3R5bGVyID0gc3RyID0+IGNoYWxrLmdyYXkoc3RyKTtcbiAgKGNtZC5vcHRpb24gYXMgY29tbWFuZGVyLkNvbW1hbmRbJ29wdGlvbiddKSgnLWMsIC0tY29uZmlnIDxjb25maWctZmlsZT4nLFxuICAgICdSZWFkIGNvbmZpZyBmaWxlcywgaWYgdGhlcmUgYXJlIG11bHRpcGxlIGZpbGVzLCB0aGUgbGF0dGVyIG9uZSBvdmVycmlkZXMgcHJldmlvdXMgb25lJyxcbiAgICAodmFsdWUsIHByZXYpID0+IHtcbiAgICAgIHByZXYucHVzaCguLi52YWx1ZS5zcGxpdCgnLCcpKTtcbiAgICAgIHJldHVybiBwcmV2O1xuICAgICAgLy8gcmV0dXJuIHByZXYuY29uY2F0KHZhbHVlLnNwbGl0KCcsJykpO1xuICAgIH0sIFtdIGFzIHN0cmluZ1tdKTtcblxuICAoY21kLm9wdGlvbiBhcyBjb21tYW5kZXIuQ29tbWFuZFsnb3B0aW9uJ10pKCctLXByb3AgPGV4cHJlc3Npb24+JyxcbiAgICAnPHByb3BlcnR5IHBhdGg+PTx2YWx1ZSBhcyBKU09OIHwgbGl0ZXJhbD4gLi4uIGRpcmVjdGx5IHNldCBjb25maWd1cmF0aW9uIHByb3BlcnRpZXMsIHByb3BlcnR5IG5hbWUgaXMgbG9kYXNoLnNldCgpIHBhdGgtbGlrZSBzdHJpbmcuIGUuZy4gJyArXG4gICAgJy0tcHJvcCBwb3J0PTgwODAgLS1wcm9wIGRldk1vZGU9ZmFsc2UgLS1wcm9wIEB3ZmgvZm9vYmFyLmFwaT1odHRwOi8vbG9jYWxob3N0OjgwODAgJyArXG4gICAgJy0tcHJvcCBhcnJheWxpa2UucHJvcFswXT1mb29iYXIgJyArXG4gICAgJy0tcHJvcCBbXCJAd2ZoL2Zvby5iYXJcIixcInByb3BcIiwwXT10cnVlJyxcbiAgICBhcnJheU9wdGlvbkZuLCBbXSBhcyBzdHJpbmdbXSlcbiAgLm9wdGlvbignLS12ZXJib3NlJywgJ1NwZWNpZnkgbG9nIGxldmVsIGFzIFwiZGVidWdcIicsIGZhbHNlKVxuICAub3B0aW9uKCctLWRldicsICdCeSB0dXJuaW5nIG9uIHRoaXMgb3B0aW9uLCcgK1xuICAgICcgUGxpbmsgc2V0dGluZyBwcm9wZXJ0eSBcImRldk1vZGVcIiB3aWxsIGF1dG9tYXRjaWFsbHkgc2V0IHRvIGB0cnVlYCwnICtcbiAgICAnIGFuZCBwcm9jZXNzLmVudi5OT0RFX0VOViB3aWxsIGFsc28gYmVpbmcgdXBkYXRlZCB0byBcXCdkZXZlbG9wZW1lbnRcXCcgb3IgXFwncHJvZHVjdGlvbiBjb3JyZXNwb25kaW5nbHkuICcsXG4gICAgZmFsc2UpXG4gIC5vcHRpb24oJy0tZW52IDxzZXR0aW5nIGVudmlyb25tZW50PicsICdBIHN0cmluZyBkZW5vdGVzIHJ1bnRpbWUgZW52aXJvbm1lbnQgbmFtZSwgcGFja2FnZSBzZXR0aW5nIGZpbGUgbWF5IHJldHVybiBkaWZmZXJlbnQgdmFsdWVzIGJhc2VkIG9uIGl0cyB2YWx1ZSAoY2xpT3B0aW9ucy5lbnYpJyk7XG4gIGlmIChjbWQgaW5zdGFuY2VvZiBQbGlua0NvbW1hbmQpXG4gICAgY21kLm9wdGlvblN0eWxlciA9IHVuZGVmaW5lZDtcbiAgcmV0dXJuIGNtZDtcbn1cbiJdfQ==