/* eslint-disable no-console */
import {Pool} from '../index';

describe('Thread pool', () => {
  it('all worker should run simultaneously', async () => {
    const pool = new Pool(3, 999);
    const dones: Promise<number>[] = [];
    for (let i = 1; i <= 3; i++) {
      dones.push(pool.submit<number>({
        file: require.resolve('./thread-job'),
        exportFn: 'default',
        args: [i]
      }));
    }
    const res = await Promise.all(dones);
    console.log('--- end ----', res);
    expect(res).toEqual([10, 20, 30]);
  });
});
