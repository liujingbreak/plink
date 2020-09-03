"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.craVersionCheck = exports.findDrcpProjectDir = exports.saveCmdArgToEnv = exports.getCmdOptions = exports.printConfig = exports.drawPuppy = void 0;
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

//# sourceMappingURL=utils.js.map
