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
    // stateFactory.configureStore();
    // config.initSync(cmd.opts() as GlobalOptions);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkJBQTZCO0FBQzdCLDZDQUFzQztBQUV0QyxnREFBd0I7QUFFeEIsbUNBQTBCO0FBRzFCLFNBQWdCLFNBQVMsQ0FBQyxNQUFjLEVBQUUsT0FBZ0I7SUFDeEQsSUFBSSxDQUFDLE1BQU0sRUFBRTtRQUNYLE1BQU0sR0FBRyxzQ0FBc0MsQ0FBQztLQUNqRDtJQUVELE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxHQUFHLElBQUksR0FBRyxJQUFJO1FBQy9CLE1BQU0sTUFBTSxNQUFNO1FBQ2xCLEtBQUssR0FBRyxJQUFJLEdBQUcsSUFBSTtRQUNuQix3R0FBd0csQ0FBQyxDQUFDO0lBQzVHLElBQUksT0FBTyxFQUFFO1FBQ1gsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztLQUN0QjtBQUNILENBQUM7QUFiRCw4QkFhQztBQUVELFNBQWdCLFdBQVcsQ0FBQyxDQUFNLEVBQUUsS0FBSyxHQUFHLENBQUM7SUFDM0MsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNsQyxJQUFJLEdBQUcsR0FBRyxLQUFLLENBQUM7SUFDaEIsS0FBSyxNQUFNLElBQUksSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFO1FBQ2pDLE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0QixHQUFHLElBQUksTUFBTSxHQUFHLEtBQUssSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQztLQUNuRjtJQUNELEdBQUcsSUFBSSxNQUFNLEdBQUcsR0FBRyxDQUFDO0lBQ3BCLE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQztBQVRELGtDQVNDO0FBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxLQUFVLEVBQUUsS0FBYTtJQUNqRCxJQUFJLEdBQUcsR0FBRyxFQUFFLENBQUM7SUFDYixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2xDLElBQUksY0FBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxjQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLGNBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQUU7UUFDekUsR0FBRyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDO0tBQ25DO1NBQU0sSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQy9CLEdBQUcsSUFBSSxLQUFLLENBQUM7UUFDWixLQUFlLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBUSxFQUFFLEVBQUU7WUFDcEMsR0FBRyxJQUFJLE1BQU0sR0FBRyxNQUFNLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMxRCxHQUFHLElBQUksS0FBSyxDQUFDO1FBQ2YsQ0FBQyxDQUFDLENBQUM7UUFDSCxHQUFHLElBQUksTUFBTSxHQUFHLEtBQUssQ0FBQztLQUN2QjtTQUFNLElBQUksY0FBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUNqQyxHQUFHLElBQUksS0FBSyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7S0FDMUI7U0FBTSxJQUFJLGVBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUMxQixHQUFHLElBQUksR0FBRyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztLQUM5QjtTQUFNLElBQUksY0FBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUMvQixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzNDLElBQUksS0FBSyxJQUFJLEtBQUssQ0FBQyxXQUFXLEtBQUssTUFBTSxFQUFFO1lBQ3pDLEdBQUcsSUFBSSxPQUFPLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSSxJQUFJLENBQUM7U0FDMUM7YUFBTTtZQUNMLEdBQUcsSUFBSSxXQUFXLENBQUMsS0FBSyxFQUFFLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztTQUN0QztLQUNGO1NBQU07UUFDTCxHQUFHLElBQUksVUFBVSxDQUFDO0tBQ25CO0lBQ0QsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDO0FBR0QsOEJBQThCO0FBQzlCLFNBQWdCLGFBQWE7SUFDM0IsTUFBTSxTQUFTLEdBQWtCLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBb0IsQ0FBQyxDQUFDO0lBQzlFLElBQUksU0FBUyxDQUFDLE9BQU8sSUFBSSxTQUFTLENBQUMsS0FBSyxFQUFFO1FBQ3ZDLE9BQU8sQ0FBQyxHQUFXLENBQUMsUUFBUSxHQUFHLGFBQWEsQ0FBQztLQUMvQztJQUNELE9BQU8sU0FBUyxDQUFDO0FBQ25CLENBQUM7QUFORCxzQ0FNQztBQUVELFNBQWdCLG1CQUFtQixDQUFDLE9BQWUsRUFBRSxHQUFzQixFQUFFLFNBQXdCO0lBQ25HLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUN4QixNQUFNLFVBQVUsR0FBa0I7UUFDaEMsU0FBUztRQUNULFdBQVcsRUFBRSxPQUFPO1FBQ3BCLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztRQUNqQixPQUFPLEVBQUUsSUFBSSxDQUFDLEdBQUc7UUFDakIsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTO1FBQ3pCLFFBQVEsRUFBRSxJQUFJLENBQUMsT0FBTztRQUN0QixVQUFVLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxZQUFZO0tBQ3BELENBQUM7SUFDRixJQUFJLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxTQUFTLEVBQUU7UUFDdkIsT0FBTyxDQUFDLEdBQVcsQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLFNBQVMsQ0FBQztLQUN4RDtJQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUU3RCxpQ0FBaUM7SUFDakMsZ0RBQWdEO0lBQ2hELE9BQU8sVUFBVSxDQUFDO0FBQ3BCLENBQUM7QUFuQkQsa0RBbUJDO0FBRUQsaURBQWlEO0FBQ2pELHVFQUF1RTtBQUN2RSwrRkFBK0Y7QUFDL0YsMkdBQTJHO0FBQzNHLDRCQUE0QjtBQUM1QixJQUFJO0FBR0osU0FBZ0IsZUFBZTtJQUM3QixNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDLENBQUM7SUFDcEYsSUFBSSxDQUFDLFdBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxFQUFFO1FBQ3BDLE1BQU0sSUFBSSxLQUFLLENBQUMsa0ZBQWtGLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO0tBQ3pIO0FBQ0gsQ0FBQztBQUxELDBDQUtDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6IG5vLWNvbnNvbGVcbmltcG9ydCB1dGlsLCB7IGlzUmVnRXhwIH0gZnJvbSAndXRpbCc7XG5pbXBvcnQge0NvbW1hbmRPcHRpb259IGZyb20gJy4vYnVpbGQtb3B0aW9ucyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge2d0fSBmcm9tICdzZW12ZXInO1xuaW1wb3J0IGNvbW1hbmRlciBmcm9tICdDb21tYW5kZXInO1xuXG5leHBvcnQgZnVuY3Rpb24gZHJhd1B1cHB5KHNsb2dvbjogc3RyaW5nLCBtZXNzYWdlPzogc3RyaW5nKSB7XG4gIGlmICghc2xvZ29uKSB7XG4gICAgc2xvZ29uID0gJ0NvbmdyYWRzISBUaW1lIHRvIHB1Ymxpc2ggeW91ciBzaGl0ISc7XG4gIH1cblxuICBjb25zdCBsaW5lID0gJy0nLnJlcGVhdChzbG9nb24ubGVuZ3RoKTtcbiAgY29uc29sZS5sb2coJ1xcbiAgICcgKyBsaW5lICsgJ1xcbicgK1xuICAgIGAgPCAke3Nsb2dvbn0gPlxcbmAgK1xuICAgICcgICAnICsgbGluZSArICdcXG4nICtcbiAgICAnXFx0XFxcXCAgIF5fX15cXG5cXHQgXFxcXCAgKG9vKVxcXFxfX19fX19fXFxuXFx0ICAgIChfXylcXFxcICAgICAgIClcXFxcL1xcXFxcXG5cXHQgICAgICAgIHx8LS0tLXcgfFxcblxcdCAgICAgICAgfHwgICAgIHx8Jyk7XG4gIGlmIChtZXNzYWdlKSB7XG4gICAgY29uc29sZS5sb2cobWVzc2FnZSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHByaW50Q29uZmlnKGM6IGFueSwgbGV2ZWwgPSAwKTogc3RyaW5nIHtcbiAgY29uc3QgaW5kZW50ID0gJyAgJy5yZXBlYXQobGV2ZWwpO1xuICBsZXQgb3V0ID0gJ3tcXG4nO1xuICBmb3IgKGNvbnN0IHByb3Agb2YgT2JqZWN0LmtleXMoYykpIHtcbiAgICBjb25zdCB2YWx1ZSA9IGNbcHJvcF07XG4gICAgb3V0ICs9IGluZGVudCArIGAgICR7SlNPTi5zdHJpbmdpZnkocHJvcCl9OiAke3ByaW50Q29uZmlnVmFsdWUodmFsdWUsIGxldmVsKX0sXFxuYDtcbiAgfVxuICBvdXQgKz0gaW5kZW50ICsgJ30nO1xuICByZXR1cm4gb3V0O1xufVxuXG5mdW5jdGlvbiBwcmludENvbmZpZ1ZhbHVlKHZhbHVlOiBhbnksIGxldmVsOiBudW1iZXIpOiBzdHJpbmcge1xuICBsZXQgb3V0ID0gJyc7XG4gIGNvbnN0IGluZGVudCA9ICcgICcucmVwZWF0KGxldmVsKTtcbiAgaWYgKHV0aWwuaXNTdHJpbmcodmFsdWUpIHx8IHV0aWwuaXNOdW1iZXIodmFsdWUpIHx8IHV0aWwuaXNCb29sZWFuKHZhbHVlKSkge1xuICAgIG91dCArPSBKU09OLnN0cmluZ2lmeSh2YWx1ZSkgKyAnJztcbiAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgIG91dCArPSAnW1xcbic7XG4gICAgKHZhbHVlIGFzIGFueVtdKS5mb3JFYWNoKChyb3c6IGFueSkgPT4ge1xuICAgICAgb3V0ICs9IGluZGVudCArICcgICAgJyArIHByaW50Q29uZmlnVmFsdWUocm93LCBsZXZlbCArIDEpO1xuICAgICAgb3V0ICs9ICcsXFxuJztcbiAgICB9KTtcbiAgICBvdXQgKz0gaW5kZW50ICsgJyAgXSc7XG4gIH0gZWxzZSBpZiAodXRpbC5pc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgIG91dCArPSB2YWx1ZS5uYW1lICsgJygpJztcbiAgfSBlbHNlIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICBvdXQgKz0gYCR7dmFsdWUudG9TdHJpbmcoKX1gO1xuICB9IGVsc2UgaWYgKHV0aWwuaXNPYmplY3QodmFsdWUpKSB7XG4gICAgY29uc3QgcHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YodmFsdWUpO1xuICAgIGlmIChwcm90byAmJiBwcm90by5jb25zdHJ1Y3RvciAhPT0gT2JqZWN0KSB7XG4gICAgICBvdXQgKz0gYG5ldyAke3Byb3RvLmNvbnN0cnVjdG9yLm5hbWV9KClgO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gcHJpbnRDb25maWcodmFsdWUsIGxldmVsICsgMSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIG91dCArPSAnIHVua25vd24nO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cblxuLy8gVE9ETzogbW92ZSB0byBhIFJlZHV4IHN0b3JlXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q21kT3B0aW9ucygpOiBDb21tYW5kT3B0aW9uIHtcbiAgY29uc3QgY21kT3B0aW9uOiBDb21tYW5kT3B0aW9uID0gSlNPTi5wYXJzZShwcm9jZXNzLmVudi5SRUFDVF9BUFBfY3JhX2J1aWxkISk7XG4gIGlmIChjbWRPcHRpb24uZGV2TW9kZSB8fCBjbWRPcHRpb24ud2F0Y2gpIHtcbiAgICAocHJvY2Vzcy5lbnYgYXMgYW55KS5OT0RFX0VOViA9ICdkZXZlbG9wbWVudCc7XG4gIH1cbiAgcmV0dXJuIGNtZE9wdGlvbjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNhdmVDbWRPcHRpb25zVG9FbnYocGtnTmFtZTogc3RyaW5nLCBjbWQ6IGNvbW1hbmRlci5Db21tYW5kLCBidWlsZFR5cGU6ICdhcHAnIHwgJ2xpYicpOiBDb21tYW5kT3B0aW9uIHtcbiAgY29uc3Qgb3B0cyA9IGNtZC5vcHRzKCk7XG4gIGNvbnN0IGNtZE9wdGlvbnM6IENvbW1hbmRPcHRpb24gPSB7XG4gICAgYnVpbGRUeXBlLFxuICAgIGJ1aWxkVGFyZ2V0OiBwa2dOYW1lLFxuICAgIHdhdGNoOiBvcHRzLndhdGNoLFxuICAgIGRldk1vZGU6IG9wdHMuZGV2LFxuICAgIHB1YmxpY1VybDogb3B0cy5wdWJsaWNVcmwsXG4gICAgaW5jbHVkZXM6IG9wdHMuaW5jbHVkZSxcbiAgICB3ZWJwYWNrRW52OiBvcHRzLmRldiA/ICdkZXZlbG9wbWVudCcgOiAncHJvZHVjdGlvbidcbiAgfTtcbiAgaWYgKGNtZC5vcHRzKCkucHVibGljVXJsKSB7XG4gICAgKHByb2Nlc3MuZW52IGFzIGFueSkuUFVCTElDX1VSTCA9IGNtZC5vcHRzKCkucHVibGljVXJsO1xuICB9XG4gIHByb2Nlc3MuZW52LlJFQUNUX0FQUF9jcmFfYnVpbGQgPSBKU09OLnN0cmluZ2lmeShjbWRPcHRpb25zKTtcblxuICAvLyBzdGF0ZUZhY3RvcnkuY29uZmlndXJlU3RvcmUoKTtcbiAgLy8gY29uZmlnLmluaXRTeW5jKGNtZC5vcHRzKCkgYXMgR2xvYmFsT3B0aW9ucyk7XG4gIHJldHVybiBjbWRPcHRpb25zO1xufVxuXG4vLyBmdW5jdGlvbiB3aXRoQ2xpY09wdChjbWQ6IGNvbW1hbmRlci5Db21tYW5kKSB7XG4vLyAgIGNtZC5vcHRpb24oJy13LCAtLXdhdGNoJywgJ1dhdGNoIGZpbGUgY2hhbmdlcyBhbmQgY29tcGlsZScsIGZhbHNlKVxuLy8gICAub3B0aW9uKCctLWRldicsICdzZXQgTk9ERV9FTlYgdG8gXCJkZXZlbG9wbWVudFwiLCBlbmFibGUgcmVhY3Qtc2NyaXB0cyBpbiBkZXYgbW9kZScsIGZhbHNlKVxuLy8gICAub3B0aW9uKCctLXB1cmwsIC0tcHVibGljVXJsIDxzdHJpbmc+JywgJ3NldCBlbnZpcm9ubWVudCB2YXJpYWJsZSBQVUJMSUNfVVJMIGZvciByZWFjdC1zY3JpcHRzJywgJy8nKTtcbi8vICAgd2l0aEdsb2JhbE9wdGlvbnMoY21kKTtcbi8vIH1cblxuXG5leHBvcnQgZnVuY3Rpb24gY3JhVmVyc2lvbkNoZWNrKCkge1xuICBjb25zdCBjcmFQYWNrYWdlID0gcmVxdWlyZShQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy9yZWFjdC1zY3JpcHRzL3BhY2thZ2UuanNvbicpKTtcbiAgaWYgKCFndChjcmFQYWNrYWdlLnZlcnNpb24sICczLjQuMCcpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGByZWFjdC1zY3JpcHRzIHZlcnNpb24gbXVzdCBiZSBncmVhdGVyIHRoYW4gMy40LjAsIGN1cnJlbnQgaW5zdGFsbGVkIHZlcnNpb24gaXMgJHtjcmFQYWNrYWdlLnZlcnNpb259YCk7XG4gIH1cbn1cbiJdfQ==