import {describe, it, expect}  from '@jest/globals';
import {initProcess} from '@wfh/plink';
import * as markdownUtil from '../ts/markdown-util';

describe('markdown-util', () => {
  beforeAll(() => {
    initProcess();
  });

  it('should be able to parse HTML with <img> tags', async () => {
    const {parseHtml} = require('../ts/markdown-util') as typeof markdownUtil;
    let i = 0;
    const {content} = await parseHtml(`<html><body>
      <img src="./foobar">
      <div></div>
      <img src="./hello-world">
      <img src="https://w.g.com/foo-bar">
    </body></html>`, imgSrc => Promise.resolve(' + imgSrcVar + ' + i++))
      .toPromise();

    console.log(content);
    expect(content.length).toBeGreaterThan(0);
  });
});
