/* eslint-disable no-console */
import Path from 'path';
import * as rx from 'rxjs';
import {afterAll, describe, it, expect, jest}  from '@jest/globals';
import {service} from '../dist/package-mgr/package-mgr2';
import {lookupPlinkRoot} from '../dist/plink2/server-process';

const plinkRoot = lookupPlinkRoot(__dirname);

const {i, o, outputTable} = service;

describe('package-mgr2', () => {
  it('scan', async () => {
    expect(plinkRoot).not.toBeNull();
    // const mockFn = jest.fn();

    // spaceDependencyMap.set('react-space', new Set());
    // o.pt.didSymlinkCreation.pipe(
    //   rx.map(() => mockFn())
    // ).subscribe();

    await rx.firstValueFrom(i.ft.scan(plinkRoot!).ddo(o.pt.onScanCompleted));
    const [, allPackages] = await rx.firstValueFrom(outputTable.l.data_allPackages);
    const [, projPkgMap] = await rx.firstValueFrom(outputTable.l.data_projPkgMap);
    console.log([...allPackages.keys()].sort().join(', '), '\ncount:', allPackages.size);
    // expect(mockFn.mock.calls.length).toBe(18);
    expect(allPackages.size).toBe(24);
    console.log('projects', [...projPkgMap.keys()]);
    console.log('----------------');

    // scan twice
    await rx.firstValueFrom(i.ft.scan(plinkRoot!).ddo(o.pt.onScanCompleted));
    // expect(mockFn.mock.calls.length).toBe(36);
    expect(allPackages.size).toBe(24);
  }, 40000);

  it.skip('syncWorkspace', async () => {
    console.log('========= test syncWorkspace ==========');
    const mockFn = jest.fn();
    o.pt.didSwitchSpace.subscribe(([, , links, created]) => mockFn(links, created));
    await rx.firstValueFrom(
      i.ft.syncWorkspace(Path.resolve(plinkRoot!, 'react-space'))
        .ddo(o.pt.onSpaceSynced)
    );
    expect(mockFn.mock.calls.length).toBe(1);
    expect((mockFn.mock.calls[0][0] as string[]).length).toBe(3);
  }, 60000);

  afterAll(() => {
    service.dispose();
  });
});
