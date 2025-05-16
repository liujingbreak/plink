/* eslint-disable no-console */
import {describe, it, expect} from '@jest/globals';
import {shrinkEachSize} from '../src/core/flex-container.ts';

describe('flexContainer', () => {
  it('shrink calculation', () => {
    const sizes = shrinkEachSize([60, 1], [1, 0], 30);
    console.log('=', sizes);
    expect(sizes).toEqual([29, 1]);
  });
});
