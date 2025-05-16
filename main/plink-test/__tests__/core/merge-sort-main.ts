import {Worker} from 'node:worker_threads';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import type {ActionStreamControl} from '@wfh/redux-toolkit-observable/dist/rx-utils';
import {createControlForMain, RecursiveTaskActions, RecursiveForkEpic} from '@wfh/plink/wfh/dist/share/forkJoin';
import {createNodeThreadPlugin} from '@wfh/plink/wfh/dist/share/forkJoin/plugin-nodeThread';

export type MergeSortActions = {
  sort(id: string, data: number[]): void;
  merge(data1: number[], data2: number[]): void;
  returnSorted(id: string): void;
};

export const epic: RecursiveForkEpic<MergeSortActions> = (ctrl: ActionStreamControl<MergeSortActions & RecursiveTaskActions<MergeSortActions>>) => {
  const {payloadByType: pt} = ctrl;
  return rx.merge(
    pt.sort.pipe(
      op.map(data => {
        console.log(data);
      })
    ),
    pt.merge.pipe()
  );
};

export function createMergeSortControl() {
  return createControlForMain<MergeSortActions>(
    createNodeThreadPlugin(),
    () => new Worker('./merge-sort-worker.js'),
    {debug: 'mergeSortMain', concurrent: 2},
    epic
  );
}

