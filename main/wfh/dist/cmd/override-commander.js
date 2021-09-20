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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcnJpZGUtY29tbWFuZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL292ZXJyaWRlLWNvbW1hbmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxrR0FBa0c7QUFDbEcsMERBQWtDO0FBVzFCLG9CQVhELG1CQUFTLENBV0M7QUFWakIsZ0RBQXFFO0FBQ3JFLGtEQUEwQjtBQUMxQixtQ0FBc0M7QUFHdEMsMkNBQWdEO0FBQ2hELG9EQUE0QjtBQUM1Qiw0REFBbUM7QUFDbkMsZ0RBQXdCO0FBQ3hCLHdDQUF1QztBQUd2QyxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0FBVXpELE1BQWEsZ0JBQWlCLFNBQVEsbUJBQVMsQ0FBQyxJQUFJO0lBQ2xELGNBQWMsQ0FBQyxHQUFzQjtRQUNuQyxNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3RDLElBQUksR0FBRyxZQUFZLFlBQVksSUFBSSxHQUFHLENBQUMsVUFBVSxFQUFFO1lBQ2pELE9BQU8sR0FBRyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUM1QjtRQUNELE9BQU8sR0FBRyxDQUFDO0lBQ2IsQ0FBQztJQUVELFVBQVUsQ0FBQyxNQUFzQjtRQUMvQixPQUFPLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO0lBQ2hGLENBQUM7SUFFTyxrQ0FBa0MsQ0FBQyxHQUFzQixFQUFFLE1BQXdCO1FBQ3pGLE9BQU8sTUFBTSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLEVBQUU7WUFDekQsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEdB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LEVBQWMsQ0FBQyxDQUFDO0lBRXBCLEdBQUcsQ0FBQyxNQUFzQyxDQUFDLHFCQUFxQixFQUMvRCw0SUFBNEk7UUFDNUkscUZBQXFGO1FBQ3JGLGtDQUFrQztRQUNsQyx1Q0FBdUMsRUFDdkMscUJBQWEsRUFBRSxFQUFjLENBQUM7U0FDL0IsTUFBTSxDQUFDLFdBQVcsRUFBRSw4QkFBOEIsRUFBRSxLQUFLLENBQUM7U0FDMUQsTUFBTSxDQUFDLE9BQU8sRUFBRSw0QkFBNEI7UUFDM0MscUVBQXFFO1FBQ3JFLHlHQUF5RyxFQUN6RyxLQUFLLENBQUM7U0FDUCxNQUFNLENBQUMsNkJBQTZCLEVBQUUsaUlBQWlJLENBQUMsQ0FBQztJQUMxSyxJQUFJLEdBQUcsWUFBWSxZQUFZO1FBQzdCLEdBQUcsQ0FBQyxZQUFZLEdBQUcsU0FBUyxDQUFDO0lBQy9CLE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQztBQS9CRCw4Q0ErQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFzc2lnbm1lbnQsICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLXJldHVybiAqL1xuaW1wb3J0IGNvbW1hbmRlciBmcm9tICdjb21tYW5kZXInO1xuaW1wb3J0IHtXb3Jrc3BhY2VTdGF0ZSwgUGFja2FnZUluZm8sIGdldFN0YXRlfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHthcnJheU9wdGlvbkZufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCAqIGFzIF9ib290c3RyYXAgZnJvbSAnLi4vdXRpbHMvYm9vdHN0cmFwLXByb2Nlc3MnO1xuaW1wb3J0IHsgR2xvYmFsT3B0aW9ucywgT3VyQ29tbWFuZE1ldGFkYXRhIH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge2NsaUFjdGlvbkRpc3BhdGNoZXJ9IGZyb20gJy4vY2xpLXNsaWNlJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCBzdHJpcEFuc2kgZnJvbSAnc3RyaXAtYW5zaSc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7cGxpbmtFbnZ9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuZXhwb3J0IHtjb21tYW5kZXJ9O1xuXG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay5vdmVycmlkZS1jb21tYW5kZXInKTtcblxuaW50ZXJmYWNlIENvbW1hbmRDb250ZXh0IHtcbiAgY3VyckNsaWVDcmVhdG9yRmlsZTogc3RyaW5nO1xuICBjdXJyQ2xpQ3JlYXRvclBrZzogUGFja2FnZUluZm8gfCBudWxsO1xuICBtZXRhTWFwOiBXZWFrTWFwPFBsaW5rQ29tbWFuZCwgUGFydGlhbDxPdXJDb21tYW5kTWV0YWRhdGE+PjtcbiAgY3VyckNsaVBrZ01hdGFJbmZvczogT3VyQ29tbWFuZE1ldGFkYXRhW107XG4gIG5hbWVTdHlsZXI/OiAoY21kTmFtZTogc3RyaW5nKSA9PiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBQbGlua0NvbW1hbmRIZWxwIGV4dGVuZHMgY29tbWFuZGVyLkhlbHAge1xuICBzdWJjb21tYW5kVGVybShjbWQ6IGNvbW1hbmRlci5Db21tYW5kKTogc3RyaW5nIHtcbiAgICBjb25zdCBzdHIgPSBzdXBlci5zdWJjb21tYW5kVGVybShjbWQpO1xuICAgIGlmIChjbWQgaW5zdGFuY2VvZiBQbGlua0NvbW1hbmQgJiYgY21kLm5hbWVTdHlsZXIpIHtcbiAgICAgIHJldHVybiBjbWQubmFtZVN0eWxlcihzdHIpO1xuICAgIH1cbiAgICByZXR1cm4gc3RyO1xuICB9XG5cbiAgb3B0aW9uVGVybShvcHRpb246IFBsaW5rQ21kT3B0aW9uKSB7XG4gICAgcmV0dXJuIG9wdGlvbi5vcHRpb25TdHlsZXIgPyBvcHRpb24ub3B0aW9uU3R5bGVyKG9wdGlvbi5mbGFncykgOiBvcHRpb24uZmxhZ3M7XG4gIH1cblxuICBwcml2YXRlIGxvbmdlc3RTdWJjb21tYW5kVGVybUxlbmd0aEZvclJlYWwoY21kOiBjb21tYW5kZXIuQ29tbWFuZCwgaGVscGVyOiBQbGlua0NvbW1hbmRIZWxwKSB7XG4gICAgcmV0dXJuIGhlbHBlci52aXNpYmxlQ29tbWFuZHMoY21kKS5yZWR1Y2UoKG1heCwgY29tbWFuZCkgPT4ge1xuICAgICAgcmV0dXJuIE1hdGgubWF4KG1heCwgc3RyaXBBbnNpKGhlbHBlci5zdWJjb21tYW5kVGVybShjb21tYW5kKSkubGVuZ3RoKTtcbiAgICB9LCAwKTtcbiAgfVxuXG4gIHByaXZhdGUgbG9uZ2VzdE9wdGlvblRlcm1MZW5ndGhGb3JSZWFsKGNtZDogY29tbWFuZGVyLkNvbW1hbmQsIGhlbHBlcjogUGxpbmtDb21tYW5kSGVscCkge1xuICAgIHJldHVybiBoZWxwZXIudmlzaWJsZU9wdGlvbnMoY21kKS5yZWR1Y2UoKG1heCwgb3B0aW9uKSA9PiB7XG4gICAgICByZXR1cm4gTWF0aC5tYXgobWF4LCBzdHJpcEFuc2koaGVscGVyLm9wdGlvblRlcm0ob3B0aW9uKSkubGVuZ3RoKTtcbiAgICB9LCAwKTtcbiAgfVxuXG4gIC8vIHN1YmNvbW1hbmREZXNjcmlwdGlvbihjbWQ6IGNvbW1hbmRlci5Db21tYW5kKSB7XG4gIC8vICAgcmV0dXJuIHN0cmlwQW5zaShzdXBlci5zdWJjb21tYW5kRGVzY3JpcHRpb24oY21kKSk7XG4gIC8vIH1cblxuICBwcml2YXRlIHJlYWxQYWRXaWR0aChjbWQ6IGNvbW1hbmRlci5Db21tYW5kLCBoZWxwZXI6IFBsaW5rQ29tbWFuZEhlbHApIHtcbiAgICByZXR1cm4gTWF0aC5tYXgoXG4gICAgICBoZWxwZXIubG9uZ2VzdE9wdGlvblRlcm1MZW5ndGhGb3JSZWFsKGNtZCwgaGVscGVyKSxcbiAgICAgIGhlbHBlci5sb25nZXN0U3ViY29tbWFuZFRlcm1MZW5ndGhGb3JSZWFsKGNtZCwgaGVscGVyKSxcbiAgICAgIGhlbHBlci5sb25nZXN0QXJndW1lbnRUZXJtTGVuZ3RoKGNtZCwgaGVscGVyKVxuICAgICk7XG4gIH1cblxuICBmb3JtYXRIZWxwKGNtZDogY29tbWFuZGVyLkNvbW1hbmQsIGhlbHBlcjogUGxpbmtDb21tYW5kSGVscCkge1xuICAgIC8vIGNvbnN0IHRlcm1XaWR0aCA9IGhlbHBlci5wYWRXaWR0aChjbWQsIGhlbHBlcik7IC8vIEl0IGlzIGJpZ2dlciB0aGFuIGFjdHVhbCB3aWR0aCBkdWUgdG8gY29sb3JmdWwgY2hhcmFjdGVyXG4gICAgY29uc3QgcmVhbFRlcm1XaWR0aCA9IGhlbHBlci5yZWFsUGFkV2lkdGgoY21kLCBoZWxwZXIpO1xuICAgIC8vIGNvbnNvbGUubG9nKCd0ZXJtV2lkdGg9JywgdGVybVdpZHRoKTtcbiAgICBjb25zdCBoZWxwV2lkdGggPSBoZWxwZXIuaGVscFdpZHRoIHx8IDgwO1xuICAgIGNvbnN0IGl0ZW1JbmRlbnRXaWR0aCA9IDI7XG4gICAgY29uc3QgaXRlbVNlcGFyYXRvcldpZHRoID0gMjsgLy8gYmV0d2VlbiB0ZXJtIGFuZCBkZXNjcmlwdGlvblxuICAgIGZ1bmN0aW9uIGZvcm1hdEl0ZW0odGVybTogc3RyaW5nLCBkZXNjcmlwdGlvbjogc3RyaW5nLCBzdHlsZXI/OiBQbGlua0NvbW1hbmRbJ25hbWVTdHlsZXInXSkge1xuICAgICAgaWYgKGRlc2NyaXB0aW9uKSB7XG4gICAgICAgIGlmIChkZXNjcmlwdGlvbikge1xuICAgICAgICAgIGNvbnN0IGZ1bGxUZXh0ID0gYCR7dGVybX0keycgJy5yZXBlYXQocmVhbFRlcm1XaWR0aCArIGl0ZW1JbmRlbnRXaWR0aCAtIHN0cmlwQW5zaSh0ZXJtKS5sZW5ndGgpfSR7ZGVzY3JpcHRpb259YDtcbiAgICAgICAgICByZXR1cm4gaGVscGVyLndyYXAoZnVsbFRleHQsIGhlbHBXaWR0aCAtIGl0ZW1JbmRlbnRXaWR0aCwgcmVhbFRlcm1XaWR0aCArIGl0ZW1TZXBhcmF0b3JXaWR0aCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRlcm07XG4gICAgICAgIC8vIFN1cHBvcnQgY29sb3JmdWwgY2hhcmFjdGVyc1xuICAgICAgICAvLyBjb25zdCBmdWxsVGV4dCA9IGAke3Rlcm19JHsnICcucmVwZWF0KHJlYWxUZXJtV2lkdGggKyBpdGVtSW5kZW50V2lkdGggLSBzdHJpcEFuc2kodGVybSkubGVuZ3RoKX0ke2Rlc2NyaXB0aW9ufWA7XG4gICAgICAgIC8vIHJldHVybiBoZWxwZXIud3JhcChmdWxsVGV4dCwgaGVscFdpZHRoIC0gaXRlbUluZGVudFdpZHRoLCByZWFsVGVybVdpZHRoICsgaXRlbVNlcGFyYXRvcldpZHRoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0ZXJtO1xuICAgIH1cbiAgICBmdW5jdGlvbiBmb3JtYXRMaXN0KHRleHRBcnJheTogc3RyaW5nW10pIHtcbiAgICAgIHJldHVybiB0ZXh0QXJyYXkuam9pbignXFxuJykucmVwbGFjZSgvXi9nbSwgJyAnLnJlcGVhdChpdGVtSW5kZW50V2lkdGgpKTtcbiAgICB9XG5cbiAgICAvLyBVc2FnZVxuICAgIGxldCBvdXRwdXQgPSBbYFVzYWdlOiAke2hlbHBlci5jb21tYW5kVXNhZ2UoY21kKX1gLCAnJ107XG5cbiAgICAvLyBEZXNjcmlwdGlvblxuICAgIGNvbnN0IGNvbW1hbmREZXNjcmlwdGlvbiA9IGhlbHBlci5jb21tYW5kRGVzY3JpcHRpb24oY21kKTtcbiAgICBpZiAoY29tbWFuZERlc2NyaXB0aW9uLmxlbmd0aCA+IDApIHtcbiAgICAgIG91dHB1dCA9IG91dHB1dC5jb25jYXQoW2NvbW1hbmREZXNjcmlwdGlvbiwgJyddKTtcbiAgICB9XG5cbiAgICAvLyBBcmd1bWVudHNcbiAgICBjb25zdCBhcmd1bWVudExpc3QgPSBoZWxwZXIudmlzaWJsZUFyZ3VtZW50cyhjbWQpLm1hcCgoYXJndW1lbnQpID0+IHtcbiAgICAgIHJldHVybiBmb3JtYXRJdGVtKGhlbHBlci5hcmd1bWVudFRlcm0oYXJndW1lbnQpLCBoZWxwZXIuYXJndW1lbnREZXNjcmlwdGlvbihhcmd1bWVudCkpO1xuICAgIH0pO1xuICAgIGlmIChhcmd1bWVudExpc3QubGVuZ3RoID4gMCkge1xuICAgICAgb3V0cHV0ID0gb3V0cHV0LmNvbmNhdChbJ0FyZ3VtZW50czonLCBmb3JtYXRMaXN0KGFyZ3VtZW50TGlzdCksICcnXSk7XG4gICAgfVxuXG4gICAgLy8gT3B0aW9uc1xuICAgIGNvbnN0IG9wdGlvbkxpc3QgPSBoZWxwZXIudmlzaWJsZU9wdGlvbnMoY21kKS5tYXAoKG9wdGlvbikgPT4ge1xuICAgICAgcmV0dXJuIGZvcm1hdEl0ZW0oaGVscGVyLm9wdGlvblRlcm0ob3B0aW9uKSwgaGVscGVyLm9wdGlvbkRlc2NyaXB0aW9uKG9wdGlvbiksIChvcHRpb24gYXMgUGxpbmtDbWRPcHRpb24pLm9wdGlvblN0eWxlcik7XG4gICAgfSk7XG4gICAgaWYgKG9wdGlvbkxpc3QubGVuZ3RoID4gMCkge1xuICAgICAgb3V0cHV0ID0gb3V0cHV0LmNvbmNhdChbJ09wdGlvbnM6JywgZm9ybWF0TGlzdChvcHRpb25MaXN0KSwgJyddKTtcbiAgICB9XG5cbiAgICAvLyBDb21tYW5kc1xuICAgIGxldCBwa2dOYW1lID0gJyc7XG4gICAgY29uc3QgY29tbWFuZExpc3QgPSBoZWxwZXIudmlzaWJsZUNvbW1hbmRzKGNtZCkubWFwKChjbWQpID0+IHtcbiAgICAgIGxldCBoZWFkZXIgPSAnJztcbiAgICAgIGlmIChwa2dOYW1lICE9PSAoY21kIGFzIFBsaW5rQ29tbWFuZCkucGtnTmFtZSkge1xuICAgICAgICBwa2dOYW1lID0gKGNtZCBhcyBQbGlua0NvbW1hbmQpLnBrZ05hbWU7XG4gICAgICAgIGhlYWRlciA9IHBrZ05hbWUgPyBgXFxuJHtjaGFsay5pbnZlcnNlKGNoYWxrLmdyYXkoJ1Byb3ZpZGVkIGJ5IHBhY2thZ2UgJyArIHBrZ05hbWUgKyAnOiAnKSl9XFxuYCA6XG4gICAgICAgICAgJ1xcbic7XG4gICAgICB9XG4gICAgICBwa2dOYW1lID0gKGNtZCBhcyBQbGlua0NvbW1hbmQpLnBrZ05hbWU7XG4gICAgICByZXR1cm4gaGVhZGVyICsgZm9ybWF0SXRlbShoZWxwZXIuc3ViY29tbWFuZFRlcm0oY21kKSwgaGVscGVyLnN1YmNvbW1hbmREZXNjcmlwdGlvbihjbWQpLCAoY21kIGFzIFBsaW5rQ29tbWFuZCkubmFtZVN0eWxlcik7XG4gICAgfSk7XG4gICAgaWYgKGNvbW1hbmRMaXN0Lmxlbmd0aCA+IDApIHtcbiAgICAgIG91dHB1dCA9IG91dHB1dC5jb25jYXQoWydDb21tYW5kczonLCBmb3JtYXRMaXN0KGNvbW1hbmRMaXN0KSwgJyddKTtcbiAgICB9XG5cbiAgICByZXR1cm4gb3V0cHV0LmpvaW4oJ1xcbicpO1xuICB9XG59XG4vKipcbiAqIEV4dGVuZCBjb21tYW5kZXIsIGNoZWNrIGNvbW1hbmRlciBBUEkgYXQgaHR0cHM6Ly93d3cubnBtanMuY29tL3BhY2thZ2UvY29tbWFuZGVyXG4gKi9cbmV4cG9ydCBjbGFzcyBQbGlua0NvbW1hbmQgZXh0ZW5kcyBjb21tYW5kZXIuQ29tbWFuZCB7XG4gIG5hbWVTdHlsZXI/OiAoY21kTmFtZTogc3RyaW5nKSA9PiBzdHJpbmc7XG4gIG9wdGlvblN0eWxlcj86IChjbWROYW1lOiBzdHJpbmcpID0+IHN0cmluZztcbiAgc3ViQ21kczogUGxpbmtDb21tYW5kW10gPSBbXTtcbiAgLyoqIHZhbHVlIGlzIGZpbGUgcGF0aCBmb3IgcGtnIG5hbWUgKi9cbiAgbG9hZGVkQ21kTWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgcGtnTmFtZSA9ICcnO1xuXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBjdHg6IENvbW1hbmRDb250ZXh0LCBuYW1lPzogc3RyaW5nKSB7XG4gICAgc3VwZXIobmFtZSk7XG4gIH1cblxuICBhZGRHbG9iYWxPcHRpb25zVG9TdWJDbWRzKCkge1xuICAgIGlmICh0aGlzLnN1YkNtZHMgPT0gbnVsbClcbiAgICAgIHJldHVybjtcbiAgICBmb3IgKGNvbnN0IHN1YkNtZCBvZiB0aGlzLnN1YkNtZHMpIHtcbiAgICAgIHdpdGhHbG9iYWxPcHRpb25zKHN1YkNtZCk7XG4gICAgfVxuICB9XG5cbiAgY3JlYXRlQ29tbWFuZChjbWROYW1lPzogc3RyaW5nKTogY29tbWFuZGVyLkNvbW1hbmQge1xuICAgIGNvbnN0IHBrID0gdGhpcy5jdHguY3VyckNsaUNyZWF0b3JQa2c7XG4gICAgY29uc3QgZmlsZVBhdGggPSB0aGlzLmN0eC5jdXJyQ2xpZUNyZWF0b3JGaWxlO1xuICAgIGlmIChjbWROYW1lICYmIGNtZE5hbWUgIT09ICdoZWxwJykge1xuICAgICAgaWYgKHRoaXMubG9hZGVkQ21kTWFwLmhhcyhjbWROYW1lKSkge1xuICAgICAgICBpZiAoZmlsZVBhdGgpXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb25mbGljdCBjb21tYW5kIG5hbWUgXCIke2NtZE5hbWV9XCIgZnJvbSBleHRlbnNpb25zIFwiJHtmaWxlUGF0aH1cIiBhbmQgXCIke3RoaXMubG9hZGVkQ21kTWFwLmdldChjbWROYW1lKSF9XCJgKTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgQ29uZmxpY3Qgd2l0aCBleGlzdGluZyBQbGluayBjb21tYW5kIG5hbWUgJHtjbWROYW1lfWApO1xuICAgICAgfVxuICAgICAgdGhpcy5sb2FkZWRDbWRNYXAuc2V0KGNtZE5hbWUsIGZpbGVQYXRoID8gZmlsZVBhdGggOiAnQHdmaC9wbGluaycpO1xuICAgIH1cblxuICAgIGNvbnN0IHN1YkNtZCA9IG5ldyBQbGlua0NvbW1hbmQodGhpcy5jdHgsIGNtZE5hbWUpO1xuICAgIHN1YkNtZC5uYW1lU3R5bGVyID0gdGhpcy5jdHgubmFtZVN0eWxlcjtcbiAgICBzdWJDbWQucGtnTmFtZSA9IHBrICE9IG51bGwgPyBway5uYW1lIDogJyc7XG4gICAgdGhpcy5zdWJDbWRzLnB1c2goc3ViQ21kKTtcblxuICAgIC8vIHN1YkNtZC5zZXRDb250ZXh0RGF0YSh0aGlzLmN1cnJDbGllQ3JlYXRvckZpbGUsIHRoaXMuY3VyckNsaUNyZWF0b3JQa2csIHRoaXMubWV0YU1hcCwgdGhpcyk7XG5cbiAgICBjb25zdCBtZXRhOiBQYXJ0aWFsPE91ckNvbW1hbmRNZXRhZGF0YT4gPSB7XG4gICAgICBwa2dOYW1lOiBwayA/IHBrLm5hbWUgOiAnQHdmaC9wbGluaycsXG4gICAgICBuYW1lOiBjbWROYW1lLFxuICAgICAgb3B0aW9uczogW10sXG4gICAgICBkZXNjOiAnJ1xuICAgIH07XG4gICAgdGhpcy5jdHgubWV0YU1hcC5zZXQoc3ViQ21kLCBtZXRhKTtcbiAgICB0aGlzLmN0eC5jdXJyQ2xpUGtnTWF0YUluZm9zLnB1c2gobWV0YSBhcyBPdXJDb21tYW5kTWV0YWRhdGEpO1xuICAgIC8vIHN1YkNtZC5kZXNjcmlwdGlvbihtZXRhLmRlc2MhKTtcbiAgICByZXR1cm4gc3ViQ21kO1xuICB9XG5cbiAgZGVzY3JpcHRpb24oc3RyPzogc3RyaW5nLFxuICAgIGFyZ3NEZXNjcmlwdGlvbj86IHsgW2FyZ05hbWU6IHN0cmluZ106IHN0cmluZyB9KSB7XG4gICAgaWYgKHN0ciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zdCBwbGlua01ldGEgPSB0aGlzLmN0eC5tZXRhTWFwLmdldCh0aGlzKSE7XG4gICAgICBwbGlua01ldGEuZGVzYyA9IHN0cjtcbiAgICAgIGlmIChhcmdzRGVzY3JpcHRpb24pIHtcbiAgICAgICAgcGxpbmtNZXRhLmFyZ0Rlc2MgPSBhcmdzRGVzY3JpcHRpb247XG4gICAgICB9XG4gICAgICByZXR1cm4gYXJnc0Rlc2NyaXB0aW9uID8gc3VwZXIuZGVzY3JpcHRpb24oc3RyLCBhcmdzRGVzY3JpcHRpb24pIDogc3VwZXIuZGVzY3JpcHRpb24oc3RyKTtcbiAgICB9XG4gICAgcmV0dXJuIHN1cGVyLmRlc2NyaXB0aW9uKCkgYXMgYW55O1xuICB9XG5cbiAgYWxpYXMoYWxpYXM/OiBzdHJpbmcpIHtcbiAgICBpZiAoYWxpYXMpIHtcbiAgICAgIGNvbnN0IHBsaW5rTWV0YSA9IHRoaXMuY3R4Lm1ldGFNYXAuZ2V0KHRoaXMpITtcbiAgICAgIHBsaW5rTWV0YS5hbGlhcyA9IGFsaWFzO1xuICAgIH1cbiAgICByZXR1cm4gc3VwZXIuYWxpYXMoYWxpYXMgYXMgYW55KSBhcyBhbnk7XG4gIH1cblxuICBjcmVhdGVPcHRpb24oZmxhZ3M6IHN0cmluZywgZGVzY3JpcHRpb24/OiBzdHJpbmcsIC4uLnJlbWFpbmluZzogYW55W10pIHtcbiAgICBsZXQgZGVmYXVsdFZhbHVlOiBhbnk7XG4gICAgaWYgKHJlbWFpbmluZy5sZW5ndGggPiAxKSB7XG4gICAgICBkZWZhdWx0VmFsdWUgPSByZW1haW5pbmdbcmVtYWluaW5nLmxlbmd0aCAtIDFdO1xuICAgIH1cbiAgICBjb25zdCBwbGlua01ldGEgPSB0aGlzLmN0eC5tZXRhTWFwLmdldCh0aGlzKSE7XG4gICAgcGxpbmtNZXRhLm9wdGlvbnMhLnB1c2goe1xuICAgICAgZmxhZ3MsIGRlc2M6IGRlc2NyaXB0aW9uIHx8ICcnLCBkZWZhdWx0VmFsdWUsIGlzUmVxdWlyZWQ6IGZhbHNlXG4gICAgfSk7XG4gICAgY29uc3Qgb3B0ID0gbmV3IFBsaW5rQ21kT3B0aW9uKGZsYWdzLCBkZXNjcmlwdGlvbik7XG4gICAgb3B0Lm9wdGlvblN0eWxlciA9IHRoaXMub3B0aW9uU3R5bGVyO1xuICAgIHJldHVybiBvcHQ7XG4gIH1cbiAgb3B0aW9uKC4uLmFyZ3M6IGFueVtdKSB7XG4gICAgKHRoaXMuX3NhdmVPcHRpb25zIGFzIGFueSkoZmFsc2UsIC4uLmFyZ3MpO1xuICAgIHJldHVybiAoc3VwZXIub3B0aW9uIGFzIGFueSkoLi4uYXJncyk7XG4gIH1cbiAgcmVxdWlyZWRPcHRpb24oLi4uYXJnczogYW55W10pIHtcbiAgICAodGhpcy5fc2F2ZU9wdGlvbnMgYXMgYW55KSh0cnVlLCAuLi5hcmdzKTtcbiAgICByZXR1cm4gKHN1cGVyLnJlcXVpcmVkT3B0aW9uIGFzIGFueSkoLi4uYXJncyk7XG4gIH1cbiAgYWN0aW9uKGZuOiAoLi4uYXJnczogYW55W10pID0+IHZvaWQgfCBQcm9taXNlPHZvaWQ+KSB7XG4gICAgZnVuY3Rpb24gYWN0aW9uQ2FsbGJhY2sodGhpczogY29tbWFuZGVyLkNvbW1hbmQpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHtpbml0Q29uZmlnfSA9IHJlcXVpcmUoJy4uL3V0aWxzL2Jvb3RzdHJhcC1wcm9jZXNzJykgYXMgdHlwZW9mIF9ib290c3RyYXA7XG4gICAgICAgIGluaXRDb25maWcodGhpcy5vcHRzKCkgYXMgR2xvYmFsT3B0aW9ucyk7XG4gICAgICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBsb2cuZXJyb3IoZSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzdXBlci5hY3Rpb24oYWN0aW9uQ2FsbGJhY2spO1xuICB9XG4gIGNyZWF0ZUhlbHAoKSB7XG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24obmV3IFBsaW5rQ29tbWFuZEhlbHAoKSwgdGhpcy5jb25maWd1cmVIZWxwKCkpO1xuICB9XG4gIF9zYXZlT3B0aW9ucyhpc1JlcXVpcmVkOiBib29sZWFuLCBmbGFnczogc3RyaW5nLCBkZXNjOiBzdHJpbmcsIC4uLnJlbWFpbmluZzogYW55W10pIHtcbiAgICBsZXQgZGVmYXVsdFZhbHVlOiBhbnk7XG4gICAgaWYgKHJlbWFpbmluZy5sZW5ndGggPiAxKSB7XG4gICAgICBkZWZhdWx0VmFsdWUgPSByZW1haW5pbmdbcmVtYWluaW5nLmxlbmd0aCAtIDFdO1xuICAgIH1cbiAgICBjb25zdCBwbGlua01ldGEgPSB0aGlzLmN0eC5tZXRhTWFwLmdldCh0aGlzKSE7XG4gICAgcGxpbmtNZXRhLm9wdGlvbnMhLnB1c2goe1xuICAgICAgZmxhZ3MsIGRlc2MsIGRlZmF1bHRWYWx1ZSwgaXNSZXF1aXJlZFxuICAgIH0pO1xuICB9XG59XG5cbmV4cG9ydCB0eXBlIENsaUV4dGVuc2lvbiA9IChwcm9ncmFtOiBQbGlua0NvbW1hbmQpID0+IHZvaWQ7XG5cbmNsYXNzIFBsaW5rQ21kT3B0aW9uIGV4dGVuZHMgY29tbWFuZGVyLk9wdGlvbiB7XG4gIG9wdGlvblN0eWxlcj86IChjbWROYW1lOiBzdHJpbmcpID0+IHN0cmluZztcbn1cbmV4cG9ydCBjbGFzcyBDb21tYW5kT3ZlcnJpZGVyIHtcbiAgLy8gbmFtZVN0eWxlcjogUGxpbmtDb21tYW5kWyduYW1lU3R5bGVyJ107XG4gIC8vIHByaXZhdGUgY3VyckNsaWVDcmVhdG9yRmlsZTogc3RyaW5nO1xuICAvLyBwcml2YXRlIGN1cnJDbGlDcmVhdG9yUGtnOiBQYWNrYWdlSW5mbyB8IG51bGwgPSBudWxsO1xuICAvLyBwcml2YXRlIGN1cnJDbGlQa2dNYXRhSW5mb3M6IE91ckNvbW1hbmRNZXRhZGF0YVtdO1xuICAvLyBwcml2YXRlIGFsbFN1YkNtZHM6IE91ckF1Z21lbnRlZENvbW1hbmRlcltdID0gW107XG4gIC8vIHByaXZhdGUgbWV0YU1hcCA9IG5ldyBXZWFrTWFwPGNvbW1hbmRlci5Db21tYW5kLCBQYXJ0aWFsPE91ckNvbW1hbmRNZXRhZGF0YT4+KCk7XG4gIHByaXZhdGUgcGtnTWV0YXNNYXAgPSBuZXcgTWFwPHN0cmluZywgT3VyQ29tbWFuZE1ldGFkYXRhW10+KCk7XG4gIHByaXZhdGUgY3R4OiBQYXJ0aWFsPENvbW1hbmRDb250ZXh0PiA9IHtcbiAgICBtZXRhTWFwOiBuZXcgV2Vha01hcDxjb21tYW5kZXIuQ29tbWFuZCwgUGFydGlhbDxPdXJDb21tYW5kTWV0YWRhdGE+PigpXG4gIH07XG5cbiAgc2V0IG5hbWVTdHlsZXIodjogUGxpbmtDb21tYW5kWyduYW1lU3R5bGVyJ10pIHtcbiAgICB0aGlzLmN0eC5uYW1lU3R5bGVyID0gdjtcbiAgfVxuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcHJvZ3JhbTogY29tbWFuZGVyLkNvbW1hbmQsIHdzPzogV29ya3NwYWNlU3RhdGUpIHtcbiAgICB0aGlzLnByb2dyYW0uY3JlYXRlQ29tbWFuZCA9IFBsaW5rQ29tbWFuZC5wcm90b3R5cGUuY3JlYXRlQ29tbWFuZDtcblxuICAgICh0aGlzLnByb2dyYW0gYXMgUGxpbmtDb21tYW5kKS5jdHggPSB0aGlzLmN0eCBhcyBDb21tYW5kQ29udGV4dDtcbiAgICAodGhpcy5wcm9ncmFtIGFzIFBsaW5rQ29tbWFuZCkuc3ViQ21kcyA9IFtdO1xuICAgICh0aGlzLnByb2dyYW0gYXMgUGxpbmtDb21tYW5kKS5sb2FkZWRDbWRNYXAgPSBuZXcgTWFwKCk7XG4gICAgKHRoaXMucHJvZ3JhbSBhcyBQbGlua0NvbW1hbmQpLmFkZEdsb2JhbE9wdGlvbnNUb1N1YkNtZHMgPSBQbGlua0NvbW1hbmQucHJvdG90eXBlLmFkZEdsb2JhbE9wdGlvbnNUb1N1YkNtZHM7XG4gICAgdGhpcy5wcm9ncmFtLmNyZWF0ZUhlbHAgPSBQbGlua0NvbW1hbmQucHJvdG90eXBlLmNyZWF0ZUhlbHA7XG4gIH1cblxuICBmb3JQYWNrYWdlKHBrOiBQYWNrYWdlSW5mbywgcGtnRmlsZVBhdGg6IHN0cmluZywgZnVuY05hbWU6IHN0cmluZyk6IHZvaWQ7XG4gIGZvclBhY2thZ2UocGs6IG51bGwsIGNvbW1hbmRDcmVhdGlvbjogKHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kKSA9PiB2b2lkKTogdm9pZDtcbiAgZm9yUGFja2FnZShwazogUGFja2FnZUluZm8gfCBudWxsLFxuICAgIHBrZ0ZpbGVQYXRoOiBzdHJpbmcgfCAoKHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kKSA9PiB2b2lkKSxcbiAgICBmdW5jTmFtZT86IHN0cmluZykge1xuICAgIGNvbnN0IGNvbW1hbmRNZXRhSW5mb3M6IE91ckNvbW1hbmRNZXRhZGF0YVtdID0gdGhpcy5jdHguY3VyckNsaVBrZ01hdGFJbmZvcyA9IFtdO1xuICAgIHRoaXMuY3R4LmN1cnJDbGlDcmVhdG9yUGtnID0gcGs7XG5cbiAgICBsZXQgZmlsZVBhdGg6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuXG4gICAgaWYgKHR5cGVvZiBwa2dGaWxlUGF0aCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcGtnRmlsZVBhdGgodGhpcy5wcm9ncmFtKTtcbiAgICAgIHRoaXMucGtnTWV0YXNNYXAuc2V0KCdAd2ZoL3BsaW5rJywgY29tbWFuZE1ldGFJbmZvcyk7XG4gICAgfSBlbHNlIGlmIChwaykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgZmlsZVBhdGggPSBQYXRoLnJlc29sdmUocGxpbmtFbnYud29ya0RpciwgJ25vZGVfbW9kdWxlcycsIHBrLm5hbWUgKyAnLycgKyBwa2dGaWxlUGF0aCk7XG4gICAgICAgIHRoaXMuY3R4LmN1cnJDbGllQ3JlYXRvckZpbGUgPSBmaWxlUGF0aDtcbiAgICAgICAgY29uc3Qgc3ViQ21kRmFjdG9yeTogQ2xpRXh0ZW5zaW9uID0gZnVuY05hbWUgPyByZXF1aXJlKGZpbGVQYXRoKVtmdW5jTmFtZV0gOlxuICAgICAgICAgIHJlcXVpcmUoZmlsZVBhdGgpO1xuICAgICAgICBzdWJDbWRGYWN0b3J5KHRoaXMucHJvZ3JhbSBhcyBQbGlua0NvbW1hbmQpO1xuICAgICAgICB0aGlzLnBrZ01ldGFzTWFwLnNldChway5uYW1lLCBjb21tYW5kTWV0YUluZm9zKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgbG9nLndhcm4oYEZhaWxlZCB0byBsb2FkIGNvbW1hbmQgbGluZSBleHRlbnNpb24gaW4gcGFja2FnZSAke3BrLm5hbWV9OiBcIiR7ZS5tZXNzYWdlIGFzIHN0cmluZ31cImAsIGUpO1xuICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgZmlsZVBhdGggPSBudWxsO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLmN0eC5jdXJyQ2xpQ3JlYXRvclBrZyA9IG51bGw7XG4gIH1cblxuICBhcHBlbmRHbG9iYWxPcHRpb25zKHNhdmVUb1N0b3JlOiBib29sZWFuKSB7XG4gICAgKHRoaXMucHJvZ3JhbSBhcyBQbGlua0NvbW1hbmQpLmFkZEdsb2JhbE9wdGlvbnNUb1N1YkNtZHMoKTtcbiAgICAvLyBmb3IgKGNvbnN0IGNtZCBvZiB0aGlzLmFsbFN1YkNtZHMpIHtcbiAgICAvLyAgIHdpdGhHbG9iYWxPcHRpb25zKGNtZCk7XG4gICAgLy8gfVxuICAgIGlmICghc2F2ZVRvU3RvcmUpXG4gICAgICByZXR1cm47XG4gICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiB7XG4gICAgICBmb3IgKGNvbnN0IFtwa2csIG1ldGFzXSBvZiB0aGlzLnBrZ01ldGFzTWFwLmVudHJpZXMoKSkge1xuICAgICAgICBjbGlBY3Rpb25EaXNwYXRjaGVyLmFkZENvbW1hbmRNZXRhKHtwa2csIG1ldGFzfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdpdGhDd2RPcHRpb24oY21kOiBjb21tYW5kZXIuQ29tbWFuZCk6IGNvbW1hbmRlci5Db21tYW5kIHtcbiAgcmV0dXJuIGNtZC5vcHRpb24oJy0tc3BhY2UsLS1jd2QgPHdvcmtpbmcgZGlyPicsICdSdW4gY29tbWFuZCBpbiBhIGRpZmZlcmVudCB3b3JrdHJlZSBkaXJlY3Rvcnk6IFsnICtcbiAgICBbLi4uZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKV0uam9pbignLCAnKSArICddJyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3aXRoR2xvYmFsT3B0aW9ucyhjbWQ6IGNvbW1hbmRlci5Db21tYW5kIHwgUGxpbmtDb21tYW5kKTogY29tbWFuZGVyLkNvbW1hbmQge1xuICBpZiAoZ2V0U3RhdGUoKS53b3Jrc3BhY2VzID09IG51bGwpXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhnZXRTdGF0ZSgpKTtcbiAgd2l0aEN3ZE9wdGlvbihjbWQpO1xuXG4gIGlmIChjbWQgaW5zdGFuY2VvZiBQbGlua0NvbW1hbmQpXG4gICAgY21kLm9wdGlvblN0eWxlciA9IHN0ciA9PiBjaGFsay5ncmF5KHN0cik7XG4gIChjbWQub3B0aW9uIGFzIGNvbW1hbmRlci5Db21tYW5kWydvcHRpb24nXSkoJy1jLCAtLWNvbmZpZyA8Y29uZmlnLWZpbGU+JyxcbiAgICAnUmVhZCBjb25maWcgZmlsZXMsIGlmIHRoZXJlIGFyZSBtdWx0aXBsZSBmaWxlcywgdGhlIGxhdHRlciBvbmUgb3ZlcnJpZGVzIHByZXZpb3VzIG9uZScsXG4gICAgKHZhbHVlLCBwcmV2KSA9PiB7XG4gICAgICBwcmV2LnB1c2goLi4udmFsdWUuc3BsaXQoJywnKSk7XG4gICAgICByZXR1cm4gcHJldjtcbiAgICAgIC8vIHJldHVybiBwcmV2LmNvbmNhdCh2YWx1ZS5zcGxpdCgnLCcpKTtcbiAgICB9LCBbXSBhcyBzdHJpbmdbXSk7XG5cbiAgKGNtZC5vcHRpb24gYXMgY29tbWFuZGVyLkNvbW1hbmRbJ29wdGlvbiddKSgnLS1wcm9wIDxleHByZXNzaW9uPicsXG4gICAgJzxwcm9wZXJ0eSBwYXRoPj08dmFsdWUgYXMgSlNPTiB8IGxpdGVyYWw+IC4uLiBkaXJlY3RseSBzZXQgY29uZmlndXJhdGlvbiBwcm9wZXJ0aWVzLCBwcm9wZXJ0eSBuYW1lIGlzIGxvZGFzaC5zZXQoKSBwYXRoLWxpa2Ugc3RyaW5nLiBlLmcuICcgK1xuICAgICctLXByb3AgcG9ydD04MDgwIC0tcHJvcCBkZXZNb2RlPWZhbHNlIC0tcHJvcCBAd2ZoL2Zvb2Jhci5hcGk9aHR0cDovL2xvY2FsaG9zdDo4MDgwICcgK1xuICAgICctLXByb3AgYXJyYXlsaWtlLnByb3BbMF09Zm9vYmFyICcgK1xuICAgICctLXByb3AgW1wiQHdmaC9mb28uYmFyXCIsXCJwcm9wXCIsMF09dHJ1ZScsXG4gICAgYXJyYXlPcHRpb25GbiwgW10gYXMgc3RyaW5nW10pXG4gIC5vcHRpb24oJy0tdmVyYm9zZScsICdTcGVjaWZ5IGxvZyBsZXZlbCBhcyBcImRlYnVnXCInLCBmYWxzZSlcbiAgLm9wdGlvbignLS1kZXYnLCAnQnkgdHVybmluZyBvbiB0aGlzIG9wdGlvbiwnICtcbiAgICAnIFBsaW5rIHNldHRpbmcgcHJvcGVydHkgXCJkZXZNb2RlXCIgd2lsbCBhdXRvbWF0Y2lhbGx5IHNldCB0byBgdHJ1ZWAsJyArXG4gICAgJyBhbmQgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgd2lsbCBhbHNvIGJlaW5nIHVwZGF0ZWQgdG8gXFwnZGV2ZWxvcGVtZW50XFwnIG9yIFxcJ3Byb2R1Y3Rpb24gY29ycmVzcG9uZGluZ2x5LiAnLFxuICAgIGZhbHNlKVxuICAub3B0aW9uKCctLWVudiA8c2V0dGluZyBlbnZpcm9ubWVudD4nLCAnQSBzdHJpbmcgZGVub3RlcyBydW50aW1lIGVudmlyb25tZW50IG5hbWUsIHBhY2thZ2Ugc2V0dGluZyBmaWxlIG1heSByZXR1cm4gZGlmZmVyZW50IHZhbHVlcyBiYXNlZCBvbiBpdHMgdmFsdWUgKGNsaU9wdGlvbnMuZW52KScpO1xuICBpZiAoY21kIGluc3RhbmNlb2YgUGxpbmtDb21tYW5kKVxuICAgIGNtZC5vcHRpb25TdHlsZXIgPSB1bmRlZmluZWQ7XG4gIHJldHVybiBjbWQ7XG59XG4iXX0=