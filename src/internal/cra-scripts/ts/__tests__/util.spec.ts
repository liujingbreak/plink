/* eslint-disable no-console */
import {initProcess} from '@wfh/plink';
import {describe, it, expect}  from '@jest/globals';
import * as _utils from '../utils';
initProcess('none');

describe('utility tool', () => {
  let strWidth: (s: string) => number;
  let cliLineWrapByWidth: (typeof _utils)['cliLineWrapByWidth'];

  beforeAll(async () => {
    strWidth = (await import('string-width')).default;
    cliLineWrapByWidth = (require('../utils') as typeof _utils).cliLineWrapByWidth;
  });

  it('cliLineWrapByWidth should work', () => {
    const res = cliLineWrapByWidth('abcdefg', 4, strWidth);
    console.log(res);
    expect(res.length).toBe(2);

    const resCn = cliLineWrapByWidth('ab中文cd', 4, strWidth);
    console.log(resCn);
    expect(strWidth('ab中')).toBe(4);
    expect(resCn.length).toBe(2);
    expect(resCn[0]).toEqual('ab中');
    expect(resCn[1]).toEqual('文cd');

    const resCn2 = cliLineWrapByWidth('abc中文d', 4, strWidth);
    console.log(resCn2);
    expect(resCn2[0]).toBe('abc');
    expect(resCn2[1]).toBe('中文');
    expect(resCn2[2]).toBe('d');

    const resCn3 = cliLineWrapByWidth('中文中文中文中文中文', 5, strWidth);
    console.log(resCn3);

    console.log(cliLineWrapByWidth('a', 5, strWidth));
    console.log(cliLineWrapByWidth('', 1, strWidth));
  });
});

