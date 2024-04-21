/* eslint-disable no-console */
import * as rx from 'rxjs';
import {describe, it, expect}  from '@jest/globals';
import {spacePkgMap, allPackages, service} from '../dist/package-mgr/package-mgr2';
import {lookupPlinkRoot} from '../dist/plink2/server-process';

const plinkRoot = lookupPlinkRoot(__dirname);

describe('package-mgr2', () => {
  it('scan', async () => {
    const {i, o} = service;
    expect(plinkRoot).not.toBeNull();
    // const mockFn = jest.fn();

    // spacePkgMap.set('react-space', new Set());
    // o.pt.didAllSymlinks.pipe(rx.map(([, count]) => {
    //   mockFn(count);
    // })).subscribe();

    await rx.firstValueFrom(i.ft.scan(plinkRoot!).ddo(o.pt.onScanCompleted));
    console.log([...allPackages.keys()].sort().join(', '), '\ncount:', allPackages.size);
    // expect(mockFn.mock.calls[0][0]).toBe(18);
    expect(allPackages.size).toBe(24);
    // console.log('----------------');

    // scan twice
    await rx.firstValueFrom(i.ft.scan(plinkRoot!).ddo(o.pt.onScanCompleted));
    // expect(mockFn.mock.calls[0][0]).toBe(36);
    expect(allPackages.size).toBe(24);

    service.dispose();
  }, 40000);
});
