"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const path_1 = __importDefault(require("path"));
module.exports = function () {
    if ((process.env.NODE_PRESERVE_SYMLINKS !== '1' && process.execArgv.indexOf('--preserve-symlinks') < 0)) {
        console.error('Node.js process must be executed with environment varaible NODE_PRESERVE_SYMLINKS=1');
        process.exit(1);
    }
    process.env.PLINK_WORK_DIR = path_1.default.resolve('react-space');
    const { initProcess, initAsChildProcess, initConfig } = require('./utils/bootstrap-process');
    const { initInjectorForNodePackages } = require('./package-runner');
    if (process.send) {
        initAsChildProcess('none');
    }
    else {
        initProcess('none');
    }
    initConfig({ dev: true, verbose: true });
    initInjectorForNodePackages();
};
//# sourceMappingURL=jest-setup.js.map