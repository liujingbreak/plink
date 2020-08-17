"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable: no-console
const util_1 = tslib_1.__importStar(require("util"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const path_1 = tslib_1.__importDefault(require("path"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
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
exports.getCmdOptions = lodash_1.default.memoize(_getCmdOptions);
function _getCmdOptions() {
    const buildTarget = process.env.REACT_APP_cra_build_target;
    const buildType = process.env.REACT_APP_cra_build_type;
    const argvMap = cliArgvMap();
    console.log('[command argv]', Array.from(argvMap.entries()).map(en => Array.from(en)));
    if (argvMap.get('dev') || argvMap.get('watch')) {
        process.env.NODE_ENV = 'development';
    }
    return {
        buildTarget,
        buildType,
        watch: buildType === 'lib' && !!argvMap.get('watch'),
        argv: argvMap
    };
}
function cliArgvMap() {
    const argvMap = new Map();
    const argv = process.argv.slice(2);
    for (let i = 0, l = argv.length; i < l; i++) {
        if (argv[i].startsWith('-')) {
            const key = argv[i].slice(argv[i].lastIndexOf('-') + 1);
            if (i >= argv.length - 1 || (argv[i + 1] && argv[i + 1].startsWith('-'))) {
                argvMap.set(key, true);
            }
            else {
                argvMap.set(key, argv[++i]);
            }
        }
    }
    return argvMap;
}
function saveCmdArgToEnv() {
    const argv = process.argv.slice(2);
    // console.log(`saveCmdArgToEnv() ${process.argv}`);
    if (argv.length > 0) {
        process.env.REACT_APP_cra_build_type = argv[0];
    }
    if (argv.length > 1) {
        process.env.REACT_APP_cra_build_target = argv[1];
    }
}
exports.saveCmdArgToEnv = saveCmdArgToEnv;
function findDrcpProjectDir() {
    const target = 'dr-comp-package/package.json';
    const paths = require.resolve.paths(target);
    for (let p of paths) {
        if (fs_1.default.existsSync(path_1.default.resolve(p, target))) {
            if (/[\\/]node_modules$/.test(p)) {
                if (fs_1.default.lstatSync(p).isSymbolicLink())
                    p = fs_1.default.realpathSync(p);
                return p.slice(0, -'/node_modules'.length);
            }
            return p;
        }
    }
}
exports.findDrcpProjectDir = findDrcpProjectDir;
function craVersionCheck() {
    const craPackage = require(path_1.default.resolve('node_modules/react-scripts/package.json'));
    if (!semver_1.gt(craPackage.version, '3.4.0')) {
        throw new Error(`react-scripts version must be greater than 3.4.0, current installed version is ${craPackage.version}`);
    }
}
exports.craVersionCheck = craVersionCheck;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvdHMvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNkJBQTZCO0FBQzdCLHFEQUFzQztBQUV0QyxvREFBb0I7QUFDcEIsd0RBQXdCO0FBQ3hCLDREQUF1QjtBQUN2QixtQ0FBMEI7QUFFMUIsU0FBZ0IsU0FBUyxDQUFDLE1BQWMsRUFBRSxPQUFnQjtJQUN4RCxJQUFJLENBQUMsTUFBTSxFQUFFO1FBQ1gsTUFBTSxHQUFHLHNDQUFzQyxDQUFDO0tBQ2pEO0lBRUQsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEdBQUcsSUFBSSxHQUFHLElBQUk7UUFDL0IsTUFBTSxNQUFNLE1BQU07UUFDbEIsS0FBSyxHQUFHLElBQUksR0FBRyxJQUFJO1FBQ25CLHdHQUF3RyxDQUFDLENBQUM7SUFDNUcsSUFBSSxPQUFPLEVBQUU7UUFDWCxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0tBQ3RCO0FBQ0gsQ0FBQztBQWJELDhCQWFDO0FBRUQsU0FBZ0IsV0FBVyxDQUFDLENBQU0sRUFBRSxLQUFLLEdBQUcsQ0FBQztJQUMzQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2xDLElBQUksR0FBRyxHQUFHLEtBQUssQ0FBQztJQUNoQixLQUFLLE1BQU0sSUFBSSxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUU7UUFDakMsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RCLEdBQUcsSUFBSSxNQUFNLEdBQUcsS0FBSyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLGdCQUFnQixDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDO0tBQ25G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RUFBRSxPQUFPLENBQUMsRUFBRTtRQUNwQyxNQUFNLElBQUksS0FBSyxDQUFDLGtGQUFrRixVQUFVLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztLQUN6SDtBQUNILENBQUM7QUFMRCwwQ0FLQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGJrL2NyYS1zY3JpcHRzL2Rpc3QvdXRpbHMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTogbm8tY29uc29sZVxuaW1wb3J0IHV0aWwsIHsgaXNSZWdFeHAgfSBmcm9tICd1dGlsJztcbmltcG9ydCB7Q29tbWFuZE9wdGlvbn0gZnJvbSAnLi9idWlsZC1vcHRpb25zJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge2d0fSBmcm9tICdzZW12ZXInO1xuXG5leHBvcnQgZnVuY3Rpb24gZHJhd1B1cHB5KHNsb2dvbjogc3RyaW5nLCBtZXNzYWdlPzogc3RyaW5nKSB7XG4gIGlmICghc2xvZ29uKSB7XG4gICAgc2xvZ29uID0gJ0NvbmdyYWRzISBUaW1lIHRvIHB1Ymxpc2ggeW91ciBzaGl0ISc7XG4gIH1cblxuICBjb25zdCBsaW5lID0gJy0nLnJlcGVhdChzbG9nb24ubGVuZ3RoKTtcbiAgY29uc29sZS5sb2coJ1xcbiAgICcgKyBsaW5lICsgJ1xcbicgK1xuICAgIGAgPCAke3Nsb2dvbn0gPlxcbmAgK1xuICAgICcgICAnICsgbGluZSArICdcXG4nICtcbiAgICAnXFx0XFxcXCAgIF5fX15cXG5cXHQgXFxcXCAgKG9vKVxcXFxfX19fX19fXFxuXFx0ICAgIChfXylcXFxcICAgICAgIClcXFxcL1xcXFxcXG5cXHQgICAgICAgIHx8LS0tLXcgfFxcblxcdCAgICAgICAgfHwgICAgIHx8Jyk7XG4gIGlmIChtZXNzYWdlKSB7XG4gICAgY29uc29sZS5sb2cobWVzc2FnZSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHByaW50Q29uZmlnKGM6IGFueSwgbGV2ZWwgPSAwKTogc3RyaW5nIHtcbiAgY29uc3QgaW5kZW50ID0gJyAgJy5yZXBlYXQobGV2ZWwpO1xuICBsZXQgb3V0ID0gJ3tcXG4nO1xuICBmb3IgKGNvbnN0IHByb3Agb2YgT2JqZWN0LmtleXMoYykpIHtcbiAgICBjb25zdCB2YWx1ZSA9IGNbcHJvcF07XG4gICAgb3V0ICs9IGluZGVudCArIGAgICR7SlNPTi5zdHJpbmdpZnkocHJvcCl9OiAke3ByaW50Q29uZmlnVmFsdWUodmFsdWUsIGxldmVsKX0sXFxuYDtcbiAgfVxuICBvdXQgKz0gaW5kZW50ICsgJ30nO1xuICByZXR1cm4gb3V0O1xufVxuXG5mdW5jdGlvbiBwcmludENvbmZpZ1ZhbHVlKHZhbHVlOiBhbnksIGxldmVsOiBudW1iZXIpOiBzdHJpbmcge1xuICBsZXQgb3V0ID0gJyc7XG4gIGNvbnN0IGluZGVudCA9ICcgICcucmVwZWF0KGxldmVsKTtcbiAgaWYgKHV0aWwuaXNTdHJpbmcodmFsdWUpIHx8IHV0aWwuaXNOdW1iZXIodmFsdWUpIHx8IHV0aWwuaXNCb29sZWFuKHZhbHVlKSkge1xuICAgIG91dCArPSBKU09OLnN0cmluZ2lmeSh2YWx1ZSkgKyAnJztcbiAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgIG91dCArPSAnW1xcbic7XG4gICAgKHZhbHVlIGFzIGFueVtdKS5mb3JFYWNoKChyb3c6IGFueSkgPT4ge1xuICAgICAgb3V0ICs9IGluZGVudCArICcgICAgJyArIHByaW50Q29uZmlnVmFsdWUocm93LCBsZXZlbCArIDEpO1xuICAgICAgb3V0ICs9ICcsXFxuJztcbiAgICB9KTtcbiAgICBvdXQgKz0gaW5kZW50ICsgJyAgXSc7XG4gIH0gZWxzZSBpZiAodXRpbC5pc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgIG91dCArPSB2YWx1ZS5uYW1lICsgJygpJztcbiAgfSBlbHNlIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICBvdXQgKz0gYCR7dmFsdWUudG9TdHJpbmcoKX1gO1xuICB9IGVsc2UgaWYgKHV0aWwuaXNPYmplY3QodmFsdWUpKSB7XG4gICAgY29uc3QgcHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YodmFsdWUpO1xuICAgIGlmIChwcm90byAmJiBwcm90by5jb25zdHJ1Y3RvciAhPT0gT2JqZWN0KSB7XG4gICAgICBvdXQgKz0gYG5ldyAke3Byb3RvLmNvbnN0cnVjdG9yLm5hbWV9KClgO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gcHJpbnRDb25maWcodmFsdWUsIGxldmVsICsgMSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIG91dCArPSAnIHVua25vd24nO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbmV4cG9ydCBjb25zdCBnZXRDbWRPcHRpb25zID0gXy5tZW1vaXplKF9nZXRDbWRPcHRpb25zKTtcblxuZnVuY3Rpb24gX2dldENtZE9wdGlvbnMoKTogQ29tbWFuZE9wdGlvbiB7XG4gIGNvbnN0IGJ1aWxkVGFyZ2V0ID0gcHJvY2Vzcy5lbnYuUkVBQ1RfQVBQX2NyYV9idWlsZF90YXJnZXQgYXMgYW55O1xuICBjb25zdCBidWlsZFR5cGUgPSBwcm9jZXNzLmVudi5SRUFDVF9BUFBfY3JhX2J1aWxkX3R5cGUgYXMgYW55O1xuICBjb25zdCBhcmd2TWFwID0gY2xpQXJndk1hcCgpO1xuICBjb25zb2xlLmxvZygnW2NvbW1hbmQgYXJndl0nLCBBcnJheS5mcm9tKGFyZ3ZNYXAuZW50cmllcygpKS5tYXAoZW4gPT4gQXJyYXkuZnJvbShlbikpKTtcbiAgaWYgKGFyZ3ZNYXAuZ2V0KCdkZXYnKSB8fCBhcmd2TWFwLmdldCgnd2F0Y2gnKSkge1xuICAgIHByb2Nlc3MuZW52Lk5PREVfRU5WID0gJ2RldmVsb3BtZW50JztcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgYnVpbGRUYXJnZXQsXG4gICAgYnVpbGRUeXBlLFxuICAgIHdhdGNoOiBidWlsZFR5cGUgPT09ICdsaWInICYmICEhYXJndk1hcC5nZXQoJ3dhdGNoJyksXG4gICAgYXJndjogYXJndk1hcFxuICB9O1xufVxuXG5mdW5jdGlvbiBjbGlBcmd2TWFwKCk6IE1hcDxzdHJpbmcsIHN0cmluZ3xib29sZWFuPiB7XG4gIGNvbnN0IGFyZ3ZNYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nfGJvb2xlYW4+KCk7XG4gIGNvbnN0IGFyZ3YgPSBwcm9jZXNzLmFyZ3Yuc2xpY2UoMik7XG4gIGZvciAobGV0IGkgPSAwLCBsID0gYXJndi5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBpZiAoYXJndltpXS5zdGFydHNXaXRoKCctJykpIHtcbiAgICAgIGNvbnN0IGtleSA9IGFyZ3ZbaV0uc2xpY2UoYXJndltpXS5sYXN0SW5kZXhPZignLScpICsgMSk7XG4gICAgICBpZiAoIGkgPj0gYXJndi5sZW5ndGggLSAxIHx8IChhcmd2W2kgKyAxXSAmJiBhcmd2W2kgKyAxXS5zdGFydHNXaXRoKCctJykpKSB7XG4gICAgICAgIGFyZ3ZNYXAuc2V0KGtleSwgdHJ1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhcmd2TWFwLnNldChrZXksIGFyZ3ZbKytpXSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBhcmd2TWFwO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2F2ZUNtZEFyZ1RvRW52KCkge1xuICBjb25zdCBhcmd2ID0gcHJvY2Vzcy5hcmd2LnNsaWNlKDIpO1xuICAvLyBjb25zb2xlLmxvZyhgc2F2ZUNtZEFyZ1RvRW52KCkgJHtwcm9jZXNzLmFyZ3Z9YCk7XG4gIGlmIChhcmd2Lmxlbmd0aCA+IDApIHtcbiAgICBwcm9jZXNzLmVudi5SRUFDVF9BUFBfY3JhX2J1aWxkX3R5cGUgPSBhcmd2WzBdO1xuICB9XG4gIGlmIChhcmd2Lmxlbmd0aCA+IDEpIHtcbiAgICBwcm9jZXNzLmVudi5SRUFDVF9BUFBfY3JhX2J1aWxkX3RhcmdldCA9IGFyZ3ZbMV07XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbmREcmNwUHJvamVjdERpcigpIHtcbiAgY29uc3QgdGFyZ2V0ID0gJ2RyLWNvbXAtcGFja2FnZS9wYWNrYWdlLmpzb24nO1xuICBjb25zdCBwYXRocyA9IHJlcXVpcmUucmVzb2x2ZS5wYXRocyh0YXJnZXQpO1xuICBmb3IgKGxldCBwIG9mIHBhdGhzISkge1xuICAgIGlmIChmcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZShwLCB0YXJnZXQpKSkge1xuICAgICAgaWYgKC9bXFxcXC9dbm9kZV9tb2R1bGVzJC8udGVzdChwKSkge1xuICAgICAgICBpZiAoZnMubHN0YXRTeW5jKHApLmlzU3ltYm9saWNMaW5rKCkpXG4gICAgICAgICAgcCA9IGZzLnJlYWxwYXRoU3luYyhwKTtcbiAgICAgICAgcmV0dXJuIHAuc2xpY2UoMCwgLSAnL25vZGVfbW9kdWxlcycubGVuZ3RoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JhVmVyc2lvbkNoZWNrKCkge1xuICBjb25zdCBjcmFQYWNrYWdlID0gcmVxdWlyZShQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy9yZWFjdC1zY3JpcHRzL3BhY2thZ2UuanNvbicpKTtcbiAgaWYgKCFndChjcmFQYWNrYWdlLnZlcnNpb24sICczLjQuMCcpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGByZWFjdC1zY3JpcHRzIHZlcnNpb24gbXVzdCBiZSBncmVhdGVyIHRoYW4gMy40LjAsIGN1cnJlbnQgaW5zdGFsbGVkIHZlcnNpb24gaXMgJHtjcmFQYWNrYWdlLnZlcnNpb259YCk7XG4gIH1cbn1cbiJdfQ==