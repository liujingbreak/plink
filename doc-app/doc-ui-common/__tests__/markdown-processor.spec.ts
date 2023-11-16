import Path from 'path';
import fs from 'fs';
import {describe, it, expect}  from '@jest/globals';
// import {initProcess} from '@wfh/plink';
import * as rx from 'rxjs';
import * as proc from '../ts/markdown-processor';

describe('markdown-processor', () => {
  beforeAll(() => {
    // initProcess();
  });

  it('long html', async () => {
    const html = fs.readFileSync(Path.resolve(__dirname, 'sample.html'), 'utf8');
  });

});
