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
            nameAndArgs: cmdName,
            options: [],
            desc: ''
        };
        this.ctx.metaMap.set(subCmd, meta);
        this.ctx.currCliPkgMataInfos.push(meta);
        subCmd.description(meta.desc);
        return subCmd;
    }
    // description(str?: string,
    //   argsDescription?: { [argName: string]: string; }) {
    //   if (str !== undefined) {
    //     if (this.ctx.currCliCreatorPkg)
    //       str = chalk.gray(`<${this.ctx.currCliCreatorPkg.name}>`) + ' ' + str;
    //     const plinkMeta = this.ctx.metaMap.get(this)!;
    //     plinkMeta.desc = str;
    //     if (argsDescription) {
    //       plinkMeta.argDesc = argsDescription;
    //     }
    //     return super.description(str, argsDescription);
    //   }
    //   return super.description() as any;
    // }
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
        this.currCliCreatorPkg = null;
        // private allSubCmds: OurAugmentedCommander[] = [];
        this.metaMap = new WeakMap();
        this.pkgMetasMap = new Map();
        this.program.createCommand = PlinkCommand.prototype.createCommand;
        const self = this;
        this.program.ctx = {
            get currClieCreatorFile() {
                return self.currClieCreatorFile;
            },
            get currCliCreatorPkg() {
                return self.currCliCreatorPkg;
            },
            metaMap: self.metaMap,
            get currCliPkgMataInfos() {
                return self.currCliPkgMataInfos;
            },
            get nameStyler() {
                return self.nameStyler;
            }
            // loadedCmdMap: self.loadedCmdMap
        };
        this.program.subCmds = [];
        this.program.loadedCmdMap = new Map();
        this.program.addGlobalOptionsToSubCmds = PlinkCommand.prototype.addGlobalOptionsToSubCmds;
        this.program.createHelp = PlinkCommand.prototype.createHelp;
    }
    forPackage(pk, pkgFilePath, funcName) {
        const commandMetaInfos = this.currCliPkgMataInfos = [];
        this.currCliCreatorPkg = pk;
        let filePath = null;
        if (typeof pkgFilePath === 'function') {
            pkgFilePath(this.program);
            this.pkgMetasMap.set('@wfh/plink', commandMetaInfos);
        }
        else if (pk) {
            try {
                filePath = require.resolve(pk.name + '/' + pkgFilePath);
                this.currClieCreatorFile = filePath;
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
        this.currCliCreatorPkg = null;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcnJpZGUtY29tbWFuZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL292ZXJyaWRlLWNvbW1hbmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSwwREFBa0M7QUFFbEMsa0RBQTBCO0FBQzFCLG1DQUFzQztBQUd0QywyQ0FBZ0Q7QUFDaEQsb0RBQTRCO0FBQzVCLDREQUFtQztBQUVuQyxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0FBVXpELE1BQWEsZ0JBQWlCLFNBQVEsbUJBQVMsQ0FBQyxJQUFJO0lBQ2xELGNBQWMsQ0FBQyxHQUFzQjtRQUNuQyxNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3RDLElBQUksR0FBRyxZQUFZLFlBQVksSUFBSSxHQUFHLENBQUMsVUFBVSxFQUFFO1lBQ2pELE9BQU8sR0FBRyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUM1QjtRQUNELE9BQU8sR0FBRyxDQUFDO0lBQ2IsQ0FBQztJQUVELFVBQVUsQ0FBQyxNQUFzQjtRQUMvQixPQUFPLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO0lBQ2hGLENBQUM7SUFFRCxrQ0FBa0MsQ0FBQyxHQUFzQixFQUFFLE1BQXdCO1FBQ2pGLE9BQU8sTUFBTSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLEVBQUU7WUFDekQsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxvQkFBUyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztR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MUJELDhDQTBCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjb21tYW5kZXIgZnJvbSAnY29tbWFuZGVyJztcbmltcG9ydCB7V29ya3NwYWNlU3RhdGUsIFBhY2thZ2VJbmZvfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHthcnJheU9wdGlvbkZufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCAqIGFzIF9ib290c3RyYXAgZnJvbSAnLi4vdXRpbHMvYm9vdHN0cmFwLXByb2Nlc3MnO1xuaW1wb3J0IHsgR2xvYmFsT3B0aW9ucywgT3VyQ29tbWFuZE1ldGFkYXRhLCBDbGlFeHRlbnNpb24gfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7Y2xpQWN0aW9uRGlzcGF0Y2hlcn0gZnJvbSAnLi9jbGktc2xpY2UnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHN0cmlwQW5zaSBmcm9tICdzdHJpcC1hbnNpJztcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsub3ZlcnJpZGUtY29tbWFuZGVyJyk7XG5cbmludGVyZmFjZSBDb21tYW5kQ29udGV4dCB7XG4gIGN1cnJDbGllQ3JlYXRvckZpbGU6IHN0cmluZztcbiAgY3VyckNsaUNyZWF0b3JQa2c6IFBhY2thZ2VJbmZvIHwgbnVsbDtcbiAgbWV0YU1hcDogV2Vha01hcDxQbGlua0NvbW1hbmQsIFBhcnRpYWw8T3VyQ29tbWFuZE1ldGFkYXRhPj47XG4gIGN1cnJDbGlQa2dNYXRhSW5mb3M6IE91ckNvbW1hbmRNZXRhZGF0YVtdO1xuICBuYW1lU3R5bGVyPzogKGNtZE5hbWU6IHN0cmluZykgPT4gc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgUGxpbmtDb21tYW5kSGVscCBleHRlbmRzIGNvbW1hbmRlci5IZWxwIHtcbiAgc3ViY29tbWFuZFRlcm0oY21kOiBjb21tYW5kZXIuQ29tbWFuZCk6IHN0cmluZyB7XG4gICAgY29uc3Qgc3RyID0gc3VwZXIuc3ViY29tbWFuZFRlcm0oY21kKTtcbiAgICBpZiAoY21kIGluc3RhbmNlb2YgUGxpbmtDb21tYW5kICYmIGNtZC5uYW1lU3R5bGVyKSB7XG4gICAgICByZXR1cm4gY21kLm5hbWVTdHlsZXIoc3RyKTtcbiAgICB9XG4gICAgcmV0dXJuIHN0cjtcbiAgfVxuXG4gIG9wdGlvblRlcm0ob3B0aW9uOiBQbGlua0NtZE9wdGlvbikge1xuICAgIHJldHVybiBvcHRpb24ub3B0aW9uU3R5bGVyID8gb3B0aW9uLm9wdGlvblN0eWxlcihvcHRpb24uZmxhZ3MpIDogb3B0aW9uLmZsYWdzO1xuICB9XG5cbiAgbG9uZ2VzdFN1YmNvbW1hbmRUZXJtTGVuZ3RoRm9yUmVhbChjbWQ6IGNvbW1hbmRlci5Db21tYW5kLCBoZWxwZXI6IFBsaW5rQ29tbWFuZEhlbHApIHtcbiAgICByZXR1cm4gaGVscGVyLnZpc2libGVDb21tYW5kcyhjbWQpLnJlZHVjZSgobWF4LCBjb21tYW5kKSA9PiB7XG4gICAgICByZXR1cm4gTWF0aC5tYXgobWF4LCBzdHJpcEFuc2koaGVscGVyLnN1YmNvbW1hbmRUZXJtKGNvbW1hbmQpKS5sZW5ndGgpO1xuICAgIH0sIDApO1xuICB9XG5cbiAgbG9uZ2VzdE9wdGlvblRlcm1MZW5ndGhGb3JSZWFsKGNtZDogY29tbWFuZGVyLkNvbW1hbmQsIGhlbHBlcjogUGxpbmtDb21tYW5kSGVscCkge1xuICAgIHJldHVybiBoZWxwZXIudmlzaWJsZU9wdGlvbnMoY21kKS5yZWR1Y2UoKG1heCwgb3B0aW9uKSA9PiB7XG4gICAgICByZXR1cm4gTWF0aC5tYXgobWF4LCBzdHJpcEFuc2koaGVscGVyLm9wdGlvblRlcm0ob3B0aW9uKSkubGVuZ3RoKTtcbiAgICB9LCAwKTtcbiAgfVxuXG4gIC8vIHN1YmNvbW1hbmREZXNjcmlwdGlvbihjbWQ6IGNvbW1hbmRlci5Db21tYW5kKSB7XG4gIC8vICAgcmV0dXJuIHN0cmlwQW5zaShzdXBlci5zdWJjb21tYW5kRGVzY3JpcHRpb24oY21kKSk7XG4gIC8vIH1cblxuICByZWFsUGFkV2lkdGgoY21kOiBjb21tYW5kZXIuQ29tbWFuZCwgaGVscGVyOiBQbGlua0NvbW1hbmRIZWxwKSB7XG4gICAgcmV0dXJuIE1hdGgubWF4KFxuICAgICAgaGVscGVyLmxvbmdlc3RPcHRpb25UZXJtTGVuZ3RoRm9yUmVhbChjbWQsIGhlbHBlciksXG4gICAgICBoZWxwZXIubG9uZ2VzdFN1YmNvbW1hbmRUZXJtTGVuZ3RoRm9yUmVhbChjbWQsIGhlbHBlciksXG4gICAgICBoZWxwZXIubG9uZ2VzdEFyZ3VtZW50VGVybUxlbmd0aChjbWQsIGhlbHBlcilcbiAgICApO1xuICB9XG5cbiAgZm9ybWF0SGVscChjbWQ6IGNvbW1hbmRlci5Db21tYW5kLCBoZWxwZXI6IFBsaW5rQ29tbWFuZEhlbHApIHtcbiAgICAvLyBjb25zdCB0ZXJtV2lkdGggPSBoZWxwZXIucGFkV2lkdGgoY21kLCBoZWxwZXIpOyAvLyBJdCBpcyBiaWdnZXIgdGhhbiBhY3R1YWwgd2lkdGggZHVlIHRvIGNvbG9yZnVsIGNoYXJhY3RlclxuICAgIGNvbnN0IHJlYWxUZXJtV2lkdGggPSBoZWxwZXIucmVhbFBhZFdpZHRoKGNtZCwgaGVscGVyKTtcbiAgICAvLyBjb25zb2xlLmxvZygndGVybVdpZHRoPScsIHRlcm1XaWR0aCk7XG4gICAgY29uc3QgaGVscFdpZHRoID0gaGVscGVyLmhlbHBXaWR0aCB8fCA4MDtcbiAgICBjb25zdCBpdGVtSW5kZW50V2lkdGggPSAyO1xuICAgIGNvbnN0IGl0ZW1TZXBhcmF0b3JXaWR0aCA9IDI7IC8vIGJldHdlZW4gdGVybSBhbmQgZGVzY3JpcHRpb25cbiAgICBmdW5jdGlvbiBmb3JtYXRJdGVtKHRlcm06IHN0cmluZywgZGVzY3JpcHRpb246IHN0cmluZywgc3R5bGVyPzogUGxpbmtDb21tYW5kWyduYW1lU3R5bGVyJ10pIHtcbiAgICAgIGlmIChkZXNjcmlwdGlvbikge1xuICAgICAgICAvLyBTdXBwb3J0IGNvbG9yZnVsIGNoYXJhY3RlcnNcbiAgICAgICAgY29uc3QgZnVsbFRleHQgPSBgJHt0ZXJtfSR7JyAnLnJlcGVhdChyZWFsVGVybVdpZHRoICsgaXRlbUluZGVudFdpZHRoIC0gc3RyaXBBbnNpKHRlcm0pLmxlbmd0aCl9JHtkZXNjcmlwdGlvbn1gO1xuICAgICAgICByZXR1cm4gaGVscGVyLndyYXAoZnVsbFRleHQsIGhlbHBXaWR0aCAtIGl0ZW1JbmRlbnRXaWR0aCwgcmVhbFRlcm1XaWR0aCArIGl0ZW1TZXBhcmF0b3JXaWR0aCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGVybTtcbiAgICB9XG4gICAgZnVuY3Rpb24gZm9ybWF0TGlzdCh0ZXh0QXJyYXk6IHN0cmluZ1tdKSB7XG4gICAgICByZXR1cm4gdGV4dEFycmF5LmpvaW4oJ1xcbicpLnJlcGxhY2UoL14vZ20sICcgJy5yZXBlYXQoaXRlbUluZGVudFdpZHRoKSk7XG4gICAgfVxuXG4gICAgLy8gVXNhZ2VcbiAgICBjb25zdCBvdXRwdXQgPSBbYFVzYWdlOiAke2hlbHBlci5jb21tYW5kVXNhZ2UoY21kKX1gLCAnJ107XG5cbiAgICAvLyBEZXNjcmlwdGlvblxuICAgIGNvbnN0IGNvbW1hbmREZXNjcmlwdGlvbiA9IGhlbHBlci5jb21tYW5kRGVzY3JpcHRpb24oY21kKTtcbiAgICBpZiAoY29tbWFuZERlc2NyaXB0aW9uLmxlbmd0aCA+IDApIHtcbiAgICAgIG91dHB1dC5wdXNoKGNvbW1hbmREZXNjcmlwdGlvbiwgJycpO1xuICAgIH1cblxuICAgIC8vIEFyZ3VtZW50c1xuICAgIGNvbnN0IGFyZ3VtZW50TGlzdCA9IGhlbHBlci52aXNpYmxlQXJndW1lbnRzKGNtZCkubWFwKChhcmd1bWVudCkgPT4ge1xuICAgICAgcmV0dXJuIGZvcm1hdEl0ZW0oYXJndW1lbnQudGVybSwgYXJndW1lbnQuZGVzY3JpcHRpb24pO1xuICAgIH0pO1xuICAgIGlmIChhcmd1bWVudExpc3QubGVuZ3RoID4gMCkge1xuICAgICAgb3V0cHV0LnB1c2goJ0FyZ3VtZW50czonLCBmb3JtYXRMaXN0KGFyZ3VtZW50TGlzdCksICcnKTtcbiAgICB9XG5cbiAgICAvLyBPcHRpb25zXG4gICAgY29uc3Qgb3B0aW9uTGlzdCA9IGhlbHBlci52aXNpYmxlT3B0aW9ucyhjbWQpLm1hcCgob3B0aW9uKSA9PiB7XG4gICAgICByZXR1cm4gZm9ybWF0SXRlbShoZWxwZXIub3B0aW9uVGVybShvcHRpb24pLCBoZWxwZXIub3B0aW9uRGVzY3JpcHRpb24ob3B0aW9uKSxcbiAgICAgICAgKG9wdGlvbiBhcyBQbGlua0NtZE9wdGlvbikub3B0aW9uU3R5bGVyKTtcbiAgICB9KTtcbiAgICBpZiAob3B0aW9uTGlzdC5sZW5ndGggPiAwKSB7XG4gICAgICBvdXRwdXQucHVzaCgnT3B0aW9uczonLCBmb3JtYXRMaXN0KG9wdGlvbkxpc3QpLCAnJyk7XG4gICAgfVxuXG4gICAgLy8gQ29tbWFuZHNcbiAgICBsZXQgcGtnTmFtZSA9ICcnO1xuICAgIGNvbnN0IGNvbW1hbmRMaXN0ID0gaGVscGVyLnZpc2libGVDb21tYW5kcyhjbWQpLm1hcCgoY21kKSA9PiB7XG4gICAgICBsZXQgaGVhZGVyID0gJyc7XG4gICAgICBpZiAocGtnTmFtZSAhPT0gKGNtZCBhcyBQbGlua0NvbW1hbmQpLnBrZ05hbWUpIHtcbiAgICAgICAgcGtnTmFtZSA9IChjbWQgYXMgUGxpbmtDb21tYW5kKS5wa2dOYW1lO1xuICAgICAgICBoZWFkZXIgPSBwa2dOYW1lID8gYFxcbiR7Y2hhbGsuaW52ZXJzZShjaGFsay5ncmF5KCdQcm92aWRlZCBieSBwYWNrYWdlICcgKyBwa2dOYW1lICsgJzogJykpfVxcbmAgOlxuICAgICAgICAgICdcXG4nO1xuICAgICAgfVxuICAgICAgcGtnTmFtZSA9IChjbWQgYXMgUGxpbmtDb21tYW5kKS5wa2dOYW1lO1xuICAgICAgcmV0dXJuIGhlYWRlciArIGZvcm1hdEl0ZW0oaGVscGVyLnN1YmNvbW1hbmRUZXJtKGNtZCksIGhlbHBlci5zdWJjb21tYW5kRGVzY3JpcHRpb24oY21kKSxcbiAgICAgICAgKGNtZCBhcyBQbGlua0NvbW1hbmQpLm5hbWVTdHlsZXIpO1xuICAgIH0pO1xuICAgIGlmIChjb21tYW5kTGlzdC5sZW5ndGggPiAwKSB7XG4gICAgICBvdXRwdXQucHVzaCgnQ29tbWFuZHM6JywgZm9ybWF0TGlzdChjb21tYW5kTGlzdCksICcnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gb3V0cHV0LmpvaW4oJ1xcbicpO1xuICB9XG5cbiAgLy8gd3JhcChzdHI6IHN0cmluZywgd2lkdGg6IG51bWJlciwgaW5kZW50OiBudW1iZXIsIG1pbkNvbHVtbldpZHRoID0gNDApIHtcbiAgLy8gICAvLyBEZXRlY3QgbWFudWFsbHkgd3JhcHBlZCBhbmQgaW5kZW50ZWQgc3RyaW5ncyBieSBzZWFyY2hpbmcgZm9yIGxpbmUgYnJlYWtzXG4gIC8vICAgLy8gZm9sbG93ZWQgYnkgbXVsdGlwbGUgc3BhY2VzL3RhYnMuXG4gIC8vICAgaWYgKHN0ci5tYXRjaCgvW1xcbl1cXHMrLykpIHJldHVybiBzdHI7XG4gIC8vICAgLy8gRG8gbm90IHdyYXAgaWYgbm90IGVub3VnaCByb29tIGZvciBhIHdyYXBwZWQgY29sdW1uIG9mIHRleHQgKGFzIGNvdWxkIGVuZCB1cCB3aXRoIGEgd29yZCBwZXIgbGluZSkuXG4gIC8vICAgY29uc3QgY29sdW1uV2lkdGggPSB3aWR0aCAtIGluZGVudDtcbiAgLy8gICBpZiAoY29sdW1uV2lkdGggPCBtaW5Db2x1bW5XaWR0aCkgcmV0dXJuIHN0cjtcblxuICAvLyAgIGNvbnN0IGxlYWRpbmdTdHIgPSBzdHIuc3Vic3RyKDAsIGluZGVudCk7XG4gIC8vICAgY29uc3QgY29sdW1uVGV4dCA9IHN0ci5zdWJzdHIoaW5kZW50KTtcblxuICAvLyAgIGNvbnN0IGluZGVudFN0cmluZyA9ICcgJy5yZXBlYXQoaW5kZW50KTtcbiAgLy8gICBjb25zdCByZWdleCA9IG5ldyBSZWdFeHAoJy57MSwnICsgKGNvbHVtbldpZHRoIC0gMSkgKyAnfShbXFxcXHNcXHUyMDBCXXwkKXxbXlxcXFxzXFx1MjAwQl0rPyhbXFxcXHNcXHUyMDBCXXwkKScsICdnJyk7XG5cbiAgLy8gICBjb25zdCBsaW5lcyA9IGNvbHVtblRleHQubWF0Y2gocmVnZXgpIHx8IFtdO1xuICAvLyAgIHJldHVybiBsZWFkaW5nU3RyICsgbGluZXMubWFwKChsaW5lLCBpKSA9PiB7XG4gIC8vICAgICBpZiAobGluZS5zbGljZSgtMSkgPT09ICdcXG4nKSB7XG4gIC8vICAgICAgIGxpbmUgPSBsaW5lLnNsaWNlKDAsIGxpbmUubGVuZ3RoIC0gMSk7XG4gIC8vICAgICB9XG4gIC8vICAgICByZXR1cm4gKChpID4gMCkgPyBpbmRlbnRTdHJpbmcgOiAnJykgKyBsaW5lLnRyaW1SaWdodCgpO1xuICAvLyAgIH0pLmpvaW4oJ1xcbicpO1xuICAvLyB9XG59XG5leHBvcnQgY2xhc3MgUGxpbmtDb21tYW5kIGV4dGVuZHMgY29tbWFuZGVyLkNvbW1hbmQge1xuICBuYW1lU3R5bGVyPzogKGNtZE5hbWU6IHN0cmluZykgPT4gc3RyaW5nO1xuICBvcHRpb25TdHlsZXI/OiAoY21kTmFtZTogc3RyaW5nKSA9PiBzdHJpbmc7XG4gIHN1YkNtZHM6IFBsaW5rQ29tbWFuZFtdID0gW107XG4gIC8qKiB2YWx1ZSBpcyBmaWxlIHBhdGggZm9yIHBrZyBuYW1lICovXG4gIGxvYWRlZENtZE1hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIHBrZ05hbWU6IHN0cmluZztcblxuICBjb25zdHJ1Y3RvcihwdWJsaWMgY3R4OiBDb21tYW5kQ29udGV4dCwgbmFtZT86IHN0cmluZykge1xuICAgIHN1cGVyKG5hbWUpO1xuICB9XG5cbiAgYWRkR2xvYmFsT3B0aW9uc1RvU3ViQ21kcygpIHtcbiAgICBpZiAodGhpcy5zdWJDbWRzID09IG51bGwpXG4gICAgICByZXR1cm47XG4gICAgZm9yIChjb25zdCBzdWJDbWQgb2YgdGhpcy5zdWJDbWRzKSB7XG4gICAgICB3aXRoR2xvYmFsT3B0aW9ucyhzdWJDbWQpO1xuICAgIH1cbiAgfVxuXG4gIGNyZWF0ZUNvbW1hbmQoY21kTmFtZT86IHN0cmluZyk6IGNvbW1hbmRlci5Db21tYW5kIHtcbiAgICBjb25zdCBwayA9IHRoaXMuY3R4LmN1cnJDbGlDcmVhdG9yUGtnO1xuICAgIGNvbnN0IGZpbGVQYXRoID0gdGhpcy5jdHguY3VyckNsaWVDcmVhdG9yRmlsZTtcbiAgICBpZiAoY21kTmFtZSAmJiBjbWROYW1lICE9PSAnaGVscCcpIHtcbiAgICAgIGlmICh0aGlzLmxvYWRlZENtZE1hcC5oYXMoY21kTmFtZSkpIHtcbiAgICAgICAgaWYgKGZpbGVQYXRoKVxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgQ29uZmxpY3QgY29tbWFuZCBuYW1lIFwiJHtjbWROYW1lfVwiIGZyb20gZXh0ZW5zaW9ucyBcIiR7ZmlsZVBhdGh9XCIgYW5kIFwiJHt0aGlzLmxvYWRlZENtZE1hcC5nZXQoY21kTmFtZSl9XCJgKTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgQ29uZmxpY3Qgd2l0aCBleGlzdGluZyBQbGluayBjb21tYW5kIG5hbWUgJHtjbWROYW1lfWApO1xuICAgICAgfVxuICAgICAgdGhpcy5sb2FkZWRDbWRNYXAuc2V0KGNtZE5hbWUsIGZpbGVQYXRoID8gZmlsZVBhdGggOiAnQHdmaC9wbGluaycpO1xuICAgIH1cblxuICAgIGNvbnN0IHN1YkNtZCA9IG5ldyBQbGlua0NvbW1hbmQodGhpcy5jdHgsIGNtZE5hbWUpO1xuICAgIHN1YkNtZC5uYW1lU3R5bGVyID0gdGhpcy5jdHgubmFtZVN0eWxlcjtcbiAgICBzdWJDbWQucGtnTmFtZSA9IHBrICE9IG51bGwgPyBway5uYW1lIDogJyc7XG4gICAgdGhpcy5zdWJDbWRzLnB1c2goc3ViQ21kKTtcblxuICAgIC8vIHN1YkNtZC5zZXRDb250ZXh0RGF0YSh0aGlzLmN1cnJDbGllQ3JlYXRvckZpbGUsIHRoaXMuY3VyckNsaUNyZWF0b3JQa2csIHRoaXMubWV0YU1hcCwgdGhpcyk7XG5cbiAgICBjb25zdCBtZXRhOiBQYXJ0aWFsPE91ckNvbW1hbmRNZXRhZGF0YT4gPSB7XG4gICAgICBwa2dOYW1lOiBwayA/IHBrLm5hbWUgOiAnQHdmaC9wbGluaycsXG4gICAgICBuYW1lQW5kQXJnczogY21kTmFtZSxcbiAgICAgIG9wdGlvbnM6IFtdLFxuICAgICAgZGVzYzogJydcbiAgICB9O1xuICAgIHRoaXMuY3R4Lm1ldGFNYXAuc2V0KHN1YkNtZCwgbWV0YSk7XG4gICAgdGhpcy5jdHguY3VyckNsaVBrZ01hdGFJbmZvcy5wdXNoKG1ldGEgYXMgT3VyQ29tbWFuZE1ldGFkYXRhKTtcbiAgICBzdWJDbWQuZGVzY3JpcHRpb24obWV0YS5kZXNjISk7XG4gICAgcmV0dXJuIHN1YkNtZDtcbiAgfVxuXG4gIC8vIGRlc2NyaXB0aW9uKHN0cj86IHN0cmluZyxcbiAgLy8gICBhcmdzRGVzY3JpcHRpb24/OiB7IFthcmdOYW1lOiBzdHJpbmddOiBzdHJpbmc7IH0pIHtcbiAgLy8gICBpZiAoc3RyICE9PSB1bmRlZmluZWQpIHtcbiAgLy8gICAgIGlmICh0aGlzLmN0eC5jdXJyQ2xpQ3JlYXRvclBrZylcbiAgLy8gICAgICAgc3RyID0gY2hhbGsuZ3JheShgPCR7dGhpcy5jdHguY3VyckNsaUNyZWF0b3JQa2cubmFtZX0+YCkgKyAnICcgKyBzdHI7XG4gIC8vICAgICBjb25zdCBwbGlua01ldGEgPSB0aGlzLmN0eC5tZXRhTWFwLmdldCh0aGlzKSE7XG4gIC8vICAgICBwbGlua01ldGEuZGVzYyA9IHN0cjtcbiAgLy8gICAgIGlmIChhcmdzRGVzY3JpcHRpb24pIHtcbiAgLy8gICAgICAgcGxpbmtNZXRhLmFyZ0Rlc2MgPSBhcmdzRGVzY3JpcHRpb247XG4gIC8vICAgICB9XG4gIC8vICAgICByZXR1cm4gc3VwZXIuZGVzY3JpcHRpb24oc3RyLCBhcmdzRGVzY3JpcHRpb24pO1xuICAvLyAgIH1cbiAgLy8gICByZXR1cm4gc3VwZXIuZGVzY3JpcHRpb24oKSBhcyBhbnk7XG4gIC8vIH1cblxuICBhbGlhcyhhbGlhcz86IHN0cmluZykge1xuICAgIGlmIChhbGlhcykge1xuICAgICAgY29uc3QgcGxpbmtNZXRhID0gdGhpcy5jdHgubWV0YU1hcC5nZXQodGhpcykhO1xuICAgICAgcGxpbmtNZXRhLmFsaWFzID0gYWxpYXM7XG4gICAgfVxuICAgIHJldHVybiBzdXBlci5hbGlhcyhhbGlhcyBhcyBhbnkpIGFzIGFueTtcbiAgfVxuXG4gIGNyZWF0ZU9wdGlvbihmbGFnczogc3RyaW5nLCBkZXNjcmlwdGlvbj86IHN0cmluZywgLi4ucmVtYWluaW5nOiBhbnlbXSkge1xuICAgIGxldCBkZWZhdWx0VmFsdWU6IGFueTtcbiAgICBpZiAocmVtYWluaW5nLmxlbmd0aCA+IDEpIHtcbiAgICAgIGRlZmF1bHRWYWx1ZSA9IHJlbWFpbmluZ1tyZW1haW5pbmcubGVuZ3RoIC0gMV07XG4gICAgfVxuICAgIGNvbnN0IHBsaW5rTWV0YSA9IHRoaXMuY3R4Lm1ldGFNYXAuZ2V0KHRoaXMpITtcbiAgICBwbGlua01ldGEub3B0aW9ucyEucHVzaCh7XG4gICAgICBmbGFncywgZGVzYzogZGVzY3JpcHRpb24gfHwgJycsIGRlZmF1bHRWYWx1ZSwgaXNSZXF1aXJlZDogZmFsc2VcbiAgICB9KTtcbiAgICBjb25zdCBvcHQgPSBuZXcgUGxpbmtDbWRPcHRpb24oZmxhZ3MsIGRlc2NyaXB0aW9uKTtcbiAgICBvcHQub3B0aW9uU3R5bGVyID0gdGhpcy5vcHRpb25TdHlsZXI7XG4gICAgcmV0dXJuIG9wdDtcbiAgfVxuICBvcHRpb24oLi4uYXJnczogYW55W10pIHtcbiAgICAodGhpcy5fc2F2ZU9wdGlvbnMgYXMgYW55KShmYWxzZSwgLi4uYXJncyk7XG4gICAgcmV0dXJuIChzdXBlci5vcHRpb24gYXMgYW55KSguLi5hcmdzKTtcbiAgfVxuICByZXF1aXJlZE9wdGlvbiguLi5hcmdzOiBhbnlbXSkge1xuICAgICh0aGlzLl9zYXZlT3B0aW9ucyBhcyBhbnkpKHRydWUsIC4uLmFyZ3MpO1xuICAgIHJldHVybiAoc3VwZXIucmVxdWlyZWRPcHRpb24gYXMgYW55KSguLi5hcmdzKTtcbiAgfVxuICBhY3Rpb24oZm46ICguLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCB8IFByb21pc2U8dm9pZD4pIHtcbiAgICBmdW5jdGlvbiBhY3Rpb25DYWxsYmFjaygpIHtcbiAgICAgIGNvbnN0IHtpbml0Q29uZmlnfSA9IHJlcXVpcmUoJy4uL3V0aWxzL2Jvb3RzdHJhcC1wcm9jZXNzJykgYXMgdHlwZW9mIF9ib290c3RyYXA7XG4gICAgICBpZiAoKHRoaXMub3B0cygpIGFzIEdsb2JhbE9wdGlvbnMpLnZlcmJvc2UpIHtcbiAgICAgICAgbG9nNGpzLmNvbmZpZ3VyZSh7XG4gICAgICAgICAgYXBwZW5kZXJzOiB7XG4gICAgICAgICAgICBvdXQ6IHtcbiAgICAgICAgICAgICAgdHlwZTogJ3N0ZG91dCcsXG4gICAgICAgICAgICAgIGxheW91dDoge3R5cGU6ICdwYXR0ZXJuJywgcGF0dGVybjogKHByb2Nlc3Muc2VuZCA/ICcleicgOiAnJykgKyAnJVtbJXBdICVjJV0gLSAlbSd9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICBjYXRlZ29yaWVzOiB7XG4gICAgICAgICAgICBkZWZhdWx0OiB7YXBwZW5kZXJzOiBbJ291dCddLCBsZXZlbDogJ2RlYnVnJ30sXG4gICAgICAgICAgICBwbGluazoge2FwcGVuZGVyczogWydvdXQnXSwgbGV2ZWw6ICdkZWJ1Zyd9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGluaXRDb25maWcodGhpcy5vcHRzKCkgYXMgR2xvYmFsT3B0aW9ucyk7XG4gICAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgcmV0dXJuIHN1cGVyLmFjdGlvbihhY3Rpb25DYWxsYmFjayk7XG4gIH1cbiAgY3JlYXRlSGVscCgpIHtcbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihuZXcgUGxpbmtDb21tYW5kSGVscCgpLCB0aGlzLmNvbmZpZ3VyZUhlbHAoKSk7XG4gIH1cbiAgX3NhdmVPcHRpb25zKGlzUmVxdWlyZWQ6IGJvb2xlYW4sIGZsYWdzOiBzdHJpbmcsIGRlc2M6IHN0cmluZywgLi4ucmVtYWluaW5nOiBhbnlbXSkge1xuICAgIGxldCBkZWZhdWx0VmFsdWU6IGFueTtcbiAgICBpZiAocmVtYWluaW5nLmxlbmd0aCA+IDEpIHtcbiAgICAgIGRlZmF1bHRWYWx1ZSA9IHJlbWFpbmluZ1tyZW1haW5pbmcubGVuZ3RoIC0gMV07XG4gICAgfVxuICAgIGNvbnN0IHBsaW5rTWV0YSA9IHRoaXMuY3R4Lm1ldGFNYXAuZ2V0KHRoaXMpITtcbiAgICBwbGlua01ldGEub3B0aW9ucyEucHVzaCh7XG4gICAgICBmbGFncywgZGVzYywgZGVmYXVsdFZhbHVlLCBpc1JlcXVpcmVkXG4gICAgfSk7XG4gIH1cbn1cblxuY2xhc3MgUGxpbmtDbWRPcHRpb24gZXh0ZW5kcyBjb21tYW5kZXIuT3B0aW9uIHtcbiAgb3B0aW9uU3R5bGVyPzogKGNtZE5hbWU6IHN0cmluZykgPT4gc3RyaW5nO1xufVxuZXhwb3J0IGNsYXNzIENvbW1hbmRPdmVycmlkZXIge1xuICBuYW1lU3R5bGVyOiBQbGlua0NvbW1hbmRbJ25hbWVTdHlsZXInXTtcbiAgcHJpdmF0ZSBjdXJyQ2xpZUNyZWF0b3JGaWxlOiBzdHJpbmc7XG4gIHByaXZhdGUgY3VyckNsaUNyZWF0b3JQa2c6IFBhY2thZ2VJbmZvIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgY3VyckNsaVBrZ01hdGFJbmZvczogT3VyQ29tbWFuZE1ldGFkYXRhW107XG4gIC8vIHByaXZhdGUgYWxsU3ViQ21kczogT3VyQXVnbWVudGVkQ29tbWFuZGVyW10gPSBbXTtcbiAgcHJpdmF0ZSBtZXRhTWFwID0gbmV3IFdlYWtNYXA8Y29tbWFuZGVyLkNvbW1hbmQsIFBhcnRpYWw8T3VyQ29tbWFuZE1ldGFkYXRhPj4oKTtcbiAgcHJpdmF0ZSBwa2dNZXRhc01hcCA9IG5ldyBNYXA8c3RyaW5nLCBPdXJDb21tYW5kTWV0YWRhdGFbXT4oKTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kLCB3cz86IFdvcmtzcGFjZVN0YXRlKSB7XG4gICAgdGhpcy5wcm9ncmFtLmNyZWF0ZUNvbW1hbmQgPSBQbGlua0NvbW1hbmQucHJvdG90eXBlLmNyZWF0ZUNvbW1hbmQ7XG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgKHRoaXMucHJvZ3JhbSBhcyBQbGlua0NvbW1hbmQpLmN0eCA9IHtcbiAgICAgIGdldCBjdXJyQ2xpZUNyZWF0b3JGaWxlKCkge1xuICAgICAgICByZXR1cm4gc2VsZi5jdXJyQ2xpZUNyZWF0b3JGaWxlO1xuICAgICAgfSxcbiAgICAgIGdldCBjdXJyQ2xpQ3JlYXRvclBrZygpIHtcbiAgICAgICAgcmV0dXJuIHNlbGYuY3VyckNsaUNyZWF0b3JQa2c7XG4gICAgICB9LFxuICAgICAgbWV0YU1hcDogc2VsZi5tZXRhTWFwLFxuICAgICAgZ2V0IGN1cnJDbGlQa2dNYXRhSW5mb3MoKTogT3VyQ29tbWFuZE1ldGFkYXRhW10ge1xuICAgICAgICByZXR1cm4gc2VsZi5jdXJyQ2xpUGtnTWF0YUluZm9zO1xuICAgICAgfSxcbiAgICAgIGdldCBuYW1lU3R5bGVyKCkge1xuICAgICAgICByZXR1cm4gc2VsZi5uYW1lU3R5bGVyO1xuICAgICAgfVxuICAgICAgLy8gbG9hZGVkQ21kTWFwOiBzZWxmLmxvYWRlZENtZE1hcFxuICAgIH07XG4gICAgKHRoaXMucHJvZ3JhbSBhcyBQbGlua0NvbW1hbmQpLnN1YkNtZHMgPSBbXTtcbiAgICAodGhpcy5wcm9ncmFtIGFzIFBsaW5rQ29tbWFuZCkubG9hZGVkQ21kTWFwID0gbmV3IE1hcCgpO1xuICAgICh0aGlzLnByb2dyYW0gYXMgUGxpbmtDb21tYW5kKS5hZGRHbG9iYWxPcHRpb25zVG9TdWJDbWRzID0gUGxpbmtDb21tYW5kLnByb3RvdHlwZS5hZGRHbG9iYWxPcHRpb25zVG9TdWJDbWRzO1xuICAgIHRoaXMucHJvZ3JhbS5jcmVhdGVIZWxwID0gUGxpbmtDb21tYW5kLnByb3RvdHlwZS5jcmVhdGVIZWxwO1xuICB9XG5cbiAgZm9yUGFja2FnZShwazogUGFja2FnZUluZm8sIHBrZ0ZpbGVQYXRoOiBzdHJpbmcsIGZ1bmNOYW1lOiBzdHJpbmcpOiB2b2lkO1xuICBmb3JQYWNrYWdlKHBrOiBudWxsLCBjb21tYW5kQ3JlYXRpb246IChwcm9ncmFtOiBjb21tYW5kZXIuQ29tbWFuZCkgPT4gdm9pZCk6IHZvaWQ7XG4gIGZvclBhY2thZ2UocGs6IFBhY2thZ2VJbmZvIHwgbnVsbCxcbiAgICBwa2dGaWxlUGF0aDogc3RyaW5nIHwgKChwcm9ncmFtOiBjb21tYW5kZXIuQ29tbWFuZCkgPT4gdm9pZCksXG4gICAgZnVuY05hbWU/OiBzdHJpbmcpIHtcbiAgICBjb25zdCBjb21tYW5kTWV0YUluZm9zID0gdGhpcy5jdXJyQ2xpUGtnTWF0YUluZm9zID0gW107XG4gICAgdGhpcy5jdXJyQ2xpQ3JlYXRvclBrZyA9IHBrO1xuXG4gICAgbGV0IGZpbGVQYXRoOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcblxuICAgIGlmICh0eXBlb2YgcGtnRmlsZVBhdGggPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHBrZ0ZpbGVQYXRoKHRoaXMucHJvZ3JhbSk7XG4gICAgICB0aGlzLnBrZ01ldGFzTWFwLnNldCgnQHdmaC9wbGluaycsIGNvbW1hbmRNZXRhSW5mb3MpO1xuICAgIH0gZWxzZSBpZiAocGspIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGZpbGVQYXRoID0gcmVxdWlyZS5yZXNvbHZlKHBrLm5hbWUgKyAnLycgKyBwa2dGaWxlUGF0aCk7XG4gICAgICAgIHRoaXMuY3VyckNsaWVDcmVhdG9yRmlsZSA9IGZpbGVQYXRoO1xuICAgICAgICBjb25zdCBzdWJDbWRGYWN0b3J5OiBDbGlFeHRlbnNpb24gPSBmdW5jTmFtZSA/IHJlcXVpcmUoZmlsZVBhdGgpW2Z1bmNOYW1lXSA6XG4gICAgICAgICAgcmVxdWlyZShmaWxlUGF0aCk7XG4gICAgICAgIHN1YkNtZEZhY3RvcnkodGhpcy5wcm9ncmFtKTtcbiAgICAgICAgdGhpcy5wa2dNZXRhc01hcC5zZXQocGsubmFtZSwgY29tbWFuZE1ldGFJbmZvcyk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICBsb2cud2FybihgRmFpbGVkIHRvIGxvYWQgY29tbWFuZCBsaW5lIGV4dGVuc2lvbiBpbiBwYWNrYWdlICR7cGsubmFtZX06IFwiJHtlLm1lc3NhZ2V9XCJgLCBlKTtcbiAgICAgIH0gZmluYWxseSB7XG4gICAgICAgIGZpbGVQYXRoID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5jdXJyQ2xpQ3JlYXRvclBrZyA9IG51bGw7XG4gIH1cblxuICBhcHBlbmRHbG9iYWxPcHRpb25zKHNhdmVUb1N0b3JlOiBib29sZWFuKSB7XG4gICAgKHRoaXMucHJvZ3JhbSBhcyBQbGlua0NvbW1hbmQpLmFkZEdsb2JhbE9wdGlvbnNUb1N1YkNtZHMoKTtcbiAgICAvLyBmb3IgKGNvbnN0IGNtZCBvZiB0aGlzLmFsbFN1YkNtZHMpIHtcbiAgICAvLyAgIHdpdGhHbG9iYWxPcHRpb25zKGNtZCk7XG4gICAgLy8gfVxuICAgIGlmICghc2F2ZVRvU3RvcmUpXG4gICAgICByZXR1cm47XG4gICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiB7XG4gICAgICBmb3IgKGNvbnN0IFtwa2csIG1ldGFzXSBvZiB0aGlzLnBrZ01ldGFzTWFwLmVudHJpZXMoKSkge1xuICAgICAgICBjbGlBY3Rpb25EaXNwYXRjaGVyLmFkZENvbW1hbmRNZXRhKHtwa2csIG1ldGFzfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdpdGhHbG9iYWxPcHRpb25zKGNtZDogY29tbWFuZGVyLkNvbW1hbmQgfCBQbGlua0NvbW1hbmQpOiBjb21tYW5kZXIuQ29tbWFuZCB7XG4gIGlmIChjbWQgaW5zdGFuY2VvZiBQbGlua0NvbW1hbmQpXG4gICAgY21kLm9wdGlvblN0eWxlciA9IHN0ciA9PiBjaGFsay5ncmF5KHN0cik7XG4gIChjbWQub3B0aW9uIGFzIGNvbW1hbmRlci5Db21tYW5kWydvcHRpb24nXSkoJy1jLCAtLWNvbmZpZyA8Y29uZmlnLWZpbGU+JyxcbiAgICAnUmVhZCBjb25maWcgZmlsZXMsIGlmIHRoZXJlIGFyZSBtdWx0aXBsZSBmaWxlcywgdGhlIGxhdHRlciBvbmUgb3ZlcnJpZGVzIHByZXZpb3VzIG9uZScsXG4gICAgKHZhbHVlLCBwcmV2KSA9PiB7XG4gICAgICBwcmV2LnB1c2goLi4udmFsdWUuc3BsaXQoJywnKSk7XG4gICAgICByZXR1cm4gcHJldjtcbiAgICAgIC8vIHJldHVybiBwcmV2LmNvbmNhdCh2YWx1ZS5zcGxpdCgnLCcpKTtcbiAgICB9LCBbXSBhcyBzdHJpbmdbXSk7XG5cbiAgKGNtZC5vcHRpb24gYXMgY29tbWFuZGVyLkNvbW1hbmRbJ29wdGlvbiddKSgnLS1wcm9wIDxleHByZXNzaW9uPicsXG4gICAgJzxwcm9wZXJ0eSBwYXRoPj08dmFsdWUgYXMgSlNPTiB8IGxpdGVyYWw+IC4uLiBkaXJlY3RseSBzZXQgY29uZmlndXJhdGlvbiBwcm9wZXJ0aWVzLCBwcm9wZXJ0eSBuYW1lIGlzIGxvZGFzaC5zZXQoKSBwYXRoLWxpa2Ugc3RyaW5nLiBlLmcuICcgK1xuICAgICctLXByb3AgcG9ydD04MDgwIC0tcHJvcCBkZXZNb2RlPWZhbHNlIC0tcHJvcCBAd2ZoL2Zvb2Jhci5hcGk9aHR0cDovL2xvY2FsaG9zdDo4MDgwICcgK1xuICAgICctLXByb3AgYXJyYXlsaWtlLnByb3BbMF09Zm9vYmFyICcgK1xuICAgICctLXByb3AgW1wiQHdmaC9mb28uYmFyXCIsXCJwcm9wXCIsMF09dHJ1ZScsXG4gICAgYXJyYXlPcHRpb25GbiwgW10gYXMgc3RyaW5nW10pXG4gIC5vcHRpb24oJy0tdmVyYm9zZScsICdTcGVjaWZ5IGxvZyBsZXZlbCBhcyBcImRlYnVnXCInLCBmYWxzZSlcbiAgLm9wdGlvbignLS1kZXYnLCAnQnkgdHVybmluZyBvbiB0aGlzIG9wdGlvbiwnICtcbiAgICAnIFBsaW5rIHNldHRpbmcgcHJvcGVydHkgXCJkZXZNb2RlXCIgd2lsbCBhdXRvbWF0Y2lhbGx5IHNldCB0byBgdHJ1ZWAsJyArXG4gICAgJyBhbmQgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgd2lsbCBhbHNvIGJlaW5nIHVwZGF0ZWQgdG8gXFwnZGV2ZWxvcGVtZW50XFwnIG9yIFxcJ3Byb2R1Y3Rpb24gY29ycmVzcG9uZGluZ2x5LiAnLFxuICAgIGZhbHNlKVxuICAub3B0aW9uKCctLWVudiA8c2V0dGluZyBlbnZpcm9ubWVudD4nLCAnQSBzdHJpbmcgZGVub3RlcyBydW50aW1lIGVudmlyb25tZW50IG5hbWUsIHBhY2thZ2Ugc2V0dGluZyBmaWxlIG1heSByZXR1cm4gZGlmZmVyZW50IHZhbHVlcyBiYXNlZCBvbiBpdHMgdmFsdWUgKGNsaU9wdGlvbnMuZW52KScpO1xuICBpZiAoY21kIGluc3RhbmNlb2YgUGxpbmtDb21tYW5kKVxuICAgIGNtZC5vcHRpb25TdHlsZXIgPSB1bmRlZmluZWQ7XG4gIHJldHVybiBjbWQ7XG59XG4iXX0=