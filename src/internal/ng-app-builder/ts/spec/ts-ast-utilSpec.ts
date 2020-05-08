// tslint:disable:no-console
import * as fs from 'fs';
import {resolve} from 'path';
// const log = require('log4js').getLogger('ts-ast-querySpec');

import {resolveImportBindName, defaultResolveModule} from '../utils/ts-ast-util';
import * as ts from 'typescript';
describe('ts-ast-util', () => {
  let testContent: string;
  const testFile = resolve(__dirname, '../../ts/spec/app.module.ts.txt');

  beforeAll(() => {
    testContent = fs.readFileSync(testFile, 'utf8');
  });

  it('resolveModule() should work', () => {
    expect(defaultResolveModule('./abc', __filename).replace(/\\/g, '/')).toBe(__dirname.replace(/\\/g, '/') + '/abc');
    expect(defaultResolveModule('abc', __filename).replace(/\\/g, '/'))
      .toBe(resolve('node_modules/abc').replace(/\\/g, '/'));
  });

  it('resolveImportBindName', () => {
    const src = ts.createSourceFile(testFile, testContent, ts.ScriptTarget.ESNext,
      true, ts.ScriptKind.TSX);
    const res = resolveImportBindName(src, '@angular/core', 'Injectable');
    expect(res).toBe('Injectable');
  });

  it('resolveImportBindName for import name space binding', () => {
    const testSample = 'import * as ng from "@angular/core";\
			@ng.Component({})\
			class MyComponent {}\
		';
    const src = ts.createSourceFile(testFile, testSample, ts.ScriptTarget.ESNext,
      true, ts.ScriptKind.TSX);
    // new Selector(src).printAll();
    const res = resolveImportBindName(src, '@angular/core', 'Component');
    expect(res).toBe('ng.Component');
  });
});

