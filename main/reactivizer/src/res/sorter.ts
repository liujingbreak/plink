import * as rx from 'rxjs';
import binarySearch from 'lodash/sortedIndex';
import {createWorkerControlOfFn, ForkTransferablePayload, setIdleDuring} from '../fork-join/node-worker';
import type {SimplexReactorOptions} from '../index';
// import {patch} from '../reactor-composite';
import {ForkWorkerInput, ForkWorkerOutput} from '../fork-join/types';
// import {SingleActionFactory} from '..';
import {ForkSortComparator, DefaultComparator, WritableArray} from './sort-comparator-interf';

export function createSorter<D extends WritableArray>(comparator?: ForkSortComparator<D> | null, opts?: SimplexReactorOptions<ForkWorkerInput & ForkWorkerOutput>) {
  const cmp = comparator ?? new DefaultComparator();

  const sortActions = {
    async sortAllInWorker(buf: SharedArrayBuffer, offset: number, len: number, noForkThreshold: number): Promise<[number, number]> {
      const forkDone = await rx.firstValueFrom(
        sorter.s.ft.fork('sort', buf, offset, len, noForkThreshold)
          .do(sorter.s.pt.sortResolved)
      );
      return forkDone[1];
    },
    /**
     * @param noForkThreshold if `len` is larger than this number, `sort` function should fork half of array to recursive call, otherwise it just go with Array.sort() directly in current worker/thread
     */
    async sort(buf: SharedArrayBuffer, offset: number, len: number, noForkThreshold = 50): Promise<[offset: number, len: number]> {
      const arr = cmp.createTypedArray(buf, offset, len);
      // sorter.o.ft.log('sort() arr.length=', len, buf.byteLength, arr.length).dp();
      if (arr.length > noForkThreshold) {
        const leftPartLen = arr.length >> 1;

        const rightPartOffset = offset + leftPartLen;
        const rightpartLen = arr.length - leftPartLen;

        // o.dp.log('create fork sort action for half', rightPartOffset, rightpartLen, `action id: ${sortAction.i}`);
        const forkDone = sorter.s.ft.fork('sort', buf, rightPartOffset, rightpartLen, noForkThreshold).do(sorter.s.at.sortResolved);

        await sortActions.sort(buf, offset, leftPartLen, noForkThreshold);
        await setIdleDuring.asPromise(sorter, forkDone);

        const mergeRes = await sortActions.merge(buf, offset, leftPartLen, rightPartOffset, rightpartLen, noForkThreshold, buf, offset);
        const mergedBuf = mergeRes?.content;
        if (mergedBuf != null) {
          const mergedArr = cmp.createTypedArray(mergedBuf);
          let i = 0;
          for (const v of mergedArr) {
            arr[i++] = v;
          }
        }
        // sorter.o.ft.log('return merge-sort', offset, len, [...arr]).dp();
      } else {
        arr.sort(cmp.compare);
        // sorter.o.ft.log('return directly sort', offset, len, [...arr]).dp();
      }
      return [offset, len];
    },

    async merge(buf: SharedArrayBuffer, offset1: number, len1: number, offset2: number, len2: number, noForkThreshold = 50, targetBuffer?: SharedArrayBuffer, targetOffset?: number):
    Promise<null | ForkTransferablePayload<ArrayBuffer | null>> {
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

      if (len1 + len2 > noForkThreshold ) {
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

        const forkDone = sorter.s.ft.fork('merge', buf, arr1RightOffset, arr1RightLen, arr2RightOffset, arr2RightLen, noForkThreshold).do(sorter.s.pt.mergeResolved);
        const leftMerged = (await sortActions.merge(buf, arr1LeftOffset, arr1LeftLen, arr2LeftOffset, arr2LeftLen, noForkThreshold))?.content;
        const [, forkResult] = await setIdleDuring.asPromise(sorter, forkDone);
        const rightMerged = forkResult?.content;

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
      } else {
        const destArr = cmp.createTypedArray(destBuf);
        const arr1 = cmp.createTypedArray(buf, offset1, len1);
        const arr2 = cmp.createTypedArray(buf, offset2, len2);
        // o.dp.log('merge directly', offset1, len1, arr1, offset2, len2, arr2);
        let pos1 = 0, pos2 = 0;
        for (let i = 0, l = len1 + len2; i < l; i++) {
          if (pos2 >= arr2.length || arr1[pos1] <= arr2[pos2]) {
            destArr[i] = arr1[pos1++];
          } else {
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
      // sorter.o.ft.log('merge returns', offset1, len1, offset2, len2).dp();
      if (targetBuffer)
        return null;
      else
        return {content: destBuf, transferList: [destBuf]};
    }
  };

  const sorter = createWorkerControlOfFn(sortActions, opts);
  return sorter;
}

