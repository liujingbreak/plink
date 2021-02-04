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
        this.origPgmCommand = program.command;
    }
    forPackage(pk, pkgFilePath, funcName) {
        const self = this;
        const commandMetaInfos = [];
        let filePath = null;
        function command(nameAndArgs, ...restArgs) {
            const cmdName = /^\S+/.exec(nameAndArgs)[0];
            if (self.loadedCmdMap.has(cmdName)) {
                if (filePath)
                    throw new Error(`Conflict command name ${cmdName} from extensions "${filePath}" and "${this.loadedCmdMap.get(cmdName)}"`);
                else
                    throw new Error(`Conflict with existing Plink command name ${cmdName}`);
            }
            self.loadedCmdMap.set(cmdName, filePath ? filePath : '@wfh/plink');
            const subCmd = self.origPgmCommand.call(this, nameAndArgs, ...restArgs);
            const meta = subCmd._plinkMeta = {
                pkgName: pk ? pk.name : '@wfh/plink',
                nameAndArgs,
                options: [],
                desc: pk == null ? '' : chalk_1.default.blue(`[${pk.name}]`)
            };
            commandMetaInfos.push(meta);
            subCmd.description(meta.desc);
            const originDescFn = subCmd.description;
            subCmd.description = description;
            const originActionFn = subCmd.action;
            subCmd.action = action;
            const originAliasFn = subCmd.alias;
            subCmd.alias = alias;
            const originOptionFn = subCmd.option;
            subCmd.option = createOptionFn(false, originOptionFn);
            const originReqOptionFn = subCmd.requiredOption;
            subCmd.requiredOption = createOptionFn(true, originReqOptionFn);
            function description(str, ...remainder) {
                if (pk)
                    str = chalk_1.default.blue(`[${pk.name}]`) + ' ' + str;
                this._plinkMeta.desc = str;
                return originDescFn.call(this, str, ...remainder);
            }
            function alias(alias) {
                if (alias)
                    this._plinkMeta.alias = alias;
                return originAliasFn.apply(this, arguments);
            }
            function createOptionFn(isRequired, originOptionFn) {
                return function (flags, desc, ...remaining) {
                    let defaultValue;
                    if (remaining.length > 1) {
                        defaultValue = remaining[remaining.length - 1];
                    }
                    this._plinkMeta.options.push({
                        flags, desc, defaultValue, isRequired
                    });
                    return originOptionFn.apply(this, arguments);
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
            withGlobalOptions(subCmd);
            return subCmd;
        }
        this.program.command = command;
        if (typeof pkgFilePath === 'function') {
            pkgFilePath(this.program);
            cli_slice_1.cliActionDispatcher.addCommandMeta({ pkg: '@wfh/plink', metas: commandMetaInfos });
        }
        else if (pk) {
            try {
                filePath = require.resolve(pk.name + '/' + pkgFilePath);
                const subCmdFactory = funcName ? require(filePath)[funcName] :
                    require(filePath);
                subCmdFactory(this.program);
                cli_slice_1.cliActionDispatcher.addCommandMeta({ pkg: pk.name, metas: commandMetaInfos });
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
}
exports.CommandOverrider = CommandOverrider;
function withGlobalOptions(program) {
    program.option('-c, --config <config-file>', utils_1.hlDesc('Read config files, if there are multiple files, the latter one overrides previous one'), (value, prev) => {
        return prev.concat(value.split(','));
    }, [])
        .option('--prop <expression>', utils_1.hlDesc('<property-path>=<value as JSON | literal> ... directly set configuration properties, property name is lodash.set() path-like string\n e.g.\n' +
        '--prop port=8080 --prop devMode=false --prop @wfh/foobar.api=http://localhost:8080\n' +
        '--prop arraylike.prop[0]=foobar\n' +
        '--prop ["@wfh/foo.bar","prop",0]=true'), utils_1.arrayOptionFn, [])
        .option('--verbose', utils_1.hlDesc('Set log level to "debug"'), false);
    // .option('--log-stat', hlDesc('Print internal Redux state/actions for debug'));
    return program;
}
exports.withGlobalOptions = withGlobalOptions;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcnJpZGUtY29tbWFuZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL292ZXJyaWRlLWNvbW1hbmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFFQSxrREFBMEI7QUFDMUIsbUNBQThDO0FBRzlDLDJDQUFnRDtBQUNoRCxvREFBNEI7QUFDNUIsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsMEJBQTBCLENBQUMsQ0FBQztBQUV6RCxNQUFhLGdCQUFnQjtJQUkzQixZQUFvQixPQUEwQixFQUFFLEVBQW1CO1FBQS9DLFlBQU8sR0FBUCxPQUFPLENBQW1CO1FBSHRDLGlCQUFZLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7UUFJL0MsSUFBSSxDQUFDLGNBQWMsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDO0lBQ3hDLENBQUM7SUFJRCxVQUFVLENBQUMsRUFBc0IsRUFDL0IsV0FBNEQsRUFDNUQsUUFBaUI7UUFDakIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2xCLE1BQU0sZ0JBQWdCLEdBQXlCLEVBQUUsQ0FBQztRQUNsRCxJQUFJLFFBQVEsR0FBa0IsSUFBSSxDQUFDO1FBRW5DLFNBQVMsT0FBTyxDQUEwQixXQUFtQixFQUFFLEdBQUcsUUFBZTtZQUUvRSxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzdDLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ2xDLElBQUksUUFBUTtvQkFDVixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixPQUFPLHFCQUFxQixRQUFRLFVBQVUsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDOztvQkFFMUgsTUFBTSxJQUFJLEtBQUssQ0FBQyw2Q0FBNkMsT0FBTyxFQUFF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QUN2QyxDQUFDLEVBQUUsRUFBYyxDQUFDO1NBQ25CLE1BQU0sQ0FBQyxxQkFBcUIsRUFDM0IsY0FBTSxDQUFDLDhJQUE4STtRQUNySixzRkFBc0Y7UUFDdEYsbUNBQW1DO1FBQ25DLHVDQUF1QyxDQUFDLEVBQ3hDLHFCQUFhLEVBQUUsRUFBYyxDQUFDO1NBQy9CLE1BQU0sQ0FBQyxXQUFXLEVBQUUsY0FBTSxDQUFDLDBCQUEwQixDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDaEUsaUZBQWlGO0lBRWpGLE9BQU8sT0FBTyxDQUFDO0FBQ2pCLENBQUM7QUFoQkQsOENBZ0JDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGNvbW1hbmRlciBmcm9tICdjb21tYW5kZXInO1xuaW1wb3J0IHtXb3Jrc3BhY2VTdGF0ZSwgUGFja2FnZUluZm99IGZyb20gJy4uL3BhY2thZ2UtbWdyJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQge2hsRGVzYywgYXJyYXlPcHRpb25Gbn0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgKiBhcyBfYm9vdHN0cmFwIGZyb20gJy4uL3V0aWxzL2Jvb3RzdHJhcC1wcm9jZXNzJztcbmltcG9ydCB7IEdsb2JhbE9wdGlvbnMsIE91ckNvbW1hbmRNZXRhZGF0YSwgT3VyQXVnbWVudGVkQ29tbWFuZGVyLCBDbGlFeHRlbnNpb24gfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7Y2xpQWN0aW9uRGlzcGF0Y2hlcn0gZnJvbSAnLi9jbGktc2xpY2UnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsub3ZlcnJpZGUtY29tbWFuZGVyJyk7XG5cbmV4cG9ydCBjbGFzcyBDb21tYW5kT3ZlcnJpZGVyIHtcbiAgcHJpdmF0ZSBsb2FkZWRDbWRNYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBwcml2YXRlIG9yaWdQZ21Db21tYW5kOiBjb21tYW5kZXIuQ29tbWFuZFsnY29tbWFuZCddO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcHJvZ3JhbTogY29tbWFuZGVyLkNvbW1hbmQsIHdzPzogV29ya3NwYWNlU3RhdGUpIHtcbiAgICB0aGlzLm9yaWdQZ21Db21tYW5kID0gcHJvZ3JhbS5jb21tYW5kO1xuICB9XG5cbiAgZm9yUGFja2FnZShwazogUGFja2FnZUluZm8sIHBrZ0ZpbGVQYXRoOiBzdHJpbmcsIGZ1bmNOYW1lOiBzdHJpbmcpOiB2b2lkO1xuICBmb3JQYWNrYWdlKHBrOiBudWxsLCBjb21tYW5kQ3JlYXRpb246IChwcm9ncmFtOiBjb21tYW5kZXIuQ29tbWFuZCkgPT4gdm9pZCk6IHZvaWQ7XG4gIGZvclBhY2thZ2UocGs6IFBhY2thZ2VJbmZvIHwgbnVsbCxcbiAgICBwa2dGaWxlUGF0aDogc3RyaW5nIHwgKChwcm9ncmFtOiBjb21tYW5kZXIuQ29tbWFuZCkgPT4gdm9pZCksXG4gICAgZnVuY05hbWU/OiBzdHJpbmcpIHtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICBjb25zdCBjb21tYW5kTWV0YUluZm9zOiBPdXJDb21tYW5kTWV0YWRhdGFbXSA9IFtdO1xuICAgIGxldCBmaWxlUGF0aDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG5cbiAgICBmdW5jdGlvbiBjb21tYW5kKHRoaXM6IGNvbW1hbmRlci5Db21tYW5kLCBuYW1lQW5kQXJnczogc3RyaW5nLCAuLi5yZXN0QXJnczogYW55W10pIHtcblxuICAgICAgY29uc3QgY21kTmFtZSA9IC9eXFxTKy8uZXhlYyhuYW1lQW5kQXJncykhWzBdO1xuICAgICAgaWYgKHNlbGYubG9hZGVkQ21kTWFwLmhhcyhjbWROYW1lKSkge1xuICAgICAgICBpZiAoZmlsZVBhdGgpXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb25mbGljdCBjb21tYW5kIG5hbWUgJHtjbWROYW1lfSBmcm9tIGV4dGVuc2lvbnMgXCIke2ZpbGVQYXRofVwiIGFuZCBcIiR7dGhpcy5sb2FkZWRDbWRNYXAuZ2V0KGNtZE5hbWUpfVwiYCk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENvbmZsaWN0IHdpdGggZXhpc3RpbmcgUGxpbmsgY29tbWFuZCBuYW1lICR7Y21kTmFtZX1gKTtcbiAgICAgIH1cblxuICAgICAgc2VsZi5sb2FkZWRDbWRNYXAuc2V0KGNtZE5hbWUsIGZpbGVQYXRoID8gZmlsZVBhdGggOiAnQHdmaC9wbGluaycpO1xuXG4gICAgICBjb25zdCBzdWJDbWQ6IGNvbW1hbmRlci5Db21tYW5kID0gc2VsZi5vcmlnUGdtQ29tbWFuZC5jYWxsKHRoaXMsIG5hbWVBbmRBcmdzLCAuLi5yZXN0QXJncyk7XG4gICAgICBjb25zdCBtZXRhOiBQYXJ0aWFsPE91ckNvbW1hbmRNZXRhZGF0YT4gPSAoc3ViQ21kIGFzIE91ckF1Z21lbnRlZENvbW1hbmRlcikuX3BsaW5rTWV0YSA9IHtcbiAgICAgICAgcGtnTmFtZTogcGsgPyBway5uYW1lIDogJ0B3ZmgvcGxpbmsnLFxuICAgICAgICBuYW1lQW5kQXJncyxcbiAgICAgICAgb3B0aW9uczogW10sXG4gICAgICAgIGRlc2M6IHBrID09IG51bGwgPyAnJyA6IGNoYWxrLmJsdWUoYFske3BrLm5hbWV9XWApXG4gICAgICB9O1xuICAgICAgY29tbWFuZE1ldGFJbmZvcy5wdXNoKG1ldGEgYXMgT3VyQ29tbWFuZE1ldGFkYXRhKTtcblxuICAgICAgc3ViQ21kLmRlc2NyaXB0aW9uKG1ldGEuZGVzYyEpO1xuXG4gICAgICBjb25zdCBvcmlnaW5EZXNjRm4gPSBzdWJDbWQuZGVzY3JpcHRpb247XG5cbiAgICAgIHN1YkNtZC5kZXNjcmlwdGlvbiA9IGRlc2NyaXB0aW9uIGFzIGFueTtcblxuICAgICAgY29uc3Qgb3JpZ2luQWN0aW9uRm4gPSBzdWJDbWQuYWN0aW9uO1xuICAgICAgc3ViQ21kLmFjdGlvbiA9IGFjdGlvbjtcblxuICAgICAgY29uc3Qgb3JpZ2luQWxpYXNGbiA9IHN1YkNtZC5hbGlhcztcbiAgICAgIHN1YkNtZC5hbGlhcyA9IGFsaWFzO1xuXG4gICAgICBjb25zdCBvcmlnaW5PcHRpb25GbiA9IHN1YkNtZC5vcHRpb247XG4gICAgICBzdWJDbWQub3B0aW9uID0gY3JlYXRlT3B0aW9uRm4oZmFsc2UsIG9yaWdpbk9wdGlvbkZuKTtcblxuICAgICAgY29uc3Qgb3JpZ2luUmVxT3B0aW9uRm4gPSBzdWJDbWQucmVxdWlyZWRPcHRpb247XG4gICAgICBzdWJDbWQucmVxdWlyZWRPcHRpb24gPSBjcmVhdGVPcHRpb25Gbih0cnVlLCBvcmlnaW5SZXFPcHRpb25Gbik7XG5cbiAgICAgIGZ1bmN0aW9uIGRlc2NyaXB0aW9uKHRoaXM6IGNvbW1hbmRlci5Db21tYW5kLCBzdHI6IHN0cmluZywgLi4ucmVtYWluZGVyOiBhbnlbXSkge1xuICAgICAgICBpZiAocGspXG4gICAgICAgICAgc3RyID0gY2hhbGsuYmx1ZShgWyR7cGsubmFtZX1dYCkgKyAnICcgKyBzdHI7XG4gICAgICAgICh0aGlzIGFzIE91ckF1Z21lbnRlZENvbW1hbmRlcikuX3BsaW5rTWV0YS5kZXNjID0gc3RyO1xuICAgICAgICByZXR1cm4gb3JpZ2luRGVzY0ZuLmNhbGwodGhpcywgc3RyLCAuLi5yZW1haW5kZXIpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBhbGlhcyh0aGlzOiBjb21tYW5kZXIuQ29tbWFuZCwgYWxpYXM/OiBzdHJpbmcpIHtcbiAgICAgICAgaWYgKGFsaWFzKVxuICAgICAgICAgICh0aGlzIGFzIE91ckF1Z21lbnRlZENvbW1hbmRlcikuX3BsaW5rTWV0YS5hbGlhcyA9IGFsaWFzO1xuICAgICAgICByZXR1cm4gb3JpZ2luQWxpYXNGbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBjcmVhdGVPcHRpb25Gbihpc1JlcXVpcmVkOiBib29sZWFuLCBvcmlnaW5PcHRpb25GbjogY29tbWFuZGVyLkNvbW1hbmRbJ29wdGlvbiddIHwgY29tbWFuZGVyLkNvbW1hbmRbJ3JlcXVpcmVkT3B0aW9uJ10pIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHRoaXM6IGNvbW1hbmRlci5Db21tYW5kLCBmbGFnczogc3RyaW5nLCBkZXNjOiBzdHJpbmcsIC4uLnJlbWFpbmluZzogYW55W10pIHtcbiAgICAgICAgICBsZXQgZGVmYXVsdFZhbHVlOiBhbnk7XG4gICAgICAgICAgaWYgKHJlbWFpbmluZy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICBkZWZhdWx0VmFsdWUgPSByZW1haW5pbmdbcmVtYWluaW5nLmxlbmd0aCAtIDFdO1xuICAgICAgICAgIH1cbiAgICAgICAgICAodGhpcyBhcyBPdXJBdWdtZW50ZWRDb21tYW5kZXIpLl9wbGlua01ldGEub3B0aW9ucyEucHVzaCh7XG4gICAgICAgICAgICBmbGFncywgZGVzYywgZGVmYXVsdFZhbHVlLCBpc1JlcXVpcmVkXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmV0dXJuIG9yaWdpbk9wdGlvbkZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGFjdGlvbih0aGlzOiBjb21tYW5kZXIuQ29tbWFuZCwgY2I6ICguLi5hcmdzOiBhbnlbXSkgPT4gYW55KSB7XG4gICAgICAgIGZ1bmN0aW9uIGFjdGlvbkNhbGxiYWNrKCkge1xuICAgICAgICAgIGNvbnN0IHtpbml0Q29uZmlnfSA9IHJlcXVpcmUoJy4uL3V0aWxzL2Jvb3RzdHJhcC1wcm9jZXNzJykgYXMgdHlwZW9mIF9ib290c3RyYXA7XG4gICAgICAgICAgaWYgKChzdWJDbWQub3B0cygpIGFzIEdsb2JhbE9wdGlvbnMpLnZlcmJvc2UpIHtcbiAgICAgICAgICAgIGxvZzRqcy5jb25maWd1cmUoe1xuICAgICAgICAgICAgICBhcHBlbmRlcnM6IHtcbiAgICAgICAgICAgICAgICBvdXQ6IHtcbiAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdGRvdXQnLFxuICAgICAgICAgICAgICAgICAgbGF5b3V0OiB7dHlwZTogJ3BhdHRlcm4nLCBwYXR0ZXJuOiAnJVtbJXBdICVjJV0gLSAlbSd9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjYXRlZ29yaWVzOiB7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDoge2FwcGVuZGVyczogWydvdXQnXSwgbGV2ZWw6ICdkZWJ1Zyd9LFxuICAgICAgICAgICAgICAgIHBsaW5rOiB7YXBwZW5kZXJzOiBbJ291dCddLCBsZXZlbDogJ2RlYnVnJ31cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGluaXRDb25maWcoc3ViQ21kLm9wdHMoKSBhcyBHbG9iYWxPcHRpb25zKTtcbiAgICAgICAgICByZXR1cm4gY2IuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBvcmlnaW5BY3Rpb25Gbi5jYWxsKHRoaXMsIGFjdGlvbkNhbGxiYWNrKTtcbiAgICAgIH1cblxuICAgICAgd2l0aEdsb2JhbE9wdGlvbnMoc3ViQ21kKTtcbiAgICAgIHJldHVybiBzdWJDbWQ7XG4gICAgfVxuXG4gICAgdGhpcy5wcm9ncmFtLmNvbW1hbmQgPSBjb21tYW5kIGFzIGFueTtcblxuICAgIGlmICh0eXBlb2YgcGtnRmlsZVBhdGggPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHBrZ0ZpbGVQYXRoKHRoaXMucHJvZ3JhbSk7XG4gICAgICBjbGlBY3Rpb25EaXNwYXRjaGVyLmFkZENvbW1hbmRNZXRhKHtwa2c6ICdAd2ZoL3BsaW5rJywgbWV0YXM6IGNvbW1hbmRNZXRhSW5mb3N9KTtcbiAgICB9IGVsc2UgaWYgKHBrKSB7XG4gICAgICB0cnkge1xuICAgICAgICBmaWxlUGF0aCA9IHJlcXVpcmUucmVzb2x2ZShway5uYW1lICsgJy8nICsgcGtnRmlsZVBhdGgpO1xuICAgICAgICBjb25zdCBzdWJDbWRGYWN0b3J5OiBDbGlFeHRlbnNpb24gPSBmdW5jTmFtZSA/IHJlcXVpcmUoZmlsZVBhdGgpW2Z1bmNOYW1lXSA6XG4gICAgICAgICAgcmVxdWlyZShmaWxlUGF0aCk7XG4gICAgICAgIHN1YkNtZEZhY3RvcnkodGhpcy5wcm9ncmFtKTtcbiAgICAgICAgY2xpQWN0aW9uRGlzcGF0Y2hlci5hZGRDb21tYW5kTWV0YSh7cGtnOiBway5uYW1lLCBtZXRhczogY29tbWFuZE1ldGFJbmZvc30pO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgbG9nLndhcm4oYEZhaWxlZCB0byBsb2FkIGNvbW1hbmQgbGluZSBleHRlbnNpb24gaW4gcGFja2FnZSAke3BrLm5hbWV9OiBcIiR7ZS5tZXNzYWdlfVwiYCwgZSk7XG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICBmaWxlUGF0aCA9IG51bGw7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3aXRoR2xvYmFsT3B0aW9ucyhwcm9ncmFtOiBjb21tYW5kZXIuQ29tbWFuZCk6IGNvbW1hbmRlci5Db21tYW5kIHtcbiAgcHJvZ3JhbS5vcHRpb24oJy1jLCAtLWNvbmZpZyA8Y29uZmlnLWZpbGU+JyxcbiAgICBobERlc2MoJ1JlYWQgY29uZmlnIGZpbGVzLCBpZiB0aGVyZSBhcmUgbXVsdGlwbGUgZmlsZXMsIHRoZSBsYXR0ZXIgb25lIG92ZXJyaWRlcyBwcmV2aW91cyBvbmUnKSxcbiAgICAodmFsdWUsIHByZXYpID0+IHtcbiAgICAgIHJldHVybiBwcmV2LmNvbmNhdCh2YWx1ZS5zcGxpdCgnLCcpKTtcbiAgICB9LCBbXSBhcyBzdHJpbmdbXSlcbiAgLm9wdGlvbignLS1wcm9wIDxleHByZXNzaW9uPicsXG4gICAgaGxEZXNjKCc8cHJvcGVydHktcGF0aD49PHZhbHVlIGFzIEpTT04gfCBsaXRlcmFsPiAuLi4gZGlyZWN0bHkgc2V0IGNvbmZpZ3VyYXRpb24gcHJvcGVydGllcywgcHJvcGVydHkgbmFtZSBpcyBsb2Rhc2guc2V0KCkgcGF0aC1saWtlIHN0cmluZ1xcbiBlLmcuXFxuJyArXG4gICAgJy0tcHJvcCBwb3J0PTgwODAgLS1wcm9wIGRldk1vZGU9ZmFsc2UgLS1wcm9wIEB3ZmgvZm9vYmFyLmFwaT1odHRwOi8vbG9jYWxob3N0OjgwODBcXG4nICtcbiAgICAnLS1wcm9wIGFycmF5bGlrZS5wcm9wWzBdPWZvb2JhclxcbicgK1xuICAgICctLXByb3AgW1wiQHdmaC9mb28uYmFyXCIsXCJwcm9wXCIsMF09dHJ1ZScpLFxuICAgIGFycmF5T3B0aW9uRm4sIFtdIGFzIHN0cmluZ1tdKVxuICAub3B0aW9uKCctLXZlcmJvc2UnLCBobERlc2MoJ1NldCBsb2cgbGV2ZWwgdG8gXCJkZWJ1Z1wiJyksIGZhbHNlKTtcbiAgLy8gLm9wdGlvbignLS1sb2ctc3RhdCcsIGhsRGVzYygnUHJpbnQgaW50ZXJuYWwgUmVkdXggc3RhdGUvYWN0aW9ucyBmb3IgZGVidWcnKSk7XG5cbiAgcmV0dXJuIHByb2dyYW07XG59XG4iXX0=