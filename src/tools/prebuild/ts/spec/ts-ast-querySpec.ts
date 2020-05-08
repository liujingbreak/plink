// tslint:disable:no-console
import Selector, {Query/*, AstCharacter*/} from '../ts-ast-query';
import * as fs from 'fs';
import {resolve} from 'path';
import * as ts from 'typescript';
// const log = require('log4js').getLogger('ts-ast-querySpec');

describe('ts-ast-query', () => {
  it('printAll demo', () => {
    const file = resolve(__dirname, 'manual-written sample file');
    const sel = new Selector('import api from \'__api\'', file);
    sel.printAll();
    expect(sel.findAll(':ImportDeclaration>.moduleSpecifier').length).toBe(1);
  });

  it('printAll should work', () => {
    const file = resolve(__dirname, '../../ts/spec/app.module.ts.txt');
    new Selector(fs.readFileSync(file, 'utf8'), file).printAll();
  });

  xit('printAllNoType should work', () => {
    const file = resolve(__dirname, '../../ts/spec/app.module.ts.txt');
    new Selector(fs.readFileSync(file, 'utf8'), file).printAllNoType();
  });

  it('Query should work', () => {
    // const file = resolve(__dirname, '../../ts/spec/app.module.ts.txt');
    // const sel = new Selector(fs.readFileSync(file, 'utf8'), file);
    let q = new Query('.statements:VariableStatement  .namedBindings .elements[0] > :Identifier');
    console.log(q.queryPaths);
    expect(q.queryPaths.slice(0).map(c => c.slice(0).reverse()).reverse()).toEqual([
      [{ propertyName: 'statements', kind: 'VariableStatement' }],
      [{ propertyName: 'namedBindings' }],
      [{ propertyName: 'elements', propIndex: 0 }, { kind: 'Identifier' }]
    ]);
    expect((q as any).matchesConsecutiveNodes(
        [(q as any)._parseDesc('.foobar:Abc'), (q as any)._parseDesc(':Off')].reverse(),
        ['.foobar[3]:Abc', '.end:Off'], 1
      )).toBe(true);
    expect((q as any).matchesConsecutiveNodes(
        [(q as any)._parseDesc('.foobar:Abc'), (q as any)._parseDesc(':Off')].reverse(),
        ['.foobar[3]:Abc', '.end:Off'], 0
      )).toBe(false);

    expect(q.matches(
      // tslint:disable-next-line:max-line-length
      '.statements[0]:VariableStatement>.importClause:ImportClause>.namedBindings:NamedImports>.elements[0]:ImportSpecifier>.name:Identifier'
      .split('>'))).toBe(true);
    q = new Query(':ImportDeclaration :Identifier');
    expect(q.matches(('.statements[0]:ImportDeclaration>.importClause:ImportClause>.namedBindings:NamedImports>' +
      '.elements[0]:ImportSpecifier>.name:Identifier').split('>'))).toBe(true);
    expect(q.matches(('.statements[0]:ImportDeclaration>.importClause:ImportClause>.namedBindings:NamedImports>' +
      '.elements[1]:ImportSpecifier>.name:Identifier').split('>'))).toBe(true);
  });

  it('findFirst should work', () => {
    const file = resolve(__dirname, '../../ts/spec/app.module.ts.txt');
    const sel = new Selector(fs.readFileSync(file, 'utf8'), file);
    const found = sel.findFirst(':ImportDeclaration :Identifier');
    expect(found != null).toBeTruthy();
    expect(found!.getText(sel.src)).toBe('Injectable');
  });

  it('findAll should work', () => {
    const file = resolve(__dirname, '../../ts/spec/app.module.ts.txt');
    const sel = new Selector(fs.readFileSync(file, 'utf8'), file);
    const found = sel.findAll(':ImportDeclaration :Identifier').map(ast => ast.getText(sel.src));

    console.log(found);

    expect(found.length).toBe(1);
  });

  it('findWith should work', () => {
    const target = `
		platformBrowserDynamic().bootstrapModule(AppModule)
		  .catch(err => console.log(err));
		`;
    const query = new Selector(target, 'main-hmr.ts');
    console.log('------>>>>----------');
    query.printAll(query.src);
    // const found = query.findAll(query.src,
    //   ':PropertyAccessExpression > .expression:CallExpression > .expression:Identifier');

    // console.log(found);

    const bootCall = query.findMapTo(query.src,
      '^.statements>:CallExpression :PropertyAccessExpression > .expression:CallExpression > .expression:Identifier',
      (ast: ts.Identifier, path, parents) => {
        // console.log('------>>>>----------');
        // console.log(ast.text, (ast.parent.parent as ts.PropertyAccessExpression).name.getText(query.src));
        if (ast.text === 'platformBrowserDynamic' &&
        (ast.parent.parent as ts.PropertyAccessExpression).name.getText(query.src) === 'bootstrapModule' &&
        ast.parent.parent.parent.kind === ts.SyntaxKind.CallExpression) {
          // console.log('here');
          return ast.parent.parent.parent;
        }
      });
    expect(bootCall != null).toBe(true);
  });

});
