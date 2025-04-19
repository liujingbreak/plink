import {describe, it} from 'node:test';
import * as forkMergeSortModule from './fork-merge-sort';

void describe('forkjoin worker', () => {
  const {forkMergeSort} = require('./fork-merge-sort') as typeof forkMergeSortModule;

  void it.skip('main worker can recursively fork main worker and perform merge-sort', async () => {
    await forkMergeSort('mainOnly');
  });

  void it.skip('single worker can fork another worker and perform merge-sort', async () => {
    await forkMergeSort('singleWorker');
  });

  void it.skip('Exclude main thread', async () => {
    await forkMergeSort('excludeMainThread');
  });


  void it('Scheduled workers can fork another worker or main worker itself', async () => {
    await forkMergeSort('scheduler');
  });

  void it.skip('Exclude main thread', async () => {
    await forkMergeSort('excludeMainThread', undefined, 2000);
  });


  void it.skip('Scheduled workers can fork another worker or main worker itself', async () => {
    await forkMergeSort('scheduler', undefined, 1000);
  });
});
