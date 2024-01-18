"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sorter = void 0;
const sorter_1 = require("./sorter");
const sorter = (0, sorter_1.createSorter)(null, {
    name: 'sorter',
    debug: false // process.env.NODE_ENV === 'development'
});
exports.sorter = sorter;
//# sourceMappingURL=sort-worker.js.map