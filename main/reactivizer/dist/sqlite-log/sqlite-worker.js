"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sqliteLogFac = void 0;
// import {Worker} from 'worker_threads';
// import {} from 'node:sqlite';
const reactivizer_1 = require("@wfh/reactivizer");
exports.sqliteLogFac = new reactivizer_1.BaseReactorFactory({
    name: 'sqlite-log'
}).defineReactor((init) => {
    // const service = init();
    // const {s, r} = service;
});
//# sourceMappingURL=sqlite-worker.js.map