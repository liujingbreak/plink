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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcnJpZGUtY29tbWFuZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL292ZXJyaWRlLWNvbW1hbmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxrR0FBa0c7QUFDbEcsZ0RBQXdCO0FBQ3hCLDBEQUFrQztBQVUxQixvQkFWRCxtQkFBUyxDQVVDO0FBVGpCLGtEQUEwQjtBQUMxQixvREFBNEI7QUFDNUIsNERBQW1DO0FBQ25DLGdEQUFxRTtBQUVyRSx3Q0FBdUM7QUFDdkMsbUNBQXNDO0FBRXRDLDJDQUFnRDtBQUdoRCxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0FBVXpELE1BQWEsZ0JBQWlCLFNBQVEsbUJBQVMsQ0FBQyxJQUFJO0lBQ2xELGNBQWMsQ0FBQyxHQUFzQjtRQUNuQyxNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3RDLElBQUksR0FBRyxZQUFZLFlBQVksSUFBSSxHQUFHLENBQUMsVUFBVSxFQUFFO1lBQ2pELE9BQU8sR0FBRyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUM1QjtRQUNELE9BQU8sR0FBRyxDQUFDO0lBQ2IsQ0FBQztJQUVELFVBQVUsQ0FBQyxNQUFzQjtRQUMvQixPQUFPLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO0lBQ2hGLENBQUM7SUFFTyxrQ0FBa0MsQ0FBQyxHQUFzQixFQUFFLE1BQXdCO1FBQ3pGLE9BQU8sTUFBTSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLEVBQUU7WUFDekQsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEdB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QUFHLENBQUMsQ0FBQztJQUMzQyxHQUFHLENBQUMsTUFBc0MsQ0FBQyw0QkFBNEIsRUFDdEUsdUZBQXVGLEVBQ3ZGLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFO1FBQ2QsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUMvQixPQUFPLElBQUksQ0FBQztRQUNaLHdDQUF3QztJQUMxQyxDQUFDLEVBQUUsRUFBYyxDQUFDLENBQUM7SUFFcEIsR0FBRyxDQUFDLE1BQXNDLENBQUMscUJBQXFCLEVBQy9ELDRJQUE0STtRQUM1SSxxRkFBcUY7UUFDckYsa0NBQWtDO1FBQ2xDLHVDQUF1QyxFQUN2QyxxQkFBYSxFQUFFLEVBQWMsQ0FBQztTQUMvQixNQUFNLENBQUMsV0FBVyxFQUFFLDhCQUE4QixFQUFFLEtBQUssQ0FBQztTQUMxRCxNQUFNLENBQUMsT0FBTyxFQUFFLDRCQUE0QjtRQUMzQyxxRUFBcUU7UUFDckUseUdBQXlHLEVBQ3pHLEtBQUssQ0FBQztTQUNQLE1BQU0sQ0FBQyw2QkFBNkIsRUFBRSxpSUFBaUksQ0FBQyxDQUFDO0lBQzFLLElBQUksR0FBRyxZQUFZLFlBQVk7UUFDN0IsR0FBRyxDQUFDLFlBQVksR0FBRyxTQUFTLENBQUM7SUFDL0IsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDO0FBL0JELDhDQStCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudCwgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtcmV0dXJuICovXG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBjb21tYW5kZXIgZnJvbSAnY29tbWFuZGVyJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgc3RyaXBBbnNpIGZyb20gJ3N0cmlwLWFuc2knO1xuaW1wb3J0IHtXb3Jrc3BhY2VTdGF0ZSwgUGFja2FnZUluZm8sIGdldFN0YXRlfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgKiBhcyBfYm9vdHN0cmFwIGZyb20gJy4uL3V0aWxzL2Jvb3RzdHJhcC1wcm9jZXNzJztcbmltcG9ydCB7cGxpbmtFbnZ9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuaW1wb3J0IHthcnJheU9wdGlvbkZufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IE91ckNvbW1hbmRNZXRhZGF0YSB9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtjbGlBY3Rpb25EaXNwYXRjaGVyfSBmcm9tICcuL2NsaS1zbGljZSc7XG5leHBvcnQge2NvbW1hbmRlcn07XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLm92ZXJyaWRlLWNvbW1hbmRlcicpO1xuXG5pbnRlcmZhY2UgQ29tbWFuZENvbnRleHQge1xuICBjdXJyQ2xpZUNyZWF0b3JGaWxlOiBzdHJpbmc7XG4gIGN1cnJDbGlDcmVhdG9yUGtnOiBQYWNrYWdlSW5mbyB8IG51bGw7XG4gIG1ldGFNYXA6IFdlYWtNYXA8UGxpbmtDb21tYW5kLCBQYXJ0aWFsPE91ckNvbW1hbmRNZXRhZGF0YT4+O1xuICBjdXJyQ2xpUGtnTWF0YUluZm9zOiBPdXJDb21tYW5kTWV0YWRhdGFbXTtcbiAgbmFtZVN0eWxlcj86IChjbWROYW1lOiBzdHJpbmcpID0+IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIFBsaW5rQ29tbWFuZEhlbHAgZXh0ZW5kcyBjb21tYW5kZXIuSGVscCB7XG4gIHN1YmNvbW1hbmRUZXJtKGNtZDogY29tbWFuZGVyLkNvbW1hbmQpOiBzdHJpbmcge1xuICAgIGNvbnN0IHN0ciA9IHN1cGVyLnN1YmNvbW1hbmRUZXJtKGNtZCk7XG4gICAgaWYgKGNtZCBpbnN0YW5jZW9mIFBsaW5rQ29tbWFuZCAmJiBjbWQubmFtZVN0eWxlcikge1xuICAgICAgcmV0dXJuIGNtZC5uYW1lU3R5bGVyKHN0cik7XG4gICAgfVxuICAgIHJldHVybiBzdHI7XG4gIH1cblxuICBvcHRpb25UZXJtKG9wdGlvbjogUGxpbmtDbWRPcHRpb24pIHtcbiAgICByZXR1cm4gb3B0aW9uLm9wdGlvblN0eWxlciA/IG9wdGlvbi5vcHRpb25TdHlsZXIob3B0aW9uLmZsYWdzKSA6IG9wdGlvbi5mbGFncztcbiAgfVxuXG4gIHByaXZhdGUgbG9uZ2VzdFN1YmNvbW1hbmRUZXJtTGVuZ3RoRm9yUmVhbChjbWQ6IGNvbW1hbmRlci5Db21tYW5kLCBoZWxwZXI6IFBsaW5rQ29tbWFuZEhlbHApIHtcbiAgICByZXR1cm4gaGVscGVyLnZpc2libGVDb21tYW5kcyhjbWQpLnJlZHVjZSgobWF4LCBjb21tYW5kKSA9PiB7XG4gICAgICByZXR1cm4gTWF0aC5tYXgobWF4LCBzdHJpcEFuc2koaGVscGVyLnN1YmNvbW1hbmRUZXJtKGNvbW1hbmQpKS5sZW5ndGgpO1xuICAgIH0sIDApO1xuICB9XG5cbiAgcHJpdmF0ZSBsb25nZXN0T3B0aW9uVGVybUxlbmd0aEZvclJlYWwoY21kOiBjb21tYW5kZXIuQ29tbWFuZCwgaGVscGVyOiBQbGlua0NvbW1hbmRIZWxwKSB7XG4gICAgcmV0dXJuIGhlbHBlci52aXNpYmxlT3B0aW9ucyhjbWQpLnJlZHVjZSgobWF4LCBvcHRpb24pID0+IHtcbiAgICAgIHJldHVybiBNYXRoLm1heChtYXgsIHN0cmlwQW5zaShoZWxwZXIub3B0aW9uVGVybShvcHRpb24pKS5sZW5ndGgpO1xuICAgIH0sIDApO1xuICB9XG5cbiAgLy8gc3ViY29tbWFuZERlc2NyaXB0aW9uKGNtZDogY29tbWFuZGVyLkNvbW1hbmQpIHtcbiAgLy8gICByZXR1cm4gc3RyaXBBbnNpKHN1cGVyLnN1YmNvbW1hbmREZXNjcmlwdGlvbihjbWQpKTtcbiAgLy8gfVxuXG4gIHByaXZhdGUgcmVhbFBhZFdpZHRoKGNtZDogY29tbWFuZGVyLkNvbW1hbmQsIGhlbHBlcjogUGxpbmtDb21tYW5kSGVscCkge1xuICAgIHJldHVybiBNYXRoLm1heChcbiAgICAgIGhlbHBlci5sb25nZXN0T3B0aW9uVGVybUxlbmd0aEZvclJlYWwoY21kLCBoZWxwZXIpLFxuICAgICAgaGVscGVyLmxvbmdlc3RTdWJjb21tYW5kVGVybUxlbmd0aEZvclJlYWwoY21kLCBoZWxwZXIpLFxuICAgICAgaGVscGVyLmxvbmdlc3RBcmd1bWVudFRlcm1MZW5ndGgoY21kLCBoZWxwZXIpXG4gICAgKTtcbiAgfVxuXG4gIGZvcm1hdEhlbHAoY21kOiBjb21tYW5kZXIuQ29tbWFuZCwgaGVscGVyOiBQbGlua0NvbW1hbmRIZWxwKSB7XG4gICAgLy8gY29uc3QgdGVybVdpZHRoID0gaGVscGVyLnBhZFdpZHRoKGNtZCwgaGVscGVyKTsgLy8gSXQgaXMgYmlnZ2VyIHRoYW4gYWN0dWFsIHdpZHRoIGR1ZSB0byBjb2xvcmZ1bCBjaGFyYWN0ZXJcbiAgICBjb25zdCByZWFsVGVybVdpZHRoID0gaGVscGVyLnJlYWxQYWRXaWR0aChjbWQsIGhlbHBlcik7XG4gICAgLy8gY29uc29sZS5sb2coJ3Rlcm1XaWR0aD0nLCB0ZXJtV2lkdGgpO1xuICAgIGNvbnN0IGhlbHBXaWR0aCA9IGhlbHBlci5oZWxwV2lkdGggfHwgODA7XG4gICAgY29uc3QgaXRlbUluZGVudFdpZHRoID0gMjtcbiAgICBjb25zdCBpdGVtU2VwYXJhdG9yV2lkdGggPSAyOyAvLyBiZXR3ZWVuIHRlcm0gYW5kIGRlc2NyaXB0aW9uXG4gICAgZnVuY3Rpb24gZm9ybWF0SXRlbSh0ZXJtOiBzdHJpbmcsIGRlc2NyaXB0aW9uOiBzdHJpbmcsIHN0eWxlcj86IFBsaW5rQ29tbWFuZFsnbmFtZVN0eWxlciddKSB7XG4gICAgICBpZiAoZGVzY3JpcHRpb24pIHtcbiAgICAgICAgaWYgKGRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgY29uc3QgZnVsbFRleHQgPSBgJHt0ZXJtfSR7JyAnLnJlcGVhdChyZWFsVGVybVdpZHRoICsgaXRlbUluZGVudFdpZHRoIC0gc3RyaXBBbnNpKHRlcm0pLmxlbmd0aCl9JHtkZXNjcmlwdGlvbn1gO1xuICAgICAgICAgIHJldHVybiBoZWxwZXIud3JhcChmdWxsVGV4dCwgaGVscFdpZHRoIC0gaXRlbUluZGVudFdpZHRoLCByZWFsVGVybVdpZHRoICsgaXRlbVNlcGFyYXRvcldpZHRoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGVybTtcbiAgICAgICAgLy8gU3VwcG9ydCBjb2xvcmZ1bCBjaGFyYWN0ZXJzXG4gICAgICAgIC8vIGNvbnN0IGZ1bGxUZXh0ID0gYCR7dGVybX0keycgJy5yZXBlYXQocmVhbFRlcm1XaWR0aCArIGl0ZW1JbmRlbnRXaWR0aCAtIHN0cmlwQW5zaSh0ZXJtKS5sZW5ndGgpfSR7ZGVzY3JpcHRpb259YDtcbiAgICAgICAgLy8gcmV0dXJuIGhlbHBlci53cmFwKGZ1bGxUZXh0LCBoZWxwV2lkdGggLSBpdGVtSW5kZW50V2lkdGgsIHJlYWxUZXJtV2lkdGggKyBpdGVtU2VwYXJhdG9yV2lkdGgpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRlcm07XG4gICAgfVxuICAgIGZ1bmN0aW9uIGZvcm1hdExpc3QodGV4dEFycmF5OiBzdHJpbmdbXSkge1xuICAgICAgcmV0dXJuIHRleHRBcnJheS5qb2luKCdcXG4nKS5yZXBsYWNlKC9eL2dtLCAnICcucmVwZWF0KGl0ZW1JbmRlbnRXaWR0aCkpO1xuICAgIH1cblxuICAgIC8vIFVzYWdlXG4gICAgbGV0IG91dHB1dCA9IFtgVXNhZ2U6ICR7aGVscGVyLmNvbW1hbmRVc2FnZShjbWQpfWAsICcnXTtcblxuICAgIC8vIERlc2NyaXB0aW9uXG4gICAgY29uc3QgY29tbWFuZERlc2NyaXB0aW9uID0gaGVscGVyLmNvbW1hbmREZXNjcmlwdGlvbihjbWQpO1xuICAgIGlmIChjb21tYW5kRGVzY3JpcHRpb24ubGVuZ3RoID4gMCkge1xuICAgICAgb3V0cHV0ID0gb3V0cHV0LmNvbmNhdChbY29tbWFuZERlc2NyaXB0aW9uLCAnJ10pO1xuICAgIH1cblxuICAgIC8vIEFyZ3VtZW50c1xuICAgIGNvbnN0IGFyZ3VtZW50TGlzdCA9IGhlbHBlci52aXNpYmxlQXJndW1lbnRzKGNtZCkubWFwKChhcmd1bWVudCkgPT4ge1xuICAgICAgcmV0dXJuIGZvcm1hdEl0ZW0oaGVscGVyLmFyZ3VtZW50VGVybShhcmd1bWVudCksIGhlbHBlci5hcmd1bWVudERlc2NyaXB0aW9uKGFyZ3VtZW50KSk7XG4gICAgfSk7XG4gICAgaWYgKGFyZ3VtZW50TGlzdC5sZW5ndGggPiAwKSB7XG4gICAgICBvdXRwdXQgPSBvdXRwdXQuY29uY2F0KFsnQXJndW1lbnRzOicsIGZvcm1hdExpc3QoYXJndW1lbnRMaXN0KSwgJyddKTtcbiAgICB9XG5cbiAgICAvLyBPcHRpb25zXG4gICAgY29uc3Qgb3B0aW9uTGlzdCA9IGhlbHBlci52aXNpYmxlT3B0aW9ucyhjbWQpLm1hcCgob3B0aW9uKSA9PiB7XG4gICAgICByZXR1cm4gZm9ybWF0SXRlbShoZWxwZXIub3B0aW9uVGVybShvcHRpb24pLCBoZWxwZXIub3B0aW9uRGVzY3JpcHRpb24ob3B0aW9uKSwgKG9wdGlvbiBhcyBQbGlua0NtZE9wdGlvbikub3B0aW9uU3R5bGVyKTtcbiAgICB9KTtcbiAgICBpZiAob3B0aW9uTGlzdC5sZW5ndGggPiAwKSB7XG4gICAgICBvdXRwdXQgPSBvdXRwdXQuY29uY2F0KFsnT3B0aW9uczonLCBmb3JtYXRMaXN0KG9wdGlvbkxpc3QpLCAnJ10pO1xuICAgIH1cblxuICAgIC8vIENvbW1hbmRzXG4gICAgbGV0IHBrZ05hbWUgPSAnJztcbiAgICBjb25zdCBjb21tYW5kTGlzdCA9IGhlbHBlci52aXNpYmxlQ29tbWFuZHMoY21kKS5tYXAoKGNtZCkgPT4ge1xuICAgICAgbGV0IGhlYWRlciA9ICcnO1xuICAgICAgaWYgKHBrZ05hbWUgIT09IChjbWQgYXMgUGxpbmtDb21tYW5kKS5wa2dOYW1lKSB7XG4gICAgICAgIHBrZ05hbWUgPSAoY21kIGFzIFBsaW5rQ29tbWFuZCkucGtnTmFtZTtcbiAgICAgICAgaGVhZGVyID0gcGtnTmFtZSA/IGBcXG4ke2NoYWxrLmludmVyc2UoY2hhbGsuZ3JheSgnUHJvdmlkZWQgYnkgcGFja2FnZSAnICsgcGtnTmFtZSArICc6ICcpKX1cXG5gIDpcbiAgICAgICAgICAnXFxuJztcbiAgICAgIH1cbiAgICAgIHBrZ05hbWUgPSAoY21kIGFzIFBsaW5rQ29tbWFuZCkucGtnTmFtZTtcbiAgICAgIHJldHVybiBoZWFkZXIgKyBmb3JtYXRJdGVtKGhlbHBlci5zdWJjb21tYW5kVGVybShjbWQpLCBoZWxwZXIuc3ViY29tbWFuZERlc2NyaXB0aW9uKGNtZCksIChjbWQgYXMgUGxpbmtDb21tYW5kKS5uYW1lU3R5bGVyKTtcbiAgICB9KTtcbiAgICBpZiAoY29tbWFuZExpc3QubGVuZ3RoID4gMCkge1xuICAgICAgb3V0cHV0ID0gb3V0cHV0LmNvbmNhdChbJ0NvbW1hbmRzOicsIGZvcm1hdExpc3QoY29tbWFuZExpc3QpLCAnJ10pO1xuICAgIH1cblxuICAgIHJldHVybiBvdXRwdXQuam9pbignXFxuJyk7XG4gIH1cbn1cbi8qKlxuICogRXh0ZW5kIGNvbW1hbmRlciwgY2hlY2sgY29tbWFuZGVyIEFQSSBhdCBodHRwczovL3d3dy5ucG1qcy5jb20vcGFja2FnZS9jb21tYW5kZXJcbiAqL1xuZXhwb3J0IGNsYXNzIFBsaW5rQ29tbWFuZCBleHRlbmRzIGNvbW1hbmRlci5Db21tYW5kIHtcbiAgbmFtZVN0eWxlcj86IChjbWROYW1lOiBzdHJpbmcpID0+IHN0cmluZztcbiAgb3B0aW9uU3R5bGVyPzogKGNtZE5hbWU6IHN0cmluZykgPT4gc3RyaW5nO1xuICBzdWJDbWRzOiBQbGlua0NvbW1hbmRbXSA9IFtdO1xuICAvKiogdmFsdWUgaXMgZmlsZSBwYXRoIGZvciBwa2cgbmFtZSAqL1xuICBsb2FkZWRDbWRNYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBwa2dOYW1lID0gJyc7XG5cbiAgY29uc3RydWN0b3IocHVibGljIGN0eDogQ29tbWFuZENvbnRleHQsIG5hbWU/OiBzdHJpbmcpIHtcbiAgICBzdXBlcihuYW1lKTtcbiAgfVxuXG4gIGFkZEdsb2JhbE9wdGlvbnNUb1N1YkNtZHMoKSB7XG4gICAgaWYgKHRoaXMuc3ViQ21kcyA9PSBudWxsKVxuICAgICAgcmV0dXJuO1xuICAgIGZvciAoY29uc3Qgc3ViQ21kIG9mIHRoaXMuc3ViQ21kcykge1xuICAgICAgd2l0aEdsb2JhbE9wdGlvbnMoc3ViQ21kKTtcbiAgICB9XG4gIH1cblxuICBjcmVhdGVDb21tYW5kKGNtZE5hbWU/OiBzdHJpbmcpOiBjb21tYW5kZXIuQ29tbWFuZCB7XG4gICAgY29uc3QgcGsgPSB0aGlzLmN0eC5jdXJyQ2xpQ3JlYXRvclBrZztcbiAgICBjb25zdCBmaWxlUGF0aCA9IHRoaXMuY3R4LmN1cnJDbGllQ3JlYXRvckZpbGU7XG4gICAgaWYgKGNtZE5hbWUgJiYgY21kTmFtZSAhPT0gJ2hlbHAnKSB7XG4gICAgICBpZiAodGhpcy5sb2FkZWRDbWRNYXAuaGFzKGNtZE5hbWUpKSB7XG4gICAgICAgIGlmIChmaWxlUGF0aClcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENvbmZsaWN0IGNvbW1hbmQgbmFtZSBcIiR7Y21kTmFtZX1cIiBmcm9tIGV4dGVuc2lvbnMgXCIke2ZpbGVQYXRofVwiIGFuZCBcIiR7dGhpcy5sb2FkZWRDbWRNYXAuZ2V0KGNtZE5hbWUpIX1cImApO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb25mbGljdCB3aXRoIGV4aXN0aW5nIFBsaW5rIGNvbW1hbmQgbmFtZSAke2NtZE5hbWV9YCk7XG4gICAgICB9XG4gICAgICB0aGlzLmxvYWRlZENtZE1hcC5zZXQoY21kTmFtZSwgZmlsZVBhdGggPyBmaWxlUGF0aCA6ICdAd2ZoL3BsaW5rJyk7XG4gICAgfVxuXG4gICAgY29uc3Qgc3ViQ21kID0gbmV3IFBsaW5rQ29tbWFuZCh0aGlzLmN0eCwgY21kTmFtZSk7XG4gICAgc3ViQ21kLm5hbWVTdHlsZXIgPSB0aGlzLmN0eC5uYW1lU3R5bGVyO1xuICAgIHN1YkNtZC5wa2dOYW1lID0gcGsgIT0gbnVsbCA/IHBrLm5hbWUgOiAnJztcbiAgICB0aGlzLnN1YkNtZHMucHVzaChzdWJDbWQpO1xuXG4gICAgLy8gc3ViQ21kLnNldENvbnRleHREYXRhKHRoaXMuY3VyckNsaWVDcmVhdG9yRmlsZSwgdGhpcy5jdXJyQ2xpQ3JlYXRvclBrZywgdGhpcy5tZXRhTWFwLCB0aGlzKTtcblxuICAgIGNvbnN0IG1ldGE6IFBhcnRpYWw8T3VyQ29tbWFuZE1ldGFkYXRhPiA9IHtcbiAgICAgIHBrZ05hbWU6IHBrID8gcGsubmFtZSA6ICdAd2ZoL3BsaW5rJyxcbiAgICAgIG5hbWU6IGNtZE5hbWUsXG4gICAgICBvcHRpb25zOiBbXSxcbiAgICAgIGRlc2M6ICcnXG4gICAgfTtcbiAgICB0aGlzLmN0eC5tZXRhTWFwLnNldChzdWJDbWQsIG1ldGEpO1xuICAgIHRoaXMuY3R4LmN1cnJDbGlQa2dNYXRhSW5mb3MucHVzaChtZXRhIGFzIE91ckNvbW1hbmRNZXRhZGF0YSk7XG4gICAgLy8gc3ViQ21kLmRlc2NyaXB0aW9uKG1ldGEuZGVzYyEpO1xuICAgIHJldHVybiBzdWJDbWQ7XG4gIH1cblxuICBkZXNjcmlwdGlvbihzdHI/OiBzdHJpbmcsXG4gICAgYXJnc0Rlc2NyaXB0aW9uPzogeyBbYXJnTmFtZTogc3RyaW5nXTogc3RyaW5nIH0pIHtcbiAgICBpZiAoc3RyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnN0IHBsaW5rTWV0YSA9IHRoaXMuY3R4Lm1ldGFNYXAuZ2V0KHRoaXMpITtcbiAgICAgIHBsaW5rTWV0YS5kZXNjID0gc3RyO1xuICAgICAgaWYgKGFyZ3NEZXNjcmlwdGlvbikge1xuICAgICAgICBwbGlua01ldGEuYXJnRGVzYyA9IGFyZ3NEZXNjcmlwdGlvbjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBhcmdzRGVzY3JpcHRpb24gPyBzdXBlci5kZXNjcmlwdGlvbihzdHIsIGFyZ3NEZXNjcmlwdGlvbikgOiBzdXBlci5kZXNjcmlwdGlvbihzdHIpO1xuICAgIH1cbiAgICByZXR1cm4gc3VwZXIuZGVzY3JpcHRpb24oKSBhcyBhbnk7XG4gIH1cblxuICBhbGlhcyhhbGlhcz86IHN0cmluZykge1xuICAgIGlmIChhbGlhcykge1xuICAgICAgY29uc3QgcGxpbmtNZXRhID0gdGhpcy5jdHgubWV0YU1hcC5nZXQodGhpcykhO1xuICAgICAgcGxpbmtNZXRhLmFsaWFzID0gYWxpYXM7XG4gICAgfVxuICAgIHJldHVybiBzdXBlci5hbGlhcyhhbGlhcyBhcyBhbnkpIGFzIGFueTtcbiAgfVxuXG4gIGNyZWF0ZU9wdGlvbihmbGFnczogc3RyaW5nLCBkZXNjcmlwdGlvbj86IHN0cmluZywgLi4ucmVtYWluaW5nOiBhbnlbXSkge1xuICAgIGxldCBkZWZhdWx0VmFsdWU6IGFueTtcbiAgICBpZiAocmVtYWluaW5nLmxlbmd0aCA+IDEpIHtcbiAgICAgIGRlZmF1bHRWYWx1ZSA9IHJlbWFpbmluZ1tyZW1haW5pbmcubGVuZ3RoIC0gMV07XG4gICAgfVxuICAgIGNvbnN0IHBsaW5rTWV0YSA9IHRoaXMuY3R4Lm1ldGFNYXAuZ2V0KHRoaXMpITtcbiAgICBwbGlua01ldGEub3B0aW9ucyEucHVzaCh7XG4gICAgICBmbGFncywgZGVzYzogZGVzY3JpcHRpb24gfHwgJycsIGRlZmF1bHRWYWx1ZSwgaXNSZXF1aXJlZDogZmFsc2VcbiAgICB9KTtcbiAgICBjb25zdCBvcHQgPSBuZXcgUGxpbmtDbWRPcHRpb24oZmxhZ3MsIGRlc2NyaXB0aW9uKTtcbiAgICBvcHQub3B0aW9uU3R5bGVyID0gdGhpcy5vcHRpb25TdHlsZXI7XG4gICAgcmV0dXJuIG9wdDtcbiAgfVxuICBvcHRpb24oLi4uYXJnczogYW55W10pIHtcbiAgICAodGhpcy5fc2F2ZU9wdGlvbnMgYXMgYW55KShmYWxzZSwgLi4uYXJncyk7XG4gICAgcmV0dXJuIChzdXBlci5vcHRpb24gYXMgYW55KSguLi5hcmdzKTtcbiAgfVxuICByZXF1aXJlZE9wdGlvbiguLi5hcmdzOiBhbnlbXSkge1xuICAgICh0aGlzLl9zYXZlT3B0aW9ucyBhcyBhbnkpKHRydWUsIC4uLmFyZ3MpO1xuICAgIHJldHVybiAoc3VwZXIucmVxdWlyZWRPcHRpb24gYXMgYW55KSguLi5hcmdzKTtcbiAgfVxuICBhY3Rpb24oZm46ICguLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCB8IFByb21pc2U8dm9pZD4pIHtcbiAgICBmdW5jdGlvbiBhY3Rpb25DYWxsYmFjayh0aGlzOiBjb21tYW5kZXIuQ29tbWFuZCwgLi4uYXJnczogYW55W10pIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHtpbml0Q29uZmlnfSA9IHJlcXVpcmUoJy4uL3V0aWxzL2Jvb3RzdHJhcC1wcm9jZXNzJykgYXMgdHlwZW9mIF9ib290c3RyYXA7XG4gICAgICAgIGluaXRDb25maWcodGhpcy5vcHRzKCkgKTtcbiAgICAgICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBsb2cuZXJyb3IoZSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzdXBlci5hY3Rpb24oYWN0aW9uQ2FsbGJhY2spO1xuICB9XG4gIGNyZWF0ZUhlbHAoKSB7XG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24obmV3IFBsaW5rQ29tbWFuZEhlbHAoKSwgdGhpcy5jb25maWd1cmVIZWxwKCkpO1xuICB9XG4gIF9zYXZlT3B0aW9ucyhpc1JlcXVpcmVkOiBib29sZWFuLCBmbGFnczogc3RyaW5nLCBkZXNjOiBzdHJpbmcsIC4uLnJlbWFpbmluZzogYW55W10pIHtcbiAgICBsZXQgZGVmYXVsdFZhbHVlOiBhbnk7XG4gICAgaWYgKHJlbWFpbmluZy5sZW5ndGggPiAxKSB7XG4gICAgICBkZWZhdWx0VmFsdWUgPSByZW1haW5pbmdbcmVtYWluaW5nLmxlbmd0aCAtIDFdO1xuICAgIH1cbiAgICBjb25zdCBwbGlua01ldGEgPSB0aGlzLmN0eC5tZXRhTWFwLmdldCh0aGlzKSE7XG4gICAgcGxpbmtNZXRhLm9wdGlvbnMhLnB1c2goe1xuICAgICAgZmxhZ3MsIGRlc2MsIGRlZmF1bHRWYWx1ZSwgaXNSZXF1aXJlZFxuICAgIH0pO1xuICB9XG59XG5cbmV4cG9ydCB0eXBlIENsaUV4dGVuc2lvbiA9IChwcm9ncmFtOiBQbGlua0NvbW1hbmQpID0+IHZvaWQ7XG5cbmNsYXNzIFBsaW5rQ21kT3B0aW9uIGV4dGVuZHMgY29tbWFuZGVyLk9wdGlvbiB7XG4gIG9wdGlvblN0eWxlcj86IChjbWROYW1lOiBzdHJpbmcpID0+IHN0cmluZztcbn1cbmV4cG9ydCBjbGFzcyBDb21tYW5kT3ZlcnJpZGVyIHtcbiAgLy8gbmFtZVN0eWxlcjogUGxpbmtDb21tYW5kWyduYW1lU3R5bGVyJ107XG4gIC8vIHByaXZhdGUgY3VyckNsaWVDcmVhdG9yRmlsZTogc3RyaW5nO1xuICAvLyBwcml2YXRlIGN1cnJDbGlDcmVhdG9yUGtnOiBQYWNrYWdlSW5mbyB8IG51bGwgPSBudWxsO1xuICAvLyBwcml2YXRlIGN1cnJDbGlQa2dNYXRhSW5mb3M6IE91ckNvbW1hbmRNZXRhZGF0YVtdO1xuICAvLyBwcml2YXRlIGFsbFN1YkNtZHM6IE91ckF1Z21lbnRlZENvbW1hbmRlcltdID0gW107XG4gIC8vIHByaXZhdGUgbWV0YU1hcCA9IG5ldyBXZWFrTWFwPGNvbW1hbmRlci5Db21tYW5kLCBQYXJ0aWFsPE91ckNvbW1hbmRNZXRhZGF0YT4+KCk7XG4gIHByaXZhdGUgcGtnTWV0YXNNYXAgPSBuZXcgTWFwPHN0cmluZywgT3VyQ29tbWFuZE1ldGFkYXRhW10+KCk7XG4gIHByaXZhdGUgY3R4OiBQYXJ0aWFsPENvbW1hbmRDb250ZXh0PiA9IHtcbiAgICBtZXRhTWFwOiBuZXcgV2Vha01hcDxjb21tYW5kZXIuQ29tbWFuZCwgUGFydGlhbDxPdXJDb21tYW5kTWV0YWRhdGE+PigpXG4gIH07XG5cbiAgc2V0IG5hbWVTdHlsZXIodjogUGxpbmtDb21tYW5kWyduYW1lU3R5bGVyJ10pIHtcbiAgICB0aGlzLmN0eC5uYW1lU3R5bGVyID0gdjtcbiAgfVxuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcHJvZ3JhbTogY29tbWFuZGVyLkNvbW1hbmQsIHdzPzogV29ya3NwYWNlU3RhdGUpIHtcbiAgICB0aGlzLnByb2dyYW0uY3JlYXRlQ29tbWFuZCA9IFBsaW5rQ29tbWFuZC5wcm90b3R5cGUuY3JlYXRlQ29tbWFuZDtcblxuICAgICh0aGlzLnByb2dyYW0gYXMgUGxpbmtDb21tYW5kKS5jdHggPSB0aGlzLmN0eCBhcyBDb21tYW5kQ29udGV4dDtcbiAgICAodGhpcy5wcm9ncmFtIGFzIFBsaW5rQ29tbWFuZCkuc3ViQ21kcyA9IFtdO1xuICAgICh0aGlzLnByb2dyYW0gYXMgUGxpbmtDb21tYW5kKS5sb2FkZWRDbWRNYXAgPSBuZXcgTWFwKCk7XG4gICAgKHRoaXMucHJvZ3JhbSBhcyBQbGlua0NvbW1hbmQpLmFkZEdsb2JhbE9wdGlvbnNUb1N1YkNtZHMgPSBQbGlua0NvbW1hbmQucHJvdG90eXBlLmFkZEdsb2JhbE9wdGlvbnNUb1N1YkNtZHM7XG4gICAgdGhpcy5wcm9ncmFtLmNyZWF0ZUhlbHAgPSBQbGlua0NvbW1hbmQucHJvdG90eXBlLmNyZWF0ZUhlbHA7XG4gIH1cblxuICBmb3JQYWNrYWdlKHBrOiBQYWNrYWdlSW5mbywgcGtnRmlsZVBhdGg6IHN0cmluZywgZnVuY05hbWU6IHN0cmluZyk6IHZvaWQ7XG4gIGZvclBhY2thZ2UocGs6IG51bGwsIGNvbW1hbmRDcmVhdGlvbjogKHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kKSA9PiB2b2lkKTogdm9pZDtcbiAgZm9yUGFja2FnZShwazogUGFja2FnZUluZm8gfCBudWxsLFxuICAgIHBrZ0ZpbGVQYXRoOiBzdHJpbmcgfCAoKHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kKSA9PiB2b2lkKSxcbiAgICBmdW5jTmFtZT86IHN0cmluZykge1xuICAgIGNvbnN0IGNvbW1hbmRNZXRhSW5mb3M6IE91ckNvbW1hbmRNZXRhZGF0YVtdID0gdGhpcy5jdHguY3VyckNsaVBrZ01hdGFJbmZvcyA9IFtdO1xuICAgIHRoaXMuY3R4LmN1cnJDbGlDcmVhdG9yUGtnID0gcGs7XG5cbiAgICBsZXQgZmlsZVBhdGg6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuXG4gICAgaWYgKHR5cGVvZiBwa2dGaWxlUGF0aCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcGtnRmlsZVBhdGgodGhpcy5wcm9ncmFtKTtcbiAgICAgIHRoaXMucGtnTWV0YXNNYXAuc2V0KCdAd2ZoL3BsaW5rJywgY29tbWFuZE1ldGFJbmZvcyk7XG4gICAgfSBlbHNlIGlmIChwaykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgZmlsZVBhdGggPSBQYXRoLnJlc29sdmUocGxpbmtFbnYud29ya0RpciwgJ25vZGVfbW9kdWxlcycsIHBrLm5hbWUgKyAnLycgKyBwa2dGaWxlUGF0aCk7XG4gICAgICAgIHRoaXMuY3R4LmN1cnJDbGllQ3JlYXRvckZpbGUgPSBmaWxlUGF0aDtcbiAgICAgICAgY29uc3Qgc3ViQ21kRmFjdG9yeTogQ2xpRXh0ZW5zaW9uID0gZnVuY05hbWUgPyByZXF1aXJlKGZpbGVQYXRoKVtmdW5jTmFtZV0gOlxuICAgICAgICAgIHJlcXVpcmUoZmlsZVBhdGgpO1xuICAgICAgICBzdWJDbWRGYWN0b3J5KHRoaXMucHJvZ3JhbSBhcyBQbGlua0NvbW1hbmQpO1xuICAgICAgICB0aGlzLnBrZ01ldGFzTWFwLnNldChway5uYW1lLCBjb21tYW5kTWV0YUluZm9zKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgbG9nLndhcm4oYEZhaWxlZCB0byBsb2FkIGNvbW1hbmQgbGluZSBleHRlbnNpb24gaW4gcGFja2FnZSAke3BrLm5hbWV9OiBcIiR7ZS5tZXNzYWdlIGFzIHN0cmluZ31cImAsIGUpO1xuICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgZmlsZVBhdGggPSBudWxsO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLmN0eC5jdXJyQ2xpQ3JlYXRvclBrZyA9IG51bGw7XG4gIH1cblxuICBhcHBlbmRHbG9iYWxPcHRpb25zKHNhdmVUb1N0b3JlOiBib29sZWFuKSB7XG4gICAgKHRoaXMucHJvZ3JhbSBhcyBQbGlua0NvbW1hbmQpLmFkZEdsb2JhbE9wdGlvbnNUb1N1YkNtZHMoKTtcbiAgICAvLyBmb3IgKGNvbnN0IGNtZCBvZiB0aGlzLmFsbFN1YkNtZHMpIHtcbiAgICAvLyAgIHdpdGhHbG9iYWxPcHRpb25zKGNtZCk7XG4gICAgLy8gfVxuICAgIGlmICghc2F2ZVRvU3RvcmUpXG4gICAgICByZXR1cm47XG4gICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiB7XG4gICAgICBmb3IgKGNvbnN0IFtwa2csIG1ldGFzXSBvZiB0aGlzLnBrZ01ldGFzTWFwLmVudHJpZXMoKSkge1xuICAgICAgICBjbGlBY3Rpb25EaXNwYXRjaGVyLmFkZENvbW1hbmRNZXRhKHtwa2csIG1ldGFzfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdpdGhDd2RPcHRpb24oY21kOiBjb21tYW5kZXIuQ29tbWFuZCk6IGNvbW1hbmRlci5Db21tYW5kIHtcbiAgaWYgKGNtZCBpbnN0YW5jZW9mIFBsaW5rQ29tbWFuZClcbiAgICBjbWQub3B0aW9uU3R5bGVyID0gc3RyID0+IGNoYWxrLmdyYXkoc3RyKTtcblxuICBjb25zdCBjbWRPYmogPSBjbWQub3B0aW9uKCctLXNwYWNlLC0tY3dkIDx3b3JraW5nIGRpcj4nLCAnUnVuIGNvbW1hbmQgaW4gYSBkaWZmZXJlbnQgd29ya3RyZWUgZGlyZWN0b3J5OiBbJyArXG4gICAgWy4uLmdldFN0YXRlKCkud29ya3NwYWNlcy5rZXlzKCldLmpvaW4oJywgJykgKyAnXScpO1xuXG4gIGlmIChjbWQgaW5zdGFuY2VvZiBQbGlua0NvbW1hbmQpXG4gICAgY21kLm9wdGlvblN0eWxlciA9IHVuZGVmaW5lZDtcbiAgcmV0dXJuIGNtZE9iajtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdpdGhHbG9iYWxPcHRpb25zKGNtZDogY29tbWFuZGVyLkNvbW1hbmQgfCBQbGlua0NvbW1hbmQpOiBjb21tYW5kZXIuQ29tbWFuZCB7XG4gIGlmIChnZXRTdGF0ZSgpLndvcmtzcGFjZXMgPT0gbnVsbClcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGdldFN0YXRlKCkpO1xuICB3aXRoQ3dkT3B0aW9uKGNtZCk7XG5cbiAgaWYgKGNtZCBpbnN0YW5jZW9mIFBsaW5rQ29tbWFuZClcbiAgICBjbWQub3B0aW9uU3R5bGVyID0gc3RyID0+IGNoYWxrLmdyYXkoc3RyKTtcbiAgKGNtZC5vcHRpb24gYXMgY29tbWFuZGVyLkNvbW1hbmRbJ29wdGlvbiddKSgnLWMsIC0tY29uZmlnIDxjb25maWctZmlsZT4nLFxuICAgICdSZWFkIGNvbmZpZyBmaWxlcywgaWYgdGhlcmUgYXJlIG11bHRpcGxlIGZpbGVzLCB0aGUgbGF0dGVyIG9uZSBvdmVycmlkZXMgcHJldmlvdXMgb25lJyxcbiAgICAodmFsdWUsIHByZXYpID0+IHtcbiAgICAgIHByZXYucHVzaCguLi52YWx1ZS5zcGxpdCgnLCcpKTtcbiAgICAgIHJldHVybiBwcmV2O1xuICAgICAgLy8gcmV0dXJuIHByZXYuY29uY2F0KHZhbHVlLnNwbGl0KCcsJykpO1xuICAgIH0sIFtdIGFzIHN0cmluZ1tdKTtcblxuICAoY21kLm9wdGlvbiBhcyBjb21tYW5kZXIuQ29tbWFuZFsnb3B0aW9uJ10pKCctLXByb3AgPGV4cHJlc3Npb24+JyxcbiAgICAnPHByb3BlcnR5IHBhdGg+PTx2YWx1ZSBhcyBKU09OIHwgbGl0ZXJhbD4gLi4uIGRpcmVjdGx5IHNldCBjb25maWd1cmF0aW9uIHByb3BlcnRpZXMsIHByb3BlcnR5IG5hbWUgaXMgbG9kYXNoLnNldCgpIHBhdGgtbGlrZSBzdHJpbmcuIGUuZy4gJyArXG4gICAgJy0tcHJvcCBwb3J0PTgwODAgLS1wcm9wIGRldk1vZGU9ZmFsc2UgLS1wcm9wIEB3ZmgvZm9vYmFyLmFwaT1odHRwOi8vbG9jYWxob3N0OjgwODAgJyArXG4gICAgJy0tcHJvcCBhcnJheWxpa2UucHJvcFswXT1mb29iYXIgJyArXG4gICAgJy0tcHJvcCBbXCJAd2ZoL2Zvby5iYXJcIixcInByb3BcIiwwXT10cnVlJyxcbiAgICBhcnJheU9wdGlvbkZuLCBbXSBhcyBzdHJpbmdbXSlcbiAgLm9wdGlvbignLS12ZXJib3NlJywgJ1NwZWNpZnkgbG9nIGxldmVsIGFzIFwiZGVidWdcIicsIGZhbHNlKVxuICAub3B0aW9uKCctLWRldicsICdCeSB0dXJuaW5nIG9uIHRoaXMgb3B0aW9uLCcgK1xuICAgICcgUGxpbmsgc2V0dGluZyBwcm9wZXJ0eSBcImRldk1vZGVcIiB3aWxsIGF1dG9tYXRjaWFsbHkgc2V0IHRvIGB0cnVlYCwnICtcbiAgICAnIGFuZCBwcm9jZXNzLmVudi5OT0RFX0VOViB3aWxsIGFsc28gYmVpbmcgdXBkYXRlZCB0byBcXCdkZXZlbG9wZW1lbnRcXCcgb3IgXFwncHJvZHVjdGlvbiBjb3JyZXNwb25kaW5nbHkuICcsXG4gICAgZmFsc2UpXG4gIC5vcHRpb24oJy0tZW52IDxzZXR0aW5nIGVudmlyb25tZW50PicsICdBIHN0cmluZyBkZW5vdGVzIHJ1bnRpbWUgZW52aXJvbm1lbnQgbmFtZSwgcGFja2FnZSBzZXR0aW5nIGZpbGUgbWF5IHJldHVybiBkaWZmZXJlbnQgdmFsdWVzIGJhc2VkIG9uIGl0cyB2YWx1ZSAoY2xpT3B0aW9ucy5lbnYpJyk7XG4gIGlmIChjbWQgaW5zdGFuY2VvZiBQbGlua0NvbW1hbmQpXG4gICAgY21kLm9wdGlvblN0eWxlciA9IHVuZGVmaW5lZDtcbiAgcmV0dXJuIGNtZDtcbn1cbiJdfQ==