"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withGlobalOptions = exports.CommandOverrider = exports.PlinkCommand = exports.PlinkCommandHelp = void 0;
/* eslint-disable @typescript-eslint/no-unsafe-assignment,  @typescript-eslint/no-unsafe-return */
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcnJpZGUtY29tbWFuZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL292ZXJyaWRlLWNvbW1hbmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxrR0FBa0c7QUFDbEcsMERBQWtDO0FBRWxDLGtEQUEwQjtBQUMxQixtQ0FBc0M7QUFHdEMsMkNBQWdEO0FBQ2hELG9EQUE0QjtBQUM1Qiw0REFBbUM7QUFFbkMsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsMEJBQTBCLENBQUMsQ0FBQztBQVV6RCxNQUFhLGdCQUFpQixTQUFRLG1CQUFTLENBQUMsSUFBSTtJQUNsRCxjQUFjLENBQUMsR0FBc0I7UUFDbkMsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN0QyxJQUFJLEdBQUcsWUFBWSxZQUFZLElBQUksR0FBRyxDQUFDLFVBQVUsRUFBRTtZQUNqRCxPQUFPLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDNUI7UUFDRCxPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUM7SUFFRCxVQUFVLENBQUMsTUFBc0I7UUFDL0IsT0FBTyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQztJQUNoRixDQUFDO0lBRUQsa0NBQWtDLENBQUMsR0FBc0IsRUFBRSxNQUF3QjtRQUNqRixPQUFPLE1BQU0sQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxFQUFFO1lBQ3pELE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsb0JBQVMsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFB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QUFHLENBQUMsTUFBc0MsQ0FBQyw0QkFBNEIsRUFDdEUsdUZBQXVGLEVBQ3ZGLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFO1FBQ2QsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUMvQixPQUFPLElBQUksQ0FBQztRQUNaLHdDQUF3QztJQUMxQyxDQUFDLEVBQUUsRUFBYyxDQUFDLENBQUM7SUFFcEIsR0FBRyxDQUFDLE1BQXNDLENBQUMscUJBQXFCLEVBQy9ELDRJQUE0STtRQUM1SSxxRkFBcUY7UUFDckYsa0NBQWtDO1FBQ2xDLHVDQUF1QyxFQUN2QyxxQkFBYSxFQUFFLEVBQWMsQ0FBQztTQUMvQixNQUFNLENBQUMsV0FBVyxFQUFFLDhCQUE4QixFQUFFLEtBQUssQ0FBQztTQUMxRCxNQUFNLENBQUMsT0FBTyxFQUFFLDRCQUE0QjtRQUMzQyxxRUFBcUU7UUFDckUseUdBQXlHLEVBQ3pHLEtBQUssQ0FBQztTQUNQLE1BQU0sQ0FBQyw2QkFBNkIsRUFBRSxpSUFBaUksQ0FBQyxDQUFDO0lBQzFLLElBQUksR0FBRyxZQUFZLFlBQVk7UUFDN0IsR0FBRyxDQUFDLFlBQVksR0FBRyxTQUFTLENBQUM7SUFDL0IsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDO0FBMUJELDhDQTBCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudCwgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtcmV0dXJuICovXG5pbXBvcnQgY29tbWFuZGVyIGZyb20gJ2NvbW1hbmRlcic7XG5pbXBvcnQge1dvcmtzcGFjZVN0YXRlLCBQYWNrYWdlSW5mb30gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB7YXJyYXlPcHRpb25Gbn0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgKiBhcyBfYm9vdHN0cmFwIGZyb20gJy4uL3V0aWxzL2Jvb3RzdHJhcC1wcm9jZXNzJztcbmltcG9ydCB7IEdsb2JhbE9wdGlvbnMsIE91ckNvbW1hbmRNZXRhZGF0YSB9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtjbGlBY3Rpb25EaXNwYXRjaGVyfSBmcm9tICcuL2NsaS1zbGljZSc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgc3RyaXBBbnNpIGZyb20gJ3N0cmlwLWFuc2knO1xuXG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay5vdmVycmlkZS1jb21tYW5kZXInKTtcblxuaW50ZXJmYWNlIENvbW1hbmRDb250ZXh0IHtcbiAgY3VyckNsaWVDcmVhdG9yRmlsZTogc3RyaW5nO1xuICBjdXJyQ2xpQ3JlYXRvclBrZzogUGFja2FnZUluZm8gfCBudWxsO1xuICBtZXRhTWFwOiBXZWFrTWFwPFBsaW5rQ29tbWFuZCwgUGFydGlhbDxPdXJDb21tYW5kTWV0YWRhdGE+PjtcbiAgY3VyckNsaVBrZ01hdGFJbmZvczogT3VyQ29tbWFuZE1ldGFkYXRhW107XG4gIG5hbWVTdHlsZXI/OiAoY21kTmFtZTogc3RyaW5nKSA9PiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBQbGlua0NvbW1hbmRIZWxwIGV4dGVuZHMgY29tbWFuZGVyLkhlbHAge1xuICBzdWJjb21tYW5kVGVybShjbWQ6IGNvbW1hbmRlci5Db21tYW5kKTogc3RyaW5nIHtcbiAgICBjb25zdCBzdHIgPSBzdXBlci5zdWJjb21tYW5kVGVybShjbWQpO1xuICAgIGlmIChjbWQgaW5zdGFuY2VvZiBQbGlua0NvbW1hbmQgJiYgY21kLm5hbWVTdHlsZXIpIHtcbiAgICAgIHJldHVybiBjbWQubmFtZVN0eWxlcihzdHIpO1xuICAgIH1cbiAgICByZXR1cm4gc3RyO1xuICB9XG5cbiAgb3B0aW9uVGVybShvcHRpb246IFBsaW5rQ21kT3B0aW9uKSB7XG4gICAgcmV0dXJuIG9wdGlvbi5vcHRpb25TdHlsZXIgPyBvcHRpb24ub3B0aW9uU3R5bGVyKG9wdGlvbi5mbGFncykgOiBvcHRpb24uZmxhZ3M7XG4gIH1cblxuICBsb25nZXN0U3ViY29tbWFuZFRlcm1MZW5ndGhGb3JSZWFsKGNtZDogY29tbWFuZGVyLkNvbW1hbmQsIGhlbHBlcjogUGxpbmtDb21tYW5kSGVscCkge1xuICAgIHJldHVybiBoZWxwZXIudmlzaWJsZUNvbW1hbmRzKGNtZCkucmVkdWNlKChtYXgsIGNvbW1hbmQpID0+IHtcbiAgICAgIHJldHVybiBNYXRoLm1heChtYXgsIHN0cmlwQW5zaShoZWxwZXIuc3ViY29tbWFuZFRlcm0oY29tbWFuZCkpLmxlbmd0aCk7XG4gICAgfSwgMCk7XG4gIH1cblxuICBsb25nZXN0T3B0aW9uVGVybUxlbmd0aEZvclJlYWwoY21kOiBjb21tYW5kZXIuQ29tbWFuZCwgaGVscGVyOiBQbGlua0NvbW1hbmRIZWxwKSB7XG4gICAgcmV0dXJuIGhlbHBlci52aXNpYmxlT3B0aW9ucyhjbWQpLnJlZHVjZSgobWF4LCBvcHRpb24pID0+IHtcbiAgICAgIHJldHVybiBNYXRoLm1heChtYXgsIHN0cmlwQW5zaShoZWxwZXIub3B0aW9uVGVybShvcHRpb24pKS5sZW5ndGgpO1xuICAgIH0sIDApO1xuICB9XG5cbiAgLy8gc3ViY29tbWFuZERlc2NyaXB0aW9uKGNtZDogY29tbWFuZGVyLkNvbW1hbmQpIHtcbiAgLy8gICByZXR1cm4gc3RyaXBBbnNpKHN1cGVyLnN1YmNvbW1hbmREZXNjcmlwdGlvbihjbWQpKTtcbiAgLy8gfVxuXG4gIHJlYWxQYWRXaWR0aChjbWQ6IGNvbW1hbmRlci5Db21tYW5kLCBoZWxwZXI6IFBsaW5rQ29tbWFuZEhlbHApIHtcbiAgICByZXR1cm4gTWF0aC5tYXgoXG4gICAgICBoZWxwZXIubG9uZ2VzdE9wdGlvblRlcm1MZW5ndGhGb3JSZWFsKGNtZCwgaGVscGVyKSxcbiAgICAgIGhlbHBlci5sb25nZXN0U3ViY29tbWFuZFRlcm1MZW5ndGhGb3JSZWFsKGNtZCwgaGVscGVyKSxcbiAgICAgIGhlbHBlci5sb25nZXN0QXJndW1lbnRUZXJtTGVuZ3RoKGNtZCwgaGVscGVyKVxuICAgICk7XG4gIH1cblxuICBmb3JtYXRIZWxwKGNtZDogY29tbWFuZGVyLkNvbW1hbmQsIGhlbHBlcjogUGxpbmtDb21tYW5kSGVscCkge1xuICAgIC8vIGNvbnN0IHRlcm1XaWR0aCA9IGhlbHBlci5wYWRXaWR0aChjbWQsIGhlbHBlcik7IC8vIEl0IGlzIGJpZ2dlciB0aGFuIGFjdHVhbCB3aWR0aCBkdWUgdG8gY29sb3JmdWwgY2hhcmFjdGVyXG4gICAgY29uc3QgcmVhbFRlcm1XaWR0aCA9IGhlbHBlci5yZWFsUGFkV2lkdGgoY21kLCBoZWxwZXIpO1xuICAgIC8vIGNvbnNvbGUubG9nKCd0ZXJtV2lkdGg9JywgdGVybVdpZHRoKTtcbiAgICBjb25zdCBoZWxwV2lkdGggPSBoZWxwZXIuaGVscFdpZHRoIHx8IDgwO1xuICAgIGNvbnN0IGl0ZW1JbmRlbnRXaWR0aCA9IDI7XG4gICAgY29uc3QgaXRlbVNlcGFyYXRvcldpZHRoID0gMjsgLy8gYmV0d2VlbiB0ZXJtIGFuZCBkZXNjcmlwdGlvblxuICAgIGZ1bmN0aW9uIGZvcm1hdEl0ZW0odGVybTogc3RyaW5nLCBkZXNjcmlwdGlvbjogc3RyaW5nLCBzdHlsZXI/OiBQbGlua0NvbW1hbmRbJ25hbWVTdHlsZXInXSkge1xuICAgICAgaWYgKGRlc2NyaXB0aW9uKSB7XG4gICAgICAgIC8vIFN1cHBvcnQgY29sb3JmdWwgY2hhcmFjdGVyc1xuICAgICAgICBjb25zdCBmdWxsVGV4dCA9IGAke3Rlcm19JHsnICcucmVwZWF0KHJlYWxUZXJtV2lkdGggKyBpdGVtSW5kZW50V2lkdGggLSBzdHJpcEFuc2kodGVybSkubGVuZ3RoKX0ke2Rlc2NyaXB0aW9ufWA7XG4gICAgICAgIHJldHVybiBoZWxwZXIud3JhcChmdWxsVGV4dCwgaGVscFdpZHRoIC0gaXRlbUluZGVudFdpZHRoLCByZWFsVGVybVdpZHRoICsgaXRlbVNlcGFyYXRvcldpZHRoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0ZXJtO1xuICAgIH1cbiAgICBmdW5jdGlvbiBmb3JtYXRMaXN0KHRleHRBcnJheTogc3RyaW5nW10pIHtcbiAgICAgIHJldHVybiB0ZXh0QXJyYXkuam9pbignXFxuJykucmVwbGFjZSgvXi9nbSwgJyAnLnJlcGVhdChpdGVtSW5kZW50V2lkdGgpKTtcbiAgICB9XG5cbiAgICAvLyBVc2FnZVxuICAgIGNvbnN0IG91dHB1dCA9IFtgVXNhZ2U6ICR7aGVscGVyLmNvbW1hbmRVc2FnZShjbWQpfWAsICcnXTtcblxuICAgIC8vIERlc2NyaXB0aW9uXG4gICAgY29uc3QgY29tbWFuZERlc2NyaXB0aW9uID0gaGVscGVyLmNvbW1hbmREZXNjcmlwdGlvbihjbWQpO1xuICAgIGlmIChjb21tYW5kRGVzY3JpcHRpb24ubGVuZ3RoID4gMCkge1xuICAgICAgb3V0cHV0LnB1c2goY29tbWFuZERlc2NyaXB0aW9uLCAnJyk7XG4gICAgfVxuXG4gICAgLy8gQXJndW1lbnRzXG4gICAgY29uc3QgYXJndW1lbnRMaXN0ID0gaGVscGVyLnZpc2libGVBcmd1bWVudHMoY21kKS5tYXAoKGFyZ3VtZW50KSA9PiB7XG4gICAgICByZXR1cm4gZm9ybWF0SXRlbShhcmd1bWVudC50ZXJtLCBhcmd1bWVudC5kZXNjcmlwdGlvbik7XG4gICAgfSk7XG4gICAgaWYgKGFyZ3VtZW50TGlzdC5sZW5ndGggPiAwKSB7XG4gICAgICBvdXRwdXQucHVzaCgnQXJndW1lbnRzOicsIGZvcm1hdExpc3QoYXJndW1lbnRMaXN0KSwgJycpO1xuICAgIH1cblxuICAgIC8vIE9wdGlvbnNcbiAgICBjb25zdCBvcHRpb25MaXN0ID0gaGVscGVyLnZpc2libGVPcHRpb25zKGNtZCkubWFwKChvcHRpb24pID0+IHtcbiAgICAgIHJldHVybiBmb3JtYXRJdGVtKGhlbHBlci5vcHRpb25UZXJtKG9wdGlvbiksIGhlbHBlci5vcHRpb25EZXNjcmlwdGlvbihvcHRpb24pLFxuICAgICAgICAob3B0aW9uIGFzIFBsaW5rQ21kT3B0aW9uKS5vcHRpb25TdHlsZXIpO1xuICAgIH0pO1xuICAgIGlmIChvcHRpb25MaXN0Lmxlbmd0aCA+IDApIHtcbiAgICAgIG91dHB1dC5wdXNoKCdPcHRpb25zOicsIGZvcm1hdExpc3Qob3B0aW9uTGlzdCksICcnKTtcbiAgICB9XG5cbiAgICAvLyBDb21tYW5kc1xuICAgIGxldCBwa2dOYW1lID0gJyc7XG4gICAgY29uc3QgY29tbWFuZExpc3QgPSBoZWxwZXIudmlzaWJsZUNvbW1hbmRzKGNtZCkubWFwKChjbWQpID0+IHtcbiAgICAgIGxldCBoZWFkZXIgPSAnJztcbiAgICAgIGlmIChwa2dOYW1lICE9PSAoY21kIGFzIFBsaW5rQ29tbWFuZCkucGtnTmFtZSkge1xuICAgICAgICBwa2dOYW1lID0gKGNtZCBhcyBQbGlua0NvbW1hbmQpLnBrZ05hbWU7XG4gICAgICAgIGhlYWRlciA9IHBrZ05hbWUgPyBgXFxuJHtjaGFsay5pbnZlcnNlKGNoYWxrLmdyYXkoJ1Byb3ZpZGVkIGJ5IHBhY2thZ2UgJyArIHBrZ05hbWUgKyAnOiAnKSl9XFxuYCA6XG4gICAgICAgICAgJ1xcbic7XG4gICAgICB9XG4gICAgICBwa2dOYW1lID0gKGNtZCBhcyBQbGlua0NvbW1hbmQpLnBrZ05hbWU7XG4gICAgICByZXR1cm4gaGVhZGVyICsgZm9ybWF0SXRlbShoZWxwZXIuc3ViY29tbWFuZFRlcm0oY21kKSwgaGVscGVyLnN1YmNvbW1hbmREZXNjcmlwdGlvbihjbWQpLFxuICAgICAgICAoY21kIGFzIFBsaW5rQ29tbWFuZCkubmFtZVN0eWxlcik7XG4gICAgfSk7XG4gICAgaWYgKGNvbW1hbmRMaXN0Lmxlbmd0aCA+IDApIHtcbiAgICAgIG91dHB1dC5wdXNoKCdDb21tYW5kczonLCBmb3JtYXRMaXN0KGNvbW1hbmRMaXN0KSwgJycpO1xuICAgIH1cblxuICAgIHJldHVybiBvdXRwdXQuam9pbignXFxuJyk7XG4gIH1cblxuICAvLyB3cmFwKHN0cjogc3RyaW5nLCB3aWR0aDogbnVtYmVyLCBpbmRlbnQ6IG51bWJlciwgbWluQ29sdW1uV2lkdGggPSA0MCkge1xuICAvLyAgIC8vIERldGVjdCBtYW51YWxseSB3cmFwcGVkIGFuZCBpbmRlbnRlZCBzdHJpbmdzIGJ5IHNlYXJjaGluZyBmb3IgbGluZSBicmVha3NcbiAgLy8gICAvLyBmb2xsb3dlZCBieSBtdWx0aXBsZSBzcGFjZXMvdGFicy5cbiAgLy8gICBpZiAoc3RyLm1hdGNoKC9bXFxuXVxccysvKSkgcmV0dXJuIHN0cjtcbiAgLy8gICAvLyBEbyBub3Qgd3JhcCBpZiBub3QgZW5vdWdoIHJvb20gZm9yIGEgd3JhcHBlZCBjb2x1bW4gb2YgdGV4dCAoYXMgY291bGQgZW5kIHVwIHdpdGggYSB3b3JkIHBlciBsaW5lKS5cbiAgLy8gICBjb25zdCBjb2x1bW5XaWR0aCA9IHdpZHRoIC0gaW5kZW50O1xuICAvLyAgIGlmIChjb2x1bW5XaWR0aCA8IG1pbkNvbHVtbldpZHRoKSByZXR1cm4gc3RyO1xuXG4gIC8vICAgY29uc3QgbGVhZGluZ1N0ciA9IHN0ci5zdWJzdHIoMCwgaW5kZW50KTtcbiAgLy8gICBjb25zdCBjb2x1bW5UZXh0ID0gc3RyLnN1YnN0cihpbmRlbnQpO1xuXG4gIC8vICAgY29uc3QgaW5kZW50U3RyaW5nID0gJyAnLnJlcGVhdChpbmRlbnQpO1xuICAvLyAgIGNvbnN0IHJlZ2V4ID0gbmV3IFJlZ0V4cCgnLnsxLCcgKyAoY29sdW1uV2lkdGggLSAxKSArICd9KFtcXFxcc1xcdTIwMEJdfCQpfFteXFxcXHNcXHUyMDBCXSs/KFtcXFxcc1xcdTIwMEJdfCQpJywgJ2cnKTtcblxuICAvLyAgIGNvbnN0IGxpbmVzID0gY29sdW1uVGV4dC5tYXRjaChyZWdleCkgfHwgW107XG4gIC8vICAgcmV0dXJuIGxlYWRpbmdTdHIgKyBsaW5lcy5tYXAoKGxpbmUsIGkpID0+IHtcbiAgLy8gICAgIGlmIChsaW5lLnNsaWNlKC0xKSA9PT0gJ1xcbicpIHtcbiAgLy8gICAgICAgbGluZSA9IGxpbmUuc2xpY2UoMCwgbGluZS5sZW5ndGggLSAxKTtcbiAgLy8gICAgIH1cbiAgLy8gICAgIHJldHVybiAoKGkgPiAwKSA/IGluZGVudFN0cmluZyA6ICcnKSArIGxpbmUudHJpbVJpZ2h0KCk7XG4gIC8vICAgfSkuam9pbignXFxuJyk7XG4gIC8vIH1cbn1cbi8qKlxuICogRXh0ZW5kIGNvbW1hbmRlciwgY2hlY2sgY29tbWFuZGVyIEFQSSBhdCBodHRwczovL3d3dy5ucG1qcy5jb20vcGFja2FnZS9jb21tYW5kZXJcbiAqL1xuZXhwb3J0IGNsYXNzIFBsaW5rQ29tbWFuZCBleHRlbmRzIGNvbW1hbmRlci5Db21tYW5kIHtcbiAgbmFtZVN0eWxlcj86IChjbWROYW1lOiBzdHJpbmcpID0+IHN0cmluZztcbiAgb3B0aW9uU3R5bGVyPzogKGNtZE5hbWU6IHN0cmluZykgPT4gc3RyaW5nO1xuICBzdWJDbWRzOiBQbGlua0NvbW1hbmRbXSA9IFtdO1xuICAvKiogdmFsdWUgaXMgZmlsZSBwYXRoIGZvciBwa2cgbmFtZSAqL1xuICBsb2FkZWRDbWRNYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBwa2dOYW1lID0gJyc7XG5cbiAgY29uc3RydWN0b3IocHVibGljIGN0eDogQ29tbWFuZENvbnRleHQsIG5hbWU/OiBzdHJpbmcpIHtcbiAgICBzdXBlcihuYW1lKTtcbiAgfVxuXG4gIGFkZEdsb2JhbE9wdGlvbnNUb1N1YkNtZHMoKSB7XG4gICAgaWYgKHRoaXMuc3ViQ21kcyA9PSBudWxsKVxuICAgICAgcmV0dXJuO1xuICAgIGZvciAoY29uc3Qgc3ViQ21kIG9mIHRoaXMuc3ViQ21kcykge1xuICAgICAgd2l0aEdsb2JhbE9wdGlvbnMoc3ViQ21kKTtcbiAgICB9XG4gIH1cblxuICBjcmVhdGVDb21tYW5kKGNtZE5hbWU/OiBzdHJpbmcpOiBjb21tYW5kZXIuQ29tbWFuZCB7XG4gICAgY29uc3QgcGsgPSB0aGlzLmN0eC5jdXJyQ2xpQ3JlYXRvclBrZztcbiAgICBjb25zdCBmaWxlUGF0aCA9IHRoaXMuY3R4LmN1cnJDbGllQ3JlYXRvckZpbGU7XG4gICAgaWYgKGNtZE5hbWUgJiYgY21kTmFtZSAhPT0gJ2hlbHAnKSB7XG4gICAgICBpZiAodGhpcy5sb2FkZWRDbWRNYXAuaGFzKGNtZE5hbWUpKSB7XG4gICAgICAgIGlmIChmaWxlUGF0aClcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENvbmZsaWN0IGNvbW1hbmQgbmFtZSBcIiR7Y21kTmFtZX1cIiBmcm9tIGV4dGVuc2lvbnMgXCIke2ZpbGVQYXRofVwiIGFuZCBcIiR7dGhpcy5sb2FkZWRDbWRNYXAuZ2V0KGNtZE5hbWUpIX1cImApO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb25mbGljdCB3aXRoIGV4aXN0aW5nIFBsaW5rIGNvbW1hbmQgbmFtZSAke2NtZE5hbWV9YCk7XG4gICAgICB9XG4gICAgICB0aGlzLmxvYWRlZENtZE1hcC5zZXQoY21kTmFtZSwgZmlsZVBhdGggPyBmaWxlUGF0aCA6ICdAd2ZoL3BsaW5rJyk7XG4gICAgfVxuXG4gICAgY29uc3Qgc3ViQ21kID0gbmV3IFBsaW5rQ29tbWFuZCh0aGlzLmN0eCwgY21kTmFtZSk7XG4gICAgc3ViQ21kLm5hbWVTdHlsZXIgPSB0aGlzLmN0eC5uYW1lU3R5bGVyO1xuICAgIHN1YkNtZC5wa2dOYW1lID0gcGsgIT0gbnVsbCA/IHBrLm5hbWUgOiAnJztcbiAgICB0aGlzLnN1YkNtZHMucHVzaChzdWJDbWQpO1xuXG4gICAgLy8gc3ViQ21kLnNldENvbnRleHREYXRhKHRoaXMuY3VyckNsaWVDcmVhdG9yRmlsZSwgdGhpcy5jdXJyQ2xpQ3JlYXRvclBrZywgdGhpcy5tZXRhTWFwLCB0aGlzKTtcblxuICAgIGNvbnN0IG1ldGE6IFBhcnRpYWw8T3VyQ29tbWFuZE1ldGFkYXRhPiA9IHtcbiAgICAgIHBrZ05hbWU6IHBrID8gcGsubmFtZSA6ICdAd2ZoL3BsaW5rJyxcbiAgICAgIG5hbWU6IGNtZE5hbWUsXG4gICAgICBvcHRpb25zOiBbXSxcbiAgICAgIGRlc2M6ICcnXG4gICAgfTtcbiAgICB0aGlzLmN0eC5tZXRhTWFwLnNldChzdWJDbWQsIG1ldGEpO1xuICAgIHRoaXMuY3R4LmN1cnJDbGlQa2dNYXRhSW5mb3MucHVzaChtZXRhIGFzIE91ckNvbW1hbmRNZXRhZGF0YSk7XG4gICAgLy8gc3ViQ21kLmRlc2NyaXB0aW9uKG1ldGEuZGVzYyEpO1xuICAgIHJldHVybiBzdWJDbWQ7XG4gIH1cblxuICBkZXNjcmlwdGlvbihzdHI/OiBzdHJpbmcsXG4gICAgYXJnc0Rlc2NyaXB0aW9uPzogeyBbYXJnTmFtZTogc3RyaW5nXTogc3RyaW5nOyB9KSB7XG4gICAgaWYgKHN0ciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zdCBwbGlua01ldGEgPSB0aGlzLmN0eC5tZXRhTWFwLmdldCh0aGlzKSE7XG4gICAgICBwbGlua01ldGEuZGVzYyA9IHN0cjtcbiAgICAgIGlmIChhcmdzRGVzY3JpcHRpb24pIHtcbiAgICAgICAgcGxpbmtNZXRhLmFyZ0Rlc2MgPSBhcmdzRGVzY3JpcHRpb247XG4gICAgICB9XG4gICAgICByZXR1cm4gc3VwZXIuZGVzY3JpcHRpb24oc3RyLCBhcmdzRGVzY3JpcHRpb24pO1xuICAgIH1cbiAgICByZXR1cm4gc3VwZXIuZGVzY3JpcHRpb24oKSBhcyBhbnk7XG4gIH1cblxuICBhbGlhcyhhbGlhcz86IHN0cmluZykge1xuICAgIGlmIChhbGlhcykge1xuICAgICAgY29uc3QgcGxpbmtNZXRhID0gdGhpcy5jdHgubWV0YU1hcC5nZXQodGhpcykhO1xuICAgICAgcGxpbmtNZXRhLmFsaWFzID0gYWxpYXM7XG4gICAgfVxuICAgIHJldHVybiBzdXBlci5hbGlhcyhhbGlhcyBhcyBhbnkpIGFzIGFueTtcbiAgfVxuXG4gIGNyZWF0ZU9wdGlvbihmbGFnczogc3RyaW5nLCBkZXNjcmlwdGlvbj86IHN0cmluZywgLi4ucmVtYWluaW5nOiBhbnlbXSkge1xuICAgIGxldCBkZWZhdWx0VmFsdWU6IGFueTtcbiAgICBpZiAocmVtYWluaW5nLmxlbmd0aCA+IDEpIHtcbiAgICAgIGRlZmF1bHRWYWx1ZSA9IHJlbWFpbmluZ1tyZW1haW5pbmcubGVuZ3RoIC0gMV07XG4gICAgfVxuICAgIGNvbnN0IHBsaW5rTWV0YSA9IHRoaXMuY3R4Lm1ldGFNYXAuZ2V0KHRoaXMpITtcbiAgICBwbGlua01ldGEub3B0aW9ucyEucHVzaCh7XG4gICAgICBmbGFncywgZGVzYzogZGVzY3JpcHRpb24gfHwgJycsIGRlZmF1bHRWYWx1ZSwgaXNSZXF1aXJlZDogZmFsc2VcbiAgICB9KTtcbiAgICBjb25zdCBvcHQgPSBuZXcgUGxpbmtDbWRPcHRpb24oZmxhZ3MsIGRlc2NyaXB0aW9uKTtcbiAgICBvcHQub3B0aW9uU3R5bGVyID0gdGhpcy5vcHRpb25TdHlsZXI7XG4gICAgcmV0dXJuIG9wdDtcbiAgfVxuICBvcHRpb24oLi4uYXJnczogYW55W10pIHtcbiAgICAodGhpcy5fc2F2ZU9wdGlvbnMgYXMgYW55KShmYWxzZSwgLi4uYXJncyk7XG4gICAgcmV0dXJuIChzdXBlci5vcHRpb24gYXMgYW55KSguLi5hcmdzKTtcbiAgfVxuICByZXF1aXJlZE9wdGlvbiguLi5hcmdzOiBhbnlbXSkge1xuICAgICh0aGlzLl9zYXZlT3B0aW9ucyBhcyBhbnkpKHRydWUsIC4uLmFyZ3MpO1xuICAgIHJldHVybiAoc3VwZXIucmVxdWlyZWRPcHRpb24gYXMgYW55KSguLi5hcmdzKTtcbiAgfVxuICBhY3Rpb24oZm46ICguLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCB8IFByb21pc2U8dm9pZD4pIHtcbiAgICBmdW5jdGlvbiBhY3Rpb25DYWxsYmFjayh0aGlzOiBjb21tYW5kZXIuQ29tbWFuZCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3Qge2luaXRDb25maWd9ID0gcmVxdWlyZSgnLi4vdXRpbHMvYm9vdHN0cmFwLXByb2Nlc3MnKSBhcyB0eXBlb2YgX2Jvb3RzdHJhcDtcbiAgICAgICAgaW5pdENvbmZpZyh0aGlzLm9wdHMoKSBhcyBHbG9iYWxPcHRpb25zKTtcbiAgICAgICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGxvZy5lcnJvcihlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHN1cGVyLmFjdGlvbihhY3Rpb25DYWxsYmFjayk7XG4gIH1cbiAgY3JlYXRlSGVscCgpIHtcbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihuZXcgUGxpbmtDb21tYW5kSGVscCgpLCB0aGlzLmNvbmZpZ3VyZUhlbHAoKSk7XG4gIH1cbiAgX3NhdmVPcHRpb25zKGlzUmVxdWlyZWQ6IGJvb2xlYW4sIGZsYWdzOiBzdHJpbmcsIGRlc2M6IHN0cmluZywgLi4ucmVtYWluaW5nOiBhbnlbXSkge1xuICAgIGxldCBkZWZhdWx0VmFsdWU6IGFueTtcbiAgICBpZiAocmVtYWluaW5nLmxlbmd0aCA+IDEpIHtcbiAgICAgIGRlZmF1bHRWYWx1ZSA9IHJlbWFpbmluZ1tyZW1haW5pbmcubGVuZ3RoIC0gMV07XG4gICAgfVxuICAgIGNvbnN0IHBsaW5rTWV0YSA9IHRoaXMuY3R4Lm1ldGFNYXAuZ2V0KHRoaXMpITtcbiAgICBwbGlua01ldGEub3B0aW9ucyEucHVzaCh7XG4gICAgICBmbGFncywgZGVzYywgZGVmYXVsdFZhbHVlLCBpc1JlcXVpcmVkXG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IHR5cGUgQ2xpRXh0ZW5zaW9uID0gKHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kKSA9PiB2b2lkO1xuXG5jbGFzcyBQbGlua0NtZE9wdGlvbiBleHRlbmRzIGNvbW1hbmRlci5PcHRpb24ge1xuICBvcHRpb25TdHlsZXI/OiAoY21kTmFtZTogc3RyaW5nKSA9PiBzdHJpbmc7XG59XG5leHBvcnQgY2xhc3MgQ29tbWFuZE92ZXJyaWRlciB7XG4gIC8vIG5hbWVTdHlsZXI6IFBsaW5rQ29tbWFuZFsnbmFtZVN0eWxlciddO1xuICAvLyBwcml2YXRlIGN1cnJDbGllQ3JlYXRvckZpbGU6IHN0cmluZztcbiAgLy8gcHJpdmF0ZSBjdXJyQ2xpQ3JlYXRvclBrZzogUGFja2FnZUluZm8gfCBudWxsID0gbnVsbDtcbiAgLy8gcHJpdmF0ZSBjdXJyQ2xpUGtnTWF0YUluZm9zOiBPdXJDb21tYW5kTWV0YWRhdGFbXTtcbiAgLy8gcHJpdmF0ZSBhbGxTdWJDbWRzOiBPdXJBdWdtZW50ZWRDb21tYW5kZXJbXSA9IFtdO1xuICAvLyBwcml2YXRlIG1ldGFNYXAgPSBuZXcgV2Vha01hcDxjb21tYW5kZXIuQ29tbWFuZCwgUGFydGlhbDxPdXJDb21tYW5kTWV0YWRhdGE+PigpO1xuICBwcml2YXRlIHBrZ01ldGFzTWFwID0gbmV3IE1hcDxzdHJpbmcsIE91ckNvbW1hbmRNZXRhZGF0YVtdPigpO1xuICBwcml2YXRlIGN0eDogUGFydGlhbDxDb21tYW5kQ29udGV4dD4gPSB7XG4gICAgbWV0YU1hcDogbmV3IFdlYWtNYXA8Y29tbWFuZGVyLkNvbW1hbmQsIFBhcnRpYWw8T3VyQ29tbWFuZE1ldGFkYXRhPj4oKVxuICB9O1xuXG4gIHNldCBuYW1lU3R5bGVyKHY6IFBsaW5rQ29tbWFuZFsnbmFtZVN0eWxlciddKSB7XG4gICAgdGhpcy5jdHgubmFtZVN0eWxlciA9IHY7XG4gIH1cblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kLCB3cz86IFdvcmtzcGFjZVN0YXRlKSB7XG4gICAgdGhpcy5wcm9ncmFtLmNyZWF0ZUNvbW1hbmQgPSBQbGlua0NvbW1hbmQucHJvdG90eXBlLmNyZWF0ZUNvbW1hbmQ7XG5cbiAgICAodGhpcy5wcm9ncmFtIGFzIFBsaW5rQ29tbWFuZCkuY3R4ID0gdGhpcy5jdHggYXMgQ29tbWFuZENvbnRleHQ7XG4gICAgKHRoaXMucHJvZ3JhbSBhcyBQbGlua0NvbW1hbmQpLnN1YkNtZHMgPSBbXTtcbiAgICAodGhpcy5wcm9ncmFtIGFzIFBsaW5rQ29tbWFuZCkubG9hZGVkQ21kTWFwID0gbmV3IE1hcCgpO1xuICAgICh0aGlzLnByb2dyYW0gYXMgUGxpbmtDb21tYW5kKS5hZGRHbG9iYWxPcHRpb25zVG9TdWJDbWRzID0gUGxpbmtDb21tYW5kLnByb3RvdHlwZS5hZGRHbG9iYWxPcHRpb25zVG9TdWJDbWRzO1xuICAgIHRoaXMucHJvZ3JhbS5jcmVhdGVIZWxwID0gUGxpbmtDb21tYW5kLnByb3RvdHlwZS5jcmVhdGVIZWxwO1xuICB9XG5cbiAgZm9yUGFja2FnZShwazogUGFja2FnZUluZm8sIHBrZ0ZpbGVQYXRoOiBzdHJpbmcsIGZ1bmNOYW1lOiBzdHJpbmcpOiB2b2lkO1xuICBmb3JQYWNrYWdlKHBrOiBudWxsLCBjb21tYW5kQ3JlYXRpb246IChwcm9ncmFtOiBjb21tYW5kZXIuQ29tbWFuZCkgPT4gdm9pZCk6IHZvaWQ7XG4gIGZvclBhY2thZ2UocGs6IFBhY2thZ2VJbmZvIHwgbnVsbCxcbiAgICBwa2dGaWxlUGF0aDogc3RyaW5nIHwgKChwcm9ncmFtOiBjb21tYW5kZXIuQ29tbWFuZCkgPT4gdm9pZCksXG4gICAgZnVuY05hbWU/OiBzdHJpbmcpIHtcbiAgICBjb25zdCBjb21tYW5kTWV0YUluZm9zOiBPdXJDb21tYW5kTWV0YWRhdGFbXSA9IHRoaXMuY3R4LmN1cnJDbGlQa2dNYXRhSW5mb3MgPSBbXTtcbiAgICB0aGlzLmN0eC5jdXJyQ2xpQ3JlYXRvclBrZyA9IHBrO1xuXG4gICAgbGV0IGZpbGVQYXRoOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcblxuICAgIGlmICh0eXBlb2YgcGtnRmlsZVBhdGggPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHBrZ0ZpbGVQYXRoKHRoaXMucHJvZ3JhbSk7XG4gICAgICB0aGlzLnBrZ01ldGFzTWFwLnNldCgnQHdmaC9wbGluaycsIGNvbW1hbmRNZXRhSW5mb3MpO1xuICAgIH0gZWxzZSBpZiAocGspIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGZpbGVQYXRoID0gcmVxdWlyZS5yZXNvbHZlKHBrLm5hbWUgKyAnLycgKyBwa2dGaWxlUGF0aCk7XG4gICAgICAgIHRoaXMuY3R4LmN1cnJDbGllQ3JlYXRvckZpbGUgPSBmaWxlUGF0aDtcbiAgICAgICAgY29uc3Qgc3ViQ21kRmFjdG9yeTogQ2xpRXh0ZW5zaW9uID0gZnVuY05hbWUgPyByZXF1aXJlKGZpbGVQYXRoKVtmdW5jTmFtZV0gOlxuICAgICAgICAgIHJlcXVpcmUoZmlsZVBhdGgpO1xuICAgICAgICBzdWJDbWRGYWN0b3J5KHRoaXMucHJvZ3JhbSBhcyBQbGlua0NvbW1hbmQpO1xuICAgICAgICB0aGlzLnBrZ01ldGFzTWFwLnNldChway5uYW1lLCBjb21tYW5kTWV0YUluZm9zKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgbG9nLndhcm4oYEZhaWxlZCB0byBsb2FkIGNvbW1hbmQgbGluZSBleHRlbnNpb24gaW4gcGFja2FnZSAke3BrLm5hbWV9OiBcIiR7ZS5tZXNzYWdlIGFzIHN0cmluZ31cImAsIGUpO1xuICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgZmlsZVBhdGggPSBudWxsO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLmN0eC5jdXJyQ2xpQ3JlYXRvclBrZyA9IG51bGw7XG4gIH1cblxuICBhcHBlbmRHbG9iYWxPcHRpb25zKHNhdmVUb1N0b3JlOiBib29sZWFuKSB7XG4gICAgKHRoaXMucHJvZ3JhbSBhcyBQbGlua0NvbW1hbmQpLmFkZEdsb2JhbE9wdGlvbnNUb1N1YkNtZHMoKTtcbiAgICAvLyBmb3IgKGNvbnN0IGNtZCBvZiB0aGlzLmFsbFN1YkNtZHMpIHtcbiAgICAvLyAgIHdpdGhHbG9iYWxPcHRpb25zKGNtZCk7XG4gICAgLy8gfVxuICAgIGlmICghc2F2ZVRvU3RvcmUpXG4gICAgICByZXR1cm47XG4gICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiB7XG4gICAgICBmb3IgKGNvbnN0IFtwa2csIG1ldGFzXSBvZiB0aGlzLnBrZ01ldGFzTWFwLmVudHJpZXMoKSkge1xuICAgICAgICBjbGlBY3Rpb25EaXNwYXRjaGVyLmFkZENvbW1hbmRNZXRhKHtwa2csIG1ldGFzfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdpdGhHbG9iYWxPcHRpb25zKGNtZDogY29tbWFuZGVyLkNvbW1hbmQgfCBQbGlua0NvbW1hbmQpOiBjb21tYW5kZXIuQ29tbWFuZCB7XG4gIGlmIChjbWQgaW5zdGFuY2VvZiBQbGlua0NvbW1hbmQpXG4gICAgY21kLm9wdGlvblN0eWxlciA9IHN0ciA9PiBjaGFsay5ncmF5KHN0cik7XG4gIChjbWQub3B0aW9uIGFzIGNvbW1hbmRlci5Db21tYW5kWydvcHRpb24nXSkoJy1jLCAtLWNvbmZpZyA8Y29uZmlnLWZpbGU+JyxcbiAgICAnUmVhZCBjb25maWcgZmlsZXMsIGlmIHRoZXJlIGFyZSBtdWx0aXBsZSBmaWxlcywgdGhlIGxhdHRlciBvbmUgb3ZlcnJpZGVzIHByZXZpb3VzIG9uZScsXG4gICAgKHZhbHVlLCBwcmV2KSA9PiB7XG4gICAgICBwcmV2LnB1c2goLi4udmFsdWUuc3BsaXQoJywnKSk7XG4gICAgICByZXR1cm4gcHJldjtcbiAgICAgIC8vIHJldHVybiBwcmV2LmNvbmNhdCh2YWx1ZS5zcGxpdCgnLCcpKTtcbiAgICB9LCBbXSBhcyBzdHJpbmdbXSk7XG5cbiAgKGNtZC5vcHRpb24gYXMgY29tbWFuZGVyLkNvbW1hbmRbJ29wdGlvbiddKSgnLS1wcm9wIDxleHByZXNzaW9uPicsXG4gICAgJzxwcm9wZXJ0eSBwYXRoPj08dmFsdWUgYXMgSlNPTiB8IGxpdGVyYWw+IC4uLiBkaXJlY3RseSBzZXQgY29uZmlndXJhdGlvbiBwcm9wZXJ0aWVzLCBwcm9wZXJ0eSBuYW1lIGlzIGxvZGFzaC5zZXQoKSBwYXRoLWxpa2Ugc3RyaW5nLiBlLmcuICcgK1xuICAgICctLXByb3AgcG9ydD04MDgwIC0tcHJvcCBkZXZNb2RlPWZhbHNlIC0tcHJvcCBAd2ZoL2Zvb2Jhci5hcGk9aHR0cDovL2xvY2FsaG9zdDo4MDgwICcgK1xuICAgICctLXByb3AgYXJyYXlsaWtlLnByb3BbMF09Zm9vYmFyICcgK1xuICAgICctLXByb3AgW1wiQHdmaC9mb28uYmFyXCIsXCJwcm9wXCIsMF09dHJ1ZScsXG4gICAgYXJyYXlPcHRpb25GbiwgW10gYXMgc3RyaW5nW10pXG4gIC5vcHRpb24oJy0tdmVyYm9zZScsICdTcGVjaWZ5IGxvZyBsZXZlbCBhcyBcImRlYnVnXCInLCBmYWxzZSlcbiAgLm9wdGlvbignLS1kZXYnLCAnQnkgdHVybmluZyBvbiB0aGlzIG9wdGlvbiwnICtcbiAgICAnIFBsaW5rIHNldHRpbmcgcHJvcGVydHkgXCJkZXZNb2RlXCIgd2lsbCBhdXRvbWF0Y2lhbGx5IHNldCB0byBgdHJ1ZWAsJyArXG4gICAgJyBhbmQgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgd2lsbCBhbHNvIGJlaW5nIHVwZGF0ZWQgdG8gXFwnZGV2ZWxvcGVtZW50XFwnIG9yIFxcJ3Byb2R1Y3Rpb24gY29ycmVzcG9uZGluZ2x5LiAnLFxuICAgIGZhbHNlKVxuICAub3B0aW9uKCctLWVudiA8c2V0dGluZyBlbnZpcm9ubWVudD4nLCAnQSBzdHJpbmcgZGVub3RlcyBydW50aW1lIGVudmlyb25tZW50IG5hbWUsIHBhY2thZ2Ugc2V0dGluZyBmaWxlIG1heSByZXR1cm4gZGlmZmVyZW50IHZhbHVlcyBiYXNlZCBvbiBpdHMgdmFsdWUgKGNsaU9wdGlvbnMuZW52KScpO1xuICBpZiAoY21kIGluc3RhbmNlb2YgUGxpbmtDb21tYW5kKVxuICAgIGNtZC5vcHRpb25TdHlsZXIgPSB1bmRlZmluZWQ7XG4gIHJldHVybiBjbWQ7XG59XG4iXX0=