"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sorter = void 0;
const nodejs_utils_1 = require("../nodejs-utils");
const sorter_1 = require("./sorter");
const sorter = (0, sorter_1.createSorter)(null, {
    name: 'sorter',
    debug: process.env.NODE_ENV === 'development',
    log: nodejs_utils_1.conciseConsoleLogger
});
exports.sorter = sorter;
//# sourceMappingURL=sort-worker.js.map