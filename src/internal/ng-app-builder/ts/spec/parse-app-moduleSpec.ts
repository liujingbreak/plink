/* eslint-disable  max-len, no-console */
import AppModuleParser, {findAppModuleFileFromMain} from '../utils/parse-app-module';
import {readFileSync} from 'fs';
import {resolve} from 'path';

class TestableParser extends AppModuleParser {
  _findEsImportByName(name: string) {
    return super.findEsImportByName(name);
  }
}

xdescribe('parse-app-module', () => {
  let parser: TestableParser;
  let source: string;
  let patched: string;

  beforeAll(() => {
    parser = new TestableParser();
    source = readFileSync(resolve(__dirname, '../../ts/spec/app.module.ts.txt'), 'utf8');
  });

  it('should can find out NgModule', () => {
    expect(source.indexOf('from \'@bk/module-user\'')).toBeGreaterThan(0);
    expect(source.indexOf('from \'@bk/module-real-name\'')).toBeGreaterThan(0);
    expect(source.indexOf('from \'@bk/module-apply/apply-lazy.module\'')).toBeGreaterThan(0);
    patched = parser.patchFile('app.module.ts', source,
      [
        '@bk/module-user#UserModule',
        '@bk/module-real-name#RealNameModule',
        '@bk/module-apply/apply-lazy.module#ApplyLazyModule'
      ], [
        '@bk/foobar#milk',
        '@bk/foobar#water',
        'foobar#tea'
      ]);
    expect(parser._findEsImportByName('_.get')!.from).toBe('lodash');
    expect(parser._findEsImportByName('env')!.from).toBe('@bk/env/environment');
    const keys: string[] = [];
    for (const k of parser.esImportsMap.keys()) {
      // console.log(parser.esImportsMap.get(k));
      keys.push(k);
    }
    console.log(patched);
    // expect(keys).toBe([]);
  });

  it('should remove dynamic modules', () => {
    expect(patched).not.toContain('from \'@bk/module-user\'');
    expect(patched).not.toContain('from \'@bk/module-real-name\'');
    expect(patched).not.toContain('from \'@bk/module-apply/apply-lazy.module\'');
  });

  it('should can add new modules', () => {
    expect(patched).toMatch(/milk_0,\s*water_1,\s*tea_2/);
    expect(patched).toContain('import {milk as milk_0, water as water_1} from \'@bk/foobar\';');
    expect(patched).toContain('import {tea as tea_2} from \'foobar\';');
  });

  it('should can locate app.module.ts file from main.ts', () => {
    expect(findAppModuleFileFromMain(resolve(__dirname, '../../ts/spec/main-test.ts.txt')))
    .toBe(resolve(__dirname, '../../ts/spec/app/app.module.ts'));
  });
});
