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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSorter = void 0;
const rx = __importStar(require("rxjs"));
const sortedIndex_1 = __importDefault(require("lodash/sortedIndex"));
const forkJoin_node_worker_1 = require("../forkJoin-node-worker");
const sort_comparator_interf_1 = require("./sort-comparator-interf");
async function createSorter(comparator, opts) {
    const ctl = await rx.firstValueFrom((0, forkJoin_node_worker_1.createWorkerControl)(opts));
    const cmp = comparator !== null && comparator !== void 0 ? comparator : new sort_comparator_interf_1.DefaultComparator();
    ctl.r(ctl.i.pt.sortInWorker.pipe(rx.map(async ([m, ...params]) => {
        const forkDone = (0, forkJoin_node_worker_1.fork)(sorter, 'sort', params);
        const ret = await forkDone;
        o.dpf.sortResolved(m, ret);
        o.dpf.sortCompleted(m);
    })));
    const sortActions = {
        /**
         * @param noForkThreshold if `len` is larger than this number, `sort` function should fork half of array to recursive call, otherwise it just go with Array.sort() directly in current worker/thread
         */
        async sort(buf, offset, len, noForkThreshold = 50) {
            const arr = cmp.createTypedArray(buf, offset, len);
            if (arr.length > noForkThreshold) {
                const leftPartLen = arr.length >> 1;
                const rightPartOffset = offset + leftPartLen;
                const rightpartLen = arr.length - leftPartLen;
                // o.dp.log('create fork sort action for half', rightPartOffset, rightpartLen, `action id: ${sortAction.i}`);
                const forkDone = (0, forkJoin_node_worker_1.fork)(sorter, 'sort', [buf, rightPartOffset, rightpartLen, noForkThreshold]);
                // o.dp.log('sort another half in current worker', leftPartOffset, leftPartLen);
                await sortActions.sort(buf, offset, leftPartLen, noForkThreshold);
                o.dp.wait();
                await forkDone;
                o.dp.stopWaiting();
                const mergeRes = await sortActions.merge(buf, offset, leftPartLen, rightPartOffset, rightpartLen, noForkThreshold, buf, offset);
                const mergedBuf = mergeRes === null || mergeRes === void 0 ? void 0 : mergeRes.content;
                if (mergedBuf != null) {
                    const mergedArr = cmp.createTypedArray(mergedBuf);
                    let i = 0;
                    for (const v of mergedArr) {
                        arr[i++] = v;
                    }
                }
                // o.dp.log('return merge-sort', offset, len, [...arr]);
            }
            else {
                arr.sort(cmp.compare);
                // o.dp.log('return directly sort', offset, len, [...arr]);
            }
            return [offset, len];
        },
        async merge(buf, offset1, len1, offset2, len2, noForkThreshold = 50, targetBuffer, targetOffset) {
            var _a, _b;
            const destBuf = cmp.createArrayBufferOfSize(len1 + len2);
            if (len1 < len2) {
                // Ensure 1st array is longer than 2nd array, because we split 1st array into evenly half to be forked merge, 1st array's length determines how much
                // the divide level is, not the 2nd array. In extreme case, the "divide fork" will be meaningless if the 1st array is empty.
                const tempOffset = offset1;
                offset1 = offset2;
                offset2 = tempOffset;
                const tempLen = len1;
                len1 = len2;
                len2 = tempLen;
            }
            if (len1 === 0) { // both empty, since len2 is always less than len1
                return null;
            }
            if (len1 + len2 > noForkThreshold) {
                const arr1 = cmp.createTypedArray(buf, offset1, len1);
                const arr1LeftOffset = offset1;
                const arr1LeftLen = (len1 >> 1);
                const arr1RightOffset = arr1LeftOffset + arr1LeftLen;
                const arr1RightLen = len1 - arr1LeftLen;
                const arr2 = cmp.createTypedArray(buf, offset2, len2);
                const arr2LeftOffset = offset2;
                const arr2LeftLen = (0, sortedIndex_1.default)(arr2, arr1[arr1LeftLen - 1]);
                const arr2RightOffset = arr2LeftOffset + arr2LeftLen;
                const arr2RightLen = len2 - arr2LeftLen;
                // o.dp.log('merge with fork', offset1, len1, [...arr1], offset2, len2, [...arr2], ', binarySerach pivot value:', arr1[arr1LeftLen - 1], '\n',
                //   '1st: left', [...arr1.slice(0, arr1LeftLen)], 'right', [...arr1.slice(arr1LeftLen, arr1LeftLen + arr1RightLen)], '\n',
                //   '2nd: left', [...arr2.slice(0, arr2LeftLen)], 'right', [...arr2.slice(arr2LeftLen, arr2LeftLen + arr2RightLen)]);
                const forkDone = (0, forkJoin_node_worker_1.fork)(sorter, 'merge', [buf, arr1RightOffset, arr1RightLen, arr2RightOffset, arr2RightLen, noForkThreshold]);
                const leftMerged = (_a = (await sortActions.merge(buf, arr1LeftOffset, arr1LeftLen, arr2LeftOffset, arr2LeftLen, noForkThreshold))) === null || _a === void 0 ? void 0 : _a.content;
                o.dp.wait();
                const rightMerged = (_b = (await forkDone)) === null || _b === void 0 ? void 0 : _b.content;
                o.dp.stopWaiting();
                const destArr = targetBuffer ? cmp.createTypedArray(targetBuffer, targetOffset, len1 + len2) : cmp.createTypedArray(destBuf);
                let i = 0;
                if (leftMerged) {
                    for (const v of cmp.createTypedArray(leftMerged)) {
                        destArr[i++] = v;
                    }
                }
                if (rightMerged) {
                    for (const v of cmp.createTypedArray(rightMerged)) {
                        destArr[i++] = v;
                    }
                }
            }
            else {
                const destArr = cmp.createTypedArray(destBuf);
                const arr1 = cmp.createTypedArray(buf, offset1, len1);
                const arr2 = cmp.createTypedArray(buf, offset2, len2);
                // o.dp.log('merge directly', offset1, len1, arr1, offset2, len2, arr2);
                let pos1 = 0, pos2 = 0;
                for (let i = 0, l = len1 + len2; i < l; i++) {
                    if (pos2 >= arr2.length || arr1[pos1] <= arr2[pos2]) {
                        destArr[i] = arr1[pos1++];
                    }
                    else {
                        destArr[i] = arr2[pos2++];
                    }
                }
                if (targetBuffer) {
                    const target = cmp.createTypedArray(targetBuffer, targetOffset, len1 + len2);
                    let i = 0;
                    for (const v of destArr)
                        target[i++] = v;
                }
            }
            // o.dp.log('merge returns', offset1, len1, offset2, len2, destArr);
            if (targetBuffer)
                return null;
            else
                return { content: destBuf, transferList: [destBuf] };
        }
    };
    const sorter = (0, forkJoin_node_worker_1.reativizeRecursiveFuncs)(ctl, sortActions);
    const { o } = sorter;
    return sorter;
}
exports.createSorter = createSorter;
//# sourceMappingURL=sorter.js.map