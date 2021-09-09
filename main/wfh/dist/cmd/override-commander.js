"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withGlobalOptions = exports.withCwdOption = exports.CommandOverrider = exports.PlinkCommand = exports.PlinkCommandHelp = exports.commander = void 0;
/* eslint-disable @typescript-eslint/no-unsafe-assignment,  @typescript-eslint/no-unsafe-return */
const commander_1 = __importDefault(require("commander"));
exports.commander = commander_1.default;
const package_mgr_1 = require("../package-mgr");
const chalk_1 = __importDefault(require("chalk"));
const utils_1 = require("./utils");
const cli_slice_1 = require("./cli-slice");
const log4js_1 = __importDefault(require("log4js"));
const strip_ansi_1 = __importDefault(require("strip-ansi"));
const path_1 = __importDefault(require("path"));
const misc_1 = require("../utils/misc");
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
                // Support colorful characters
                const fullText = `${term}${' '.repeat(realTermWidth + itemIndentWidth - (0, strip_ansi_1.default)(term).length)}${description}`;
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
    return cmd.option('--space,--cwd <working dir>', 'Run command in a different worktree directory: [' +
        [...(0, package_mgr_1.getState)().workspaces.keys()].join(', ') + ']');
}
exports.withCwdOption = withCwdOption;
function withGlobalOptions(cmd) {
    if ((0, package_mgr_1.getState)().workspaces == null)
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcnJpZGUtY29tbWFuZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL292ZXJyaWRlLWNvbW1hbmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxrR0FBa0c7QUFDbEcsMERBQWtDO0FBVzFCLG9CQVhELG1CQUFTLENBV0M7QUFWakIsZ0RBQXFFO0FBQ3JFLGtEQUEwQjtBQUMxQixtQ0FBc0M7QUFHdEMsMkNBQWdEO0FBQ2hELG9EQUE0QjtBQUM1Qiw0REFBbUM7QUFDbkMsZ0RBQXdCO0FBQ3hCLHdDQUF1QztBQUd2QyxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0FBVXpELE1BQWEsZ0JBQWlCLFNBQVEsbUJBQVMsQ0FBQyxJQUFJO0lBQ2xELGNBQWMsQ0FBQyxHQUFzQjtRQUNuQyxNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3RDLElBQUksR0FBRyxZQUFZLFlBQVksSUFBSSxHQUFHLENBQUMsVUFBVSxFQUFFO1lBQ2pELE9BQU8sR0FBRyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUM1QjtRQUNELE9BQU8sR0FBRyxDQUFDO0lBQ2IsQ0FBQztJQUVELFVBQVUsQ0FBQyxNQUFzQjtRQUMvQixPQUFPLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO0lBQ2hGLENBQUM7SUFFRCxrQ0FBa0MsQ0FBQyxHQUFzQixFQUFFLE1BQXdCO1FBQ2pGLE9BQU8sTUFBTSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLEVBQUU7WUFDekQsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEdB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QUFDLDZCQUE2QixFQUFFLGlJQUFpSSxDQUFDLENBQUM7SUFDMUssSUFBSSxHQUFHLFlBQVksWUFBWTtRQUM3QixHQUFHLENBQUMsWUFBWSxHQUFHLFNBQVMsQ0FBQztJQUMvQixPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUM7QUE5QkQsOENBOEJDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50LCAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1yZXR1cm4gKi9cbmltcG9ydCBjb21tYW5kZXIgZnJvbSAnY29tbWFuZGVyJztcbmltcG9ydCB7V29ya3NwYWNlU3RhdGUsIFBhY2thZ2VJbmZvLCBnZXRTdGF0ZX0gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB7YXJyYXlPcHRpb25Gbn0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgKiBhcyBfYm9vdHN0cmFwIGZyb20gJy4uL3V0aWxzL2Jvb3RzdHJhcC1wcm9jZXNzJztcbmltcG9ydCB7IEdsb2JhbE9wdGlvbnMsIE91ckNvbW1hbmRNZXRhZGF0YSB9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtjbGlBY3Rpb25EaXNwYXRjaGVyfSBmcm9tICcuL2NsaS1zbGljZSc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgc3RyaXBBbnNpIGZyb20gJ3N0cmlwLWFuc2knO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge3BsaW5rRW52fSBmcm9tICcuLi91dGlscy9taXNjJztcbmV4cG9ydCB7Y29tbWFuZGVyfTtcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsub3ZlcnJpZGUtY29tbWFuZGVyJyk7XG5cbmludGVyZmFjZSBDb21tYW5kQ29udGV4dCB7XG4gIGN1cnJDbGllQ3JlYXRvckZpbGU6IHN0cmluZztcbiAgY3VyckNsaUNyZWF0b3JQa2c6IFBhY2thZ2VJbmZvIHwgbnVsbDtcbiAgbWV0YU1hcDogV2Vha01hcDxQbGlua0NvbW1hbmQsIFBhcnRpYWw8T3VyQ29tbWFuZE1ldGFkYXRhPj47XG4gIGN1cnJDbGlQa2dNYXRhSW5mb3M6IE91ckNvbW1hbmRNZXRhZGF0YVtdO1xuICBuYW1lU3R5bGVyPzogKGNtZE5hbWU6IHN0cmluZykgPT4gc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgUGxpbmtDb21tYW5kSGVscCBleHRlbmRzIGNvbW1hbmRlci5IZWxwIHtcbiAgc3ViY29tbWFuZFRlcm0oY21kOiBjb21tYW5kZXIuQ29tbWFuZCk6IHN0cmluZyB7XG4gICAgY29uc3Qgc3RyID0gc3VwZXIuc3ViY29tbWFuZFRlcm0oY21kKTtcbiAgICBpZiAoY21kIGluc3RhbmNlb2YgUGxpbmtDb21tYW5kICYmIGNtZC5uYW1lU3R5bGVyKSB7XG4gICAgICByZXR1cm4gY21kLm5hbWVTdHlsZXIoc3RyKTtcbiAgICB9XG4gICAgcmV0dXJuIHN0cjtcbiAgfVxuXG4gIG9wdGlvblRlcm0ob3B0aW9uOiBQbGlua0NtZE9wdGlvbikge1xuICAgIHJldHVybiBvcHRpb24ub3B0aW9uU3R5bGVyID8gb3B0aW9uLm9wdGlvblN0eWxlcihvcHRpb24uZmxhZ3MpIDogb3B0aW9uLmZsYWdzO1xuICB9XG5cbiAgbG9uZ2VzdFN1YmNvbW1hbmRUZXJtTGVuZ3RoRm9yUmVhbChjbWQ6IGNvbW1hbmRlci5Db21tYW5kLCBoZWxwZXI6IFBsaW5rQ29tbWFuZEhlbHApIHtcbiAgICByZXR1cm4gaGVscGVyLnZpc2libGVDb21tYW5kcyhjbWQpLnJlZHVjZSgobWF4LCBjb21tYW5kKSA9PiB7XG4gICAgICByZXR1cm4gTWF0aC5tYXgobWF4LCBzdHJpcEFuc2koaGVscGVyLnN1YmNvbW1hbmRUZXJtKGNvbW1hbmQpKS5sZW5ndGgpO1xuICAgIH0sIDApO1xuICB9XG5cbiAgbG9uZ2VzdE9wdGlvblRlcm1MZW5ndGhGb3JSZWFsKGNtZDogY29tbWFuZGVyLkNvbW1hbmQsIGhlbHBlcjogUGxpbmtDb21tYW5kSGVscCkge1xuICAgIHJldHVybiBoZWxwZXIudmlzaWJsZU9wdGlvbnMoY21kKS5yZWR1Y2UoKG1heCwgb3B0aW9uKSA9PiB7XG4gICAgICByZXR1cm4gTWF0aC5tYXgobWF4LCBzdHJpcEFuc2koaGVscGVyLm9wdGlvblRlcm0ob3B0aW9uKSkubGVuZ3RoKTtcbiAgICB9LCAwKTtcbiAgfVxuXG4gIC8vIHN1YmNvbW1hbmREZXNjcmlwdGlvbihjbWQ6IGNvbW1hbmRlci5Db21tYW5kKSB7XG4gIC8vICAgcmV0dXJuIHN0cmlwQW5zaShzdXBlci5zdWJjb21tYW5kRGVzY3JpcHRpb24oY21kKSk7XG4gIC8vIH1cblxuICByZWFsUGFkV2lkdGgoY21kOiBjb21tYW5kZXIuQ29tbWFuZCwgaGVscGVyOiBQbGlua0NvbW1hbmRIZWxwKSB7XG4gICAgcmV0dXJuIE1hdGgubWF4KFxuICAgICAgaGVscGVyLmxvbmdlc3RPcHRpb25UZXJtTGVuZ3RoRm9yUmVhbChjbWQsIGhlbHBlciksXG4gICAgICBoZWxwZXIubG9uZ2VzdFN1YmNvbW1hbmRUZXJtTGVuZ3RoRm9yUmVhbChjbWQsIGhlbHBlciksXG4gICAgICBoZWxwZXIubG9uZ2VzdEFyZ3VtZW50VGVybUxlbmd0aChjbWQsIGhlbHBlcilcbiAgICApO1xuICB9XG5cbiAgZm9ybWF0SGVscChjbWQ6IGNvbW1hbmRlci5Db21tYW5kLCBoZWxwZXI6IFBsaW5rQ29tbWFuZEhlbHApIHtcbiAgICAvLyBjb25zdCB0ZXJtV2lkdGggPSBoZWxwZXIucGFkV2lkdGgoY21kLCBoZWxwZXIpOyAvLyBJdCBpcyBiaWdnZXIgdGhhbiBhY3R1YWwgd2lkdGggZHVlIHRvIGNvbG9yZnVsIGNoYXJhY3RlclxuICAgIGNvbnN0IHJlYWxUZXJtV2lkdGggPSBoZWxwZXIucmVhbFBhZFdpZHRoKGNtZCwgaGVscGVyKTtcbiAgICAvLyBjb25zb2xlLmxvZygndGVybVdpZHRoPScsIHRlcm1XaWR0aCk7XG4gICAgY29uc3QgaGVscFdpZHRoID0gaGVscGVyLmhlbHBXaWR0aCB8fCA4MDtcbiAgICBjb25zdCBpdGVtSW5kZW50V2lkdGggPSAyO1xuICAgIGNvbnN0IGl0ZW1TZXBhcmF0b3JXaWR0aCA9IDI7IC8vIGJldHdlZW4gdGVybSBhbmQgZGVzY3JpcHRpb25cbiAgICBmdW5jdGlvbiBmb3JtYXRJdGVtKHRlcm06IHN0cmluZywgZGVzY3JpcHRpb246IHN0cmluZywgc3R5bGVyPzogUGxpbmtDb21tYW5kWyduYW1lU3R5bGVyJ10pIHtcbiAgICAgIGlmIChkZXNjcmlwdGlvbikge1xuICAgICAgICAvLyBTdXBwb3J0IGNvbG9yZnVsIGNoYXJhY3RlcnNcbiAgICAgICAgY29uc3QgZnVsbFRleHQgPSBgJHt0ZXJtfSR7JyAnLnJlcGVhdChyZWFsVGVybVdpZHRoICsgaXRlbUluZGVudFdpZHRoIC0gc3RyaXBBbnNpKHRlcm0pLmxlbmd0aCl9JHtkZXNjcmlwdGlvbn1gO1xuICAgICAgICByZXR1cm4gaGVscGVyLndyYXAoZnVsbFRleHQsIGhlbHBXaWR0aCAtIGl0ZW1JbmRlbnRXaWR0aCwgcmVhbFRlcm1XaWR0aCArIGl0ZW1TZXBhcmF0b3JXaWR0aCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGVybTtcbiAgICB9XG4gICAgZnVuY3Rpb24gZm9ybWF0TGlzdCh0ZXh0QXJyYXk6IHN0cmluZ1tdKSB7XG4gICAgICByZXR1cm4gdGV4dEFycmF5LmpvaW4oJ1xcbicpLnJlcGxhY2UoL14vZ20sICcgJy5yZXBlYXQoaXRlbUluZGVudFdpZHRoKSk7XG4gICAgfVxuXG4gICAgLy8gVXNhZ2VcbiAgICBjb25zdCBvdXRwdXQgPSBbYFVzYWdlOiAke2hlbHBlci5jb21tYW5kVXNhZ2UoY21kKX1gLCAnJ107XG5cbiAgICAvLyBEZXNjcmlwdGlvblxuICAgIGNvbnN0IGNvbW1hbmREZXNjcmlwdGlvbiA9IGhlbHBlci5jb21tYW5kRGVzY3JpcHRpb24oY21kKTtcbiAgICBpZiAoY29tbWFuZERlc2NyaXB0aW9uLmxlbmd0aCA+IDApIHtcbiAgICAgIG91dHB1dC5wdXNoKGNvbW1hbmREZXNjcmlwdGlvbiwgJycpO1xuICAgIH1cblxuICAgIC8vIEFyZ3VtZW50c1xuICAgIGNvbnN0IGFyZ3VtZW50TGlzdCA9IGhlbHBlci52aXNpYmxlQXJndW1lbnRzKGNtZCkubWFwKChhcmd1bWVudCkgPT4ge1xuICAgICAgcmV0dXJuIGZvcm1hdEl0ZW0oYXJndW1lbnQudGVybSwgYXJndW1lbnQuZGVzY3JpcHRpb24pO1xuICAgIH0pO1xuICAgIGlmIChhcmd1bWVudExpc3QubGVuZ3RoID4gMCkge1xuICAgICAgb3V0cHV0LnB1c2goJ0FyZ3VtZW50czonLCBmb3JtYXRMaXN0KGFyZ3VtZW50TGlzdCksICcnKTtcbiAgICB9XG5cbiAgICAvLyBPcHRpb25zXG4gICAgY29uc3Qgb3B0aW9uTGlzdCA9IGhlbHBlci52aXNpYmxlT3B0aW9ucyhjbWQpLm1hcCgob3B0aW9uKSA9PiB7XG4gICAgICByZXR1cm4gZm9ybWF0SXRlbShoZWxwZXIub3B0aW9uVGVybShvcHRpb24pLCBoZWxwZXIub3B0aW9uRGVzY3JpcHRpb24ob3B0aW9uKSxcbiAgICAgICAgKG9wdGlvbiBhcyBQbGlua0NtZE9wdGlvbikub3B0aW9uU3R5bGVyKTtcbiAgICB9KTtcbiAgICBpZiAob3B0aW9uTGlzdC5sZW5ndGggPiAwKSB7XG4gICAgICBvdXRwdXQucHVzaCgnT3B0aW9uczonLCBmb3JtYXRMaXN0KG9wdGlvbkxpc3QpLCAnJyk7XG4gICAgfVxuXG4gICAgLy8gQ29tbWFuZHNcbiAgICBsZXQgcGtnTmFtZSA9ICcnO1xuICAgIGNvbnN0IGNvbW1hbmRMaXN0ID0gaGVscGVyLnZpc2libGVDb21tYW5kcyhjbWQpLm1hcCgoY21kKSA9PiB7XG4gICAgICBsZXQgaGVhZGVyID0gJyc7XG4gICAgICBpZiAocGtnTmFtZSAhPT0gKGNtZCBhcyBQbGlua0NvbW1hbmQpLnBrZ05hbWUpIHtcbiAgICAgICAgcGtnTmFtZSA9IChjbWQgYXMgUGxpbmtDb21tYW5kKS5wa2dOYW1lO1xuICAgICAgICBoZWFkZXIgPSBwa2dOYW1lID8gYFxcbiR7Y2hhbGsuaW52ZXJzZShjaGFsay5ncmF5KCdQcm92aWRlZCBieSBwYWNrYWdlICcgKyBwa2dOYW1lICsgJzogJykpfVxcbmAgOlxuICAgICAgICAgICdcXG4nO1xuICAgICAgfVxuICAgICAgcGtnTmFtZSA9IChjbWQgYXMgUGxpbmtDb21tYW5kKS5wa2dOYW1lO1xuICAgICAgcmV0dXJuIGhlYWRlciArIGZvcm1hdEl0ZW0oaGVscGVyLnN1YmNvbW1hbmRUZXJtKGNtZCksIGhlbHBlci5zdWJjb21tYW5kRGVzY3JpcHRpb24oY21kKSxcbiAgICAgICAgKGNtZCBhcyBQbGlua0NvbW1hbmQpLm5hbWVTdHlsZXIpO1xuICAgIH0pO1xuICAgIGlmIChjb21tYW5kTGlzdC5sZW5ndGggPiAwKSB7XG4gICAgICBvdXRwdXQucHVzaCgnQ29tbWFuZHM6JywgZm9ybWF0TGlzdChjb21tYW5kTGlzdCksICcnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gb3V0cHV0LmpvaW4oJ1xcbicpO1xuICB9XG5cbiAgLy8gd3JhcChzdHI6IHN0cmluZywgd2lkdGg6IG51bWJlciwgaW5kZW50OiBudW1iZXIsIG1pbkNvbHVtbldpZHRoID0gNDApIHtcbiAgLy8gICAvLyBEZXRlY3QgbWFudWFsbHkgd3JhcHBlZCBhbmQgaW5kZW50ZWQgc3RyaW5ncyBieSBzZWFyY2hpbmcgZm9yIGxpbmUgYnJlYWtzXG4gIC8vICAgLy8gZm9sbG93ZWQgYnkgbXVsdGlwbGUgc3BhY2VzL3RhYnMuXG4gIC8vICAgaWYgKHN0ci5tYXRjaCgvW1xcbl1cXHMrLykpIHJldHVybiBzdHI7XG4gIC8vICAgLy8gRG8gbm90IHdyYXAgaWYgbm90IGVub3VnaCByb29tIGZvciBhIHdyYXBwZWQgY29sdW1uIG9mIHRleHQgKGFzIGNvdWxkIGVuZCB1cCB3aXRoIGEgd29yZCBwZXIgbGluZSkuXG4gIC8vICAgY29uc3QgY29sdW1uV2lkdGggPSB3aWR0aCAtIGluZGVudDtcbiAgLy8gICBpZiAoY29sdW1uV2lkdGggPCBtaW5Db2x1bW5XaWR0aCkgcmV0dXJuIHN0cjtcblxuICAvLyAgIGNvbnN0IGxlYWRpbmdTdHIgPSBzdHIuc3Vic3RyKDAsIGluZGVudCk7XG4gIC8vICAgY29uc3QgY29sdW1uVGV4dCA9IHN0ci5zdWJzdHIoaW5kZW50KTtcblxuICAvLyAgIGNvbnN0IGluZGVudFN0cmluZyA9ICcgJy5yZXBlYXQoaW5kZW50KTtcbiAgLy8gICBjb25zdCByZWdleCA9IG5ldyBSZWdFeHAoJy57MSwnICsgKGNvbHVtbldpZHRoIC0gMSkgKyAnfShbXFxcXHNcXHUyMDBCXXwkKXxbXlxcXFxzXFx1MjAwQl0rPyhbXFxcXHNcXHUyMDBCXXwkKScsICdnJyk7XG5cbiAgLy8gICBjb25zdCBsaW5lcyA9IGNvbHVtblRleHQubWF0Y2gocmVnZXgpIHx8IFtdO1xuICAvLyAgIHJldHVybiBsZWFkaW5nU3RyICsgbGluZXMubWFwKChsaW5lLCBpKSA9PiB7XG4gIC8vICAgICBpZiAobGluZS5zbGljZSgtMSkgPT09ICdcXG4nKSB7XG4gIC8vICAgICAgIGxpbmUgPSBsaW5lLnNsaWNlKDAsIGxpbmUubGVuZ3RoIC0gMSk7XG4gIC8vICAgICB9XG4gIC8vICAgICByZXR1cm4gKChpID4gMCkgPyBpbmRlbnRTdHJpbmcgOiAnJykgKyBsaW5lLnRyaW1SaWdodCgpO1xuICAvLyAgIH0pLmpvaW4oJ1xcbicpO1xuICAvLyB9XG59XG4vKipcbiAqIEV4dGVuZCBjb21tYW5kZXIsIGNoZWNrIGNvbW1hbmRlciBBUEkgYXQgaHR0cHM6Ly93d3cubnBtanMuY29tL3BhY2thZ2UvY29tbWFuZGVyXG4gKi9cbmV4cG9ydCBjbGFzcyBQbGlua0NvbW1hbmQgZXh0ZW5kcyBjb21tYW5kZXIuQ29tbWFuZCB7XG4gIG5hbWVTdHlsZXI/OiAoY21kTmFtZTogc3RyaW5nKSA9PiBzdHJpbmc7XG4gIG9wdGlvblN0eWxlcj86IChjbWROYW1lOiBzdHJpbmcpID0+IHN0cmluZztcbiAgc3ViQ21kczogUGxpbmtDb21tYW5kW10gPSBbXTtcbiAgLyoqIHZhbHVlIGlzIGZpbGUgcGF0aCBmb3IgcGtnIG5hbWUgKi9cbiAgbG9hZGVkQ21kTWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgcGtnTmFtZSA9ICcnO1xuXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBjdHg6IENvbW1hbmRDb250ZXh0LCBuYW1lPzogc3RyaW5nKSB7XG4gICAgc3VwZXIobmFtZSk7XG4gIH1cblxuICBhZGRHbG9iYWxPcHRpb25zVG9TdWJDbWRzKCkge1xuICAgIGlmICh0aGlzLnN1YkNtZHMgPT0gbnVsbClcbiAgICAgIHJldHVybjtcbiAgICBmb3IgKGNvbnN0IHN1YkNtZCBvZiB0aGlzLnN1YkNtZHMpIHtcbiAgICAgIHdpdGhHbG9iYWxPcHRpb25zKHN1YkNtZCk7XG4gICAgfVxuICB9XG5cbiAgY3JlYXRlQ29tbWFuZChjbWROYW1lPzogc3RyaW5nKTogY29tbWFuZGVyLkNvbW1hbmQge1xuICAgIGNvbnN0IHBrID0gdGhpcy5jdHguY3VyckNsaUNyZWF0b3JQa2c7XG4gICAgY29uc3QgZmlsZVBhdGggPSB0aGlzLmN0eC5jdXJyQ2xpZUNyZWF0b3JGaWxlO1xuICAgIGlmIChjbWROYW1lICYmIGNtZE5hbWUgIT09ICdoZWxwJykge1xuICAgICAgaWYgKHRoaXMubG9hZGVkQ21kTWFwLmhhcyhjbWROYW1lKSkge1xuICAgICAgICBpZiAoZmlsZVBhdGgpXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb25mbGljdCBjb21tYW5kIG5hbWUgXCIke2NtZE5hbWV9XCIgZnJvbSBleHRlbnNpb25zIFwiJHtmaWxlUGF0aH1cIiBhbmQgXCIke3RoaXMubG9hZGVkQ21kTWFwLmdldChjbWROYW1lKSF9XCJgKTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgQ29uZmxpY3Qgd2l0aCBleGlzdGluZyBQbGluayBjb21tYW5kIG5hbWUgJHtjbWROYW1lfWApO1xuICAgICAgfVxuICAgICAgdGhpcy5sb2FkZWRDbWRNYXAuc2V0KGNtZE5hbWUsIGZpbGVQYXRoID8gZmlsZVBhdGggOiAnQHdmaC9wbGluaycpO1xuICAgIH1cblxuICAgIGNvbnN0IHN1YkNtZCA9IG5ldyBQbGlua0NvbW1hbmQodGhpcy5jdHgsIGNtZE5hbWUpO1xuICAgIHN1YkNtZC5uYW1lU3R5bGVyID0gdGhpcy5jdHgubmFtZVN0eWxlcjtcbiAgICBzdWJDbWQucGtnTmFtZSA9IHBrICE9IG51bGwgPyBway5uYW1lIDogJyc7XG4gICAgdGhpcy5zdWJDbWRzLnB1c2goc3ViQ21kKTtcblxuICAgIC8vIHN1YkNtZC5zZXRDb250ZXh0RGF0YSh0aGlzLmN1cnJDbGllQ3JlYXRvckZpbGUsIHRoaXMuY3VyckNsaUNyZWF0b3JQa2csIHRoaXMubWV0YU1hcCwgdGhpcyk7XG5cbiAgICBjb25zdCBtZXRhOiBQYXJ0aWFsPE91ckNvbW1hbmRNZXRhZGF0YT4gPSB7XG4gICAgICBwa2dOYW1lOiBwayA/IHBrLm5hbWUgOiAnQHdmaC9wbGluaycsXG4gICAgICBuYW1lOiBjbWROYW1lLFxuICAgICAgb3B0aW9uczogW10sXG4gICAgICBkZXNjOiAnJ1xuICAgIH07XG4gICAgdGhpcy5jdHgubWV0YU1hcC5zZXQoc3ViQ21kLCBtZXRhKTtcbiAgICB0aGlzLmN0eC5jdXJyQ2xpUGtnTWF0YUluZm9zLnB1c2gobWV0YSBhcyBPdXJDb21tYW5kTWV0YWRhdGEpO1xuICAgIC8vIHN1YkNtZC5kZXNjcmlwdGlvbihtZXRhLmRlc2MhKTtcbiAgICByZXR1cm4gc3ViQ21kO1xuICB9XG5cbiAgZGVzY3JpcHRpb24oc3RyPzogc3RyaW5nLFxuICAgIGFyZ3NEZXNjcmlwdGlvbj86IHsgW2FyZ05hbWU6IHN0cmluZ106IHN0cmluZzsgfSkge1xuICAgIGlmIChzdHIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgY29uc3QgcGxpbmtNZXRhID0gdGhpcy5jdHgubWV0YU1hcC5nZXQodGhpcykhO1xuICAgICAgcGxpbmtNZXRhLmRlc2MgPSBzdHI7XG4gICAgICBpZiAoYXJnc0Rlc2NyaXB0aW9uKSB7XG4gICAgICAgIHBsaW5rTWV0YS5hcmdEZXNjID0gYXJnc0Rlc2NyaXB0aW9uO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHN1cGVyLmRlc2NyaXB0aW9uKHN0ciwgYXJnc0Rlc2NyaXB0aW9uKTtcbiAgICB9XG4gICAgcmV0dXJuIHN1cGVyLmRlc2NyaXB0aW9uKCkgYXMgYW55O1xuICB9XG5cbiAgYWxpYXMoYWxpYXM/OiBzdHJpbmcpIHtcbiAgICBpZiAoYWxpYXMpIHtcbiAgICAgIGNvbnN0IHBsaW5rTWV0YSA9IHRoaXMuY3R4Lm1ldGFNYXAuZ2V0KHRoaXMpITtcbiAgICAgIHBsaW5rTWV0YS5hbGlhcyA9IGFsaWFzO1xuICAgIH1cbiAgICByZXR1cm4gc3VwZXIuYWxpYXMoYWxpYXMgYXMgYW55KSBhcyBhbnk7XG4gIH1cblxuICBjcmVhdGVPcHRpb24oZmxhZ3M6IHN0cmluZywgZGVzY3JpcHRpb24/OiBzdHJpbmcsIC4uLnJlbWFpbmluZzogYW55W10pIHtcbiAgICBsZXQgZGVmYXVsdFZhbHVlOiBhbnk7XG4gICAgaWYgKHJlbWFpbmluZy5sZW5ndGggPiAxKSB7XG4gICAgICBkZWZhdWx0VmFsdWUgPSByZW1haW5pbmdbcmVtYWluaW5nLmxlbmd0aCAtIDFdO1xuICAgIH1cbiAgICBjb25zdCBwbGlua01ldGEgPSB0aGlzLmN0eC5tZXRhTWFwLmdldCh0aGlzKSE7XG4gICAgcGxpbmtNZXRhLm9wdGlvbnMhLnB1c2goe1xuICAgICAgZmxhZ3MsIGRlc2M6IGRlc2NyaXB0aW9uIHx8ICcnLCBkZWZhdWx0VmFsdWUsIGlzUmVxdWlyZWQ6IGZhbHNlXG4gICAgfSk7XG4gICAgY29uc3Qgb3B0ID0gbmV3IFBsaW5rQ21kT3B0aW9uKGZsYWdzLCBkZXNjcmlwdGlvbik7XG4gICAgb3B0Lm9wdGlvblN0eWxlciA9IHRoaXMub3B0aW9uU3R5bGVyO1xuICAgIHJldHVybiBvcHQ7XG4gIH1cbiAgb3B0aW9uKC4uLmFyZ3M6IGFueVtdKSB7XG4gICAgKHRoaXMuX3NhdmVPcHRpb25zIGFzIGFueSkoZmFsc2UsIC4uLmFyZ3MpO1xuICAgIHJldHVybiAoc3VwZXIub3B0aW9uIGFzIGFueSkoLi4uYXJncyk7XG4gIH1cbiAgcmVxdWlyZWRPcHRpb24oLi4uYXJnczogYW55W10pIHtcbiAgICAodGhpcy5fc2F2ZU9wdGlvbnMgYXMgYW55KSh0cnVlLCAuLi5hcmdzKTtcbiAgICByZXR1cm4gKHN1cGVyLnJlcXVpcmVkT3B0aW9uIGFzIGFueSkoLi4uYXJncyk7XG4gIH1cbiAgYWN0aW9uKGZuOiAoLi4uYXJnczogYW55W10pID0+IHZvaWQgfCBQcm9taXNlPHZvaWQ+KSB7XG4gICAgZnVuY3Rpb24gYWN0aW9uQ2FsbGJhY2sodGhpczogY29tbWFuZGVyLkNvbW1hbmQpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHtpbml0Q29uZmlnfSA9IHJlcXVpcmUoJy4uL3V0aWxzL2Jvb3RzdHJhcC1wcm9jZXNzJykgYXMgdHlwZW9mIF9ib290c3RyYXA7XG4gICAgICAgIGluaXRDb25maWcodGhpcy5vcHRzKCkgYXMgR2xvYmFsT3B0aW9ucyk7XG4gICAgICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBsb2cuZXJyb3IoZSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzdXBlci5hY3Rpb24oYWN0aW9uQ2FsbGJhY2spO1xuICB9XG4gIGNyZWF0ZUhlbHAoKSB7XG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24obmV3IFBsaW5rQ29tbWFuZEhlbHAoKSwgdGhpcy5jb25maWd1cmVIZWxwKCkpO1xuICB9XG4gIF9zYXZlT3B0aW9ucyhpc1JlcXVpcmVkOiBib29sZWFuLCBmbGFnczogc3RyaW5nLCBkZXNjOiBzdHJpbmcsIC4uLnJlbWFpbmluZzogYW55W10pIHtcbiAgICBsZXQgZGVmYXVsdFZhbHVlOiBhbnk7XG4gICAgaWYgKHJlbWFpbmluZy5sZW5ndGggPiAxKSB7XG4gICAgICBkZWZhdWx0VmFsdWUgPSByZW1haW5pbmdbcmVtYWluaW5nLmxlbmd0aCAtIDFdO1xuICAgIH1cbiAgICBjb25zdCBwbGlua01ldGEgPSB0aGlzLmN0eC5tZXRhTWFwLmdldCh0aGlzKSE7XG4gICAgcGxpbmtNZXRhLm9wdGlvbnMhLnB1c2goe1xuICAgICAgZmxhZ3MsIGRlc2MsIGRlZmF1bHRWYWx1ZSwgaXNSZXF1aXJlZFxuICAgIH0pO1xuICB9XG59XG5cbmV4cG9ydCB0eXBlIENsaUV4dGVuc2lvbiA9IChwcm9ncmFtOiBQbGlua0NvbW1hbmQpID0+IHZvaWQ7XG5cbmNsYXNzIFBsaW5rQ21kT3B0aW9uIGV4dGVuZHMgY29tbWFuZGVyLk9wdGlvbiB7XG4gIG9wdGlvblN0eWxlcj86IChjbWROYW1lOiBzdHJpbmcpID0+IHN0cmluZztcbn1cbmV4cG9ydCBjbGFzcyBDb21tYW5kT3ZlcnJpZGVyIHtcbiAgLy8gbmFtZVN0eWxlcjogUGxpbmtDb21tYW5kWyduYW1lU3R5bGVyJ107XG4gIC8vIHByaXZhdGUgY3VyckNsaWVDcmVhdG9yRmlsZTogc3RyaW5nO1xuICAvLyBwcml2YXRlIGN1cnJDbGlDcmVhdG9yUGtnOiBQYWNrYWdlSW5mbyB8IG51bGwgPSBudWxsO1xuICAvLyBwcml2YXRlIGN1cnJDbGlQa2dNYXRhSW5mb3M6IE91ckNvbW1hbmRNZXRhZGF0YVtdO1xuICAvLyBwcml2YXRlIGFsbFN1YkNtZHM6IE91ckF1Z21lbnRlZENvbW1hbmRlcltdID0gW107XG4gIC8vIHByaXZhdGUgbWV0YU1hcCA9IG5ldyBXZWFrTWFwPGNvbW1hbmRlci5Db21tYW5kLCBQYXJ0aWFsPE91ckNvbW1hbmRNZXRhZGF0YT4+KCk7XG4gIHByaXZhdGUgcGtnTWV0YXNNYXAgPSBuZXcgTWFwPHN0cmluZywgT3VyQ29tbWFuZE1ldGFkYXRhW10+KCk7XG4gIHByaXZhdGUgY3R4OiBQYXJ0aWFsPENvbW1hbmRDb250ZXh0PiA9IHtcbiAgICBtZXRhTWFwOiBuZXcgV2Vha01hcDxjb21tYW5kZXIuQ29tbWFuZCwgUGFydGlhbDxPdXJDb21tYW5kTWV0YWRhdGE+PigpXG4gIH07XG5cbiAgc2V0IG5hbWVTdHlsZXIodjogUGxpbmtDb21tYW5kWyduYW1lU3R5bGVyJ10pIHtcbiAgICB0aGlzLmN0eC5uYW1lU3R5bGVyID0gdjtcbiAgfVxuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcHJvZ3JhbTogY29tbWFuZGVyLkNvbW1hbmQsIHdzPzogV29ya3NwYWNlU3RhdGUpIHtcbiAgICB0aGlzLnByb2dyYW0uY3JlYXRlQ29tbWFuZCA9IFBsaW5rQ29tbWFuZC5wcm90b3R5cGUuY3JlYXRlQ29tbWFuZDtcblxuICAgICh0aGlzLnByb2dyYW0gYXMgUGxpbmtDb21tYW5kKS5jdHggPSB0aGlzLmN0eCBhcyBDb21tYW5kQ29udGV4dDtcbiAgICAodGhpcy5wcm9ncmFtIGFzIFBsaW5rQ29tbWFuZCkuc3ViQ21kcyA9IFtdO1xuICAgICh0aGlzLnByb2dyYW0gYXMgUGxpbmtDb21tYW5kKS5sb2FkZWRDbWRNYXAgPSBuZXcgTWFwKCk7XG4gICAgKHRoaXMucHJvZ3JhbSBhcyBQbGlua0NvbW1hbmQpLmFkZEdsb2JhbE9wdGlvbnNUb1N1YkNtZHMgPSBQbGlua0NvbW1hbmQucHJvdG90eXBlLmFkZEdsb2JhbE9wdGlvbnNUb1N1YkNtZHM7XG4gICAgdGhpcy5wcm9ncmFtLmNyZWF0ZUhlbHAgPSBQbGlua0NvbW1hbmQucHJvdG90eXBlLmNyZWF0ZUhlbHA7XG4gIH1cblxuICBmb3JQYWNrYWdlKHBrOiBQYWNrYWdlSW5mbywgcGtnRmlsZVBhdGg6IHN0cmluZywgZnVuY05hbWU6IHN0cmluZyk6IHZvaWQ7XG4gIGZvclBhY2thZ2UocGs6IG51bGwsIGNvbW1hbmRDcmVhdGlvbjogKHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kKSA9PiB2b2lkKTogdm9pZDtcbiAgZm9yUGFja2FnZShwazogUGFja2FnZUluZm8gfCBudWxsLFxuICAgIHBrZ0ZpbGVQYXRoOiBzdHJpbmcgfCAoKHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kKSA9PiB2b2lkKSxcbiAgICBmdW5jTmFtZT86IHN0cmluZykge1xuICAgIGNvbnN0IGNvbW1hbmRNZXRhSW5mb3M6IE91ckNvbW1hbmRNZXRhZGF0YVtdID0gdGhpcy5jdHguY3VyckNsaVBrZ01hdGFJbmZvcyA9IFtdO1xuICAgIHRoaXMuY3R4LmN1cnJDbGlDcmVhdG9yUGtnID0gcGs7XG5cbiAgICBsZXQgZmlsZVBhdGg6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuXG4gICAgaWYgKHR5cGVvZiBwa2dGaWxlUGF0aCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcGtnRmlsZVBhdGgodGhpcy5wcm9ncmFtKTtcbiAgICAgIHRoaXMucGtnTWV0YXNNYXAuc2V0KCdAd2ZoL3BsaW5rJywgY29tbWFuZE1ldGFJbmZvcyk7XG4gICAgfSBlbHNlIGlmIChwaykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgZmlsZVBhdGggPSBQYXRoLnJlc29sdmUocGxpbmtFbnYud29ya0RpciwgJ25vZGVfbW9kdWxlcycsIHBrLm5hbWUgKyAnLycgKyBwa2dGaWxlUGF0aCk7XG4gICAgICAgIHRoaXMuY3R4LmN1cnJDbGllQ3JlYXRvckZpbGUgPSBmaWxlUGF0aDtcbiAgICAgICAgY29uc3Qgc3ViQ21kRmFjdG9yeTogQ2xpRXh0ZW5zaW9uID0gZnVuY05hbWUgPyByZXF1aXJlKGZpbGVQYXRoKVtmdW5jTmFtZV0gOlxuICAgICAgICAgIHJlcXVpcmUoZmlsZVBhdGgpO1xuICAgICAgICBzdWJDbWRGYWN0b3J5KHRoaXMucHJvZ3JhbSBhcyBQbGlua0NvbW1hbmQpO1xuICAgICAgICB0aGlzLnBrZ01ldGFzTWFwLnNldChway5uYW1lLCBjb21tYW5kTWV0YUluZm9zKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgbG9nLndhcm4oYEZhaWxlZCB0byBsb2FkIGNvbW1hbmQgbGluZSBleHRlbnNpb24gaW4gcGFja2FnZSAke3BrLm5hbWV9OiBcIiR7ZS5tZXNzYWdlIGFzIHN0cmluZ31cImAsIGUpO1xuICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgZmlsZVBhdGggPSBudWxsO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLmN0eC5jdXJyQ2xpQ3JlYXRvclBrZyA9IG51bGw7XG4gIH1cblxuICBhcHBlbmRHbG9iYWxPcHRpb25zKHNhdmVUb1N0b3JlOiBib29sZWFuKSB7XG4gICAgKHRoaXMucHJvZ3JhbSBhcyBQbGlua0NvbW1hbmQpLmFkZEdsb2JhbE9wdGlvbnNUb1N1YkNtZHMoKTtcbiAgICAvLyBmb3IgKGNvbnN0IGNtZCBvZiB0aGlzLmFsbFN1YkNtZHMpIHtcbiAgICAvLyAgIHdpdGhHbG9iYWxPcHRpb25zKGNtZCk7XG4gICAgLy8gfVxuICAgIGlmICghc2F2ZVRvU3RvcmUpXG4gICAgICByZXR1cm47XG4gICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiB7XG4gICAgICBmb3IgKGNvbnN0IFtwa2csIG1ldGFzXSBvZiB0aGlzLnBrZ01ldGFzTWFwLmVudHJpZXMoKSkge1xuICAgICAgICBjbGlBY3Rpb25EaXNwYXRjaGVyLmFkZENvbW1hbmRNZXRhKHtwa2csIG1ldGFzfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdpdGhDd2RPcHRpb24oY21kOiBjb21tYW5kZXIuQ29tbWFuZCk6IGNvbW1hbmRlci5Db21tYW5kIHtcbiAgcmV0dXJuIGNtZC5vcHRpb24oJy0tc3BhY2UsLS1jd2QgPHdvcmtpbmcgZGlyPicsICdSdW4gY29tbWFuZCBpbiBhIGRpZmZlcmVudCB3b3JrdHJlZSBkaXJlY3Rvcnk6IFsnICtcbiAgICBbLi4uZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKV0uam9pbignLCAnKSArICddJyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3aXRoR2xvYmFsT3B0aW9ucyhjbWQ6IGNvbW1hbmRlci5Db21tYW5kIHwgUGxpbmtDb21tYW5kKTogY29tbWFuZGVyLkNvbW1hbmQge1xuICBpZiAoZ2V0U3RhdGUoKS53b3Jrc3BhY2VzID09IG51bGwpXG4gICAgY29uc29sZS5sb2coZ2V0U3RhdGUoKSk7XG4gIHdpdGhDd2RPcHRpb24oY21kKTtcblxuICBpZiAoY21kIGluc3RhbmNlb2YgUGxpbmtDb21tYW5kKVxuICAgIGNtZC5vcHRpb25TdHlsZXIgPSBzdHIgPT4gY2hhbGsuZ3JheShzdHIpO1xuICAoY21kLm9wdGlvbiBhcyBjb21tYW5kZXIuQ29tbWFuZFsnb3B0aW9uJ10pKCctYywgLS1jb25maWcgPGNvbmZpZy1maWxlPicsXG4gICAgJ1JlYWQgY29uZmlnIGZpbGVzLCBpZiB0aGVyZSBhcmUgbXVsdGlwbGUgZmlsZXMsIHRoZSBsYXR0ZXIgb25lIG92ZXJyaWRlcyBwcmV2aW91cyBvbmUnLFxuICAgICh2YWx1ZSwgcHJldikgPT4ge1xuICAgICAgcHJldi5wdXNoKC4uLnZhbHVlLnNwbGl0KCcsJykpO1xuICAgICAgcmV0dXJuIHByZXY7XG4gICAgICAvLyByZXR1cm4gcHJldi5jb25jYXQodmFsdWUuc3BsaXQoJywnKSk7XG4gICAgfSwgW10gYXMgc3RyaW5nW10pO1xuXG4gIChjbWQub3B0aW9uIGFzIGNvbW1hbmRlci5Db21tYW5kWydvcHRpb24nXSkoJy0tcHJvcCA8ZXhwcmVzc2lvbj4nLFxuICAgICc8cHJvcGVydHkgcGF0aD49PHZhbHVlIGFzIEpTT04gfCBsaXRlcmFsPiAuLi4gZGlyZWN0bHkgc2V0IGNvbmZpZ3VyYXRpb24gcHJvcGVydGllcywgcHJvcGVydHkgbmFtZSBpcyBsb2Rhc2guc2V0KCkgcGF0aC1saWtlIHN0cmluZy4gZS5nLiAnICtcbiAgICAnLS1wcm9wIHBvcnQ9ODA4MCAtLXByb3AgZGV2TW9kZT1mYWxzZSAtLXByb3AgQHdmaC9mb29iYXIuYXBpPWh0dHA6Ly9sb2NhbGhvc3Q6ODA4MCAnICtcbiAgICAnLS1wcm9wIGFycmF5bGlrZS5wcm9wWzBdPWZvb2JhciAnICtcbiAgICAnLS1wcm9wIFtcIkB3ZmgvZm9vLmJhclwiLFwicHJvcFwiLDBdPXRydWUnLFxuICAgIGFycmF5T3B0aW9uRm4sIFtdIGFzIHN0cmluZ1tdKVxuICAub3B0aW9uKCctLXZlcmJvc2UnLCAnU3BlY2lmeSBsb2cgbGV2ZWwgYXMgXCJkZWJ1Z1wiJywgZmFsc2UpXG4gIC5vcHRpb24oJy0tZGV2JywgJ0J5IHR1cm5pbmcgb24gdGhpcyBvcHRpb24sJyArXG4gICAgJyBQbGluayBzZXR0aW5nIHByb3BlcnR5IFwiZGV2TW9kZVwiIHdpbGwgYXV0b21hdGNpYWxseSBzZXQgdG8gYHRydWVgLCcgK1xuICAgICcgYW5kIHByb2Nlc3MuZW52Lk5PREVfRU5WIHdpbGwgYWxzbyBiZWluZyB1cGRhdGVkIHRvIFxcJ2RldmVsb3BlbWVudFxcJyBvciBcXCdwcm9kdWN0aW9uIGNvcnJlc3BvbmRpbmdseS4gJyxcbiAgICBmYWxzZSlcbiAgLm9wdGlvbignLS1lbnYgPHNldHRpbmcgZW52aXJvbm1lbnQ+JywgJ0Egc3RyaW5nIGRlbm90ZXMgcnVudGltZSBlbnZpcm9ubWVudCBuYW1lLCBwYWNrYWdlIHNldHRpbmcgZmlsZSBtYXkgcmV0dXJuIGRpZmZlcmVudCB2YWx1ZXMgYmFzZWQgb24gaXRzIHZhbHVlIChjbGlPcHRpb25zLmVudiknKTtcbiAgaWYgKGNtZCBpbnN0YW5jZW9mIFBsaW5rQ29tbWFuZClcbiAgICBjbWQub3B0aW9uU3R5bGVyID0gdW5kZWZpbmVkO1xuICByZXR1cm4gY21kO1xufVxuIl19