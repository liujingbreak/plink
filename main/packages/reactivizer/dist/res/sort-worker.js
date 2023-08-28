"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sorter = exports.sortActions = void 0;
const rx = __importStar(require("rxjs"));
const forkJoin_node_worker_1 = require("../forkJoin-node-worker");
const ctl = (0, forkJoin_node_worker_1.createWorkerControl)();
exports.sortActions = {
    async sort(buf, offset = 0, len) {
        const arr = new Float32Array(buf, offset, len);
        console.log('sort', offset, len);
        if (arr.length > 3) {
            const leftPartOffset = 0;
            const leftPartLen = arr.length >> 1;
            const rightPartOffset = leftPartLen;
            const rightpartLen = arr.length - leftPartLen;
            const sortAction = exports.sorter.i.core.createAction('sort', [buf, rightPartOffset, rightpartLen]);
            const forkDone = rx.firstValueFrom(exports.sorter.i.pt.sortResolved.pipe(rx.filter(([, , callerId]) => sortAction.i === callerId), rx.map(([, res]) => res)));
            exports.sorter.o.dp.fork(sortAction);
            await exports.sortActions.sort(buf, leftPartOffset, leftPartLen);
            // sorter.i.dp.sort(arr, leftPartOffset, leftPartLen);
            await forkDone;
            exports.sortActions.merge(buf, leftPartOffset, leftPartLen, buf, rightPartOffset, rightpartLen);
            console.log('return merged', offset, len);
        }
        else {
            new Float32Array(buf, offset, len).sort();
            console.log('return', offset, len);
        }
    },
    merge(_buf, offset1 = 0, len1, _arr2, offset2 = 0, len2) {
        console.log('merge', offset1, len1, offset2, len2);
    }
};
exports.sorter = (0, forkJoin_node_worker_1.reativizeRecursiveFuncs)(ctl, exports.sortActions);
//# sourceMappingURL=sort-worker.js.map