import * as rx from 'rxjs';
import { createWorkerControl, reativizeRecursiveFuncs } from '../forkJoin-node-worker';
const ctl = createWorkerControl();
export const sortActions = {
    async sort(buf, offset = 0, len) {
        const arr = new Float32Array(buf, offset, len);
        console.log('sort', offset, len);
        if (arr.length > 3) {
            const leftPartOffset = 0;
            const leftPartLen = arr.length >> 1;
            const rightPartOffset = leftPartLen;
            const rightpartLen = arr.length - leftPartLen;
            const sortAction = sorter.i.core.createAction('sort', [buf, rightPartOffset, rightpartLen]);
            const forkDone = rx.firstValueFrom(sorter.i.pt.sortResolved.pipe(rx.filter(([, , callerId]) => sortAction.i === callerId), rx.map(([, res]) => res)));
            sorter.o.dp.fork(sortAction);
            await sortActions.sort(buf, leftPartOffset, leftPartLen);
            // sorter.i.dp.sort(arr, leftPartOffset, leftPartLen);
            await forkDone;
            sortActions.merge(buf, leftPartOffset, leftPartLen, buf, rightPartOffset, rightpartLen);
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
export const sorter = reativizeRecursiveFuncs(ctl, sortActions);
//# sourceMappingURL=sort-worker.js.map