import {createControlForWorker, createNodeThreadPlugin} from '@wfh/plink/wfh/ts/share/forkJoin';
import {epic} from './merge-sort-main';

export type MergeSortActions = {
  sort(data: number[]): void;
  forkSort(data: number[], offset: number, end: number): void;
};

createControlForWorker<MergeSortActions>(createNodeThreadPlugin(), {debug: 'mergeSortWorker'}, epic);

