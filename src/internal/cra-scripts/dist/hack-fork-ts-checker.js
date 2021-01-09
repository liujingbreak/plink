"use strict";
/**
 * Hack fork-ts-checker-webpack-plugin:
 *  - change ts.compilerHost.readFile()
 *  - change rootNames in parameters of ts.createProgram()
 *  - change compilerOptions.rootDir in parameters of ts.createProgram()
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = void 0;
const path_1 = __importDefault(require("path"));
function register() {
    process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS || '') + ' -r ' +
        path_1.default.resolve(__filename);
}
exports.register = register;
if (process.send && /[\\\/]fork-ts-checker-webpack-plugin[\\\/]/.test(process.argv[1])) {
    // Current process is a child process forked by fork-ts-checker-webpack-plugin
    require('@wfh/plink/wfh/dist/node-path');
    const plink = require('@wfh/plink/wfh/dist');
    plink.initProcess();
    require('./hack-fork-ts-checker-worker');
}

//# sourceMappingURL=hack-fork-ts-checker.js.map
