"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withGlobalOptions = exports.overrideCommand = void 0;
const chalk_1 = __importDefault(require("chalk"));
const utils_1 = require("./utils");
const log4js_1 = __importDefault(require("log4js"));
function overrideCommand(program, ws) {
    const loadedCmdMap = new Map();
    const origPgmCommand = program.command;
    let filePath = null;
    let pk;
    const commandMetaInfos = new Map();
    function command(nameAndArgs, ...restArgs) {
        const cmdName = /^\S+/.exec(nameAndArgs)[0];
        if (loadedCmdMap.has(cmdName)) {
            throw new Error(`Conflict command name ${cmdName} from extensions "${filePath}" and "${loadedCmdMap.get(cmdName)}"`);
        }
        loadedCmdMap.set(cmdName, filePath);
        const subCmd = origPgmCommand.call(this, nameAndArgs, ...restArgs);
        subCmd._plinkMeta = {
            nameAndArgs,
            options: []
        };
        commandMetaInfos.set(pk ? pk.name : '@wfh/plink', subCmd._plinkMeta);
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
                cb.apply(this, arguments);
            }
            return originActionFn.call(this, actionCallback);
        }
        withGlobalOptions(subCmd);
        return subCmd;
    }
    program.command = command;
    return {
        forPackage(pkg, cmdExecutionFile) {
            pk = pkg;
            filePath = cmdExecutionFile;
        },
        commandMetaInfos
    };
}
exports.overrideCommand = overrideCommand;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcnJpZGUtY29tbWFuZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL292ZXJyaWRlLWNvbW1hbmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFFQSxrREFBMEI7QUFDMUIsbUNBQThDO0FBRzlDLG9EQUE0QjtBQUU1QixTQUFnQixlQUFlLENBQUMsT0FBMEIsRUFBRSxFQUFtQjtJQUM3RSxNQUFNLFlBQVksR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztJQUMvQyxNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDO0lBQ3ZDLElBQUksUUFBUSxHQUFrQixJQUFJLENBQUM7SUFFbkMsSUFBSSxFQUEyQixDQUFDO0lBQ2hDLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxHQUFHLEVBQThCLENBQUM7SUFFL0QsU0FBUyxPQUFPLENBQTBCLFdBQW1CLEVBQUUsR0FBRyxRQUFlO1FBRS9FLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0MsSUFBSSxZQUFZLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQzdCLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLE9BQU8scUJBQXFCLFFBQVEsVUFBVSxZQUFZLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUN0SDtRQUVELFlBQVksQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLFFBQVMsQ0FBQyxDQUFDO1FBRXJDLE1BQU0sTUFBTSxHQUFzQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUUsR0FBRyxRQUFRLENBQUMsQ0FBQztRQUNyRyxNQUFnQyxDQUFDLFVBQVUsR0FBRztZQUM3QyxXQUFXO1lBQ1gsT0FBTyxFQUFFLEVBQUU7U0FDWixDQUFDO1FBQ0YsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsWUFBWSxFQUM3QyxNQUFnQyxDQUFDLFVBQWdDLENBQUMsQ0FBQztRQUV0RSxNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDO1FBRXhDLE1BQU0sQ0FBQyxXQUFXLEdBQUcsV0FBa0IsQ0FBQztRQUV4QyxNQUFNLGNBQWMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBRXZCLE1BQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUM7UUFDbkMsTUFBTSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFFckIsTUFBTSxjQUFjLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQztRQUNyQyxNQUFNLENBQUMsTUFBTSxHQUFHLGNBQWMsQ0FBQyxLQUFLLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFFdEQsTUFBTSxpQkFBaUIsR0FBRyxNQUFNLENBQUMsY0FBYyxDQUFDO1FBQ2hELE1BQU0sQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBRWhFLFNBQVMsV0FBVyxDQUEwQyxHQUFXLEVBQUUsR0FBRyxTQUFnQjtZQUM1RixJQUFJLEVBQUU7Z0JBQ0osR0FBRyxHQUFHLGVBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDO1lBQzlDLElBQThCLENBQUMsVUFBVSxDQUFDLElBQUksR0FBRyxHQUFHLENBQUM7WUFDdEQsT0FBTyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRyxTQUFTLENBQUMsQ0FBQztRQUNwRCxDQUFDO1FBRUQsU0FBUyxLQUFLLENBQTBDLEtBQWM7WUFDcEUsSUFBSSxLQUFLO2dCQUNOLElBQThCLENBQUMsVUFBVSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7WUFDM0QsT0FBTyxhQUFhLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztRQUM5QyxDQUFDO1FBRUQsU0FBUyxjQUFjLENBQUMsVUFBbUIsRUFBRSxjQUFpRjtZQUM1SCxPQUFPLFVBQWtELEtBQWEsRUFBRSxJQUFZLEVBQUUsR0FBRyxTQUFnQjtnQkFDdkcsSUFBSSxZQUFpQixDQUFDO2dCQUN0QixJQUFJLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO29CQUN4QixZQUFZLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7aUJBQ2hEO2dCQUNBLElBQThCLENBQUMsVUFBVSxDQUFDLE9BQVEsQ0FBQyxJQUFJLENBQUM7b0JBQ3ZELEtBQUssRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLFVBQVU7aUJBQ3RDLENBQUMsQ0FBQztnQkFDSCxPQUFPLGNBQWMsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQy9DLENBQUMsQ0FBQztRQUNKLENBQUM7UUFFRCxTQUFTLE1BQU0sQ0FBMEMsRUFBMkI7WUFDbEYsU0FBUyxjQUFjO2dCQUNyQixNQUFNLEVBQUMsVUFBVSxFQUFDLEdBQUcsT0FBTyxDQUFDLDRCQUE0QixDQUFzQixDQUFDO2dCQUNoRixJQUFLLE1BQU0sQ0FBQyxJQUFJLEVBQW9CLENBQUMsT0FBTyxFQUFFO29CQUM1QyxnQkFBTSxDQUFDLFNBQVMsQ0FBQzt3QkFDZixTQUFTLEVBQUU7NEJBQ1QsR0FBRyxFQUFFO2dDQUNILElBQUksRUFBRSxRQUFRO2dDQUNkLE1BQU0sRUFBRSxFQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLGtCQUFrQixFQUFDOzZCQUN2RDt5QkFDRjt3QkFDRCxVQUFVLEVBQUU7NEJBQ1YsT0FBTyxFQUFFLEVBQUMsU0FBUyxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBQzs0QkFDN0MsS0FBSyxFQUFFLEVBQUMsU0FBUyxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBQzt5QkFDNUM7cUJBQ0YsQ0FBQyxDQUFDO2lCQUNKO2dCQUNELFVBQVUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFtQixDQUFDLENBQUM7Z0JBQzNDLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzVCLENBQUM7WUFFRCxPQUFPLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ25ELENBQUM7UUFHRCxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMxQixPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0lBRUQsT0FBTyxDQUFDLE9BQU8sR0FBRyxPQUFjLENBQUM7SUFFakMsT0FBTztRQUNMLFVBQVUsQ0FBQyxHQUFnQixFQUFFLGdCQUF3QjtZQUNuRCxFQUFFLEdBQUcsR0FBRyxDQUFDO1lBQ1QsUUFBUSxHQUFHLGdCQUFnQixDQUFDO1FBQzlCLENBQUM7UUFDRCxnQkFBZ0I7S0FDakIsQ0FBQztBQUNKLENBQUM7QUF6R0QsMENBeUdDO0FBRUQsU0FBZ0IsaUJBQWlCLENBQUMsT0FBMEI7SUFDMUQsT0FBTyxDQUFDLE1BQU0sQ0FBQyw0QkFBNEIsRUFDekMsY0FBTSxDQUFDLHVGQUF1RixDQUFDLEVBQy9GLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUEsQ0FBQyxFQUFFLEVBQWMsQ0FBQztTQUNsRixNQUFNLENBQUMscUJBQXFCLEVBQzNCLGNBQU0sQ0FBQyw4SUFBOEk7UUFDckosc0ZBQXNGO1FBQ3RGLG1DQUFtQztRQUNuQyx1Q0FBdUMsQ0FBQyxFQUN4QyxxQkFBYSxFQUFFLEVBQWMsQ0FBQztTQUMvQixNQUFNLENBQUMsV0FBVyxFQUFFLGNBQU0sQ0FBQywwQkFBMEIsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ2hFLGlGQUFpRjtJQUVqRixPQUFPLE9BQU8sQ0FBQztBQUNqQixDQUFDO0FBZEQsOENBY0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY29tbWFuZGVyIGZyb20gJ2NvbW1hbmRlcic7XG5pbXBvcnQge1dvcmtzcGFjZVN0YXRlLCBQYWNrYWdlSW5mb30gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB7aGxEZXNjLCBhcnJheU9wdGlvbkZufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCAqIGFzIF9ib290c3RyYXAgZnJvbSAnLi4vdXRpbHMvYm9vdHN0cmFwLXByb2Nlc3MnO1xuaW1wb3J0IHsgR2xvYmFsT3B0aW9ucyB9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuXG5leHBvcnQgZnVuY3Rpb24gb3ZlcnJpZGVDb21tYW5kKHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kLCB3cz86IFdvcmtzcGFjZVN0YXRlKSB7XG4gIGNvbnN0IGxvYWRlZENtZE1hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIGNvbnN0IG9yaWdQZ21Db21tYW5kID0gcHJvZ3JhbS5jb21tYW5kO1xuICBsZXQgZmlsZVBhdGg6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuXG4gIGxldCBwazogUGFja2FnZUluZm8gfCB1bmRlZmluZWQ7XG4gIGNvbnN0IGNvbW1hbmRNZXRhSW5mb3MgPSBuZXcgTWFwPHN0cmluZywgT3VyQ29tbWFuZE1ldGFkYXRhPigpO1xuXG4gIGZ1bmN0aW9uIGNvbW1hbmQodGhpczogY29tbWFuZGVyLkNvbW1hbmQsIG5hbWVBbmRBcmdzOiBzdHJpbmcsIC4uLnJlc3RBcmdzOiBhbnlbXSkge1xuXG4gICAgY29uc3QgY21kTmFtZSA9IC9eXFxTKy8uZXhlYyhuYW1lQW5kQXJncykhWzBdO1xuICAgIGlmIChsb2FkZWRDbWRNYXAuaGFzKGNtZE5hbWUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENvbmZsaWN0IGNvbW1hbmQgbmFtZSAke2NtZE5hbWV9IGZyb20gZXh0ZW5zaW9ucyBcIiR7ZmlsZVBhdGh9XCIgYW5kIFwiJHtsb2FkZWRDbWRNYXAuZ2V0KGNtZE5hbWUpfVwiYCk7XG4gICAgfVxuXG4gICAgbG9hZGVkQ21kTWFwLnNldChjbWROYW1lLCBmaWxlUGF0aCEpO1xuXG4gICAgY29uc3Qgc3ViQ21kOiBSZXR1cm5UeXBlPHR5cGVvZiBvcmlnUGdtQ29tbWFuZD4gPSBvcmlnUGdtQ29tbWFuZC5jYWxsKHRoaXMsIG5hbWVBbmRBcmdzLCAuLi5yZXN0QXJncyk7XG4gICAgKHN1YkNtZCBhcyBPdXJBdWdtZW50ZWRDb21tYW5kZXIpLl9wbGlua01ldGEgPSB7XG4gICAgICBuYW1lQW5kQXJncyxcbiAgICAgIG9wdGlvbnM6IFtdXG4gICAgfTtcbiAgICBjb21tYW5kTWV0YUluZm9zLnNldChwayA/IHBrLm5hbWUgOiAnQHdmaC9wbGluaycsXG4gICAgICAoc3ViQ21kIGFzIE91ckF1Z21lbnRlZENvbW1hbmRlcikuX3BsaW5rTWV0YSBhcyBPdXJDb21tYW5kTWV0YWRhdGEpO1xuXG4gICAgY29uc3Qgb3JpZ2luRGVzY0ZuID0gc3ViQ21kLmRlc2NyaXB0aW9uO1xuXG4gICAgc3ViQ21kLmRlc2NyaXB0aW9uID0gZGVzY3JpcHRpb24gYXMgYW55O1xuXG4gICAgY29uc3Qgb3JpZ2luQWN0aW9uRm4gPSBzdWJDbWQuYWN0aW9uO1xuICAgIHN1YkNtZC5hY3Rpb24gPSBhY3Rpb247XG5cbiAgICBjb25zdCBvcmlnaW5BbGlhc0ZuID0gc3ViQ21kLmFsaWFzO1xuICAgIHN1YkNtZC5hbGlhcyA9IGFsaWFzO1xuXG4gICAgY29uc3Qgb3JpZ2luT3B0aW9uRm4gPSBzdWJDbWQub3B0aW9uO1xuICAgIHN1YkNtZC5vcHRpb24gPSBjcmVhdGVPcHRpb25GbihmYWxzZSwgb3JpZ2luT3B0aW9uRm4pO1xuXG4gICAgY29uc3Qgb3JpZ2luUmVxT3B0aW9uRm4gPSBzdWJDbWQucmVxdWlyZWRPcHRpb247XG4gICAgc3ViQ21kLnJlcXVpcmVkT3B0aW9uID0gY3JlYXRlT3B0aW9uRm4odHJ1ZSwgb3JpZ2luUmVxT3B0aW9uRm4pO1xuXG4gICAgZnVuY3Rpb24gZGVzY3JpcHRpb24odGhpczogUmV0dXJuVHlwZTx0eXBlb2Ygb3JpZ1BnbUNvbW1hbmQ+LCBzdHI6IHN0cmluZywgLi4ucmVtYWluZGVyOiBhbnlbXSkge1xuICAgICAgaWYgKHBrKVxuICAgICAgICBzdHIgPSBjaGFsay5ibHVlKGBbJHtway5uYW1lfV1gKSArICcgJyArIHN0cjtcbiAgICAgICh0aGlzIGFzIE91ckF1Z21lbnRlZENvbW1hbmRlcikuX3BsaW5rTWV0YS5kZXNjID0gc3RyO1xuICAgICAgcmV0dXJuIG9yaWdpbkRlc2NGbi5jYWxsKHRoaXMsIHN0ciwgLi4ucmVtYWluZGVyKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhbGlhcyh0aGlzOiBSZXR1cm5UeXBlPHR5cGVvZiBvcmlnUGdtQ29tbWFuZD4sIGFsaWFzPzogc3RyaW5nKSB7XG4gICAgICBpZiAoYWxpYXMpXG4gICAgICAgICh0aGlzIGFzIE91ckF1Z21lbnRlZENvbW1hbmRlcikuX3BsaW5rTWV0YS5hbGlhcyA9IGFsaWFzO1xuICAgICAgcmV0dXJuIG9yaWdpbkFsaWFzRm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVPcHRpb25Gbihpc1JlcXVpcmVkOiBib29sZWFuLCBvcmlnaW5PcHRpb25GbjogY29tbWFuZGVyLkNvbW1hbmRbJ29wdGlvbiddIHwgY29tbWFuZGVyLkNvbW1hbmRbJ3JlcXVpcmVkT3B0aW9uJ10pIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbih0aGlzOiBSZXR1cm5UeXBlPHR5cGVvZiBvcmlnUGdtQ29tbWFuZD4sIGZsYWdzOiBzdHJpbmcsIGRlc2M6IHN0cmluZywgLi4ucmVtYWluaW5nOiBhbnlbXSkge1xuICAgICAgICBsZXQgZGVmYXVsdFZhbHVlOiBhbnk7XG4gICAgICAgIGlmIChyZW1haW5pbmcubGVuZ3RoID4gMSkge1xuICAgICAgICAgIGRlZmF1bHRWYWx1ZSA9IHJlbWFpbmluZ1tyZW1haW5pbmcubGVuZ3RoIC0gMV07XG4gICAgICAgIH1cbiAgICAgICAgKHRoaXMgYXMgT3VyQXVnbWVudGVkQ29tbWFuZGVyKS5fcGxpbmtNZXRhLm9wdGlvbnMhLnB1c2goe1xuICAgICAgICAgIGZsYWdzLCBkZXNjLCBkZWZhdWx0VmFsdWUsIGlzUmVxdWlyZWRcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBvcmlnaW5PcHRpb25Gbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhY3Rpb24odGhpczogUmV0dXJuVHlwZTx0eXBlb2Ygb3JpZ1BnbUNvbW1hbmQ+LCBjYjogKC4uLmFyZ3M6IGFueVtdKSA9PiBhbnkpIHtcbiAgICAgIGZ1bmN0aW9uIGFjdGlvbkNhbGxiYWNrKCkge1xuICAgICAgICBjb25zdCB7aW5pdENvbmZpZ30gPSByZXF1aXJlKCcuLi91dGlscy9ib290c3RyYXAtcHJvY2VzcycpIGFzIHR5cGVvZiBfYm9vdHN0cmFwO1xuICAgICAgICBpZiAoKHN1YkNtZC5vcHRzKCkgYXMgR2xvYmFsT3B0aW9ucykudmVyYm9zZSkge1xuICAgICAgICAgIGxvZzRqcy5jb25maWd1cmUoe1xuICAgICAgICAgICAgYXBwZW5kZXJzOiB7XG4gICAgICAgICAgICAgIG91dDoge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdzdGRvdXQnLFxuICAgICAgICAgICAgICAgIGxheW91dDoge3R5cGU6ICdwYXR0ZXJuJywgcGF0dGVybjogJyVbWyVwXSAlYyVdIC0gJW0nfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY2F0ZWdvcmllczoge1xuICAgICAgICAgICAgICBkZWZhdWx0OiB7YXBwZW5kZXJzOiBbJ291dCddLCBsZXZlbDogJ2RlYnVnJ30sXG4gICAgICAgICAgICAgIHBsaW5rOiB7YXBwZW5kZXJzOiBbJ291dCddLCBsZXZlbDogJ2RlYnVnJ31cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpbml0Q29uZmlnKHN1YkNtZC5vcHRzKCkgYXMgR2xvYmFsT3B0aW9ucyk7XG4gICAgICAgIGNiLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBvcmlnaW5BY3Rpb25Gbi5jYWxsKHRoaXMsIGFjdGlvbkNhbGxiYWNrKTtcbiAgICB9XG5cblxuICAgIHdpdGhHbG9iYWxPcHRpb25zKHN1YkNtZCk7XG4gICAgcmV0dXJuIHN1YkNtZDtcbiAgfVxuXG4gIHByb2dyYW0uY29tbWFuZCA9IGNvbW1hbmQgYXMgYW55O1xuXG4gIHJldHVybiB7XG4gICAgZm9yUGFja2FnZShwa2c6IFBhY2thZ2VJbmZvLCBjbWRFeGVjdXRpb25GaWxlOiBzdHJpbmcpIHtcbiAgICAgIHBrID0gcGtnO1xuICAgICAgZmlsZVBhdGggPSBjbWRFeGVjdXRpb25GaWxlO1xuICAgIH0sXG4gICAgY29tbWFuZE1ldGFJbmZvc1xuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd2l0aEdsb2JhbE9wdGlvbnMocHJvZ3JhbTogY29tbWFuZGVyLkNvbW1hbmQpOiBjb21tYW5kZXIuQ29tbWFuZCB7XG4gIHByb2dyYW0ub3B0aW9uKCctYywgLS1jb25maWcgPGNvbmZpZy1maWxlPicsXG4gICAgaGxEZXNjKCdSZWFkIGNvbmZpZyBmaWxlcywgaWYgdGhlcmUgYXJlIG11bHRpcGxlIGZpbGVzLCB0aGUgbGF0dGVyIG9uZSBvdmVycmlkZXMgcHJldmlvdXMgb25lJyksXG4gICAgKHZhbHVlLCBwcmV2KSA9PiB7IHByZXYucHVzaCguLi52YWx1ZS5zcGxpdCgnLCcpKTsgcmV0dXJuIHByZXY7fSwgW10gYXMgc3RyaW5nW10pXG4gIC5vcHRpb24oJy0tcHJvcCA8ZXhwcmVzc2lvbj4nLFxuICAgIGhsRGVzYygnPHByb3BlcnR5LXBhdGg+PTx2YWx1ZSBhcyBKU09OIHwgbGl0ZXJhbD4gLi4uIGRpcmVjdGx5IHNldCBjb25maWd1cmF0aW9uIHByb3BlcnRpZXMsIHByb3BlcnR5IG5hbWUgaXMgbG9kYXNoLnNldCgpIHBhdGgtbGlrZSBzdHJpbmdcXG4gZS5nLlxcbicgK1xuICAgICctLXByb3AgcG9ydD04MDgwIC0tcHJvcCBkZXZNb2RlPWZhbHNlIC0tcHJvcCBAd2ZoL2Zvb2Jhci5hcGk9aHR0cDovL2xvY2FsaG9zdDo4MDgwXFxuJyArXG4gICAgJy0tcHJvcCBhcnJheWxpa2UucHJvcFswXT1mb29iYXJcXG4nICtcbiAgICAnLS1wcm9wIFtcIkB3ZmgvZm9vLmJhclwiLFwicHJvcFwiLDBdPXRydWUnKSxcbiAgICBhcnJheU9wdGlvbkZuLCBbXSBhcyBzdHJpbmdbXSlcbiAgLm9wdGlvbignLS12ZXJib3NlJywgaGxEZXNjKCdTZXQgbG9nIGxldmVsIHRvIFwiZGVidWdcIicpLCBmYWxzZSk7XG4gIC8vIC5vcHRpb24oJy0tbG9nLXN0YXQnLCBobERlc2MoJ1ByaW50IGludGVybmFsIFJlZHV4IHN0YXRlL2FjdGlvbnMgZm9yIGRlYnVnJykpO1xuXG4gIHJldHVybiBwcm9ncmFtO1xufVxuXG5pbnRlcmZhY2UgT3VyQ29tbWFuZE1ldGFkYXRhIHtcbiAgbmFtZUFuZEFyZ3M6IHN0cmluZztcbiAgYWxpYXM/OiBzdHJpbmc7XG4gIGRlc2M6IHN0cmluZztcbiAgdXNhZ2U6IHN0cmluZztcbiAgb3B0aW9uczogT3VyQ29tbWFuZE9wdGlvbltdO1xufVxuXG5pbnRlcmZhY2UgT3VyQ29tbWFuZE9wdGlvbjxUID0gc3RyaW5nPiB7XG4gIGZsYWdzOiBzdHJpbmc7XG4gIGRlc2M6IHN0cmluZztcbiAgZGVmYXVsdFZhbHVlOiBzdHJpbmcgfCBib29sZWFuIHwgVFtdIHwgVDtcbiAgLy8gaXNBcnJheTogYm9vbGVhbjtcbiAgaXNSZXF1aXJlZDogYm9vbGVhbjtcbn1cblxuaW50ZXJmYWNlIE91ckF1Z21lbnRlZENvbW1hbmRlciBleHRlbmRzIGNvbW1hbmRlci5Db21tYW5kIHtcbiAgX3BsaW5rTWV0YTogUGFydGlhbDxPdXJDb21tYW5kTWV0YWRhdGE+O1xufVxuIl19