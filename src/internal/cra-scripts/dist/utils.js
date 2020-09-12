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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.craVersionCheck = exports.findDrcpProjectDir = exports.saveCmdArgToEnv = exports.getCmdOptions = exports.printConfig = exports.drawPuppy = void 0;
// tslint:disable: no-console
const util_1 = __importStar(require("util"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const lodash_1 = __importDefault(require("lodash"));
const semver_1 = require("semver");
const Commander_1 = __importDefault(require("Commander"));
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
    process.title = 'Plink';
    const pk = require('../package.json');
    const program = new Commander_1.default.Command('react-scripts')
        .action(() => {
        program.outputHelp();
        process.exit(0);
    });
    program.version(pk.version, '-v, --vers', 'output the current version');
    program.command('lib <package-name>')
        .description('Compile library')
        .action(pkgName => {
        process.env.REACT_APP_cra_build_type = 'lib';
        process.env.REACT_APP_cra_build_target = pkgName;
    });
    program.command('app <package-name>')
        .description('Compile appliaction')
        .action(pkgName => {
        process.env.REACT_APP_cra_build_target = pkgName;
    });
    program.parse(process.argv);
    // const argv = process.argv.slice(2);
    // console.log(`saveCmdArgToEnv() ${process.argv}`);
    // if (argv.length > 0) {
    //   process.env.REACT_APP_cra_build_type = argv[0];
    // }
    // if (argv.length > 1) {
    //   process.env.REACT_APP_cra_build_target = argv[1];
    // }
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
