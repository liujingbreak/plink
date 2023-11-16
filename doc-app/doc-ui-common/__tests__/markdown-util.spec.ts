import Path from 'path';
import fs from 'fs';
import {describe, it, expect}  from '@jest/globals';
// import {initProcess} from '@wfh/plink';
import * as rx from 'rxjs';
import * as markdownUtil from '../ts/markdown-loader-worker';

describe('markdown-util', () => {
  beforeAll(() => {
    // initProcess();
  });

  it('should be able to parse HTML with <img> tags', async () => {
    const {testable: {parseHtml}} = require('../ts/markdown-loader-worker') as typeof markdownUtil;
    let i = 0;
    const {content} = await rx.firstValueFrom(parseHtml(`<html><body>
      <img src="./foobar">
      <div></div>
      <img src="./hello-world">
      <img src="https://w.g.com/foo-bar">
      <h1>I am head 1</h1>
    </body></html>`, imgSrc => Promise.resolve(`imgSrcVar${i++}`))
    );

    console.log(content);
    expect(content.length).toBeGreaterThan(0);
  });

  it.skip('long html', async () => {
    const html = fs.readFileSync(Path.resolve(__dirname, 'sample.html'), 'utf8');
    const {testable: {parseHtml}} = require('../ts/markdown-loader-worker') as typeof markdownUtil;
    let i = 0;
    const {content} = await rx.firstValueFrom(parseHtml(html, imgSrc => Promise.resolve(' + imgSrcVar + ' + i++)));
    console.log(content);
  });

});
