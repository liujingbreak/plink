"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sorter = void 0;
// import {formatToConcise} from '../nodejs-utils';
// import {ReactorCompositeOpt} from '../index';
const sorter_1 = require("./sorter");
// const stdoutLogger: ReactorCompositeOpt<any, any, any, any>['log'] = (...msgs) => {
//   process.stdout.write(formatToConcise(...msgs));
//   process.stdout.write('\n');
// };
const sorter = (0, sorter_1.createSorter)(null, {
    name: 'sorter',
    debug: process.env.NODE_ENV === 'development'
    // log: stdoutLogger
});
exports.sorter = sorter;
//# sourceMappingURL=sort-worker.js.map