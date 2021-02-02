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
    program.option('-c, --config <config-file>', utils_1.hlDesc('Read config files, if there are multiple files, the latter one overrides previous one'), (value, prev) => { prev.push(...value.split(',')); return prev; }, [])
        .option('--prop <expression>', utils_1.hlDesc('<property-path>=<value as JSON | literal> ... directly set configuration properties, property name is lodash.set() path-like string\n e.g.\n' +
        '--prop port=8080 --prop devMode=false --prop @wfh/foobar.api=http://localhost:8080\n' +
        '--prop arraylike.prop[0]=foobar\n' +
        '--prop ["@wfh/foo.bar","prop",0]=true'), utils_1.arrayOptionFn, [])
        .option('--verbose', utils_1.hlDesc('Set log level to "debug"'), false);
    // .option('--log-stat', hlDesc('Print internal Redux state/actions for debug'));
    return program;
}
exports.withGlobalOptions = withGlobalOptions;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcnJpZGUtY29tbWFuZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL292ZXJyaWRlLWNvbW1hbmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFFQSxrREFBMEI7QUFDMUIsbUNBQThDO0FBRzlDLDJDQUFnRDtBQUNoRCxvREFBNEI7QUFDNUIsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsMEJBQTBCLENBQUMsQ0FBQztBQUV6RCxNQUFhLGdCQUFnQjtJQUkzQixZQUFvQixPQUEwQixFQUFFLEVBQW1CO1FBQS9DLFlBQU8sR0FBUCxPQUFPLENBQW1CO1FBSHRDLGlCQUFZLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7UUFJL0MsSUFBSSxDQUFDLGNBQWMsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDO0lBQ3hDLENBQUM7SUFJRCxVQUFVLENBQUMsRUFBc0IsRUFDL0IsV0FBNEQsRUFDNUQsUUFBaUI7UUFDakIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2xCLE1BQU0sZ0JBQWdCLEdBQXlCLEVBQUUsQ0FBQztRQUNsRCxJQUFJLFFBQVEsR0FBa0IsSUFBSSxDQUFDO1FBRW5DLFNBQVMsT0FBTyxDQUEwQixXQUFtQixFQUFFLEdBQUcsUUFBZTtZQUUvRSxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzdDLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ2xDLElBQUksUUFBUTtvQkFDVixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixPQUFPLHFCQUFxQixRQUFRLFVBQVUsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDOztvQkFFMUgsTUFBTSxJQUFJLEtBQUssQ0FBQyw2Q0FBNkMsT0FBTyxFQUFF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QUFDLE9BQU8sSUFBSSxDQUFDLENBQUEsQ0FBQyxFQUFFLEVBQWMsQ0FBQztTQUNsRixNQUFNLENBQUMscUJBQXFCLEVBQzNCLGNBQU0sQ0FBQyw4SUFBOEk7UUFDckosc0ZBQXNGO1FBQ3RGLG1DQUFtQztRQUNuQyx1Q0FBdUMsQ0FBQyxFQUN4QyxxQkFBYSxFQUFFLEVBQWMsQ0FBQztTQUMvQixNQUFNLENBQUMsV0FBVyxFQUFFLGNBQU0sQ0FBQywwQkFBMEIsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ2hFLGlGQUFpRjtJQUVqRixPQUFPLE9BQU8sQ0FBQztBQUNqQixDQUFDO0FBZEQsOENBY0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY29tbWFuZGVyIGZyb20gJ2NvbW1hbmRlcic7XG5pbXBvcnQge1dvcmtzcGFjZVN0YXRlLCBQYWNrYWdlSW5mb30gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB7aGxEZXNjLCBhcnJheU9wdGlvbkZufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCAqIGFzIF9ib290c3RyYXAgZnJvbSAnLi4vdXRpbHMvYm9vdHN0cmFwLXByb2Nlc3MnO1xuaW1wb3J0IHsgR2xvYmFsT3B0aW9ucywgT3VyQ29tbWFuZE1ldGFkYXRhLCBPdXJBdWdtZW50ZWRDb21tYW5kZXIsIENsaUV4dGVuc2lvbiB9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtjbGlBY3Rpb25EaXNwYXRjaGVyfSBmcm9tICcuL2NsaS1zbGljZSc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay5vdmVycmlkZS1jb21tYW5kZXInKTtcblxuZXhwb3J0IGNsYXNzIENvbW1hbmRPdmVycmlkZXIge1xuICBwcml2YXRlIGxvYWRlZENtZE1hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIHByaXZhdGUgb3JpZ1BnbUNvbW1hbmQ6IGNvbW1hbmRlci5Db21tYW5kWydjb21tYW5kJ107XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBwcm9ncmFtOiBjb21tYW5kZXIuQ29tbWFuZCwgd3M/OiBXb3Jrc3BhY2VTdGF0ZSkge1xuICAgIHRoaXMub3JpZ1BnbUNvbW1hbmQgPSBwcm9ncmFtLmNvbW1hbmQ7XG4gIH1cblxuICBmb3JQYWNrYWdlKHBrOiBQYWNrYWdlSW5mbywgcGtnRmlsZVBhdGg6IHN0cmluZywgZnVuY05hbWU6IHN0cmluZyk6IHZvaWQ7XG4gIGZvclBhY2thZ2UocGs6IG51bGwsIGNvbW1hbmRDcmVhdGlvbjogKHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kKSA9PiB2b2lkKTogdm9pZDtcbiAgZm9yUGFja2FnZShwazogUGFja2FnZUluZm8gfCBudWxsLFxuICAgIHBrZ0ZpbGVQYXRoOiBzdHJpbmcgfCAoKHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kKSA9PiB2b2lkKSxcbiAgICBmdW5jTmFtZT86IHN0cmluZykge1xuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgIGNvbnN0IGNvbW1hbmRNZXRhSW5mb3M6IE91ckNvbW1hbmRNZXRhZGF0YVtdID0gW107XG4gICAgbGV0IGZpbGVQYXRoOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcblxuICAgIGZ1bmN0aW9uIGNvbW1hbmQodGhpczogY29tbWFuZGVyLkNvbW1hbmQsIG5hbWVBbmRBcmdzOiBzdHJpbmcsIC4uLnJlc3RBcmdzOiBhbnlbXSkge1xuXG4gICAgICBjb25zdCBjbWROYW1lID0gL15cXFMrLy5leGVjKG5hbWVBbmRBcmdzKSFbMF07XG4gICAgICBpZiAoc2VsZi5sb2FkZWRDbWRNYXAuaGFzKGNtZE5hbWUpKSB7XG4gICAgICAgIGlmIChmaWxlUGF0aClcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENvbmZsaWN0IGNvbW1hbmQgbmFtZSAke2NtZE5hbWV9IGZyb20gZXh0ZW5zaW9ucyBcIiR7ZmlsZVBhdGh9XCIgYW5kIFwiJHt0aGlzLmxvYWRlZENtZE1hcC5nZXQoY21kTmFtZSl9XCJgKTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgQ29uZmxpY3Qgd2l0aCBleGlzdGluZyBQbGluayBjb21tYW5kIG5hbWUgJHtjbWROYW1lfWApO1xuICAgICAgfVxuXG4gICAgICBzZWxmLmxvYWRlZENtZE1hcC5zZXQoY21kTmFtZSwgZmlsZVBhdGggPyBmaWxlUGF0aCA6ICdAd2ZoL3BsaW5rJyk7XG5cbiAgICAgIGNvbnN0IHN1YkNtZDogY29tbWFuZGVyLkNvbW1hbmQgPSBzZWxmLm9yaWdQZ21Db21tYW5kLmNhbGwodGhpcywgbmFtZUFuZEFyZ3MsIC4uLnJlc3RBcmdzKTtcbiAgICAgIGNvbnN0IG1ldGE6IFBhcnRpYWw8T3VyQ29tbWFuZE1ldGFkYXRhPiA9IChzdWJDbWQgYXMgT3VyQXVnbWVudGVkQ29tbWFuZGVyKS5fcGxpbmtNZXRhID0ge1xuICAgICAgICBwa2dOYW1lOiBwayA/IHBrLm5hbWUgOiAnQHdmaC9wbGluaycsXG4gICAgICAgIG5hbWVBbmRBcmdzLFxuICAgICAgICBvcHRpb25zOiBbXSxcbiAgICAgICAgZGVzYzogcGsgPT0gbnVsbCA/ICcnIDogY2hhbGsuYmx1ZShgWyR7cGsubmFtZX1dYClcbiAgICAgIH07XG4gICAgICBjb21tYW5kTWV0YUluZm9zLnB1c2gobWV0YSBhcyBPdXJDb21tYW5kTWV0YWRhdGEpO1xuXG4gICAgICBzdWJDbWQuZGVzY3JpcHRpb24obWV0YS5kZXNjISk7XG5cbiAgICAgIGNvbnN0IG9yaWdpbkRlc2NGbiA9IHN1YkNtZC5kZXNjcmlwdGlvbjtcblxuICAgICAgc3ViQ21kLmRlc2NyaXB0aW9uID0gZGVzY3JpcHRpb24gYXMgYW55O1xuXG4gICAgICBjb25zdCBvcmlnaW5BY3Rpb25GbiA9IHN1YkNtZC5hY3Rpb247XG4gICAgICBzdWJDbWQuYWN0aW9uID0gYWN0aW9uO1xuXG4gICAgICBjb25zdCBvcmlnaW5BbGlhc0ZuID0gc3ViQ21kLmFsaWFzO1xuICAgICAgc3ViQ21kLmFsaWFzID0gYWxpYXM7XG5cbiAgICAgIGNvbnN0IG9yaWdpbk9wdGlvbkZuID0gc3ViQ21kLm9wdGlvbjtcbiAgICAgIHN1YkNtZC5vcHRpb24gPSBjcmVhdGVPcHRpb25GbihmYWxzZSwgb3JpZ2luT3B0aW9uRm4pO1xuXG4gICAgICBjb25zdCBvcmlnaW5SZXFPcHRpb25GbiA9IHN1YkNtZC5yZXF1aXJlZE9wdGlvbjtcbiAgICAgIHN1YkNtZC5yZXF1aXJlZE9wdGlvbiA9IGNyZWF0ZU9wdGlvbkZuKHRydWUsIG9yaWdpblJlcU9wdGlvbkZuKTtcblxuICAgICAgZnVuY3Rpb24gZGVzY3JpcHRpb24odGhpczogY29tbWFuZGVyLkNvbW1hbmQsIHN0cjogc3RyaW5nLCAuLi5yZW1haW5kZXI6IGFueVtdKSB7XG4gICAgICAgIGlmIChwaylcbiAgICAgICAgICBzdHIgPSBjaGFsay5ibHVlKGBbJHtway5uYW1lfV1gKSArICcgJyArIHN0cjtcbiAgICAgICAgKHRoaXMgYXMgT3VyQXVnbWVudGVkQ29tbWFuZGVyKS5fcGxpbmtNZXRhLmRlc2MgPSBzdHI7XG4gICAgICAgIHJldHVybiBvcmlnaW5EZXNjRm4uY2FsbCh0aGlzLCBzdHIsIC4uLnJlbWFpbmRlcik7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGFsaWFzKHRoaXM6IGNvbW1hbmRlci5Db21tYW5kLCBhbGlhcz86IHN0cmluZykge1xuICAgICAgICBpZiAoYWxpYXMpXG4gICAgICAgICAgKHRoaXMgYXMgT3VyQXVnbWVudGVkQ29tbWFuZGVyKS5fcGxpbmtNZXRhLmFsaWFzID0gYWxpYXM7XG4gICAgICAgIHJldHVybiBvcmlnaW5BbGlhc0ZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGNyZWF0ZU9wdGlvbkZuKGlzUmVxdWlyZWQ6IGJvb2xlYW4sIG9yaWdpbk9wdGlvbkZuOiBjb21tYW5kZXIuQ29tbWFuZFsnb3B0aW9uJ10gfCBjb21tYW5kZXIuQ29tbWFuZFsncmVxdWlyZWRPcHRpb24nXSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24odGhpczogY29tbWFuZGVyLkNvbW1hbmQsIGZsYWdzOiBzdHJpbmcsIGRlc2M6IHN0cmluZywgLi4ucmVtYWluaW5nOiBhbnlbXSkge1xuICAgICAgICAgIGxldCBkZWZhdWx0VmFsdWU6IGFueTtcbiAgICAgICAgICBpZiAocmVtYWluaW5nLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIGRlZmF1bHRWYWx1ZSA9IHJlbWFpbmluZ1tyZW1haW5pbmcubGVuZ3RoIC0gMV07XG4gICAgICAgICAgfVxuICAgICAgICAgICh0aGlzIGFzIE91ckF1Z21lbnRlZENvbW1hbmRlcikuX3BsaW5rTWV0YS5vcHRpb25zIS5wdXNoKHtcbiAgICAgICAgICAgIGZsYWdzLCBkZXNjLCBkZWZhdWx0VmFsdWUsIGlzUmVxdWlyZWRcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm4gb3JpZ2luT3B0aW9uRm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gYWN0aW9uKHRoaXM6IGNvbW1hbmRlci5Db21tYW5kLCBjYjogKC4uLmFyZ3M6IGFueVtdKSA9PiBhbnkpIHtcbiAgICAgICAgZnVuY3Rpb24gYWN0aW9uQ2FsbGJhY2soKSB7XG4gICAgICAgICAgY29uc3Qge2luaXRDb25maWd9ID0gcmVxdWlyZSgnLi4vdXRpbHMvYm9vdHN0cmFwLXByb2Nlc3MnKSBhcyB0eXBlb2YgX2Jvb3RzdHJhcDtcbiAgICAgICAgICBpZiAoKHN1YkNtZC5vcHRzKCkgYXMgR2xvYmFsT3B0aW9ucykudmVyYm9zZSkge1xuICAgICAgICAgICAgbG9nNGpzLmNvbmZpZ3VyZSh7XG4gICAgICAgICAgICAgIGFwcGVuZGVyczoge1xuICAgICAgICAgICAgICAgIG91dDoge1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0ZG91dCcsXG4gICAgICAgICAgICAgICAgICBsYXlvdXQ6IHt0eXBlOiAncGF0dGVybicsIHBhdHRlcm46ICclW1slcF0gJWMlXSAtICVtJ31cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNhdGVnb3JpZXM6IHtcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiB7YXBwZW5kZXJzOiBbJ291dCddLCBsZXZlbDogJ2RlYnVnJ30sXG4gICAgICAgICAgICAgICAgcGxpbms6IHthcHBlbmRlcnM6IFsnb3V0J10sIGxldmVsOiAnZGVidWcnfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaW5pdENvbmZpZyhzdWJDbWQub3B0cygpIGFzIEdsb2JhbE9wdGlvbnMpO1xuICAgICAgICAgIHJldHVybiBjYi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG9yaWdpbkFjdGlvbkZuLmNhbGwodGhpcywgYWN0aW9uQ2FsbGJhY2spO1xuICAgICAgfVxuXG4gICAgICB3aXRoR2xvYmFsT3B0aW9ucyhzdWJDbWQpO1xuICAgICAgcmV0dXJuIHN1YkNtZDtcbiAgICB9XG5cbiAgICB0aGlzLnByb2dyYW0uY29tbWFuZCA9IGNvbW1hbmQgYXMgYW55O1xuXG4gICAgaWYgKHR5cGVvZiBwa2dGaWxlUGF0aCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcGtnRmlsZVBhdGgodGhpcy5wcm9ncmFtKTtcbiAgICAgIGNsaUFjdGlvbkRpc3BhdGNoZXIuYWRkQ29tbWFuZE1ldGEoe3BrZzogJ0B3ZmgvcGxpbmsnLCBtZXRhczogY29tbWFuZE1ldGFJbmZvc30pO1xuICAgIH0gZWxzZSBpZiAocGspIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGZpbGVQYXRoID0gcmVxdWlyZS5yZXNvbHZlKHBrLm5hbWUgKyAnLycgKyBwa2dGaWxlUGF0aCk7XG4gICAgICAgIGNvbnN0IHN1YkNtZEZhY3Rvcnk6IENsaUV4dGVuc2lvbiA9IGZ1bmNOYW1lID8gcmVxdWlyZShmaWxlUGF0aClbZnVuY05hbWVdIDpcbiAgICAgICAgICByZXF1aXJlKGZpbGVQYXRoKTtcbiAgICAgICAgc3ViQ21kRmFjdG9yeSh0aGlzLnByb2dyYW0pO1xuICAgICAgICBjbGlBY3Rpb25EaXNwYXRjaGVyLmFkZENvbW1hbmRNZXRhKHtwa2c6IHBrLm5hbWUsIG1ldGFzOiBjb21tYW5kTWV0YUluZm9zfSk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICBsb2cud2FybihgRmFpbGVkIHRvIGxvYWQgY29tbWFuZCBsaW5lIGV4dGVuc2lvbiBpbiBwYWNrYWdlICR7cGsubmFtZX06IFwiJHtlLm1lc3NhZ2V9XCJgLCBlKTtcbiAgICAgIH0gZmluYWxseSB7XG4gICAgICAgIGZpbGVQYXRoID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdpdGhHbG9iYWxPcHRpb25zKHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kKTogY29tbWFuZGVyLkNvbW1hbmQge1xuICBwcm9ncmFtLm9wdGlvbignLWMsIC0tY29uZmlnIDxjb25maWctZmlsZT4nLFxuICAgIGhsRGVzYygnUmVhZCBjb25maWcgZmlsZXMsIGlmIHRoZXJlIGFyZSBtdWx0aXBsZSBmaWxlcywgdGhlIGxhdHRlciBvbmUgb3ZlcnJpZGVzIHByZXZpb3VzIG9uZScpLFxuICAgICh2YWx1ZSwgcHJldikgPT4geyBwcmV2LnB1c2goLi4udmFsdWUuc3BsaXQoJywnKSk7IHJldHVybiBwcmV2O30sIFtdIGFzIHN0cmluZ1tdKVxuICAub3B0aW9uKCctLXByb3AgPGV4cHJlc3Npb24+JyxcbiAgICBobERlc2MoJzxwcm9wZXJ0eS1wYXRoPj08dmFsdWUgYXMgSlNPTiB8IGxpdGVyYWw+IC4uLiBkaXJlY3RseSBzZXQgY29uZmlndXJhdGlvbiBwcm9wZXJ0aWVzLCBwcm9wZXJ0eSBuYW1lIGlzIGxvZGFzaC5zZXQoKSBwYXRoLWxpa2Ugc3RyaW5nXFxuIGUuZy5cXG4nICtcbiAgICAnLS1wcm9wIHBvcnQ9ODA4MCAtLXByb3AgZGV2TW9kZT1mYWxzZSAtLXByb3AgQHdmaC9mb29iYXIuYXBpPWh0dHA6Ly9sb2NhbGhvc3Q6ODA4MFxcbicgK1xuICAgICctLXByb3AgYXJyYXlsaWtlLnByb3BbMF09Zm9vYmFyXFxuJyArXG4gICAgJy0tcHJvcCBbXCJAd2ZoL2Zvby5iYXJcIixcInByb3BcIiwwXT10cnVlJyksXG4gICAgYXJyYXlPcHRpb25GbiwgW10gYXMgc3RyaW5nW10pXG4gIC5vcHRpb24oJy0tdmVyYm9zZScsIGhsRGVzYygnU2V0IGxvZyBsZXZlbCB0byBcImRlYnVnXCInKSwgZmFsc2UpO1xuICAvLyAub3B0aW9uKCctLWxvZy1zdGF0JywgaGxEZXNjKCdQcmludCBpbnRlcm5hbCBSZWR1eCBzdGF0ZS9hY3Rpb25zIGZvciBkZWJ1ZycpKTtcblxuICByZXR1cm4gcHJvZ3JhbTtcbn1cbiJdfQ==