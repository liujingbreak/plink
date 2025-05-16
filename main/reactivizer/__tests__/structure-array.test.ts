import {describe, it, expect, jest}  from '@jest/globals';
import {ArrayBufferMgr} from '../src/structure-array';

describe('ArrayBufferMgr', () => {
  it('create a simple array of structure', () => {
    const definition = {
      field1: {
        type: Uint32Array,
        len: 3
      },

      field2: {
        type: Uint8Array
      },

      field3: {
        type: Float64Array,
        len: 3
      },

      field4: {
        type: Float32Array
      },

      field5: {
        type: Uint8Array,
        len: 2
      }
    };
    const mgr = new ArrayBufferMgr(definition);

    const mocker = jest.fn();
    const fromArrayBuffers = mgr.fromArrayBuffers;

    mgr.fromArrayBuffers = function(...args) {
      mocker(...args);
      return fromArrayBuffers.apply(mgr, args);
    };

    mgr.allocate(2, true);

    expect((mocker.mock.calls[0][0] as SharedArrayBuffer[]).length).toBe(4);
    // expect((mocker.mock.calls[0][0] as SharedArrayBuffer[])[0]).toBeInstanceOf(SharedArrayBuffer);
    // expect((mocker.mock.calls[0][0] as SharedArrayBuffer[])[1]).toBeInstanceOf(SharedArrayBuffer);
    // expect((mocker.mock.calls[0][0] as SharedArrayBuffer[])[2]).toBeInstanceOf(SharedArrayBuffer);

    // console.log((mgr as any).fieldMetas);
    const entry = mgr.getStructureAt(1);
    entry.field1.set([9999, 9980, 9970]);
    // entry.field1[0] = 9999;
    // entry.field1[1] = 9980;
    // entry.field1[2] = 9970;

    // expect(entry.field1).toEqual([9999, 9980, 9970]);
    entry.field2 = 5;
    expect(entry.field2).toEqual(5);
    entry.field3.set([2.1, 2.2, 2.3]);
    entry.field4 = Math.PI;
    entry.field5.set([1, 2], 0);

    const bufs = mgr.toArrayBuffers();

    expect(bufs.length).toBe(4);
    const mgr2 = new ArrayBufferMgr(definition);
    mgr2.fromArrayBuffers(bufs);
    const entryT = mgr2.getStructureAt(1);
    expect([...entryT.field1]).toEqual([9999, 9980, 9970]);
    expect(entryT.field2).toEqual(5);
    expect([...entryT.field3]).toEqual([2.1, 2.2, 2.3]);
    expect((entryT.field4 + '').slice(0, 8)).toEqual('3.141592');
    expect([...entryT.field5]).toEqual([1, 2]);
  });
});
