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
exports.craVersionCheck = exports.saveCmdArgToEnv = exports.getCmdOptions = exports.printConfig = exports.drawPuppy = void 0;
// tslint:disable: no-console
const util_1 = __importStar(require("util"));
const path_1 = __importDefault(require("path"));
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
function getCmdOptions() {
    const cmdOption = JSON.parse(process.env.REACT_APP_cra_build);
    if (cmdOption.devMode || cmdOption.watch) {
        process.env.NODE_ENV = 'development';
    }
    return cmdOption;
}
exports.getCmdOptions = getCmdOptions;
function saveCmdArgToEnv() {
    process.title = 'Plink';
    const pk = require('../package.json');
    const program = new Commander_1.default.Command('cra-scripts')
        .action(() => {
        program.outputHelp();
        process.exit(0);
    });
    program.version(pk.version, '-v, --vers', 'output the current version');
    program.usage('react-scripts -r dr-comp-package/register -r @bk/cra-scripts build ' + program.usage());
    let cmdOptions;
    const libCmd = program.command('lib <package-name>')
        .description('Compile library')
        .action(pkgName => {
        // console.log(libCmd.opts());
        cmdOptions = {
            buildType: 'lib',
            buildTarget: pkgName,
            watch: libCmd.opts().watch,
            devMode: libCmd.opts().dev,
            publicUrl: libCmd.opts().publicUrl
        };
        process.env.REACT_APP_cra_build = JSON.stringify(cmdOptions);
    });
    withClicOpt(libCmd);
    const appCmd = program.command('app <package-name>')
        .description('Compile appliaction')
        .action(pkgName => {
        cmdOptions = {
            buildType: 'app',
            buildTarget: pkgName,
            watch: appCmd.opts().watch,
            devMode: appCmd.opts().dev,
            publicUrl: appCmd.opts().publicUrl
        };
        process.env.REACT_APP_cra_build = JSON.stringify(cmdOptions);
    });
    withClicOpt(appCmd);
    program.parse(process.argv);
}
exports.saveCmdArgToEnv = saveCmdArgToEnv;
function withClicOpt(cmd) {
    cmd.option('-w, --watch', 'Watch file changes and compile', false)
        .option('--dev', 'set NODE_ENV to "development", enable react-scripts in dev mode', false)
        .option('--purl, --publicUrl <string>', 'set environment variable PUBLIC_URL for react-scripts', '/');
}
function craVersionCheck() {
    const craPackage = require(path_1.default.resolve('node_modules/react-scripts/package.json'));
    if (!semver_1.gt(craPackage.version, '3.4.0')) {
        throw new Error(`react-scripts version must be greater than 3.4.0, current installed version is ${craPackage.version}`);
    }
}
exports.craVersionCheck = craVersionCheck;

//# sourceMappingURL=utils.js.map
