"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
let header;
try {
    const wt = require('worker_threads');
    header = `[${wt.isMainThread ? 'pid:' + process.pid : 'thread:' + wt.threadId}]`;
}
catch (err) {
    header = `[pid: ${process.pid}]`;
}
function default_1() {
    const mem = process.memoryUsage();
    let stats = header;
    for (const key of Object.keys(mem)) {
        stats += `${key}: ${Math.ceil(mem[key] / 1024 / 1024)}M, `;
    }
    const report = chalk_1.default.cyanBright(stats);
    // eslint-disable-next-line no-console
    console.log(report);
    return report;
}
exports.default = default_1;
//# sourceMappingURL=mem-stats.js.map