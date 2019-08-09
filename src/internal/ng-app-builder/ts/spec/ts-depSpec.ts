import ts from 'typescript';
import fs from 'fs';
import Query from '../utils/ts-ast-query';

describe('ts', () => {
  it('should can list dependencies', () => {
    const file = '/Users/liujing/bk/dr-comp-package/wfh/ts/config-handler.ts';
    const src = ts.createSourceFile(file,
      fs.readFileSync(file, 'utf8'), ts.ScriptTarget.ES2015);

    // console.log(src.statements);
    new Query(src).printAll();
  });
});
