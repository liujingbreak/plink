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
                    throw new Error(`Conflict command name ${cmdName} from extensions "${filePath}" and "${self.loadedCmdMap.get(cmdName)}"`);
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
            // subCmd.description = description as any;
            const originActionFn = subCmd.action;
            subCmd.action = action;
            const originAliasFn = subCmd.alias;
            subCmd.alias = alias;
            const originOptionFn = subCmd.option;
            subCmd.option = createOptionFn(false, originOptionFn);
            subCmd._origOption = originOptionFn;
            const originReqOptionFn = subCmd.requiredOption;
            subCmd.requiredOption = createOptionFn(true, originReqOptionFn);
            subCmd.description = function description(str, argsDescription) {
                if (str) {
                    if (pk)
                        str = chalk_1.default.blue(`[${pk.name}]`) + ' ' + str;
                    const plinkMeta = self.metaMap.get(this);
                    plinkMeta.desc = str;
                    if (argsDescription) {
                        plinkMeta.argDesc = argsDescription;
                    }
                }
                // console.log(str);
                return originDescFn.call(subCmd, str, argsDescription);
            };
            function alias(alias) {
                if (alias) {
                    const plinkMeta = self.metaMap.get(this);
                    plinkMeta.alias = alias;
                }
                return originAliasFn.apply(this, arguments);
            }
            function createOptionFn(isRequired, originOptionFn) {
                return function (flags, desc, ...remaining) {
                    let defaultValue;
                    if (remaining.length > 1) {
                        defaultValue = remaining[remaining.length - 1];
                    }
                    const plinkMeta = self.metaMap.get(this);
                    plinkMeta.options.push({
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
                                    layout: { type: 'pattern', pattern: (process.send ? '%z' : '') + '%[[%p] %c%] - %m' }
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
    }
    appendGlobalOptions(saveToStore) {
        for (const cmd of this.allSubCmds) {
            withGlobalOptions(cmd);
        }
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
function withGlobalOptions(program) {
    if (program._origOption == null) {
        program._origOption = program.option;
    }
    program._origOption('-c, --config <config-file>', utils_1.hlDesc('Read config files, if there are multiple files, the latter one overrides previous one'), (value, prev) => {
        prev.push(...value.split(','));
        return prev;
        // return prev.concat(value.split(','));
    }, []);
    program._origOption('--prop <expression>', utils_1.hlDesc('<property-path>=<value as JSON | literal> ... directly set configuration properties, property name is lodash.set() path-like string\n e.g.\n' +
        '--prop port=8080 --prop devMode=false --prop @wfh/foobar.api=http://localhost:8080\n' +
        '--prop arraylike.prop[0]=foobar\n' +
        '--prop ["@wfh/foo.bar","prop",0]=true'), utils_1.arrayOptionFn, [])
        .option('--verbose', utils_1.hlDesc('Specify log level as "debug"'), false)
        .option('--dev', utils_1.hlDesc('By turning on this option,' +
        ' Plink setting property "devMode" will automatcially set to `true`,' +
        ' and process.env.NODE_ENV will also being updated to \'developement\' or \'production correspondingly. '), false)
        .option('--env <setting-env>', utils_1.hlDesc('customized environment value, package setting file may return different values based on its value (cliOptions.env)'));
    // .option('--log-stat', hlDesc('Print internal Redux state/actions for debug'));
    return program;
}
exports.withGlobalOptions = withGlobalOptions;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcnJpZGUtY29tbWFuZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL292ZXJyaWRlLWNvbW1hbmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFFQSxrREFBMEI7QUFDMUIsbUNBQThDO0FBRzlDLDJDQUFnRDtBQUNoRCxvREFBNEI7QUFFNUIsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsMEJBQTBCLENBQUMsQ0FBQztBQUV6RCxNQUFhLGdCQUFnQjtJQVUzQixZQUFvQixPQUEwQixFQUFFLEVBQW1CO1FBQS9DLFlBQU8sR0FBUCxPQUFPLENBQW1CO1FBVHRDLGlCQUFZLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7UUFHekMsc0JBQWlCLEdBQXVCLElBQUksQ0FBQztRQUU3QyxlQUFVLEdBQTRCLEVBQUUsQ0FBQztRQUN6QyxZQUFPLEdBQUcsSUFBSSxPQUFPLEVBQWtELENBQUM7UUFDeEUsZ0JBQVcsR0FBRyxJQUFJLEdBQUcsRUFBZ0MsQ0FBQztRQUc1RCxJQUFJLENBQUMsY0FBYyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUM7UUFDdEMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBRWxCLFNBQVMsT0FBTyxDQUEwQixXQUFtQixFQUFFLEdBQUcsUUFBZTtZQUMvRSxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUM7WUFDbEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDO1lBQzFDLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDN0MsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRTtnQkFDbEMsSUFBSSxRQUFRO29CQUNWLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLE9BQU8scUJBQXFCLFFBQVEsVUFBVSxJQUFJ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QXNLQztBQUVELFNBQWdCLGlCQUFpQixDQUFDLE9BQWtEO0lBQ2xGLElBQUssT0FBaUMsQ0FBQyxXQUFXLElBQUksSUFBSSxFQUFFO1FBQ3pELE9BQWlDLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7S0FDakU7SUFDQSxPQUFpQyxDQUFDLFdBQVcsQ0FBQyw0QkFBNEIsRUFDekUsY0FBTSxDQUFDLHVGQUF1RixDQUFDLEVBQy9GLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFO1FBQ2QsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUMvQixPQUFPLElBQUksQ0FBQztRQUNaLHdDQUF3QztJQUMxQyxDQUFDLEVBQUUsRUFBYyxDQUFDLENBQUM7SUFDcEIsT0FBaUMsQ0FBQyxXQUFXLENBQUMscUJBQXFCLEVBQ2xFLGNBQU0sQ0FBQyw4SUFBOEk7UUFDckosc0ZBQXNGO1FBQ3RGLG1DQUFtQztRQUNuQyx1Q0FBdUMsQ0FBQyxFQUN4QyxxQkFBYSxFQUFFLEVBQWMsQ0FBQztTQUMvQixNQUFNLENBQUMsV0FBVyxFQUFFLGNBQU0sQ0FBQyw4QkFBOEIsQ0FBQyxFQUFFLEtBQUssQ0FBQztTQUNsRSxNQUFNLENBQUMsT0FBTyxFQUFFLGNBQU0sQ0FBQyw0QkFBNEI7UUFDbEQscUVBQXFFO1FBQ3JFLHlHQUF5RyxDQUFDLEVBQUUsS0FBSyxDQUFDO1NBQ25ILE1BQU0sQ0FBQyxxQkFBcUIsRUFBRSxjQUFNLENBQUMsb0hBQW9ILENBQUMsQ0FBQyxDQUFDO0lBRTdKLGlGQUFpRjtJQUVqRixPQUFPLE9BQU8sQ0FBQztBQUNqQixDQUFDO0FBMUJELDhDQTBCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjb21tYW5kZXIgZnJvbSAnY29tbWFuZGVyJztcbmltcG9ydCB7V29ya3NwYWNlU3RhdGUsIFBhY2thZ2VJbmZvfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHtobERlc2MsIGFycmF5T3B0aW9uRm59IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0ICogYXMgX2Jvb3RzdHJhcCBmcm9tICcuLi91dGlscy9ib290c3RyYXAtcHJvY2Vzcyc7XG5pbXBvcnQgeyBHbG9iYWxPcHRpb25zLCBPdXJDb21tYW5kTWV0YWRhdGEsIE91ckF1Z21lbnRlZENvbW1hbmRlciwgQ2xpRXh0ZW5zaW9uIH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge2NsaUFjdGlvbkRpc3BhdGNoZXJ9IGZyb20gJy4vY2xpLXNsaWNlJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsub3ZlcnJpZGUtY29tbWFuZGVyJyk7XG5cbmV4cG9ydCBjbGFzcyBDb21tYW5kT3ZlcnJpZGVyIHtcbiAgcHJpdmF0ZSBsb2FkZWRDbWRNYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBwcml2YXRlIG9yaWdQZ21Db21tYW5kOiBjb21tYW5kZXIuQ29tbWFuZFsnY29tbWFuZCddO1xuICBwcml2YXRlIGN1cnJDbGllQ3JlYXRvckZpbGU6IHN0cmluZztcbiAgcHJpdmF0ZSBjdXJyQ2xpQ3JlYXRvclBrZzogUGFja2FnZUluZm8gfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBjdXJyQ2xpUGtnTWF0YUluZm9zOiBPdXJDb21tYW5kTWV0YWRhdGFbXTtcbiAgcHJpdmF0ZSBhbGxTdWJDbWRzOiBPdXJBdWdtZW50ZWRDb21tYW5kZXJbXSA9IFtdO1xuICBwcml2YXRlIG1ldGFNYXAgPSBuZXcgV2Vha01hcDxjb21tYW5kZXIuQ29tbWFuZCwgUGFydGlhbDxPdXJDb21tYW5kTWV0YWRhdGE+PigpO1xuICBwcml2YXRlIHBrZ01ldGFzTWFwID0gbmV3IE1hcDxzdHJpbmcsIE91ckNvbW1hbmRNZXRhZGF0YVtdPigpO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcHJvZ3JhbTogY29tbWFuZGVyLkNvbW1hbmQsIHdzPzogV29ya3NwYWNlU3RhdGUpIHtcbiAgICB0aGlzLm9yaWdQZ21Db21tYW5kID0gcHJvZ3JhbS5jb21tYW5kO1xuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuXG4gICAgZnVuY3Rpb24gY29tbWFuZCh0aGlzOiBjb21tYW5kZXIuQ29tbWFuZCwgbmFtZUFuZEFyZ3M6IHN0cmluZywgLi4ucmVzdEFyZ3M6IGFueVtdKSB7XG4gICAgICBjb25zdCBwayA9IHNlbGYuY3VyckNsaUNyZWF0b3JQa2c7XG4gICAgICBjb25zdCBmaWxlUGF0aCA9IHNlbGYuY3VyckNsaWVDcmVhdG9yRmlsZTtcbiAgICAgIGNvbnN0IGNtZE5hbWUgPSAvXlxcUysvLmV4ZWMobmFtZUFuZEFyZ3MpIVswXTtcbiAgICAgIGlmIChzZWxmLmxvYWRlZENtZE1hcC5oYXMoY21kTmFtZSkpIHtcbiAgICAgICAgaWYgKGZpbGVQYXRoKVxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgQ29uZmxpY3QgY29tbWFuZCBuYW1lICR7Y21kTmFtZX0gZnJvbSBleHRlbnNpb25zIFwiJHtmaWxlUGF0aH1cIiBhbmQgXCIke3NlbGYubG9hZGVkQ21kTWFwLmdldChjbWROYW1lKX1cImApO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb25mbGljdCB3aXRoIGV4aXN0aW5nIFBsaW5rIGNvbW1hbmQgbmFtZSAke2NtZE5hbWV9YCk7XG4gICAgICB9XG5cbiAgICAgIHNlbGYubG9hZGVkQ21kTWFwLnNldChjbWROYW1lLCBmaWxlUGF0aCA/IGZpbGVQYXRoIDogJ0B3ZmgvcGxpbmsnKTtcblxuICAgICAgY29uc3Qgc3ViQ21kOiBjb21tYW5kZXIuQ29tbWFuZCA9IHNlbGYub3JpZ1BnbUNvbW1hbmQuY2FsbCh0aGlzLCBuYW1lQW5kQXJncywgLi4ucmVzdEFyZ3MpO1xuICAgICAgY29uc3QgbWV0YTogUGFydGlhbDxPdXJDb21tYW5kTWV0YWRhdGE+ID0ge1xuICAgICAgICBwa2dOYW1lOiBwayA/IHBrLm5hbWUgOiAnQHdmaC9wbGluaycsXG4gICAgICAgIG5hbWVBbmRBcmdzLFxuICAgICAgICBvcHRpb25zOiBbXSxcbiAgICAgICAgZGVzYzogcGsgPT0gbnVsbCA/ICcnIDogY2hhbGsuYmx1ZShgWyR7cGsubmFtZX1dYClcbiAgICAgIH07XG4gICAgICBzZWxmLm1ldGFNYXAuc2V0KHN1YkNtZCwgbWV0YSk7XG4gICAgICBzZWxmLmN1cnJDbGlQa2dNYXRhSW5mb3MucHVzaChtZXRhIGFzIE91ckNvbW1hbmRNZXRhZGF0YSk7XG5cbiAgICAgIHN1YkNtZC5kZXNjcmlwdGlvbihtZXRhLmRlc2MhKTtcblxuICAgICAgY29uc3Qgb3JpZ2luRGVzY0ZuID0gc3ViQ21kLmRlc2NyaXB0aW9uO1xuXG4gICAgICAvLyBzdWJDbWQuZGVzY3JpcHRpb24gPSBkZXNjcmlwdGlvbiBhcyBhbnk7XG5cbiAgICAgIGNvbnN0IG9yaWdpbkFjdGlvbkZuID0gc3ViQ21kLmFjdGlvbjtcbiAgICAgIHN1YkNtZC5hY3Rpb24gPSBhY3Rpb247XG5cbiAgICAgIGNvbnN0IG9yaWdpbkFsaWFzRm4gPSBzdWJDbWQuYWxpYXM7XG4gICAgICBzdWJDbWQuYWxpYXMgPSBhbGlhcztcblxuICAgICAgY29uc3Qgb3JpZ2luT3B0aW9uRm4gPSBzdWJDbWQub3B0aW9uO1xuICAgICAgc3ViQ21kLm9wdGlvbiA9IGNyZWF0ZU9wdGlvbkZuKGZhbHNlLCBvcmlnaW5PcHRpb25Gbik7XG4gICAgICAoc3ViQ21kIGFzIE91ckF1Z21lbnRlZENvbW1hbmRlcikuX29yaWdPcHRpb24gPSBvcmlnaW5PcHRpb25GbjtcblxuICAgICAgY29uc3Qgb3JpZ2luUmVxT3B0aW9uRm4gPSBzdWJDbWQucmVxdWlyZWRPcHRpb247XG4gICAgICBzdWJDbWQucmVxdWlyZWRPcHRpb24gPSBjcmVhdGVPcHRpb25Gbih0cnVlLCBvcmlnaW5SZXFPcHRpb25Gbik7XG5cbiAgICAgIHN1YkNtZC5kZXNjcmlwdGlvbiA9IGZ1bmN0aW9uIGRlc2NyaXB0aW9uKHN0cj86IHN0cmluZyxcbiAgICAgICAgYXJnc0Rlc2NyaXB0aW9uPzogeyBbYXJnTmFtZTogc3RyaW5nXTogc3RyaW5nOyB9KSB7XG4gICAgICAgIGlmIChzdHIpIHtcbiAgICAgICAgICBpZiAocGspXG4gICAgICAgICAgICBzdHIgPSBjaGFsay5ibHVlKGBbJHtway5uYW1lfV1gKSArICcgJyArIHN0cjtcblxuICAgICAgICAgIGNvbnN0IHBsaW5rTWV0YSA9IHNlbGYubWV0YU1hcC5nZXQodGhpcykhO1xuICAgICAgICAgIHBsaW5rTWV0YS5kZXNjID0gc3RyO1xuICAgICAgICAgIGlmIChhcmdzRGVzY3JpcHRpb24pIHtcbiAgICAgICAgICAgIHBsaW5rTWV0YS5hcmdEZXNjID0gYXJnc0Rlc2NyaXB0aW9uO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBjb25zb2xlLmxvZyhzdHIpO1xuICAgICAgICByZXR1cm4gb3JpZ2luRGVzY0ZuLmNhbGwoc3ViQ21kLCBzdHIsIGFyZ3NEZXNjcmlwdGlvbikgYXMgYW55O1xuICAgICAgfTtcblxuICAgICAgZnVuY3Rpb24gYWxpYXModGhpczogY29tbWFuZGVyLkNvbW1hbmQsIGFsaWFzPzogc3RyaW5nKSB7XG4gICAgICAgIGlmIChhbGlhcykge1xuICAgICAgICAgIGNvbnN0IHBsaW5rTWV0YSA9IHNlbGYubWV0YU1hcC5nZXQodGhpcykhO1xuICAgICAgICAgIHBsaW5rTWV0YS5hbGlhcyA9IGFsaWFzO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvcmlnaW5BbGlhc0ZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGNyZWF0ZU9wdGlvbkZuKGlzUmVxdWlyZWQ6IGJvb2xlYW4sIG9yaWdpbk9wdGlvbkZuOiBjb21tYW5kZXIuQ29tbWFuZFsnb3B0aW9uJ10gfCBjb21tYW5kZXIuQ29tbWFuZFsncmVxdWlyZWRPcHRpb24nXSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24odGhpczogY29tbWFuZGVyLkNvbW1hbmQsIGZsYWdzOiBzdHJpbmcsIGRlc2M6IHN0cmluZywgLi4ucmVtYWluaW5nOiBhbnlbXSkge1xuICAgICAgICAgIGxldCBkZWZhdWx0VmFsdWU6IGFueTtcbiAgICAgICAgICBpZiAocmVtYWluaW5nLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIGRlZmF1bHRWYWx1ZSA9IHJlbWFpbmluZ1tyZW1haW5pbmcubGVuZ3RoIC0gMV07XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IHBsaW5rTWV0YSA9IHNlbGYubWV0YU1hcC5nZXQodGhpcykhO1xuICAgICAgICAgIHBsaW5rTWV0YS5vcHRpb25zIS5wdXNoKHtcbiAgICAgICAgICAgIGZsYWdzLCBkZXNjLCBkZWZhdWx0VmFsdWUsIGlzUmVxdWlyZWRcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIHJldHVybiBvcmlnaW5PcHRpb25Gbi5jYWxsKHRoaXMsIGZsYWdzLCBkZXNjLCAuLi5yZW1haW5pbmcpO1xuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBhY3Rpb24odGhpczogY29tbWFuZGVyLkNvbW1hbmQsIGNiOiAoLi4uYXJnczogYW55W10pID0+IGFueSkge1xuICAgICAgICBmdW5jdGlvbiBhY3Rpb25DYWxsYmFjaygpIHtcbiAgICAgICAgICBjb25zdCB7aW5pdENvbmZpZ30gPSByZXF1aXJlKCcuLi91dGlscy9ib290c3RyYXAtcHJvY2VzcycpIGFzIHR5cGVvZiBfYm9vdHN0cmFwO1xuICAgICAgICAgIGlmICgoc3ViQ21kLm9wdHMoKSBhcyBHbG9iYWxPcHRpb25zKS52ZXJib3NlKSB7XG4gICAgICAgICAgICBsb2c0anMuY29uZmlndXJlKHtcbiAgICAgICAgICAgICAgYXBwZW5kZXJzOiB7XG4gICAgICAgICAgICAgICAgb3V0OiB7XG4gICAgICAgICAgICAgICAgICB0eXBlOiAnc3Rkb3V0JyxcbiAgICAgICAgICAgICAgICAgIGxheW91dDoge3R5cGU6ICdwYXR0ZXJuJywgcGF0dGVybjogKHByb2Nlc3Muc2VuZCA/ICcleicgOiAnJykgKyAnJVtbJXBdICVjJV0gLSAlbSd9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjYXRlZ29yaWVzOiB7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDoge2FwcGVuZGVyczogWydvdXQnXSwgbGV2ZWw6ICdkZWJ1Zyd9LFxuICAgICAgICAgICAgICAgIHBsaW5rOiB7YXBwZW5kZXJzOiBbJ291dCddLCBsZXZlbDogJ2RlYnVnJ31cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGluaXRDb25maWcoc3ViQ21kLm9wdHMoKSBhcyBHbG9iYWxPcHRpb25zKTtcbiAgICAgICAgICByZXR1cm4gY2IuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBvcmlnaW5BY3Rpb25Gbi5jYWxsKHRoaXMsIGFjdGlvbkNhbGxiYWNrKTtcbiAgICAgIH1cbiAgICAgIHNlbGYuYWxsU3ViQ21kcy5wdXNoKHN1YkNtZCBhcyBPdXJBdWdtZW50ZWRDb21tYW5kZXIpO1xuICAgICAgcmV0dXJuIHN1YkNtZDtcbiAgICB9XG4gICAgdGhpcy5wcm9ncmFtLmNvbW1hbmQgPSBjb21tYW5kIGFzIGFueTtcbiAgfVxuXG4gIGZvclBhY2thZ2UocGs6IFBhY2thZ2VJbmZvLCBwa2dGaWxlUGF0aDogc3RyaW5nLCBmdW5jTmFtZTogc3RyaW5nKTogdm9pZDtcbiAgZm9yUGFja2FnZShwazogbnVsbCwgY29tbWFuZENyZWF0aW9uOiAocHJvZ3JhbTogY29tbWFuZGVyLkNvbW1hbmQpID0+IHZvaWQpOiB2b2lkO1xuICBmb3JQYWNrYWdlKHBrOiBQYWNrYWdlSW5mbyB8IG51bGwsXG4gICAgcGtnRmlsZVBhdGg6IHN0cmluZyB8ICgocHJvZ3JhbTogY29tbWFuZGVyLkNvbW1hbmQpID0+IHZvaWQpLFxuICAgIGZ1bmNOYW1lPzogc3RyaW5nKSB7XG4gICAgY29uc3QgY29tbWFuZE1ldGFJbmZvcyA9IHRoaXMuY3VyckNsaVBrZ01hdGFJbmZvcyA9IFtdO1xuICAgIHRoaXMuY3VyckNsaUNyZWF0b3JQa2cgPSBwaztcblxuICAgIGxldCBmaWxlUGF0aDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG5cbiAgICBpZiAodHlwZW9mIHBrZ0ZpbGVQYXRoID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBwa2dGaWxlUGF0aCh0aGlzLnByb2dyYW0pO1xuICAgICAgdGhpcy5wa2dNZXRhc01hcC5zZXQoJ0B3ZmgvcGxpbmsnLCBjb21tYW5kTWV0YUluZm9zKTtcbiAgICB9IGVsc2UgaWYgKHBrKSB7XG4gICAgICB0cnkge1xuICAgICAgICBmaWxlUGF0aCA9IHJlcXVpcmUucmVzb2x2ZShway5uYW1lICsgJy8nICsgcGtnRmlsZVBhdGgpO1xuICAgICAgICB0aGlzLmN1cnJDbGllQ3JlYXRvckZpbGUgPSBmaWxlUGF0aDtcbiAgICAgICAgY29uc3Qgc3ViQ21kRmFjdG9yeTogQ2xpRXh0ZW5zaW9uID0gZnVuY05hbWUgPyByZXF1aXJlKGZpbGVQYXRoKVtmdW5jTmFtZV0gOlxuICAgICAgICAgIHJlcXVpcmUoZmlsZVBhdGgpO1xuICAgICAgICBzdWJDbWRGYWN0b3J5KHRoaXMucHJvZ3JhbSk7XG4gICAgICAgIHRoaXMucGtnTWV0YXNNYXAuc2V0KHBrLm5hbWUsIGNvbW1hbmRNZXRhSW5mb3MpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgbG9nLndhcm4oYEZhaWxlZCB0byBsb2FkIGNvbW1hbmQgbGluZSBleHRlbnNpb24gaW4gcGFja2FnZSAke3BrLm5hbWV9OiBcIiR7ZS5tZXNzYWdlfVwiYCwgZSk7XG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICBmaWxlUGF0aCA9IG51bGw7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXBwZW5kR2xvYmFsT3B0aW9ucyhzYXZlVG9TdG9yZTogYm9vbGVhbikge1xuICAgIGZvciAoY29uc3QgY21kIG9mIHRoaXMuYWxsU3ViQ21kcykge1xuICAgICAgd2l0aEdsb2JhbE9wdGlvbnMoY21kKTtcbiAgICB9XG4gICAgaWYgKCFzYXZlVG9TdG9yZSlcbiAgICAgIHJldHVybjtcbiAgICBwcm9jZXNzLm5leHRUaWNrKCgpID0+IHtcbiAgICAgIGZvciAoY29uc3QgW3BrZywgbWV0YXNdIG9mIHRoaXMucGtnTWV0YXNNYXAuZW50cmllcygpKSB7XG4gICAgICAgIGNsaUFjdGlvbkRpc3BhdGNoZXIuYWRkQ29tbWFuZE1ldGEoe3BrZywgbWV0YXN9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gd2l0aEdsb2JhbE9wdGlvbnMocHJvZ3JhbTogT3VyQXVnbWVudGVkQ29tbWFuZGVyIHwgY29tbWFuZGVyLkNvbW1hbmQpOiBjb21tYW5kZXIuQ29tbWFuZCB7XG4gIGlmICgocHJvZ3JhbSBhcyBPdXJBdWdtZW50ZWRDb21tYW5kZXIpLl9vcmlnT3B0aW9uID09IG51bGwpIHtcbiAgICAocHJvZ3JhbSBhcyBPdXJBdWdtZW50ZWRDb21tYW5kZXIpLl9vcmlnT3B0aW9uID0gcHJvZ3JhbS5vcHRpb247XG4gIH1cbiAgKHByb2dyYW0gYXMgT3VyQXVnbWVudGVkQ29tbWFuZGVyKS5fb3JpZ09wdGlvbignLWMsIC0tY29uZmlnIDxjb25maWctZmlsZT4nLFxuICAgIGhsRGVzYygnUmVhZCBjb25maWcgZmlsZXMsIGlmIHRoZXJlIGFyZSBtdWx0aXBsZSBmaWxlcywgdGhlIGxhdHRlciBvbmUgb3ZlcnJpZGVzIHByZXZpb3VzIG9uZScpLFxuICAgICh2YWx1ZSwgcHJldikgPT4ge1xuICAgICAgcHJldi5wdXNoKC4uLnZhbHVlLnNwbGl0KCcsJykpO1xuICAgICAgcmV0dXJuIHByZXY7XG4gICAgICAvLyByZXR1cm4gcHJldi5jb25jYXQodmFsdWUuc3BsaXQoJywnKSk7XG4gICAgfSwgW10gYXMgc3RyaW5nW10pO1xuICAocHJvZ3JhbSBhcyBPdXJBdWdtZW50ZWRDb21tYW5kZXIpLl9vcmlnT3B0aW9uKCctLXByb3AgPGV4cHJlc3Npb24+JyxcbiAgICBobERlc2MoJzxwcm9wZXJ0eS1wYXRoPj08dmFsdWUgYXMgSlNPTiB8IGxpdGVyYWw+IC4uLiBkaXJlY3RseSBzZXQgY29uZmlndXJhdGlvbiBwcm9wZXJ0aWVzLCBwcm9wZXJ0eSBuYW1lIGlzIGxvZGFzaC5zZXQoKSBwYXRoLWxpa2Ugc3RyaW5nXFxuIGUuZy5cXG4nICtcbiAgICAnLS1wcm9wIHBvcnQ9ODA4MCAtLXByb3AgZGV2TW9kZT1mYWxzZSAtLXByb3AgQHdmaC9mb29iYXIuYXBpPWh0dHA6Ly9sb2NhbGhvc3Q6ODA4MFxcbicgK1xuICAgICctLXByb3AgYXJyYXlsaWtlLnByb3BbMF09Zm9vYmFyXFxuJyArXG4gICAgJy0tcHJvcCBbXCJAd2ZoL2Zvby5iYXJcIixcInByb3BcIiwwXT10cnVlJyksXG4gICAgYXJyYXlPcHRpb25GbiwgW10gYXMgc3RyaW5nW10pXG4gIC5vcHRpb24oJy0tdmVyYm9zZScsIGhsRGVzYygnU3BlY2lmeSBsb2cgbGV2ZWwgYXMgXCJkZWJ1Z1wiJyksIGZhbHNlKVxuICAub3B0aW9uKCctLWRldicsIGhsRGVzYygnQnkgdHVybmluZyBvbiB0aGlzIG9wdGlvbiwnICtcbiAgICAnIFBsaW5rIHNldHRpbmcgcHJvcGVydHkgXCJkZXZNb2RlXCIgd2lsbCBhdXRvbWF0Y2lhbGx5IHNldCB0byBgdHJ1ZWAsJyArXG4gICAgJyBhbmQgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgd2lsbCBhbHNvIGJlaW5nIHVwZGF0ZWQgdG8gXFwnZGV2ZWxvcGVtZW50XFwnIG9yIFxcJ3Byb2R1Y3Rpb24gY29ycmVzcG9uZGluZ2x5LiAnKSwgZmFsc2UpXG4gIC5vcHRpb24oJy0tZW52IDxzZXR0aW5nLWVudj4nLCBobERlc2MoJ2N1c3RvbWl6ZWQgZW52aXJvbm1lbnQgdmFsdWUsIHBhY2thZ2Ugc2V0dGluZyBmaWxlIG1heSByZXR1cm4gZGlmZmVyZW50IHZhbHVlcyBiYXNlZCBvbiBpdHMgdmFsdWUgKGNsaU9wdGlvbnMuZW52KScpKTtcblxuICAvLyAub3B0aW9uKCctLWxvZy1zdGF0JywgaGxEZXNjKCdQcmludCBpbnRlcm5hbCBSZWR1eCBzdGF0ZS9hY3Rpb25zIGZvciBkZWJ1ZycpKTtcblxuICByZXR1cm4gcHJvZ3JhbTtcbn1cbiJdfQ==