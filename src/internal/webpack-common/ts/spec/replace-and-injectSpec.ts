import replaceAndInject from '../../ts/tsjs/replace-and-inject';
import RJ from 'require-injector';
import Path from 'path';

describe('replace-and-inject', () => {
  it('replace', () => {
    const rj = new RJ({noNode: true});
    const tsconfig = Path.resolve(require.resolve('@wfh/plink/package.json'), '../wfh/tsconfig-base.json');
    // tslint:disable-next-line
    console.log('tsconfig file', tsconfig);
    rj.fromDir(__dirname).alias('lodash', 'NOTHING_BUT_LONG');
    const rs = replaceAndInject(Path.resolve(__dirname, 'mock.ts'), mockFileContent, rj,
    tsconfig, {
      __context: {
        foobar() { return 'REPLACED';}
      }
    });
    // tslint:disable-next-line
    console.log(rs);
  });
});

const mockFileContent = 'import _ from \'lodash\';__context.foobar();';
