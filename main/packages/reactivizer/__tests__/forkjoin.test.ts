/* eslint-disable no-console */
// import Path from 'node:path';
// import {performance} from 'node:perf_hooks';
// import os from 'node:os';
// import {Worker} from 'node:worker_threads';
import {initProcess, initConfig, logConfig} from '@wfh/plink';
// import * as rx from 'rxjs';
import {describe, it, beforeEach, afterEach}  from '@jest/globals';
// import {createSorter} from '../src/res/sorter';
// import {createBroker, applyScheduler} from '../src/fork-join/for-node';
import * as forkMergeSortModule from '../src/__tests__/fork-merge-sort';

initProcess('none');
logConfig(initConfig({})());
// const log = log4File(__filename);

describe('forkjoin worker', () => {
  // const num = 3000;
  // let testArr: Float32Array;
  // let shutdown: undefined | (() => Promise<any>);

  const {forkMergeSort} = require('../src/__tests__/fork-merge-sort') as typeof forkMergeSortModule;
  beforeEach(() => {
    // testArr = createSharedArryForTest(0, num);
  });

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

  it('Exclude main thread', async () => {
    await forkMergeSort('excludeMainThread');
  }, 50000);


  it('Scheduled workers can fork another worker or main worker itself', async () => {
    await forkMergeSort('scheduler');
  }, 40000);

});


