import binarySearch from 'lodash/sortedIndex';
import { createWorkerControl, fork, setIdleDuring } from '../fork-join/node-worker';
import { DefaultComparator } from './sort-comparator-interf';
export function createSorter(comparator, opts) {
    const cmp = comparator !== null && comparator !== void 0 ? comparator : new DefaultComparator();
    const sortActions = {
        async sortAllInWorker(buf, offset, len, noForkThreshold) {
            const forkDone = fork(sorter, 'sort', [buf, offset, len, noForkThreshold]);
            return forkDone;
        },
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
                const forkDone = fork(sorter, 'sort', [buf, rightPartOffset, rightpartLen, noForkThreshold]);
                // o.dp.log('sort another half in current worker', leftPartOffset, leftPartLen);
                await sortActions.sort(buf, offset, leftPartLen, noForkThreshold);
                await setIdleDuring.asPromise(sorter, forkDone);
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
            var _a;
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
                const arr2LeftLen = binarySearch(arr2, arr1[arr1LeftLen - 1]);
                const arr2RightOffset = arr2LeftOffset + arr2LeftLen;
                const arr2RightLen = len2 - arr2LeftLen;
                // o.dp.log('merge with fork', offset1, len1, [...arr1], offset2, len2, [...arr2], ', binarySerach pivot value:', arr1[arr1LeftLen - 1], '\n',
                //   '1st: left', [...arr1.slice(0, arr1LeftLen)], 'right', [...arr1.slice(arr1LeftLen, arr1LeftLen + arr1RightLen)], '\n',
                //   '2nd: left', [...arr2.slice(0, arr2LeftLen)], 'right', [...arr2.slice(arr2LeftLen, arr2LeftLen + arr2RightLen)]);
                const forkDone = fork(sorter, 'merge', [buf, arr1RightOffset, arr1RightLen, arr2RightOffset, arr2RightLen, noForkThreshold]);
                const leftMerged = (_a = (await sortActions.merge(buf, arr1LeftOffset, arr1LeftLen, arr2LeftOffset, arr2LeftLen, noForkThreshold))) === null || _a === void 0 ? void 0 : _a.content;
                const [forkResult] = await setIdleDuring.asPromise(sorter, forkDone);
                const rightMerged = forkResult === null || forkResult === void 0 ? void 0 : forkResult.content;
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
    const sorter = createWorkerControl(opts).reativizeRecursiveFuncs(sortActions);
    return sorter;
}
//# sourceMappingURL=sorter.js.map