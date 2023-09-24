import binarySearch from 'lodash/sortedIndex';
import { createWorkerControl, reativizeRecursiveFuncs, fork } from '../forkJoin-node-worker';
export function createSorter(opts) {
    const ctl = createWorkerControl(opts);
    const sortActions = {
        /**
         * @param noForkThreshold if `len` is larger than this number, `sort` function should fork half of array to recursive call, otherwise it just go with Array.sort() directly in current worker/thread
         */
        async sort(buf, offset = 0, len, noForkThreshold = 50) {
            const arr = new Float32Array(buf, offset << 2, len);
            if (arr.length > noForkThreshold) {
                const leftPartLen = arr.length >> 1;
                const rightPartOffset = offset + leftPartLen;
                const rightpartLen = arr.length - leftPartLen;
                // o.dp.log('create fork sort action for half', rightPartOffset, rightpartLen, `action id: ${sortAction.i}`);
                const forkDone = fork(sorter, 'sort', [buf, rightPartOffset, rightpartLen, noForkThreshold]);
                // o.dp.log('sort another half in current worker', leftPartOffset, leftPartLen);
                await sortActions.sort(buf, offset, leftPartLen, noForkThreshold);
                o.dp.wait();
                await forkDone;
                o.dp.stopWaiting();
                const mergeRes = await sortActions.merge(buf, offset, leftPartLen, rightPartOffset, rightpartLen, noForkThreshold, buf, offset);
                const mergedBuf = mergeRes === null || mergeRes === void 0 ? void 0 : mergeRes.content;
                if (mergedBuf != null) {
                    const mergedArr = new Float32Array(mergedBuf);
                    let i = 0;
                    for (const v of mergedArr) {
                        arr[i++] = v;
                    }
                }
                // o.dp.log('return merge-sort', offset, len, [...arr]);
            }
            else {
                arr.sort();
                // o.dp.log('return directly sort', offset, len, [...arr]);
            }
            return [offset, len];
        },
        async merge(buf, offset1 = 0, len1, offset2 = 0, len2, noForkThreshold = 50, targetBuffer, targetOffset) {
            var _a, _b;
            const destBuf = new ArrayBuffer((len1 + len2) << 2);
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
                const arr1 = new Float32Array(buf, offset1 << 2, len1);
                const arr1LeftOffset = offset1;
                const arr1LeftLen = (len1 >> 1);
                const arr1RightOffset = arr1LeftOffset + arr1LeftLen;
                const arr1RightLen = len1 - arr1LeftLen;
                const arr2 = new Float32Array(buf, offset2 << 2, len2);
                const arr2LeftOffset = offset2;
                const arr2LeftLen = binarySearch(arr2, arr1[arr1LeftLen - 1]);
                const arr2RightOffset = arr2LeftOffset + arr2LeftLen;
                const arr2RightLen = len2 - arr2LeftLen;
                // o.dp.log('merge with fork', offset1, len1, [...arr1], offset2, len2, [...arr2], ', binarySerach pivot value:', arr1[arr1LeftLen - 1], '\n',
                //   '1st: left', [...arr1.slice(0, arr1LeftLen)], 'right', [...arr1.slice(arr1LeftLen, arr1LeftLen + arr1RightLen)], '\n',
                //   '2nd: left', [...arr2.slice(0, arr2LeftLen)], 'right', [...arr2.slice(arr2LeftLen, arr2LeftLen + arr2RightLen)]);
                const forkDone = fork(sorter, 'merge', [buf, arr1RightOffset, arr1RightLen, arr2RightOffset, arr2RightLen, noForkThreshold]);
                const leftMerged = (_a = (await sortActions.merge(buf, arr1LeftOffset, arr1LeftLen, arr2LeftOffset, arr2LeftLen, noForkThreshold))) === null || _a === void 0 ? void 0 : _a.content;
                o.dp.wait();
                const rightMerged = (_b = (await forkDone)) === null || _b === void 0 ? void 0 : _b.content;
                o.dp.stopWaiting();
                const destArr = targetBuffer ? new Float32Array(targetBuffer, targetOffset << 2, len1 + len2) : new Float32Array(destBuf);
                let i = 0;
                if (leftMerged) {
                    for (const v of new Float32Array(leftMerged)) {
                        destArr[i++] = v;
                    }
                }
                if (rightMerged) {
                    for (const v of new Float32Array(rightMerged)) {
                        destArr[i++] = v;
                    }
                }
            }
            else {
                const destArr = new Float32Array(destBuf);
                const arr1 = new Float32Array(buf, offset1 << 2, len1);
                const arr2 = new Float32Array(buf, offset2 << 2, len2);
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
                    const target = new Float32Array(targetBuffer, targetOffset, len1 + len2);
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
    const sorter = reativizeRecursiveFuncs(ctl, sortActions);
    const { o } = sorter;
    return sorter;
}
//# sourceMappingURL=sorter.js.map