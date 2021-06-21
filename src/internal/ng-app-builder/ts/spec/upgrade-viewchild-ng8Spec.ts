import {transform} from '../utils/upgrade-viewchild-ng8';
import fs from 'fs';
import Path from 'path';

describe('ViewChild transformer', () => {
  it('should work', () => {
    const content = fs.readFileSync(Path.resolve(
      __dirname, '../../ts/spec/upgrade-viewchild-ng8-sample.txt'), 'utf8');
    const newContent = transform(content, 'test view child upgrade');
    // eslint-disable-next-line no-console
    console.log(newContent);
    // expect(newContent)
    // TODO
  });
});

