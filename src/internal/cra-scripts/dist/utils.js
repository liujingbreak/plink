"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.craVersionCheck = exports.saveCmdOptionsToEnv = exports.getCmdOptions = exports.printConfig = exports.drawPuppy = void 0;
// tslint:disable: no-console
const util_1 = __importStar(require("util"));
const path_1 = __importDefault(require("path"));
const semver_1 = require("semver");
const dist_1 = require("@wfh/plink/wfh/dist");
const config_1 = __importDefault(require("@wfh/plink/wfh/dist/config"));
function drawPuppy(slogon, message) {
    if (!slogon) {
        slogon = 'Congrads! Time to publish your shit!';
    }
    const line = '-'.repeat(slogon.length);
    console.log('\n   ' + line + '\n' +
        ` < ${slogon} >\n` +
        '   ' + line + '\n' +
        '\t\\   ^__^\n\t \\  (oo)\\_______\n\t    (__)\\       )\\/\\\n\t        ||----w |\n\t        ||     ||');
    if (message) {
        console.log(message);
    }
}
exports.drawPuppy = drawPuppy;
function printConfig(c, level = 0) {
    const indent = '  '.repeat(level);
    let out = '{\n';
    for (const prop of Object.keys(c)) {
        const value = c[prop];
        out += indent + `  ${JSON.stringify(prop)}: ${printConfigValue(value, level)},\n`;
    }
    out += indent + '}';
    return out;
}
exports.printConfig = printConfig;
function printConfigValue(value, level) {
    let out = '';
    const indent = '  '.repeat(level);
    if (util_1.default.isString(value) || util_1.default.isNumber(value) || util_1.default.isBoolean(value)) {
        out += JSON.stringify(value) + '';
    }
    else if (Array.isArray(value)) {
        out += '[\n';
        value.forEach((row) => {
            out += indent + '    ' + printConfigValue(row, level + 1);
            out += ',\n';
        });
        out += indent + '  ]';
    }
    else if (util_1.default.isFunction(value)) {
        out += value.name + '()';
    }
    else if (util_1.isRegExp(value)) {
        out += `${value.toString()}`;
    }
    else if (util_1.default.isObject(value)) {
        const proto = Object.getPrototypeOf(value);
        if (proto && proto.constructor !== Object) {
            out += `new ${proto.constructor.name}()`;
        }
        else {
            out += printConfig(value, level + 1);
        }
    }
    else {
        out += ' unknown';
    }
    return out;
}
// TODO: move to a Redux store
function getCmdOptions() {
    const cmdOption = JSON.parse(process.env.REACT_APP_cra_build);
    if (cmdOption.devMode || cmdOption.watch) {
        process.env.NODE_ENV = 'development';
    }
    return cmdOption;
}
exports.getCmdOptions = getCmdOptions;
function saveCmdOptionsToEnv(pkgName, cmd, buildType) {
    const opts = cmd.opts();
    const cmdOptions = {
        buildType,
        buildTarget: pkgName,
        watch: opts.watch,
        devMode: opts.dev,
        publicUrl: opts.publicUrl,
        includes: opts.include,
        webpackEnv: opts.dev ? 'development' : 'production'
    };
    if (cmd.opts().publicUrl) {
        process.env.PUBLIC_URL = cmd.opts().publicUrl;
    }
    process.env.REACT_APP_cra_build = JSON.stringify(cmdOptions);
    dist_1.stateFactory.configureStore();
    config_1.default.initSync(cmd.opts());
    return cmdOptions;
}
exports.saveCmdOptionsToEnv = saveCmdOptionsToEnv;
// function withClicOpt(cmd: commander.Command) {
//   cmd.option('-w, --watch', 'Watch file changes and compile', false)
//   .option('--dev', 'set NODE_ENV to "development", enable react-scripts in dev mode', false)
//   .option('--purl, --publicUrl <string>', 'set environment variable PUBLIC_URL for react-scripts', '/');
//   withGlobalOptions(cmd);
// }
function craVersionCheck() {
    const craPackage = require(path_1.default.resolve('node_modules/react-scripts/package.json'));
    if (!semver_1.gt(craPackage.version, '3.4.0')) {
        throw new Error(`react-scripts version must be greater than 3.4.0, current installed version is ${craPackage.version}`);
    }
}
exports.craVersionCheck = craVersionCheck;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkJBQTZCO0FBQzdCLDZDQUFzQztBQUV0QyxnREFBd0I7QUFFeEIsbUNBQTBCO0FBRTFCLDhDQUFnRTtBQUNoRSx3RUFBZ0Q7QUFFaEQsU0FBZ0IsU0FBUyxDQUFDLE1BQWMsRUFBRSxPQUFnQjtJQUN4RCxJQUFJLENBQUMsTUFBTSxFQUFFO1FBQ1gsTUFBTSxHQUFHLHNDQUFzQyxDQUFDO0tBQ2pEO0lBRUQsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEdBQUcsSUFBSSxHQUFHLElBQUk7UUFDL0IsTUFBTSxNQUFNLE1BQU07UUFDbEIsS0FBSyxHQUFHLElBQUksR0FBRyxJQUFJO1FBQ25CLHdHQUF3RyxDQUFDLENBQUM7SUFDNUcsSUFBSSxPQUFPLEVBQUU7UUFDWCxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0tBQ3RCO0FBQ0gsQ0FBQztBQWJELDhCQWFDO0FBRUQsU0FBZ0IsV0FBVyxDQUFDLENBQU0sRUFBRSxLQUFLLEdBQUcsQ0FBQztJQUMzQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2xDLElBQUksR0FBRyxHQUFHLEtBQUssQ0FBQztJQUNoQixLQUFLLE1BQU0sSUFBSSxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUU7UUFDakMsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RCLEdBQUcsSUFBSSxNQUFNLEdBQUcsS0FBSyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLGdCQUFnQixDQUFDLEtBQUssRUFBRSxL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LENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLFlBQVk7S0FDcEQsQ0FBQztJQUNGLElBQUksR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLFNBQVMsRUFBRTtRQUN2QixPQUFPLENBQUMsR0FBVyxDQUFDLFVBQVUsR0FBRyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsU0FBUyxDQUFDO0tBQ3hEO0lBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBRTdELG1CQUFZLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDOUIsZ0JBQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksRUFBbUIsQ0FBQyxDQUFDO0lBQzdDLE9BQU8sVUFBVSxDQUFDO0FBQ3BCLENBQUM7QUFuQkQsa0RBbUJDO0FBRUQsaURBQWlEO0FBQ2pELHVFQUF1RTtBQUN2RSwrRkFBK0Y7QUFDL0YsMkdBQTJHO0FBQzNHLDRCQUE0QjtBQUM1QixJQUFJO0FBR0osU0FBZ0IsZUFBZTtJQUM3QixNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDLENBQUM7SUFDcEYsSUFBSSxDQUFDLFdBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxFQUFFO1FBQ3BDLE1BQU0sSUFBSSxLQUFLLENBQUMsa0ZBQWtGLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO0tBQ3pIO0FBQ0gsQ0FBQztBQUxELDBDQUtDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6IG5vLWNvbnNvbGVcbmltcG9ydCB1dGlsLCB7IGlzUmVnRXhwIH0gZnJvbSAndXRpbCc7XG5pbXBvcnQge0NvbW1hbmRPcHRpb259IGZyb20gJy4vYnVpbGQtb3B0aW9ucyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge2d0fSBmcm9tICdzZW12ZXInO1xuaW1wb3J0IGNvbW1hbmRlciBmcm9tICdDb21tYW5kZXInO1xuaW1wb3J0IHtzdGF0ZUZhY3RvcnksIEdsb2JhbE9wdGlvbnN9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L2NvbmZpZyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBkcmF3UHVwcHkoc2xvZ29uOiBzdHJpbmcsIG1lc3NhZ2U/OiBzdHJpbmcpIHtcbiAgaWYgKCFzbG9nb24pIHtcbiAgICBzbG9nb24gPSAnQ29uZ3JhZHMhIFRpbWUgdG8gcHVibGlzaCB5b3VyIHNoaXQhJztcbiAgfVxuXG4gIGNvbnN0IGxpbmUgPSAnLScucmVwZWF0KHNsb2dvbi5sZW5ndGgpO1xuICBjb25zb2xlLmxvZygnXFxuICAgJyArIGxpbmUgKyAnXFxuJyArXG4gICAgYCA8ICR7c2xvZ29ufSA+XFxuYCArXG4gICAgJyAgICcgKyBsaW5lICsgJ1xcbicgK1xuICAgICdcXHRcXFxcICAgXl9fXlxcblxcdCBcXFxcICAob28pXFxcXF9fX19fX19cXG5cXHQgICAgKF9fKVxcXFwgICAgICAgKVxcXFwvXFxcXFxcblxcdCAgICAgICAgfHwtLS0tdyB8XFxuXFx0ICAgICAgICB8fCAgICAgfHwnKTtcbiAgaWYgKG1lc3NhZ2UpIHtcbiAgICBjb25zb2xlLmxvZyhtZXNzYWdlKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcHJpbnRDb25maWcoYzogYW55LCBsZXZlbCA9IDApOiBzdHJpbmcge1xuICBjb25zdCBpbmRlbnQgPSAnICAnLnJlcGVhdChsZXZlbCk7XG4gIGxldCBvdXQgPSAne1xcbic7XG4gIGZvciAoY29uc3QgcHJvcCBvZiBPYmplY3Qua2V5cyhjKSkge1xuICAgIGNvbnN0IHZhbHVlID0gY1twcm9wXTtcbiAgICBvdXQgKz0gaW5kZW50ICsgYCAgJHtKU09OLnN0cmluZ2lmeShwcm9wKX06ICR7cHJpbnRDb25maWdWYWx1ZSh2YWx1ZSwgbGV2ZWwpfSxcXG5gO1xuICB9XG4gIG91dCArPSBpbmRlbnQgKyAnfSc7XG4gIHJldHVybiBvdXQ7XG59XG5cbmZ1bmN0aW9uIHByaW50Q29uZmlnVmFsdWUodmFsdWU6IGFueSwgbGV2ZWw6IG51bWJlcik6IHN0cmluZyB7XG4gIGxldCBvdXQgPSAnJztcbiAgY29uc3QgaW5kZW50ID0gJyAgJy5yZXBlYXQobGV2ZWwpO1xuICBpZiAodXRpbC5pc1N0cmluZyh2YWx1ZSkgfHwgdXRpbC5pc051bWJlcih2YWx1ZSkgfHwgdXRpbC5pc0Jvb2xlYW4odmFsdWUpKSB7XG4gICAgb3V0ICs9IEpTT04uc3RyaW5naWZ5KHZhbHVlKSArICcnO1xuICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgb3V0ICs9ICdbXFxuJztcbiAgICAodmFsdWUgYXMgYW55W10pLmZvckVhY2goKHJvdzogYW55KSA9PiB7XG4gICAgICBvdXQgKz0gaW5kZW50ICsgJyAgICAnICsgcHJpbnRDb25maWdWYWx1ZShyb3csIGxldmVsICsgMSk7XG4gICAgICBvdXQgKz0gJyxcXG4nO1xuICAgIH0pO1xuICAgIG91dCArPSBpbmRlbnQgKyAnICBdJztcbiAgfSBlbHNlIGlmICh1dGlsLmlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgb3V0ICs9IHZhbHVlLm5hbWUgKyAnKCknO1xuICB9IGVsc2UgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgIG91dCArPSBgJHt2YWx1ZS50b1N0cmluZygpfWA7XG4gIH0gZWxzZSBpZiAodXRpbC5pc09iamVjdCh2YWx1ZSkpIHtcbiAgICBjb25zdCBwcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZih2YWx1ZSk7XG4gICAgaWYgKHByb3RvICYmIHByb3RvLmNvbnN0cnVjdG9yICE9PSBPYmplY3QpIHtcbiAgICAgIG91dCArPSBgbmV3ICR7cHJvdG8uY29uc3RydWN0b3IubmFtZX0oKWA7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSBwcmludENvbmZpZyh2YWx1ZSwgbGV2ZWwgKyAxKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcgdW5rbm93bic7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cblxuXG4vLyBUT0RPOiBtb3ZlIHRvIGEgUmVkdXggc3RvcmVcbmV4cG9ydCBmdW5jdGlvbiBnZXRDbWRPcHRpb25zKCk6IENvbW1hbmRPcHRpb24ge1xuICBjb25zdCBjbWRPcHRpb246IENvbW1hbmRPcHRpb24gPSBKU09OLnBhcnNlKHByb2Nlc3MuZW52LlJFQUNUX0FQUF9jcmFfYnVpbGQhKTtcbiAgaWYgKGNtZE9wdGlvbi5kZXZNb2RlIHx8IGNtZE9wdGlvbi53YXRjaCkge1xuICAgIChwcm9jZXNzLmVudiBhcyBhbnkpLk5PREVfRU5WID0gJ2RldmVsb3BtZW50JztcbiAgfVxuICByZXR1cm4gY21kT3B0aW9uO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2F2ZUNtZE9wdGlvbnNUb0Vudihwa2dOYW1lOiBzdHJpbmcsIGNtZDogY29tbWFuZGVyLkNvbW1hbmQsIGJ1aWxkVHlwZTogJ2FwcCcgfCAnbGliJyk6IENvbW1hbmRPcHRpb24ge1xuICBjb25zdCBvcHRzID0gY21kLm9wdHMoKTtcbiAgY29uc3QgY21kT3B0aW9uczogQ29tbWFuZE9wdGlvbiA9IHtcbiAgICBidWlsZFR5cGUsXG4gICAgYnVpbGRUYXJnZXQ6IHBrZ05hbWUsXG4gICAgd2F0Y2g6IG9wdHMud2F0Y2gsXG4gICAgZGV2TW9kZTogb3B0cy5kZXYsXG4gICAgcHVibGljVXJsOiBvcHRzLnB1YmxpY1VybCxcbiAgICBpbmNsdWRlczogb3B0cy5pbmNsdWRlLFxuICAgIHdlYnBhY2tFbnY6IG9wdHMuZGV2ID8gJ2RldmVsb3BtZW50JyA6ICdwcm9kdWN0aW9uJ1xuICB9O1xuICBpZiAoY21kLm9wdHMoKS5wdWJsaWNVcmwpIHtcbiAgICAocHJvY2Vzcy5lbnYgYXMgYW55KS5QVUJMSUNfVVJMID0gY21kLm9wdHMoKS5wdWJsaWNVcmw7XG4gIH1cbiAgcHJvY2Vzcy5lbnYuUkVBQ1RfQVBQX2NyYV9idWlsZCA9IEpTT04uc3RyaW5naWZ5KGNtZE9wdGlvbnMpO1xuXG4gIHN0YXRlRmFjdG9yeS5jb25maWd1cmVTdG9yZSgpO1xuICBjb25maWcuaW5pdFN5bmMoY21kLm9wdHMoKSBhcyBHbG9iYWxPcHRpb25zKTtcbiAgcmV0dXJuIGNtZE9wdGlvbnM7XG59XG5cbi8vIGZ1bmN0aW9uIHdpdGhDbGljT3B0KGNtZDogY29tbWFuZGVyLkNvbW1hbmQpIHtcbi8vICAgY21kLm9wdGlvbignLXcsIC0td2F0Y2gnLCAnV2F0Y2ggZmlsZSBjaGFuZ2VzIGFuZCBjb21waWxlJywgZmFsc2UpXG4vLyAgIC5vcHRpb24oJy0tZGV2JywgJ3NldCBOT0RFX0VOViB0byBcImRldmVsb3BtZW50XCIsIGVuYWJsZSByZWFjdC1zY3JpcHRzIGluIGRldiBtb2RlJywgZmFsc2UpXG4vLyAgIC5vcHRpb24oJy0tcHVybCwgLS1wdWJsaWNVcmwgPHN0cmluZz4nLCAnc2V0IGVudmlyb25tZW50IHZhcmlhYmxlIFBVQkxJQ19VUkwgZm9yIHJlYWN0LXNjcmlwdHMnLCAnLycpO1xuLy8gICB3aXRoR2xvYmFsT3B0aW9ucyhjbWQpO1xuLy8gfVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBjcmFWZXJzaW9uQ2hlY2soKSB7XG4gIGNvbnN0IGNyYVBhY2thZ2UgPSByZXF1aXJlKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL3JlYWN0LXNjcmlwdHMvcGFja2FnZS5qc29uJykpO1xuICBpZiAoIWd0KGNyYVBhY2thZ2UudmVyc2lvbiwgJzMuNC4wJykpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYHJlYWN0LXNjcmlwdHMgdmVyc2lvbiBtdXN0IGJlIGdyZWF0ZXIgdGhhbiAzLjQuMCwgY3VycmVudCBpbnN0YWxsZWQgdmVyc2lvbiBpcyAke2NyYVBhY2thZ2UudmVyc2lvbn1gKTtcbiAgfVxufVxuIl19