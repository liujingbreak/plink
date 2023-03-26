"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.colorCmp = void 0;
const plink_1 = require("@wfh/plink");
const log = (0, plink_1.log4File)(__filename);
// Chalk is useful for printing colorful text in a terminal
// import chalk from 'chalk';
function colorCmp(argument1, opts) {
    log.info('Command is executing with options:', opts);
    log.info('Command is executing with configuration:', (0, plink_1.config)());
    // TODO: Your command job implementation here
}
exports.colorCmp = colorCmp;
//# sourceMappingURL=cli-color-cmp.js.map