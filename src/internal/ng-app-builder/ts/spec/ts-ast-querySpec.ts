// tslint:disable:no-console
import Selector, {Query/*, AstCharacter*/} from '../utils/ts-ast-query';
import * as fs from 'fs';
import {resolve} from 'path';

describe('ts-ast-query', () => {
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
		let q = new Query('.statements:VariableStatement .namedBindings .elements[0] > :Identifier');
		console.log(q.queryPaths);
		expect(q.queryPaths).toEqual([
			[{ propertyName: 'statements', kind: 'VariableStatement' }],
			[{ propertyName: 'namedBindings' }],
			[{ propertyName: 'elements', propIndex: 0 }, { kind: 'Identifier' }]
		]);
		expect((q as any).matchesConsecutiveNodes(
				[(q as any)._parseDesc('.foobar:Abc'), (q as any)._parseDesc(':Off')], ['.foobar[3]:Abc', '.end:Off'], 1
			)).toBe(true);
		expect((q as any).matchesConsecutiveNodes(
				[(q as any)._parseDesc('.foobar:Abc'), (q as any)._parseDesc(':Off')], ['.foobar[3]:Abc', '.end:Off'], 0
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
		expect(found.getText(sel.src)).toBe('NgModule');
	});

	it('findAll should work', () => {
		const file = resolve(__dirname, '../../ts/spec/app.module.ts.txt');
		const sel = new Selector(fs.readFileSync(file, 'utf8'), file);
		const found = sel.findAll(':ImportDeclaration :Identifier');
		console.log(found.map(ast => ast.getText(sel.src)));
	});

});
