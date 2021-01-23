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
const log_config_1 = __importDefault(require("@wfh/plink/wfh/dist/log-config"));
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
    const setting = config_1.default.initSync(cmd.opts());
    log_config_1.default(setting);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkJBQTZCO0FBQzdCLDZDQUFzQztBQUV0QyxnREFBd0I7QUFFeEIsbUNBQTBCO0FBRTFCLDhDQUFnRTtBQUNoRSx3RUFBZ0Q7QUFDaEQsZ0ZBQXVEO0FBRXZELFNBQWdCLFNBQVMsQ0FBQyxNQUFjLEVBQUUsT0FBZ0I7SUFDeEQsSUFBSSxDQUFDLE1BQU0sRUFBRTtRQUNYLE1BQU0sR0FBRyxzQ0FBc0MsQ0FBQztLQUNqRDtJQUVELE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxHQUFHLElBQUksR0FBRyxJQUFJO1FBQy9CLE1BQU0sTUFBTSxNQUFNO1FBQ2xCLEtBQUssR0FBRyxJQUFJLEdBQUcsSUFBSTtRQUNuQix3R0FBd0csQ0FBQyxDQUFDO0lBQzVHLElBQUksT0FBTyxFQUFFO1FBQ1gsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztLQUN0QjtBQUNILENBQUM7QUFiRCw4QkFhQztBQUVELFNBQWdCLFdBQVcsQ0FBQyxDQUFNLEVBQUUsS0FBSyxHQUFHLENBQUM7SUFDM0MsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNsQyxJQUFJLEdBQUcsR0FBRyxLQUFLLENBQUM7SUFDaEIsS0FBSyxNQUFNLElBQUksSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFO1FBQ2pDLE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0QixHQUFHLElBQUksTUFBTSxHQUFHLEtBQUssSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxnQkFBZ0IsQ0FB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QUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxZQUFZO0tBQ3BELENBQUM7SUFDRixJQUFJLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxTQUFTLEVBQUU7UUFDdkIsT0FBTyxDQUFDLEdBQVcsQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLFNBQVMsQ0FBQztLQUN4RDtJQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUU3RCxtQkFBWSxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBQzlCLE1BQU0sT0FBTyxHQUFHLGdCQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQW1CLENBQUMsQ0FBQztJQUM3RCxvQkFBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ25CLE9BQU8sVUFBVSxDQUFDO0FBQ3BCLENBQUM7QUFwQkQsa0RBb0JDO0FBRUQsaURBQWlEO0FBQ2pELHVFQUF1RTtBQUN2RSwrRkFBK0Y7QUFDL0YsMkdBQTJHO0FBQzNHLDRCQUE0QjtBQUM1QixJQUFJO0FBR0osU0FBZ0IsZUFBZTtJQUM3QixNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDLENBQUM7SUFDcEYsSUFBSSxDQUFDLFdBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxFQUFFO1FBQ3BDLE1BQU0sSUFBSSxLQUFLLENBQUMsa0ZBQWtGLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO0tBQ3pIO0FBQ0gsQ0FBQztBQUxELDBDQUtDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6IG5vLWNvbnNvbGVcbmltcG9ydCB1dGlsLCB7IGlzUmVnRXhwIH0gZnJvbSAndXRpbCc7XG5pbXBvcnQge0NvbW1hbmRPcHRpb259IGZyb20gJy4vYnVpbGQtb3B0aW9ucyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge2d0fSBmcm9tICdzZW12ZXInO1xuaW1wb3J0IGNvbW1hbmRlciBmcm9tICdDb21tYW5kZXInO1xuaW1wb3J0IHtzdGF0ZUZhY3RvcnksIEdsb2JhbE9wdGlvbnN9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L2NvbmZpZyc7XG5pbXBvcnQgbG9nQ29uZmlnIGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvbG9nLWNvbmZpZyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBkcmF3UHVwcHkoc2xvZ29uOiBzdHJpbmcsIG1lc3NhZ2U/OiBzdHJpbmcpIHtcbiAgaWYgKCFzbG9nb24pIHtcbiAgICBzbG9nb24gPSAnQ29uZ3JhZHMhIFRpbWUgdG8gcHVibGlzaCB5b3VyIHNoaXQhJztcbiAgfVxuXG4gIGNvbnN0IGxpbmUgPSAnLScucmVwZWF0KHNsb2dvbi5sZW5ndGgpO1xuICBjb25zb2xlLmxvZygnXFxuICAgJyArIGxpbmUgKyAnXFxuJyArXG4gICAgYCA8ICR7c2xvZ29ufSA+XFxuYCArXG4gICAgJyAgICcgKyBsaW5lICsgJ1xcbicgK1xuICAgICdcXHRcXFxcICAgXl9fXlxcblxcdCBcXFxcICAob28pXFxcXF9fX19fX19cXG5cXHQgICAgKF9fKVxcXFwgICAgICAgKVxcXFwvXFxcXFxcblxcdCAgICAgICAgfHwtLS0tdyB8XFxuXFx0ICAgICAgICB8fCAgICAgfHwnKTtcbiAgaWYgKG1lc3NhZ2UpIHtcbiAgICBjb25zb2xlLmxvZyhtZXNzYWdlKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcHJpbnRDb25maWcoYzogYW55LCBsZXZlbCA9IDApOiBzdHJpbmcge1xuICBjb25zdCBpbmRlbnQgPSAnICAnLnJlcGVhdChsZXZlbCk7XG4gIGxldCBvdXQgPSAne1xcbic7XG4gIGZvciAoY29uc3QgcHJvcCBvZiBPYmplY3Qua2V5cyhjKSkge1xuICAgIGNvbnN0IHZhbHVlID0gY1twcm9wXTtcbiAgICBvdXQgKz0gaW5kZW50ICsgYCAgJHtKU09OLnN0cmluZ2lmeShwcm9wKX06ICR7cHJpbnRDb25maWdWYWx1ZSh2YWx1ZSwgbGV2ZWwpfSxcXG5gO1xuICB9XG4gIG91dCArPSBpbmRlbnQgKyAnfSc7XG4gIHJldHVybiBvdXQ7XG59XG5cbmZ1bmN0aW9uIHByaW50Q29uZmlnVmFsdWUodmFsdWU6IGFueSwgbGV2ZWw6IG51bWJlcik6IHN0cmluZyB7XG4gIGxldCBvdXQgPSAnJztcbiAgY29uc3QgaW5kZW50ID0gJyAgJy5yZXBlYXQobGV2ZWwpO1xuICBpZiAodXRpbC5pc1N0cmluZyh2YWx1ZSkgfHwgdXRpbC5pc051bWJlcih2YWx1ZSkgfHwgdXRpbC5pc0Jvb2xlYW4odmFsdWUpKSB7XG4gICAgb3V0ICs9IEpTT04uc3RyaW5naWZ5KHZhbHVlKSArICcnO1xuICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgb3V0ICs9ICdbXFxuJztcbiAgICAodmFsdWUgYXMgYW55W10pLmZvckVhY2goKHJvdzogYW55KSA9PiB7XG4gICAgICBvdXQgKz0gaW5kZW50ICsgJyAgICAnICsgcHJpbnRDb25maWdWYWx1ZShyb3csIGxldmVsICsgMSk7XG4gICAgICBvdXQgKz0gJyxcXG4nO1xuICAgIH0pO1xuICAgIG91dCArPSBpbmRlbnQgKyAnICBdJztcbiAgfSBlbHNlIGlmICh1dGlsLmlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgb3V0ICs9IHZhbHVlLm5hbWUgKyAnKCknO1xuICB9IGVsc2UgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgIG91dCArPSBgJHt2YWx1ZS50b1N0cmluZygpfWA7XG4gIH0gZWxzZSBpZiAodXRpbC5pc09iamVjdCh2YWx1ZSkpIHtcbiAgICBjb25zdCBwcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZih2YWx1ZSk7XG4gICAgaWYgKHByb3RvICYmIHByb3RvLmNvbnN0cnVjdG9yICE9PSBPYmplY3QpIHtcbiAgICAgIG91dCArPSBgbmV3ICR7cHJvdG8uY29uc3RydWN0b3IubmFtZX0oKWA7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSBwcmludENvbmZpZyh2YWx1ZSwgbGV2ZWwgKyAxKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcgdW5rbm93bic7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cblxuXG4vLyBUT0RPOiBtb3ZlIHRvIGEgUmVkdXggc3RvcmVcbmV4cG9ydCBmdW5jdGlvbiBnZXRDbWRPcHRpb25zKCk6IENvbW1hbmRPcHRpb24ge1xuICBjb25zdCBjbWRPcHRpb246IENvbW1hbmRPcHRpb24gPSBKU09OLnBhcnNlKHByb2Nlc3MuZW52LlJFQUNUX0FQUF9jcmFfYnVpbGQhKTtcbiAgaWYgKGNtZE9wdGlvbi5kZXZNb2RlIHx8IGNtZE9wdGlvbi53YXRjaCkge1xuICAgIChwcm9jZXNzLmVudiBhcyBhbnkpLk5PREVfRU5WID0gJ2RldmVsb3BtZW50JztcbiAgfVxuICByZXR1cm4gY21kT3B0aW9uO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2F2ZUNtZE9wdGlvbnNUb0Vudihwa2dOYW1lOiBzdHJpbmcsIGNtZDogY29tbWFuZGVyLkNvbW1hbmQsIGJ1aWxkVHlwZTogJ2FwcCcgfCAnbGliJyk6IENvbW1hbmRPcHRpb24ge1xuICBjb25zdCBvcHRzID0gY21kLm9wdHMoKTtcbiAgY29uc3QgY21kT3B0aW9uczogQ29tbWFuZE9wdGlvbiA9IHtcbiAgICBidWlsZFR5cGUsXG4gICAgYnVpbGRUYXJnZXQ6IHBrZ05hbWUsXG4gICAgd2F0Y2g6IG9wdHMud2F0Y2gsXG4gICAgZGV2TW9kZTogb3B0cy5kZXYsXG4gICAgcHVibGljVXJsOiBvcHRzLnB1YmxpY1VybCxcbiAgICBpbmNsdWRlczogb3B0cy5pbmNsdWRlLFxuICAgIHdlYnBhY2tFbnY6IG9wdHMuZGV2ID8gJ2RldmVsb3BtZW50JyA6ICdwcm9kdWN0aW9uJ1xuICB9O1xuICBpZiAoY21kLm9wdHMoKS5wdWJsaWNVcmwpIHtcbiAgICAocHJvY2Vzcy5lbnYgYXMgYW55KS5QVUJMSUNfVVJMID0gY21kLm9wdHMoKS5wdWJsaWNVcmw7XG4gIH1cbiAgcHJvY2Vzcy5lbnYuUkVBQ1RfQVBQX2NyYV9idWlsZCA9IEpTT04uc3RyaW5naWZ5KGNtZE9wdGlvbnMpO1xuXG4gIHN0YXRlRmFjdG9yeS5jb25maWd1cmVTdG9yZSgpO1xuICBjb25zdCBzZXR0aW5nID0gY29uZmlnLmluaXRTeW5jKGNtZC5vcHRzKCkgYXMgR2xvYmFsT3B0aW9ucyk7XG4gIGxvZ0NvbmZpZyhzZXR0aW5nKTtcbiAgcmV0dXJuIGNtZE9wdGlvbnM7XG59XG5cbi8vIGZ1bmN0aW9uIHdpdGhDbGljT3B0KGNtZDogY29tbWFuZGVyLkNvbW1hbmQpIHtcbi8vICAgY21kLm9wdGlvbignLXcsIC0td2F0Y2gnLCAnV2F0Y2ggZmlsZSBjaGFuZ2VzIGFuZCBjb21waWxlJywgZmFsc2UpXG4vLyAgIC5vcHRpb24oJy0tZGV2JywgJ3NldCBOT0RFX0VOViB0byBcImRldmVsb3BtZW50XCIsIGVuYWJsZSByZWFjdC1zY3JpcHRzIGluIGRldiBtb2RlJywgZmFsc2UpXG4vLyAgIC5vcHRpb24oJy0tcHVybCwgLS1wdWJsaWNVcmwgPHN0cmluZz4nLCAnc2V0IGVudmlyb25tZW50IHZhcmlhYmxlIFBVQkxJQ19VUkwgZm9yIHJlYWN0LXNjcmlwdHMnLCAnLycpO1xuLy8gICB3aXRoR2xvYmFsT3B0aW9ucyhjbWQpO1xuLy8gfVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBjcmFWZXJzaW9uQ2hlY2soKSB7XG4gIGNvbnN0IGNyYVBhY2thZ2UgPSByZXF1aXJlKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL3JlYWN0LXNjcmlwdHMvcGFja2FnZS5qc29uJykpO1xuICBpZiAoIWd0KGNyYVBhY2thZ2UudmVyc2lvbiwgJzMuNC4wJykpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYHJlYWN0LXNjcmlwdHMgdmVyc2lvbiBtdXN0IGJlIGdyZWF0ZXIgdGhhbiAzLjQuMCwgY3VycmVudCBpbnN0YWxsZWQgdmVyc2lvbiBpcyAke2NyYVBhY2thZ2UudmVyc2lvbn1gKTtcbiAgfVxufVxuIl19