/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import Path from 'path';
import fs from 'fs';
import {describe, it, expect}  from '@jest/globals';
import {initProcess, initConfig, logConfig} from '@wfh/plink';
import * as rx from 'rxjs';
import markdownLoader0 from '../ts/markdown-loader';

describe('markdown-util', () => {
  beforeAll(() => {
    initProcess();
    logConfig(initConfig({dev: true})());
  });

  it('long markdown', async () => {
    const {default: markdownLoader} = require('../dist/markdown-loader') as {default: typeof markdownLoader0};
    const file = Path.resolve(__dirname, 'sample-markdown.md');
    const md = fs.readFileSync(file, 'utf8');
    const jestMock = jest.fn();
    const done$ = new rx.ReplaySubject<[Error | undefined, string]>(1);
    const mockMarkdownInstance = {
      context: __dirname,
      async() {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return (...args: any[]) => {
          jestMock(...args);
          done$.next(args as [any, any]);
          done$.complete();
        };
      },
      resourcePath: file
    } as any;
    void markdownLoader.call(mockMarkdownInstance, md, undefined);
    return rx.firstValueFrom(done$.pipe(
      rx.tap(([err, text]) => {
        console.log(err, text);
        expect(err).toBeNull();
      })
    ));
  }, 15000);

});
