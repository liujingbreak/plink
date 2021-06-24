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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcnJpZGUtY29tbWFuZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL292ZXJyaWRlLWNvbW1hbmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxrR0FBa0c7QUFDbEcsMERBQWtDO0FBRWxDLGtEQUEwQjtBQUMxQixtQ0FBc0M7QUFHdEMsMkNBQWdEO0FBQ2hELG9EQUE0QjtBQUM1Qiw0REFBbUM7QUFFbkMsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsMEJBQTBCLENBQUMsQ0FBQztBQVV6RCxNQUFhLGdCQUFpQixTQUFRLG1CQUFTLENBQUMsSUFBSTtJQUNsRCxjQUFjLENBQUMsR0FBc0I7UUFDbkMsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN0QyxJQUFJLEdBQUcsWUFBWSxZQUFZLElBQUksR0FBRyxDQUFDLFVBQVUsRUFBRTtZQUNqRCxPQUFPLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDNUI7UUFDRCxPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUM7SUFFRCxVQUFVLENBQUMsTUFBc0I7UUFDL0IsT0FBTyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQztJQUNoRixDQUFDO0lBRUQsa0NBQWtDLENBQUMsR0FBc0IsRUFBRSxNQUF3QjtRQUNqRixPQUFPLE1BQU0sQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxFQUFFO1lBQ3pELE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsb0JBQVMsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFB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SyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQy9CLE9BQU8sSUFBSSxDQUFDO1FBQ1osd0NBQXdDO0lBQzFDLENBQUMsRUFBRSxFQUFjLENBQUMsQ0FBQztJQUVwQixHQUFHLENBQUMsTUFBc0MsQ0FBQyxxQkFBcUIsRUFDL0QsNElBQTRJO1FBQzVJLHFGQUFxRjtRQUNyRixrQ0FBa0M7UUFDbEMsdUNBQXVDLEVBQ3ZDLHFCQUFhLEVBQUUsRUFBYyxDQUFDO1NBQy9CLE1BQU0sQ0FBQyxXQUFXLEVBQUUsOEJBQThCLEVBQUUsS0FBSyxDQUFDO1NBQzFELE1BQU0sQ0FBQyxPQUFPLEVBQUUsNEJBQTRCO1FBQzNDLHFFQUFxRTtRQUNyRSx5R0FBeUcsRUFDekcsS0FBSyxDQUFDO1NBQ1AsTUFBTSxDQUFDLDZCQUE2QixFQUFFLGlJQUFpSSxDQUFDLENBQUM7SUFDMUssSUFBSSxHQUFHLFlBQVksWUFBWTtRQUM3QixHQUFHLENBQUMsWUFBWSxHQUFHLFNBQVMsQ0FBQztJQUMvQixPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUM7QUExQkQsOENBMEJDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50LCAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1yZXR1cm4gKi9cbmltcG9ydCBjb21tYW5kZXIgZnJvbSAnY29tbWFuZGVyJztcbmltcG9ydCB7V29ya3NwYWNlU3RhdGUsIFBhY2thZ2VJbmZvfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHthcnJheU9wdGlvbkZufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCAqIGFzIF9ib290c3RyYXAgZnJvbSAnLi4vdXRpbHMvYm9vdHN0cmFwLXByb2Nlc3MnO1xuaW1wb3J0IHsgR2xvYmFsT3B0aW9ucywgT3VyQ29tbWFuZE1ldGFkYXRhIH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge2NsaUFjdGlvbkRpc3BhdGNoZXJ9IGZyb20gJy4vY2xpLXNsaWNlJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCBzdHJpcEFuc2kgZnJvbSAnc3RyaXAtYW5zaSc7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLm92ZXJyaWRlLWNvbW1hbmRlcicpO1xuXG5pbnRlcmZhY2UgQ29tbWFuZENvbnRleHQge1xuICBjdXJyQ2xpZUNyZWF0b3JGaWxlOiBzdHJpbmc7XG4gIGN1cnJDbGlDcmVhdG9yUGtnOiBQYWNrYWdlSW5mbyB8IG51bGw7XG4gIG1ldGFNYXA6IFdlYWtNYXA8UGxpbmtDb21tYW5kLCBQYXJ0aWFsPE91ckNvbW1hbmRNZXRhZGF0YT4+O1xuICBjdXJyQ2xpUGtnTWF0YUluZm9zOiBPdXJDb21tYW5kTWV0YWRhdGFbXTtcbiAgbmFtZVN0eWxlcj86IChjbWROYW1lOiBzdHJpbmcpID0+IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIFBsaW5rQ29tbWFuZEhlbHAgZXh0ZW5kcyBjb21tYW5kZXIuSGVscCB7XG4gIHN1YmNvbW1hbmRUZXJtKGNtZDogY29tbWFuZGVyLkNvbW1hbmQpOiBzdHJpbmcge1xuICAgIGNvbnN0IHN0ciA9IHN1cGVyLnN1YmNvbW1hbmRUZXJtKGNtZCk7XG4gICAgaWYgKGNtZCBpbnN0YW5jZW9mIFBsaW5rQ29tbWFuZCAmJiBjbWQubmFtZVN0eWxlcikge1xuICAgICAgcmV0dXJuIGNtZC5uYW1lU3R5bGVyKHN0cik7XG4gICAgfVxuICAgIHJldHVybiBzdHI7XG4gIH1cblxuICBvcHRpb25UZXJtKG9wdGlvbjogUGxpbmtDbWRPcHRpb24pIHtcbiAgICByZXR1cm4gb3B0aW9uLm9wdGlvblN0eWxlciA/IG9wdGlvbi5vcHRpb25TdHlsZXIob3B0aW9uLmZsYWdzKSA6IG9wdGlvbi5mbGFncztcbiAgfVxuXG4gIGxvbmdlc3RTdWJjb21tYW5kVGVybUxlbmd0aEZvclJlYWwoY21kOiBjb21tYW5kZXIuQ29tbWFuZCwgaGVscGVyOiBQbGlua0NvbW1hbmRIZWxwKSB7XG4gICAgcmV0dXJuIGhlbHBlci52aXNpYmxlQ29tbWFuZHMoY21kKS5yZWR1Y2UoKG1heCwgY29tbWFuZCkgPT4ge1xuICAgICAgcmV0dXJuIE1hdGgubWF4KG1heCwgc3RyaXBBbnNpKGhlbHBlci5zdWJjb21tYW5kVGVybShjb21tYW5kKSkubGVuZ3RoKTtcbiAgICB9LCAwKTtcbiAgfVxuXG4gIGxvbmdlc3RPcHRpb25UZXJtTGVuZ3RoRm9yUmVhbChjbWQ6IGNvbW1hbmRlci5Db21tYW5kLCBoZWxwZXI6IFBsaW5rQ29tbWFuZEhlbHApIHtcbiAgICByZXR1cm4gaGVscGVyLnZpc2libGVPcHRpb25zKGNtZCkucmVkdWNlKChtYXgsIG9wdGlvbikgPT4ge1xuICAgICAgcmV0dXJuIE1hdGgubWF4KG1heCwgc3RyaXBBbnNpKGhlbHBlci5vcHRpb25UZXJtKG9wdGlvbikpLmxlbmd0aCk7XG4gICAgfSwgMCk7XG4gIH1cblxuICAvLyBzdWJjb21tYW5kRGVzY3JpcHRpb24oY21kOiBjb21tYW5kZXIuQ29tbWFuZCkge1xuICAvLyAgIHJldHVybiBzdHJpcEFuc2koc3VwZXIuc3ViY29tbWFuZERlc2NyaXB0aW9uKGNtZCkpO1xuICAvLyB9XG5cbiAgcmVhbFBhZFdpZHRoKGNtZDogY29tbWFuZGVyLkNvbW1hbmQsIGhlbHBlcjogUGxpbmtDb21tYW5kSGVscCkge1xuICAgIHJldHVybiBNYXRoLm1heChcbiAgICAgIGhlbHBlci5sb25nZXN0T3B0aW9uVGVybUxlbmd0aEZvclJlYWwoY21kLCBoZWxwZXIpLFxuICAgICAgaGVscGVyLmxvbmdlc3RTdWJjb21tYW5kVGVybUxlbmd0aEZvclJlYWwoY21kLCBoZWxwZXIpLFxuICAgICAgaGVscGVyLmxvbmdlc3RBcmd1bWVudFRlcm1MZW5ndGgoY21kLCBoZWxwZXIpXG4gICAgKTtcbiAgfVxuXG4gIGZvcm1hdEhlbHAoY21kOiBjb21tYW5kZXIuQ29tbWFuZCwgaGVscGVyOiBQbGlua0NvbW1hbmRIZWxwKSB7XG4gICAgLy8gY29uc3QgdGVybVdpZHRoID0gaGVscGVyLnBhZFdpZHRoKGNtZCwgaGVscGVyKTsgLy8gSXQgaXMgYmlnZ2VyIHRoYW4gYWN0dWFsIHdpZHRoIGR1ZSB0byBjb2xvcmZ1bCBjaGFyYWN0ZXJcbiAgICBjb25zdCByZWFsVGVybVdpZHRoID0gaGVscGVyLnJlYWxQYWRXaWR0aChjbWQsIGhlbHBlcik7XG4gICAgLy8gY29uc29sZS5sb2coJ3Rlcm1XaWR0aD0nLCB0ZXJtV2lkdGgpO1xuICAgIGNvbnN0IGhlbHBXaWR0aCA9IGhlbHBlci5oZWxwV2lkdGggfHwgODA7XG4gICAgY29uc3QgaXRlbUluZGVudFdpZHRoID0gMjtcbiAgICBjb25zdCBpdGVtU2VwYXJhdG9yV2lkdGggPSAyOyAvLyBiZXR3ZWVuIHRlcm0gYW5kIGRlc2NyaXB0aW9uXG4gICAgZnVuY3Rpb24gZm9ybWF0SXRlbSh0ZXJtOiBzdHJpbmcsIGRlc2NyaXB0aW9uOiBzdHJpbmcsIHN0eWxlcj86IFBsaW5rQ29tbWFuZFsnbmFtZVN0eWxlciddKSB7XG4gICAgICBpZiAoZGVzY3JpcHRpb24pIHtcbiAgICAgICAgLy8gU3VwcG9ydCBjb2xvcmZ1bCBjaGFyYWN0ZXJzXG4gICAgICAgIGNvbnN0IGZ1bGxUZXh0ID0gYCR7dGVybX0keycgJy5yZXBlYXQocmVhbFRlcm1XaWR0aCArIGl0ZW1JbmRlbnRXaWR0aCAtIHN0cmlwQW5zaSh0ZXJtKS5sZW5ndGgpfSR7ZGVzY3JpcHRpb259YDtcbiAgICAgICAgcmV0dXJuIGhlbHBlci53cmFwKGZ1bGxUZXh0LCBoZWxwV2lkdGggLSBpdGVtSW5kZW50V2lkdGgsIHJlYWxUZXJtV2lkdGggKyBpdGVtU2VwYXJhdG9yV2lkdGgpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRlcm07XG4gICAgfVxuICAgIGZ1bmN0aW9uIGZvcm1hdExpc3QodGV4dEFycmF5OiBzdHJpbmdbXSkge1xuICAgICAgcmV0dXJuIHRleHRBcnJheS5qb2luKCdcXG4nKS5yZXBsYWNlKC9eL2dtLCAnICcucmVwZWF0KGl0ZW1JbmRlbnRXaWR0aCkpO1xuICAgIH1cblxuICAgIC8vIFVzYWdlXG4gICAgY29uc3Qgb3V0cHV0ID0gW2BVc2FnZTogJHtoZWxwZXIuY29tbWFuZFVzYWdlKGNtZCl9YCwgJyddO1xuXG4gICAgLy8gRGVzY3JpcHRpb25cbiAgICBjb25zdCBjb21tYW5kRGVzY3JpcHRpb24gPSBoZWxwZXIuY29tbWFuZERlc2NyaXB0aW9uKGNtZCk7XG4gICAgaWYgKGNvbW1hbmREZXNjcmlwdGlvbi5sZW5ndGggPiAwKSB7XG4gICAgICBvdXRwdXQucHVzaChjb21tYW5kRGVzY3JpcHRpb24sICcnKTtcbiAgICB9XG5cbiAgICAvLyBBcmd1bWVudHNcbiAgICBjb25zdCBhcmd1bWVudExpc3QgPSBoZWxwZXIudmlzaWJsZUFyZ3VtZW50cyhjbWQpLm1hcCgoYXJndW1lbnQpID0+IHtcbiAgICAgIHJldHVybiBmb3JtYXRJdGVtKGFyZ3VtZW50LnRlcm0sIGFyZ3VtZW50LmRlc2NyaXB0aW9uKTtcbiAgICB9KTtcbiAgICBpZiAoYXJndW1lbnRMaXN0Lmxlbmd0aCA+IDApIHtcbiAgICAgIG91dHB1dC5wdXNoKCdBcmd1bWVudHM6JywgZm9ybWF0TGlzdChhcmd1bWVudExpc3QpLCAnJyk7XG4gICAgfVxuXG4gICAgLy8gT3B0aW9uc1xuICAgIGNvbnN0IG9wdGlvbkxpc3QgPSBoZWxwZXIudmlzaWJsZU9wdGlvbnMoY21kKS5tYXAoKG9wdGlvbikgPT4ge1xuICAgICAgcmV0dXJuIGZvcm1hdEl0ZW0oaGVscGVyLm9wdGlvblRlcm0ob3B0aW9uKSwgaGVscGVyLm9wdGlvbkRlc2NyaXB0aW9uKG9wdGlvbiksXG4gICAgICAgIChvcHRpb24gYXMgUGxpbmtDbWRPcHRpb24pLm9wdGlvblN0eWxlcik7XG4gICAgfSk7XG4gICAgaWYgKG9wdGlvbkxpc3QubGVuZ3RoID4gMCkge1xuICAgICAgb3V0cHV0LnB1c2goJ09wdGlvbnM6JywgZm9ybWF0TGlzdChvcHRpb25MaXN0KSwgJycpO1xuICAgIH1cblxuICAgIC8vIENvbW1hbmRzXG4gICAgbGV0IHBrZ05hbWUgPSAnJztcbiAgICBjb25zdCBjb21tYW5kTGlzdCA9IGhlbHBlci52aXNpYmxlQ29tbWFuZHMoY21kKS5tYXAoKGNtZCkgPT4ge1xuICAgICAgbGV0IGhlYWRlciA9ICcnO1xuICAgICAgaWYgKHBrZ05hbWUgIT09IChjbWQgYXMgUGxpbmtDb21tYW5kKS5wa2dOYW1lKSB7XG4gICAgICAgIHBrZ05hbWUgPSAoY21kIGFzIFBsaW5rQ29tbWFuZCkucGtnTmFtZTtcbiAgICAgICAgaGVhZGVyID0gcGtnTmFtZSA/IGBcXG4ke2NoYWxrLmludmVyc2UoY2hhbGsuZ3JheSgnUHJvdmlkZWQgYnkgcGFja2FnZSAnICsgcGtnTmFtZSArICc6ICcpKX1cXG5gIDpcbiAgICAgICAgICAnXFxuJztcbiAgICAgIH1cbiAgICAgIHBrZ05hbWUgPSAoY21kIGFzIFBsaW5rQ29tbWFuZCkucGtnTmFtZTtcbiAgICAgIHJldHVybiBoZWFkZXIgKyBmb3JtYXRJdGVtKGhlbHBlci5zdWJjb21tYW5kVGVybShjbWQpLCBoZWxwZXIuc3ViY29tbWFuZERlc2NyaXB0aW9uKGNtZCksXG4gICAgICAgIChjbWQgYXMgUGxpbmtDb21tYW5kKS5uYW1lU3R5bGVyKTtcbiAgICB9KTtcbiAgICBpZiAoY29tbWFuZExpc3QubGVuZ3RoID4gMCkge1xuICAgICAgb3V0cHV0LnB1c2goJ0NvbW1hbmRzOicsIGZvcm1hdExpc3QoY29tbWFuZExpc3QpLCAnJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG91dHB1dC5qb2luKCdcXG4nKTtcbiAgfVxuXG4gIC8vIHdyYXAoc3RyOiBzdHJpbmcsIHdpZHRoOiBudW1iZXIsIGluZGVudDogbnVtYmVyLCBtaW5Db2x1bW5XaWR0aCA9IDQwKSB7XG4gIC8vICAgLy8gRGV0ZWN0IG1hbnVhbGx5IHdyYXBwZWQgYW5kIGluZGVudGVkIHN0cmluZ3MgYnkgc2VhcmNoaW5nIGZvciBsaW5lIGJyZWFrc1xuICAvLyAgIC8vIGZvbGxvd2VkIGJ5IG11bHRpcGxlIHNwYWNlcy90YWJzLlxuICAvLyAgIGlmIChzdHIubWF0Y2goL1tcXG5dXFxzKy8pKSByZXR1cm4gc3RyO1xuICAvLyAgIC8vIERvIG5vdCB3cmFwIGlmIG5vdCBlbm91Z2ggcm9vbSBmb3IgYSB3cmFwcGVkIGNvbHVtbiBvZiB0ZXh0IChhcyBjb3VsZCBlbmQgdXAgd2l0aCBhIHdvcmQgcGVyIGxpbmUpLlxuICAvLyAgIGNvbnN0IGNvbHVtbldpZHRoID0gd2lkdGggLSBpbmRlbnQ7XG4gIC8vICAgaWYgKGNvbHVtbldpZHRoIDwgbWluQ29sdW1uV2lkdGgpIHJldHVybiBzdHI7XG5cbiAgLy8gICBjb25zdCBsZWFkaW5nU3RyID0gc3RyLnN1YnN0cigwLCBpbmRlbnQpO1xuICAvLyAgIGNvbnN0IGNvbHVtblRleHQgPSBzdHIuc3Vic3RyKGluZGVudCk7XG5cbiAgLy8gICBjb25zdCBpbmRlbnRTdHJpbmcgPSAnICcucmVwZWF0KGluZGVudCk7XG4gIC8vICAgY29uc3QgcmVnZXggPSBuZXcgUmVnRXhwKCcuezEsJyArIChjb2x1bW5XaWR0aCAtIDEpICsgJ30oW1xcXFxzXFx1MjAwQl18JCl8W15cXFxcc1xcdTIwMEJdKz8oW1xcXFxzXFx1MjAwQl18JCknLCAnZycpO1xuXG4gIC8vICAgY29uc3QgbGluZXMgPSBjb2x1bW5UZXh0Lm1hdGNoKHJlZ2V4KSB8fCBbXTtcbiAgLy8gICByZXR1cm4gbGVhZGluZ1N0ciArIGxpbmVzLm1hcCgobGluZSwgaSkgPT4ge1xuICAvLyAgICAgaWYgKGxpbmUuc2xpY2UoLTEpID09PSAnXFxuJykge1xuICAvLyAgICAgICBsaW5lID0gbGluZS5zbGljZSgwLCBsaW5lLmxlbmd0aCAtIDEpO1xuICAvLyAgICAgfVxuICAvLyAgICAgcmV0dXJuICgoaSA+IDApID8gaW5kZW50U3RyaW5nIDogJycpICsgbGluZS50cmltUmlnaHQoKTtcbiAgLy8gICB9KS5qb2luKCdcXG4nKTtcbiAgLy8gfVxufVxuLyoqXG4gKiBFeHRlbmQgY29tbWFuZGVyLCBjaGVjayBjb21tYW5kZXIgQVBJIGF0IGh0dHBzOi8vd3d3Lm5wbWpzLmNvbS9wYWNrYWdlL2NvbW1hbmRlclxuICovXG5leHBvcnQgY2xhc3MgUGxpbmtDb21tYW5kIGV4dGVuZHMgY29tbWFuZGVyLkNvbW1hbmQge1xuICBuYW1lU3R5bGVyPzogKGNtZE5hbWU6IHN0cmluZykgPT4gc3RyaW5nO1xuICBvcHRpb25TdHlsZXI/OiAoY21kTmFtZTogc3RyaW5nKSA9PiBzdHJpbmc7XG4gIHN1YkNtZHM6IFBsaW5rQ29tbWFuZFtdID0gW107XG4gIC8qKiB2YWx1ZSBpcyBmaWxlIHBhdGggZm9yIHBrZyBuYW1lICovXG4gIGxvYWRlZENtZE1hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIHBrZ05hbWU6IHN0cmluZztcblxuICBjb25zdHJ1Y3RvcihwdWJsaWMgY3R4OiBDb21tYW5kQ29udGV4dCwgbmFtZT86IHN0cmluZykge1xuICAgIHN1cGVyKG5hbWUpO1xuICB9XG5cbiAgYWRkR2xvYmFsT3B0aW9uc1RvU3ViQ21kcygpIHtcbiAgICBpZiAodGhpcy5zdWJDbWRzID09IG51bGwpXG4gICAgICByZXR1cm47XG4gICAgZm9yIChjb25zdCBzdWJDbWQgb2YgdGhpcy5zdWJDbWRzKSB7XG4gICAgICB3aXRoR2xvYmFsT3B0aW9ucyhzdWJDbWQpO1xuICAgIH1cbiAgfVxuXG4gIGNyZWF0ZUNvbW1hbmQoY21kTmFtZT86IHN0cmluZyk6IGNvbW1hbmRlci5Db21tYW5kIHtcbiAgICBjb25zdCBwayA9IHRoaXMuY3R4LmN1cnJDbGlDcmVhdG9yUGtnO1xuICAgIGNvbnN0IGZpbGVQYXRoID0gdGhpcy5jdHguY3VyckNsaWVDcmVhdG9yRmlsZTtcbiAgICBpZiAoY21kTmFtZSAmJiBjbWROYW1lICE9PSAnaGVscCcpIHtcbiAgICAgIGlmICh0aGlzLmxvYWRlZENtZE1hcC5oYXMoY21kTmFtZSkpIHtcbiAgICAgICAgaWYgKGZpbGVQYXRoKVxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgQ29uZmxpY3QgY29tbWFuZCBuYW1lIFwiJHtjbWROYW1lfVwiIGZyb20gZXh0ZW5zaW9ucyBcIiR7ZmlsZVBhdGh9XCIgYW5kIFwiJHt0aGlzLmxvYWRlZENtZE1hcC5nZXQoY21kTmFtZSkhfVwiYCk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENvbmZsaWN0IHdpdGggZXhpc3RpbmcgUGxpbmsgY29tbWFuZCBuYW1lICR7Y21kTmFtZX1gKTtcbiAgICAgIH1cbiAgICAgIHRoaXMubG9hZGVkQ21kTWFwLnNldChjbWROYW1lLCBmaWxlUGF0aCA/IGZpbGVQYXRoIDogJ0B3ZmgvcGxpbmsnKTtcbiAgICB9XG5cbiAgICBjb25zdCBzdWJDbWQgPSBuZXcgUGxpbmtDb21tYW5kKHRoaXMuY3R4LCBjbWROYW1lKTtcbiAgICBzdWJDbWQubmFtZVN0eWxlciA9IHRoaXMuY3R4Lm5hbWVTdHlsZXI7XG4gICAgc3ViQ21kLnBrZ05hbWUgPSBwayAhPSBudWxsID8gcGsubmFtZSA6ICcnO1xuICAgIHRoaXMuc3ViQ21kcy5wdXNoKHN1YkNtZCk7XG5cbiAgICAvLyBzdWJDbWQuc2V0Q29udGV4dERhdGEodGhpcy5jdXJyQ2xpZUNyZWF0b3JGaWxlLCB0aGlzLmN1cnJDbGlDcmVhdG9yUGtnLCB0aGlzLm1ldGFNYXAsIHRoaXMpO1xuXG4gICAgY29uc3QgbWV0YTogUGFydGlhbDxPdXJDb21tYW5kTWV0YWRhdGE+ID0ge1xuICAgICAgcGtnTmFtZTogcGsgPyBway5uYW1lIDogJ0B3ZmgvcGxpbmsnLFxuICAgICAgbmFtZTogY21kTmFtZSxcbiAgICAgIG9wdGlvbnM6IFtdLFxuICAgICAgZGVzYzogJydcbiAgICB9O1xuICAgIHRoaXMuY3R4Lm1ldGFNYXAuc2V0KHN1YkNtZCwgbWV0YSk7XG4gICAgdGhpcy5jdHguY3VyckNsaVBrZ01hdGFJbmZvcy5wdXNoKG1ldGEgYXMgT3VyQ29tbWFuZE1ldGFkYXRhKTtcbiAgICAvLyBzdWJDbWQuZGVzY3JpcHRpb24obWV0YS5kZXNjISk7XG4gICAgcmV0dXJuIHN1YkNtZDtcbiAgfVxuXG4gIGRlc2NyaXB0aW9uKHN0cj86IHN0cmluZyxcbiAgICBhcmdzRGVzY3JpcHRpb24/OiB7IFthcmdOYW1lOiBzdHJpbmddOiBzdHJpbmc7IH0pIHtcbiAgICBpZiAoc3RyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnN0IHBsaW5rTWV0YSA9IHRoaXMuY3R4Lm1ldGFNYXAuZ2V0KHRoaXMpITtcbiAgICAgIHBsaW5rTWV0YS5kZXNjID0gc3RyO1xuICAgICAgaWYgKGFyZ3NEZXNjcmlwdGlvbikge1xuICAgICAgICBwbGlua01ldGEuYXJnRGVzYyA9IGFyZ3NEZXNjcmlwdGlvbjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzdXBlci5kZXNjcmlwdGlvbihzdHIsIGFyZ3NEZXNjcmlwdGlvbik7XG4gICAgfVxuICAgIHJldHVybiBzdXBlci5kZXNjcmlwdGlvbigpIGFzIGFueTtcbiAgfVxuXG4gIGFsaWFzKGFsaWFzPzogc3RyaW5nKSB7XG4gICAgaWYgKGFsaWFzKSB7XG4gICAgICBjb25zdCBwbGlua01ldGEgPSB0aGlzLmN0eC5tZXRhTWFwLmdldCh0aGlzKSE7XG4gICAgICBwbGlua01ldGEuYWxpYXMgPSBhbGlhcztcbiAgICB9XG4gICAgcmV0dXJuIHN1cGVyLmFsaWFzKGFsaWFzIGFzIGFueSkgYXMgYW55O1xuICB9XG5cbiAgY3JlYXRlT3B0aW9uKGZsYWdzOiBzdHJpbmcsIGRlc2NyaXB0aW9uPzogc3RyaW5nLCAuLi5yZW1haW5pbmc6IGFueVtdKSB7XG4gICAgbGV0IGRlZmF1bHRWYWx1ZTogYW55O1xuICAgIGlmIChyZW1haW5pbmcubGVuZ3RoID4gMSkge1xuICAgICAgZGVmYXVsdFZhbHVlID0gcmVtYWluaW5nW3JlbWFpbmluZy5sZW5ndGggLSAxXTtcbiAgICB9XG4gICAgY29uc3QgcGxpbmtNZXRhID0gdGhpcy5jdHgubWV0YU1hcC5nZXQodGhpcykhO1xuICAgIHBsaW5rTWV0YS5vcHRpb25zIS5wdXNoKHtcbiAgICAgIGZsYWdzLCBkZXNjOiBkZXNjcmlwdGlvbiB8fCAnJywgZGVmYXVsdFZhbHVlLCBpc1JlcXVpcmVkOiBmYWxzZVxuICAgIH0pO1xuICAgIGNvbnN0IG9wdCA9IG5ldyBQbGlua0NtZE9wdGlvbihmbGFncywgZGVzY3JpcHRpb24pO1xuICAgIG9wdC5vcHRpb25TdHlsZXIgPSB0aGlzLm9wdGlvblN0eWxlcjtcbiAgICByZXR1cm4gb3B0O1xuICB9XG4gIG9wdGlvbiguLi5hcmdzOiBhbnlbXSkge1xuICAgICh0aGlzLl9zYXZlT3B0aW9ucyBhcyBhbnkpKGZhbHNlLCAuLi5hcmdzKTtcbiAgICByZXR1cm4gKHN1cGVyLm9wdGlvbiBhcyBhbnkpKC4uLmFyZ3MpO1xuICB9XG4gIHJlcXVpcmVkT3B0aW9uKC4uLmFyZ3M6IGFueVtdKSB7XG4gICAgKHRoaXMuX3NhdmVPcHRpb25zIGFzIGFueSkodHJ1ZSwgLi4uYXJncyk7XG4gICAgcmV0dXJuIChzdXBlci5yZXF1aXJlZE9wdGlvbiBhcyBhbnkpKC4uLmFyZ3MpO1xuICB9XG4gIGFjdGlvbihmbjogKC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkIHwgUHJvbWlzZTx2b2lkPikge1xuICAgIGZ1bmN0aW9uIGFjdGlvbkNhbGxiYWNrKCkge1xuICAgICAgY29uc3Qge2luaXRDb25maWd9ID0gcmVxdWlyZSgnLi4vdXRpbHMvYm9vdHN0cmFwLXByb2Nlc3MnKSBhcyB0eXBlb2YgX2Jvb3RzdHJhcDtcbiAgICAgIGluaXRDb25maWcodGhpcy5vcHRzKCkgYXMgR2xvYmFsT3B0aW9ucyk7XG4gICAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgcmV0dXJuIHN1cGVyLmFjdGlvbihhY3Rpb25DYWxsYmFjayk7XG4gIH1cbiAgY3JlYXRlSGVscCgpIHtcbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihuZXcgUGxpbmtDb21tYW5kSGVscCgpLCB0aGlzLmNvbmZpZ3VyZUhlbHAoKSk7XG4gIH1cbiAgX3NhdmVPcHRpb25zKGlzUmVxdWlyZWQ6IGJvb2xlYW4sIGZsYWdzOiBzdHJpbmcsIGRlc2M6IHN0cmluZywgLi4ucmVtYWluaW5nOiBhbnlbXSkge1xuICAgIGxldCBkZWZhdWx0VmFsdWU6IGFueTtcbiAgICBpZiAocmVtYWluaW5nLmxlbmd0aCA+IDEpIHtcbiAgICAgIGRlZmF1bHRWYWx1ZSA9IHJlbWFpbmluZ1tyZW1haW5pbmcubGVuZ3RoIC0gMV07XG4gICAgfVxuICAgIGNvbnN0IHBsaW5rTWV0YSA9IHRoaXMuY3R4Lm1ldGFNYXAuZ2V0KHRoaXMpITtcbiAgICBwbGlua01ldGEub3B0aW9ucyEucHVzaCh7XG4gICAgICBmbGFncywgZGVzYywgZGVmYXVsdFZhbHVlLCBpc1JlcXVpcmVkXG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IHR5cGUgQ2xpRXh0ZW5zaW9uID0gKHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kKSA9PiB2b2lkO1xuXG5jbGFzcyBQbGlua0NtZE9wdGlvbiBleHRlbmRzIGNvbW1hbmRlci5PcHRpb24ge1xuICBvcHRpb25TdHlsZXI/OiAoY21kTmFtZTogc3RyaW5nKSA9PiBzdHJpbmc7XG59XG5leHBvcnQgY2xhc3MgQ29tbWFuZE92ZXJyaWRlciB7XG4gIC8vIG5hbWVTdHlsZXI6IFBsaW5rQ29tbWFuZFsnbmFtZVN0eWxlciddO1xuICAvLyBwcml2YXRlIGN1cnJDbGllQ3JlYXRvckZpbGU6IHN0cmluZztcbiAgLy8gcHJpdmF0ZSBjdXJyQ2xpQ3JlYXRvclBrZzogUGFja2FnZUluZm8gfCBudWxsID0gbnVsbDtcbiAgLy8gcHJpdmF0ZSBjdXJyQ2xpUGtnTWF0YUluZm9zOiBPdXJDb21tYW5kTWV0YWRhdGFbXTtcbiAgLy8gcHJpdmF0ZSBhbGxTdWJDbWRzOiBPdXJBdWdtZW50ZWRDb21tYW5kZXJbXSA9IFtdO1xuICAvLyBwcml2YXRlIG1ldGFNYXAgPSBuZXcgV2Vha01hcDxjb21tYW5kZXIuQ29tbWFuZCwgUGFydGlhbDxPdXJDb21tYW5kTWV0YWRhdGE+PigpO1xuICBwcml2YXRlIHBrZ01ldGFzTWFwID0gbmV3IE1hcDxzdHJpbmcsIE91ckNvbW1hbmRNZXRhZGF0YVtdPigpO1xuICBwcml2YXRlIGN0eDogUGFydGlhbDxDb21tYW5kQ29udGV4dD4gPSB7XG4gICAgbWV0YU1hcDogbmV3IFdlYWtNYXA8Y29tbWFuZGVyLkNvbW1hbmQsIFBhcnRpYWw8T3VyQ29tbWFuZE1ldGFkYXRhPj4oKVxuICB9O1xuXG4gIHNldCBuYW1lU3R5bGVyKHY6IFBsaW5rQ29tbWFuZFsnbmFtZVN0eWxlciddKSB7XG4gICAgdGhpcy5jdHgubmFtZVN0eWxlciA9IHY7XG4gIH1cblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kLCB3cz86IFdvcmtzcGFjZVN0YXRlKSB7XG4gICAgdGhpcy5wcm9ncmFtLmNyZWF0ZUNvbW1hbmQgPSBQbGlua0NvbW1hbmQucHJvdG90eXBlLmNyZWF0ZUNvbW1hbmQ7XG5cbiAgICAodGhpcy5wcm9ncmFtIGFzIFBsaW5rQ29tbWFuZCkuY3R4ID0gdGhpcy5jdHggYXMgQ29tbWFuZENvbnRleHQ7XG4gICAgKHRoaXMucHJvZ3JhbSBhcyBQbGlua0NvbW1hbmQpLnN1YkNtZHMgPSBbXTtcbiAgICAodGhpcy5wcm9ncmFtIGFzIFBsaW5rQ29tbWFuZCkubG9hZGVkQ21kTWFwID0gbmV3IE1hcCgpO1xuICAgICh0aGlzLnByb2dyYW0gYXMgUGxpbmtDb21tYW5kKS5hZGRHbG9iYWxPcHRpb25zVG9TdWJDbWRzID0gUGxpbmtDb21tYW5kLnByb3RvdHlwZS5hZGRHbG9iYWxPcHRpb25zVG9TdWJDbWRzO1xuICAgIHRoaXMucHJvZ3JhbS5jcmVhdGVIZWxwID0gUGxpbmtDb21tYW5kLnByb3RvdHlwZS5jcmVhdGVIZWxwO1xuICB9XG5cbiAgZm9yUGFja2FnZShwazogUGFja2FnZUluZm8sIHBrZ0ZpbGVQYXRoOiBzdHJpbmcsIGZ1bmNOYW1lOiBzdHJpbmcpOiB2b2lkO1xuICBmb3JQYWNrYWdlKHBrOiBudWxsLCBjb21tYW5kQ3JlYXRpb246IChwcm9ncmFtOiBjb21tYW5kZXIuQ29tbWFuZCkgPT4gdm9pZCk6IHZvaWQ7XG4gIGZvclBhY2thZ2UocGs6IFBhY2thZ2VJbmZvIHwgbnVsbCxcbiAgICBwa2dGaWxlUGF0aDogc3RyaW5nIHwgKChwcm9ncmFtOiBjb21tYW5kZXIuQ29tbWFuZCkgPT4gdm9pZCksXG4gICAgZnVuY05hbWU/OiBzdHJpbmcpIHtcbiAgICBjb25zdCBjb21tYW5kTWV0YUluZm9zOiBPdXJDb21tYW5kTWV0YWRhdGFbXSA9IHRoaXMuY3R4LmN1cnJDbGlQa2dNYXRhSW5mb3MgPSBbXTtcbiAgICB0aGlzLmN0eC5jdXJyQ2xpQ3JlYXRvclBrZyA9IHBrO1xuXG4gICAgbGV0IGZpbGVQYXRoOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcblxuICAgIGlmICh0eXBlb2YgcGtnRmlsZVBhdGggPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHBrZ0ZpbGVQYXRoKHRoaXMucHJvZ3JhbSk7XG4gICAgICB0aGlzLnBrZ01ldGFzTWFwLnNldCgnQHdmaC9wbGluaycsIGNvbW1hbmRNZXRhSW5mb3MpO1xuICAgIH0gZWxzZSBpZiAocGspIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGZpbGVQYXRoID0gcmVxdWlyZS5yZXNvbHZlKHBrLm5hbWUgKyAnLycgKyBwa2dGaWxlUGF0aCk7XG4gICAgICAgIHRoaXMuY3R4LmN1cnJDbGllQ3JlYXRvckZpbGUgPSBmaWxlUGF0aDtcbiAgICAgICAgY29uc3Qgc3ViQ21kRmFjdG9yeTogQ2xpRXh0ZW5zaW9uID0gZnVuY05hbWUgPyByZXF1aXJlKGZpbGVQYXRoKVtmdW5jTmFtZV0gOlxuICAgICAgICAgIHJlcXVpcmUoZmlsZVBhdGgpO1xuICAgICAgICBzdWJDbWRGYWN0b3J5KHRoaXMucHJvZ3JhbSBhcyBQbGlua0NvbW1hbmQpO1xuICAgICAgICB0aGlzLnBrZ01ldGFzTWFwLnNldChway5uYW1lLCBjb21tYW5kTWV0YUluZm9zKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgbG9nLndhcm4oYEZhaWxlZCB0byBsb2FkIGNvbW1hbmQgbGluZSBleHRlbnNpb24gaW4gcGFja2FnZSAke3BrLm5hbWV9OiBcIiR7ZS5tZXNzYWdlIGFzIHN0cmluZ31cImAsIGUpO1xuICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgZmlsZVBhdGggPSBudWxsO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLmN0eC5jdXJyQ2xpQ3JlYXRvclBrZyA9IG51bGw7XG4gIH1cblxuICBhcHBlbmRHbG9iYWxPcHRpb25zKHNhdmVUb1N0b3JlOiBib29sZWFuKSB7XG4gICAgKHRoaXMucHJvZ3JhbSBhcyBQbGlua0NvbW1hbmQpLmFkZEdsb2JhbE9wdGlvbnNUb1N1YkNtZHMoKTtcbiAgICAvLyBmb3IgKGNvbnN0IGNtZCBvZiB0aGlzLmFsbFN1YkNtZHMpIHtcbiAgICAvLyAgIHdpdGhHbG9iYWxPcHRpb25zKGNtZCk7XG4gICAgLy8gfVxuICAgIGlmICghc2F2ZVRvU3RvcmUpXG4gICAgICByZXR1cm47XG4gICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiB7XG4gICAgICBmb3IgKGNvbnN0IFtwa2csIG1ldGFzXSBvZiB0aGlzLnBrZ01ldGFzTWFwLmVudHJpZXMoKSkge1xuICAgICAgICBjbGlBY3Rpb25EaXNwYXRjaGVyLmFkZENvbW1hbmRNZXRhKHtwa2csIG1ldGFzfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdpdGhHbG9iYWxPcHRpb25zKGNtZDogY29tbWFuZGVyLkNvbW1hbmQgfCBQbGlua0NvbW1hbmQpOiBjb21tYW5kZXIuQ29tbWFuZCB7XG4gIGlmIChjbWQgaW5zdGFuY2VvZiBQbGlua0NvbW1hbmQpXG4gICAgY21kLm9wdGlvblN0eWxlciA9IHN0ciA9PiBjaGFsay5ncmF5KHN0cik7XG4gIChjbWQub3B0aW9uIGFzIGNvbW1hbmRlci5Db21tYW5kWydvcHRpb24nXSkoJy1jLCAtLWNvbmZpZyA8Y29uZmlnLWZpbGU+JyxcbiAgICAnUmVhZCBjb25maWcgZmlsZXMsIGlmIHRoZXJlIGFyZSBtdWx0aXBsZSBmaWxlcywgdGhlIGxhdHRlciBvbmUgb3ZlcnJpZGVzIHByZXZpb3VzIG9uZScsXG4gICAgKHZhbHVlLCBwcmV2KSA9PiB7XG4gICAgICBwcmV2LnB1c2goLi4udmFsdWUuc3BsaXQoJywnKSk7XG4gICAgICByZXR1cm4gcHJldjtcbiAgICAgIC8vIHJldHVybiBwcmV2LmNvbmNhdCh2YWx1ZS5zcGxpdCgnLCcpKTtcbiAgICB9LCBbXSBhcyBzdHJpbmdbXSk7XG5cbiAgKGNtZC5vcHRpb24gYXMgY29tbWFuZGVyLkNvbW1hbmRbJ29wdGlvbiddKSgnLS1wcm9wIDxleHByZXNzaW9uPicsXG4gICAgJzxwcm9wZXJ0eSBwYXRoPj08dmFsdWUgYXMgSlNPTiB8IGxpdGVyYWw+IC4uLiBkaXJlY3RseSBzZXQgY29uZmlndXJhdGlvbiBwcm9wZXJ0aWVzLCBwcm9wZXJ0eSBuYW1lIGlzIGxvZGFzaC5zZXQoKSBwYXRoLWxpa2Ugc3RyaW5nLiBlLmcuICcgK1xuICAgICctLXByb3AgcG9ydD04MDgwIC0tcHJvcCBkZXZNb2RlPWZhbHNlIC0tcHJvcCBAd2ZoL2Zvb2Jhci5hcGk9aHR0cDovL2xvY2FsaG9zdDo4MDgwICcgK1xuICAgICctLXByb3AgYXJyYXlsaWtlLnByb3BbMF09Zm9vYmFyICcgK1xuICAgICctLXByb3AgW1wiQHdmaC9mb28uYmFyXCIsXCJwcm9wXCIsMF09dHJ1ZScsXG4gICAgYXJyYXlPcHRpb25GbiwgW10gYXMgc3RyaW5nW10pXG4gIC5vcHRpb24oJy0tdmVyYm9zZScsICdTcGVjaWZ5IGxvZyBsZXZlbCBhcyBcImRlYnVnXCInLCBmYWxzZSlcbiAgLm9wdGlvbignLS1kZXYnLCAnQnkgdHVybmluZyBvbiB0aGlzIG9wdGlvbiwnICtcbiAgICAnIFBsaW5rIHNldHRpbmcgcHJvcGVydHkgXCJkZXZNb2RlXCIgd2lsbCBhdXRvbWF0Y2lhbGx5IHNldCB0byBgdHJ1ZWAsJyArXG4gICAgJyBhbmQgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgd2lsbCBhbHNvIGJlaW5nIHVwZGF0ZWQgdG8gXFwnZGV2ZWxvcGVtZW50XFwnIG9yIFxcJ3Byb2R1Y3Rpb24gY29ycmVzcG9uZGluZ2x5LiAnLFxuICAgIGZhbHNlKVxuICAub3B0aW9uKCctLWVudiA8c2V0dGluZyBlbnZpcm9ubWVudD4nLCAnQSBzdHJpbmcgZGVub3RlcyBydW50aW1lIGVudmlyb25tZW50IG5hbWUsIHBhY2thZ2Ugc2V0dGluZyBmaWxlIG1heSByZXR1cm4gZGlmZmVyZW50IHZhbHVlcyBiYXNlZCBvbiBpdHMgdmFsdWUgKGNsaU9wdGlvbnMuZW52KScpO1xuICBpZiAoY21kIGluc3RhbmNlb2YgUGxpbmtDb21tYW5kKVxuICAgIGNtZC5vcHRpb25TdHlsZXIgPSB1bmRlZmluZWQ7XG4gIHJldHVybiBjbWQ7XG59XG4iXX0=