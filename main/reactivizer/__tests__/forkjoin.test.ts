/* eslint-disable no-console */
import {initProcess, initConfig, logConfig} from '@wfh/plink';
import {describe, it, afterEach}  from '@jest/globals';
import * as forkMergeSortModule from '../src/__tests__/fork-merge-sort';

initProcess('none');
logConfig(initConfig({})());

describe('forkjoin worker', () => {

  const {forkMergeSort} = require('../src/__tests__/fork-merge-sort') as typeof forkMergeSortModule;

  afterEach(async () => {
    // if (shutdown)
    //   await shutdown();
  });

  it.skip('messUp function', () => {
    // const arr = createSharedArryForTest(0, 20);
    // console.log(arr);
    // expect(new Set(arr).size).toEqual(20);
  });

  it.skip('main worker can recursively fork main worker and perform merge-sort', async () => {
    await forkMergeSort('mainOnly');
  }, 50000);

  it.skip('single worker can fork another worker and perform merge-sort', async () => {
    await forkMergeSort('singleWorker');
  }, 50000);

  it.skip('Exclude main thread', async () => {
    await forkMergeSort('excludeMainThread');
  }, 50000);


  it.skip('Scheduled workers can fork another worker or main worker itself', async () => {
    await forkMergeSort('scheduler');
  }, 40000);

  it.skip('Exclude main thread', async () => {
    await forkMergeSort('excludeMainThread', undefined, 2000);
  }, 50000);


  it('Scheduled workers can fork another worker or main worker itself', async () => {
    await forkMergeSort('scheduler', undefined, 1000);
  }, 40000);
});


