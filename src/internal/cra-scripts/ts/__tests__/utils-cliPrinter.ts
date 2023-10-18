import * as _utils from '../utils';

export async function test() {
  const {createCliPrinter} = require('../utils') as typeof _utils;
  const print = createCliPrinter('Hello world !!!!!!!!!!!!!!!!!!!!');
  await new Promise(r => setTimeout(r, 1000));
  for (let i = 0; i < 50; i++) {
    await print('line ', i + 1, ' hahaha'.repeat(100));
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}
