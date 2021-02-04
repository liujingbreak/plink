"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withGlobalOptions = exports.CommandOverrider = void 0;
const chalk_1 = __importDefault(require("chalk"));
const utils_1 = require("./utils");
const cli_slice_1 = require("./cli-slice");
const log4js_1 = __importDefault(require("log4js"));
const log = log4js_1.default.getLogger('plink.override-commander');
class CommandOverrider {
    constructor(program, ws) {
        this.program = program;
        this.loadedCmdMap = new Map();
        this.currCliCreatorPkg = null;
        this.allSubCmds = [];
        this.metaMap = new WeakMap();
        this.pkgMetasMap = new Map();
        this.origPgmCommand = program.command;
        const self = this;
        function command(nameAndArgs, ...restArgs) {
            const pk = self.currCliCreatorPkg;
            const filePath = self.currClieCreatorFile;
            const cmdName = /^\S+/.exec(nameAndArgs)[0];
            if (self.loadedCmdMap.has(cmdName)) {
                if (filePath)
                    throw new Error(`Conflict command name ${cmdName} from extensions "${filePath}" and "${this.loadedCmdMap.get(cmdName)}"`);
                else
                    throw new Error(`Conflict with existing Plink command name ${cmdName}`);
            }
            self.loadedCmdMap.set(cmdName, filePath ? filePath : '@wfh/plink');
            const subCmd = self.origPgmCommand.call(this, nameAndArgs, ...restArgs);
            const meta = {
                pkgName: pk ? pk.name : '@wfh/plink',
                nameAndArgs,
                options: [],
                desc: pk == null ? '' : chalk_1.default.blue(`[${pk.name}]`)
            };
            self.metaMap.set(subCmd, meta);
            self.currCliPkgMataInfos.push(meta);
            subCmd.description(meta.desc);
            const originDescFn = subCmd.description;
            subCmd.description = description;
            const originActionFn = subCmd.action;
            subCmd.action = action;
            const originAliasFn = subCmd.alias;
            subCmd.alias = alias;
            const originOptionFn = subCmd.option;
            subCmd.option = createOptionFn(false, originOptionFn);
            subCmd._origOption = originOptionFn;
            const originReqOptionFn = subCmd.requiredOption;
            subCmd.requiredOption = createOptionFn(true, originReqOptionFn);
            function description(str, ...remainder) {
                if (pk)
                    str = chalk_1.default.blue(`[${pk.name}]`) + ' ' + str;
                const _plinkMeta = self.metaMap.get(this);
                _plinkMeta.desc = str;
                return originDescFn.call(this, str, ...remainder);
            }
            function alias(alias) {
                if (alias) {
                    const _plinkMeta = self.metaMap.get(this);
                    _plinkMeta.alias = alias;
                }
                return originAliasFn.apply(this, arguments);
            }
            function createOptionFn(isRequired, originOptionFn) {
                return function (flags, desc, ...remaining) {
                    let defaultValue;
                    if (remaining.length > 1) {
                        defaultValue = remaining[remaining.length - 1];
                    }
                    const _plinkMeta = self.metaMap.get(this);
                    _plinkMeta.options.push({
                        flags, desc, defaultValue, isRequired
                    });
                    return originOptionFn.call(this, flags, desc, ...remaining);
                };
            }
            function action(cb) {
                function actionCallback() {
                    const { initConfig } = require('../utils/bootstrap-process');
                    if (subCmd.opts().verbose) {
                        log4js_1.default.configure({
                            appenders: {
                                out: {
                                    type: 'stdout',
                                    layout: { type: 'pattern', pattern: '%[[%p] %c%] - %m' }
                                }
                            },
                            categories: {
                                default: { appenders: ['out'], level: 'debug' },
                                plink: { appenders: ['out'], level: 'debug' }
                            }
                        });
                    }
                    initConfig(subCmd.opts());
                    return cb.apply(this, arguments);
                }
                return originActionFn.call(this, actionCallback);
            }
            self.allSubCmds.push(subCmd);
            return subCmd;
        }
        this.program.command = command;
    }
    forPackage(pk, pkgFilePath, funcName) {
        const commandMetaInfos = this.currCliPkgMataInfos = [];
        this.currCliCreatorPkg = pk;
        let filePath = null;
        if (typeof pkgFilePath === 'function') {
            pkgFilePath(this.program);
            this.pkgMetasMap.set('@wfh/plink', commandMetaInfos);
            // cliActionDispatcher.addCommandMeta({pkg: '@wfh/plink', metas: commandMetaInfos});
        }
        else if (pk) {
            try {
                filePath = require.resolve(pk.name + '/' + pkgFilePath);
                this.currClieCreatorFile = filePath;
                const subCmdFactory = funcName ? require(filePath)[funcName] :
                    require(filePath);
                subCmdFactory(this.program);
                this.pkgMetasMap.set(pk.name, commandMetaInfos);
                // cliActionDispatcher.addCommandMeta({pkg: pk.name, metas: commandMetaInfos});
            }
            catch (e) {
                // tslint:disable-next-line: no-console
                log.warn(`Failed to load command line extension in package ${pk.name}: "${e.message}"`, e);
            }
            finally {
                filePath = null;
            }
        }
    }
    appendGlobalOptions() {
        for (const cmd of this.allSubCmds) {
            withGlobalOptions(cmd);
        }
        for (const [pkg, metas] of this.pkgMetasMap.entries()) {
            cli_slice_1.cliActionDispatcher.addCommandMeta({ pkg, metas });
        }
    }
}
exports.CommandOverrider = CommandOverrider;
function withGlobalOptions(program) {
    if (program._origOption == null) {
        program._origOption = program.option;
    }
    program._origOption('-c, --config <config-file>', utils_1.hlDesc('Read config files, if there are multiple files, the latter one overrides previous one'), (value, prev) => {
        prev.push(...value.split(','));
        return prev;
        // return prev.concat(value.split(','));
    }, [])
        ._origOption('--prop <expression>', utils_1.hlDesc('<property-path>=<value as JSON | literal> ... directly set configuration properties, property name is lodash.set() path-like string\n e.g.\n' +
        '--prop port=8080 --prop devMode=false --prop @wfh/foobar.api=http://localhost:8080\n' +
        '--prop arraylike.prop[0]=foobar\n' +
        '--prop ["@wfh/foo.bar","prop",0]=true'), utils_1.arrayOptionFn, [])
        .option('--verbose', utils_1.hlDesc('Set log level to "debug"'), false);
    // .option('--log-stat', hlDesc('Print internal Redux state/actions for debug'));
    return program;
}
exports.withGlobalOptions = withGlobalOptions;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcnJpZGUtY29tbWFuZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL292ZXJyaWRlLWNvbW1hbmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFFQSxrREFBMEI7QUFDMUIsbUNBQThDO0FBRzlDLDJDQUFnRDtBQUNoRCxvREFBNEI7QUFFNUIsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsMEJBQTBCLENBQUMsQ0FBQztBQUV6RCxNQUFhLGdCQUFnQjtJQVUzQixZQUFvQixPQUEwQixFQUFFLEVBQW1CO1FBQS9DLFlBQU8sR0FBUCxPQUFPLENBQW1CO1FBVHRDLGlCQUFZLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7UUFHekMsc0JBQWlCLEdBQXVCLElBQUksQ0FBQztRQUU3QyxlQUFVLEdBQTRCLEVBQUUsQ0FBQztRQUN6QyxZQUFPLEdBQUcsSUFBSSxPQUFPLEVBQWtELENBQUM7UUFDeEUsZ0JBQVcsR0FBRyxJQUFJLEdBQUcsRUFBZ0MsQ0FBQztRQUc1RCxJQUFJLENBQUMsY0FBYyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUM7UUFDdEMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBRWxCLFNBQVMsT0FBTyxDQUEwQixXQUFtQixFQUFFLEdBQUcsUUFBZTtZQUMvRSxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUM7WUFDbEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDO1lBQzFDLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDN0MsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRTtnQkFDbEMsSUFBSSxRQUFRO29CQUNWLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLE9BQU8scUJBQXFCLFFBQVEsVUFBVSxJQUFJ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SUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQy9CLE9BQU8sSUFBSSxDQUFDO1FBQ1osd0NBQXdDO0lBQzFDLENBQUMsRUFBRSxFQUFjLENBQUM7U0FDbkIsV0FBVyxDQUFDLHFCQUFxQixFQUNoQyxjQUFNLENBQUMsOElBQThJO1FBQ3JKLHNGQUFzRjtRQUN0RixtQ0FBbUM7UUFDbkMsdUNBQXVDLENBQUMsRUFDeEMscUJBQWEsRUFBRSxFQUFjLENBQUM7U0FDL0IsTUFBTSxDQUFDLFdBQVcsRUFBRSxjQUFNLENBQUMsMEJBQTBCLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNoRSxpRkFBaUY7SUFFakYsT0FBTyxPQUFPLENBQUM7QUFDakIsQ0FBQztBQXJCRCw4Q0FxQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY29tbWFuZGVyIGZyb20gJ2NvbW1hbmRlcic7XG5pbXBvcnQge1dvcmtzcGFjZVN0YXRlLCBQYWNrYWdlSW5mb30gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB7aGxEZXNjLCBhcnJheU9wdGlvbkZufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCAqIGFzIF9ib290c3RyYXAgZnJvbSAnLi4vdXRpbHMvYm9vdHN0cmFwLXByb2Nlc3MnO1xuaW1wb3J0IHsgR2xvYmFsT3B0aW9ucywgT3VyQ29tbWFuZE1ldGFkYXRhLCBPdXJBdWdtZW50ZWRDb21tYW5kZXIsIENsaUV4dGVuc2lvbiB9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtjbGlBY3Rpb25EaXNwYXRjaGVyfSBmcm9tICcuL2NsaS1zbGljZSc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLm92ZXJyaWRlLWNvbW1hbmRlcicpO1xuXG5leHBvcnQgY2xhc3MgQ29tbWFuZE92ZXJyaWRlciB7XG4gIHByaXZhdGUgbG9hZGVkQ21kTWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgcHJpdmF0ZSBvcmlnUGdtQ29tbWFuZDogY29tbWFuZGVyLkNvbW1hbmRbJ2NvbW1hbmQnXTtcbiAgcHJpdmF0ZSBjdXJyQ2xpZUNyZWF0b3JGaWxlOiBzdHJpbmc7XG4gIHByaXZhdGUgY3VyckNsaUNyZWF0b3JQa2c6IFBhY2thZ2VJbmZvIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgY3VyckNsaVBrZ01hdGFJbmZvczogT3VyQ29tbWFuZE1ldGFkYXRhW107XG4gIHByaXZhdGUgYWxsU3ViQ21kczogT3VyQXVnbWVudGVkQ29tbWFuZGVyW10gPSBbXTtcbiAgcHJpdmF0ZSBtZXRhTWFwID0gbmV3IFdlYWtNYXA8Y29tbWFuZGVyLkNvbW1hbmQsIFBhcnRpYWw8T3VyQ29tbWFuZE1ldGFkYXRhPj4oKTtcbiAgcHJpdmF0ZSBwa2dNZXRhc01hcCA9IG5ldyBNYXA8c3RyaW5nLCBPdXJDb21tYW5kTWV0YWRhdGFbXT4oKTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kLCB3cz86IFdvcmtzcGFjZVN0YXRlKSB7XG4gICAgdGhpcy5vcmlnUGdtQ29tbWFuZCA9IHByb2dyYW0uY29tbWFuZDtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcblxuICAgIGZ1bmN0aW9uIGNvbW1hbmQodGhpczogY29tbWFuZGVyLkNvbW1hbmQsIG5hbWVBbmRBcmdzOiBzdHJpbmcsIC4uLnJlc3RBcmdzOiBhbnlbXSkge1xuICAgICAgY29uc3QgcGsgPSBzZWxmLmN1cnJDbGlDcmVhdG9yUGtnO1xuICAgICAgY29uc3QgZmlsZVBhdGggPSBzZWxmLmN1cnJDbGllQ3JlYXRvckZpbGU7XG4gICAgICBjb25zdCBjbWROYW1lID0gL15cXFMrLy5leGVjKG5hbWVBbmRBcmdzKSFbMF07XG4gICAgICBpZiAoc2VsZi5sb2FkZWRDbWRNYXAuaGFzKGNtZE5hbWUpKSB7XG4gICAgICAgIGlmIChmaWxlUGF0aClcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENvbmZsaWN0IGNvbW1hbmQgbmFtZSAke2NtZE5hbWV9IGZyb20gZXh0ZW5zaW9ucyBcIiR7ZmlsZVBhdGh9XCIgYW5kIFwiJHt0aGlzLmxvYWRlZENtZE1hcC5nZXQoY21kTmFtZSl9XCJgKTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgQ29uZmxpY3Qgd2l0aCBleGlzdGluZyBQbGluayBjb21tYW5kIG5hbWUgJHtjbWROYW1lfWApO1xuICAgICAgfVxuXG4gICAgICBzZWxmLmxvYWRlZENtZE1hcC5zZXQoY21kTmFtZSwgZmlsZVBhdGggPyBmaWxlUGF0aCA6ICdAd2ZoL3BsaW5rJyk7XG5cbiAgICAgIGNvbnN0IHN1YkNtZDogY29tbWFuZGVyLkNvbW1hbmQgPSBzZWxmLm9yaWdQZ21Db21tYW5kLmNhbGwodGhpcywgbmFtZUFuZEFyZ3MsIC4uLnJlc3RBcmdzKTtcbiAgICAgIGNvbnN0IG1ldGE6IFBhcnRpYWw8T3VyQ29tbWFuZE1ldGFkYXRhPiA9IHtcbiAgICAgICAgcGtnTmFtZTogcGsgPyBway5uYW1lIDogJ0B3ZmgvcGxpbmsnLFxuICAgICAgICBuYW1lQW5kQXJncyxcbiAgICAgICAgb3B0aW9uczogW10sXG4gICAgICAgIGRlc2M6IHBrID09IG51bGwgPyAnJyA6IGNoYWxrLmJsdWUoYFske3BrLm5hbWV9XWApXG4gICAgICB9O1xuICAgICAgc2VsZi5tZXRhTWFwLnNldChzdWJDbWQsIG1ldGEpO1xuICAgICAgc2VsZi5jdXJyQ2xpUGtnTWF0YUluZm9zLnB1c2gobWV0YSBhcyBPdXJDb21tYW5kTWV0YWRhdGEpO1xuXG4gICAgICBzdWJDbWQuZGVzY3JpcHRpb24obWV0YS5kZXNjISk7XG5cbiAgICAgIGNvbnN0IG9yaWdpbkRlc2NGbiA9IHN1YkNtZC5kZXNjcmlwdGlvbjtcblxuICAgICAgc3ViQ21kLmRlc2NyaXB0aW9uID0gZGVzY3JpcHRpb24gYXMgYW55O1xuXG4gICAgICBjb25zdCBvcmlnaW5BY3Rpb25GbiA9IHN1YkNtZC5hY3Rpb247XG4gICAgICBzdWJDbWQuYWN0aW9uID0gYWN0aW9uO1xuXG4gICAgICBjb25zdCBvcmlnaW5BbGlhc0ZuID0gc3ViQ21kLmFsaWFzO1xuICAgICAgc3ViQ21kLmFsaWFzID0gYWxpYXM7XG5cbiAgICAgIGNvbnN0IG9yaWdpbk9wdGlvbkZuID0gc3ViQ21kLm9wdGlvbjtcbiAgICAgIHN1YkNtZC5vcHRpb24gPSBjcmVhdGVPcHRpb25GbihmYWxzZSwgb3JpZ2luT3B0aW9uRm4pO1xuICAgICAgc3ViQ21kLl9vcmlnT3B0aW9uID0gb3JpZ2luT3B0aW9uRm47XG5cbiAgICAgIGNvbnN0IG9yaWdpblJlcU9wdGlvbkZuID0gc3ViQ21kLnJlcXVpcmVkT3B0aW9uO1xuICAgICAgc3ViQ21kLnJlcXVpcmVkT3B0aW9uID0gY3JlYXRlT3B0aW9uRm4odHJ1ZSwgb3JpZ2luUmVxT3B0aW9uRm4pO1xuXG4gICAgICBmdW5jdGlvbiBkZXNjcmlwdGlvbih0aGlzOiBjb21tYW5kZXIuQ29tbWFuZCwgc3RyOiBzdHJpbmcsIC4uLnJlbWFpbmRlcjogYW55W10pIHtcbiAgICAgICAgaWYgKHBrKVxuICAgICAgICAgIHN0ciA9IGNoYWxrLmJsdWUoYFske3BrLm5hbWV9XWApICsgJyAnICsgc3RyO1xuXG4gICAgICAgIGNvbnN0IF9wbGlua01ldGEgPSBzZWxmLm1ldGFNYXAuZ2V0KHRoaXMpITtcbiAgICAgICAgX3BsaW5rTWV0YS5kZXNjID0gc3RyO1xuICAgICAgICByZXR1cm4gb3JpZ2luRGVzY0ZuLmNhbGwodGhpcywgc3RyLCAuLi5yZW1haW5kZXIpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBhbGlhcyh0aGlzOiBjb21tYW5kZXIuQ29tbWFuZCwgYWxpYXM/OiBzdHJpbmcpIHtcbiAgICAgICAgaWYgKGFsaWFzKSB7XG4gICAgICAgICAgY29uc3QgX3BsaW5rTWV0YSA9IHNlbGYubWV0YU1hcC5nZXQodGhpcykhO1xuICAgICAgICAgIF9wbGlua01ldGEuYWxpYXMgPSBhbGlhcztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3JpZ2luQWxpYXNGbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBjcmVhdGVPcHRpb25Gbihpc1JlcXVpcmVkOiBib29sZWFuLCBvcmlnaW5PcHRpb25GbjogY29tbWFuZGVyLkNvbW1hbmRbJ29wdGlvbiddIHwgY29tbWFuZGVyLkNvbW1hbmRbJ3JlcXVpcmVkT3B0aW9uJ10pIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHRoaXM6IGNvbW1hbmRlci5Db21tYW5kLCBmbGFnczogc3RyaW5nLCBkZXNjOiBzdHJpbmcsIC4uLnJlbWFpbmluZzogYW55W10pIHtcbiAgICAgICAgICBsZXQgZGVmYXVsdFZhbHVlOiBhbnk7XG4gICAgICAgICAgaWYgKHJlbWFpbmluZy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICBkZWZhdWx0VmFsdWUgPSByZW1haW5pbmdbcmVtYWluaW5nLmxlbmd0aCAtIDFdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBfcGxpbmtNZXRhID0gc2VsZi5tZXRhTWFwLmdldCh0aGlzKSE7XG4gICAgICAgICAgX3BsaW5rTWV0YS5vcHRpb25zIS5wdXNoKHtcbiAgICAgICAgICAgIGZsYWdzLCBkZXNjLCBkZWZhdWx0VmFsdWUsIGlzUmVxdWlyZWRcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIHJldHVybiBvcmlnaW5PcHRpb25Gbi5jYWxsKHRoaXMsIGZsYWdzLCBkZXNjLCAuLi5yZW1haW5pbmcpO1xuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBhY3Rpb24odGhpczogY29tbWFuZGVyLkNvbW1hbmQsIGNiOiAoLi4uYXJnczogYW55W10pID0+IGFueSkge1xuICAgICAgICBmdW5jdGlvbiBhY3Rpb25DYWxsYmFjaygpIHtcbiAgICAgICAgICBjb25zdCB7aW5pdENvbmZpZ30gPSByZXF1aXJlKCcuLi91dGlscy9ib290c3RyYXAtcHJvY2VzcycpIGFzIHR5cGVvZiBfYm9vdHN0cmFwO1xuICAgICAgICAgIGlmICgoc3ViQ21kLm9wdHMoKSBhcyBHbG9iYWxPcHRpb25zKS52ZXJib3NlKSB7XG4gICAgICAgICAgICBsb2c0anMuY29uZmlndXJlKHtcbiAgICAgICAgICAgICAgYXBwZW5kZXJzOiB7XG4gICAgICAgICAgICAgICAgb3V0OiB7XG4gICAgICAgICAgICAgICAgICB0eXBlOiAnc3Rkb3V0JyxcbiAgICAgICAgICAgICAgICAgIGxheW91dDoge3R5cGU6ICdwYXR0ZXJuJywgcGF0dGVybjogJyVbWyVwXSAlYyVdIC0gJW0nfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY2F0ZWdvcmllczoge1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6IHthcHBlbmRlcnM6IFsnb3V0J10sIGxldmVsOiAnZGVidWcnfSxcbiAgICAgICAgICAgICAgICBwbGluazoge2FwcGVuZGVyczogWydvdXQnXSwgbGV2ZWw6ICdkZWJ1Zyd9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpbml0Q29uZmlnKHN1YkNtZC5vcHRzKCkgYXMgR2xvYmFsT3B0aW9ucyk7XG4gICAgICAgICAgcmV0dXJuIGNiLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gb3JpZ2luQWN0aW9uRm4uY2FsbCh0aGlzLCBhY3Rpb25DYWxsYmFjayk7XG4gICAgICB9XG4gICAgICBzZWxmLmFsbFN1YkNtZHMucHVzaChzdWJDbWQgYXMgT3VyQXVnbWVudGVkQ29tbWFuZGVyKTtcbiAgICAgIHJldHVybiBzdWJDbWQ7XG4gICAgfVxuICAgIHRoaXMucHJvZ3JhbS5jb21tYW5kID0gY29tbWFuZCBhcyBhbnk7XG4gIH1cblxuICBmb3JQYWNrYWdlKHBrOiBQYWNrYWdlSW5mbywgcGtnRmlsZVBhdGg6IHN0cmluZywgZnVuY05hbWU6IHN0cmluZyk6IHZvaWQ7XG4gIGZvclBhY2thZ2UocGs6IG51bGwsIGNvbW1hbmRDcmVhdGlvbjogKHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kKSA9PiB2b2lkKTogdm9pZDtcbiAgZm9yUGFja2FnZShwazogUGFja2FnZUluZm8gfCBudWxsLFxuICAgIHBrZ0ZpbGVQYXRoOiBzdHJpbmcgfCAoKHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kKSA9PiB2b2lkKSxcbiAgICBmdW5jTmFtZT86IHN0cmluZykge1xuICAgIGNvbnN0IGNvbW1hbmRNZXRhSW5mb3MgPSB0aGlzLmN1cnJDbGlQa2dNYXRhSW5mb3MgPSBbXTtcbiAgICB0aGlzLmN1cnJDbGlDcmVhdG9yUGtnID0gcGs7XG5cbiAgICBsZXQgZmlsZVBhdGg6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuXG5cbiAgICBpZiAodHlwZW9mIHBrZ0ZpbGVQYXRoID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBwa2dGaWxlUGF0aCh0aGlzLnByb2dyYW0pO1xuICAgICAgdGhpcy5wa2dNZXRhc01hcC5zZXQoJ0B3ZmgvcGxpbmsnLCBjb21tYW5kTWV0YUluZm9zKTtcbiAgICAgIC8vIGNsaUFjdGlvbkRpc3BhdGNoZXIuYWRkQ29tbWFuZE1ldGEoe3BrZzogJ0B3ZmgvcGxpbmsnLCBtZXRhczogY29tbWFuZE1ldGFJbmZvc30pO1xuICAgIH0gZWxzZSBpZiAocGspIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGZpbGVQYXRoID0gcmVxdWlyZS5yZXNvbHZlKHBrLm5hbWUgKyAnLycgKyBwa2dGaWxlUGF0aCk7XG4gICAgICAgIHRoaXMuY3VyckNsaWVDcmVhdG9yRmlsZSA9IGZpbGVQYXRoO1xuICAgICAgICBjb25zdCBzdWJDbWRGYWN0b3J5OiBDbGlFeHRlbnNpb24gPSBmdW5jTmFtZSA/IHJlcXVpcmUoZmlsZVBhdGgpW2Z1bmNOYW1lXSA6XG4gICAgICAgICAgcmVxdWlyZShmaWxlUGF0aCk7XG4gICAgICAgIHN1YkNtZEZhY3RvcnkodGhpcy5wcm9ncmFtKTtcbiAgICAgICAgdGhpcy5wa2dNZXRhc01hcC5zZXQocGsubmFtZSwgY29tbWFuZE1ldGFJbmZvcyk7XG4gICAgICAgIC8vIGNsaUFjdGlvbkRpc3BhdGNoZXIuYWRkQ29tbWFuZE1ldGEoe3BrZzogcGsubmFtZSwgbWV0YXM6IGNvbW1hbmRNZXRhSW5mb3N9KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgIGxvZy53YXJuKGBGYWlsZWQgdG8gbG9hZCBjb21tYW5kIGxpbmUgZXh0ZW5zaW9uIGluIHBhY2thZ2UgJHtway5uYW1lfTogXCIke2UubWVzc2FnZX1cImAsIGUpO1xuICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgZmlsZVBhdGggPSBudWxsO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGFwcGVuZEdsb2JhbE9wdGlvbnMoKSB7XG4gICAgZm9yIChjb25zdCBjbWQgb2YgdGhpcy5hbGxTdWJDbWRzKSB7XG4gICAgICB3aXRoR2xvYmFsT3B0aW9ucyhjbWQpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IFtwa2csIG1ldGFzXSBvZiB0aGlzLnBrZ01ldGFzTWFwLmVudHJpZXMoKSkge1xuICAgICAgY2xpQWN0aW9uRGlzcGF0Y2hlci5hZGRDb21tYW5kTWV0YSh7cGtnLCBtZXRhc30pO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gd2l0aEdsb2JhbE9wdGlvbnMocHJvZ3JhbTogT3VyQXVnbWVudGVkQ29tbWFuZGVyIHwgY29tbWFuZGVyLkNvbW1hbmQpOiBjb21tYW5kZXIuQ29tbWFuZCB7XG4gIGlmIChwcm9ncmFtLl9vcmlnT3B0aW9uID09IG51bGwpIHtcbiAgICBwcm9ncmFtLl9vcmlnT3B0aW9uID0gcHJvZ3JhbS5vcHRpb247XG4gIH1cbiAgKHByb2dyYW0gYXMgT3VyQXVnbWVudGVkQ29tbWFuZGVyKS5fb3JpZ09wdGlvbignLWMsIC0tY29uZmlnIDxjb25maWctZmlsZT4nLFxuICAgIGhsRGVzYygnUmVhZCBjb25maWcgZmlsZXMsIGlmIHRoZXJlIGFyZSBtdWx0aXBsZSBmaWxlcywgdGhlIGxhdHRlciBvbmUgb3ZlcnJpZGVzIHByZXZpb3VzIG9uZScpLFxuICAgICh2YWx1ZSwgcHJldikgPT4ge1xuICAgICAgcHJldi5wdXNoKC4uLnZhbHVlLnNwbGl0KCcsJykpO1xuICAgICAgcmV0dXJuIHByZXY7XG4gICAgICAvLyByZXR1cm4gcHJldi5jb25jYXQodmFsdWUuc3BsaXQoJywnKSk7XG4gICAgfSwgW10gYXMgc3RyaW5nW10pXG4gIC5fb3JpZ09wdGlvbignLS1wcm9wIDxleHByZXNzaW9uPicsXG4gICAgaGxEZXNjKCc8cHJvcGVydHktcGF0aD49PHZhbHVlIGFzIEpTT04gfCBsaXRlcmFsPiAuLi4gZGlyZWN0bHkgc2V0IGNvbmZpZ3VyYXRpb24gcHJvcGVydGllcywgcHJvcGVydHkgbmFtZSBpcyBsb2Rhc2guc2V0KCkgcGF0aC1saWtlIHN0cmluZ1xcbiBlLmcuXFxuJyArXG4gICAgJy0tcHJvcCBwb3J0PTgwODAgLS1wcm9wIGRldk1vZGU9ZmFsc2UgLS1wcm9wIEB3ZmgvZm9vYmFyLmFwaT1odHRwOi8vbG9jYWxob3N0OjgwODBcXG4nICtcbiAgICAnLS1wcm9wIGFycmF5bGlrZS5wcm9wWzBdPWZvb2JhclxcbicgK1xuICAgICctLXByb3AgW1wiQHdmaC9mb28uYmFyXCIsXCJwcm9wXCIsMF09dHJ1ZScpLFxuICAgIGFycmF5T3B0aW9uRm4sIFtdIGFzIHN0cmluZ1tdKVxuICAub3B0aW9uKCctLXZlcmJvc2UnLCBobERlc2MoJ1NldCBsb2cgbGV2ZWwgdG8gXCJkZWJ1Z1wiJyksIGZhbHNlKTtcbiAgLy8gLm9wdGlvbignLS1sb2ctc3RhdCcsIGhsRGVzYygnUHJpbnQgaW50ZXJuYWwgUmVkdXggc3RhdGUvYWN0aW9ucyBmb3IgZGVidWcnKSk7XG5cbiAgcmV0dXJuIHByb2dyYW07XG59XG4iXX0=