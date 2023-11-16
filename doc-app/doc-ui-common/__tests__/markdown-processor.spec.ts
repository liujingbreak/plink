import Path from 'path';
import fs from 'fs';
import {describe, it, expect}  from '@jest/globals';
// import {initProcess} from '@wfh/plink';
import * as rx from 'rxjs';
import {markdownProcessor} from '../ts/markdown-processor-main';

describe('markdown-processor', () => {
  beforeAll(() => {
    // initProcess();
  });

  it('long html', async () => {
    const html = fs.readFileSync(Path.resolve(__dirname, 'sample.html'), 'utf8');
    markdownProcessor.i.do.forkProcessFile(waitForAction$, markdownFileContent, filePath)
  });

});
