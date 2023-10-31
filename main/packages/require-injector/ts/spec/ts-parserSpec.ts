// tslint:disable:no-console
// import * as ts from 'typescript';
import * as fs from 'fs';
import * as Path from 'path';
import * as vm from 'vm';
// import * as _ from 'lodash';
import {TypescriptParser} from '../parse-ts-import';
import {FactoryMap} from '../factory-map';
import Query from '../ts-ast-query';
const EsReplacer = require('../../lib/replace-require');

describe('TypescriptParser', () => {
	let file = Path.resolve(__dirname, '../../ts/spec/test-ts.txt');
	let source = fs.readFileSync(file, 'utf8');
	let fm = new FactoryMap();
	fm.alias('lodash', 'underscore');
	fm.replaceCode('__api', (file) => {
		if (file.endsWith('.ts'))
			return 'API';
		return 'shit happends';
	});
	fm.alias('asyncModule', '_asyncModule_');
	fm.alias('yyy', '_yyy_');
	var replaced: string | null;

	it('can replace \'import\' and \'require\' statements ', () => {
		replaced = new TypescriptParser(new EsReplacer()).replace(source, fm, 'test.ts').replaced;
		console.log('---------------\n%s\n--------------', replaced);
		expect(/var __imp[0-9]__ = API, api = __imp[0-9]__\["default"\];/.test(replaced!)).toBeTruthy();
		expect(replaced!.indexOf('import * as _ from "underscore";')).toBeGreaterThanOrEqual(0);

		expect(replaced).toMatch(/var a =\s*API;/);
		expect(replaced).toMatch(/import\("_asyncModule_"*\);/);
	});

	it('require.ensure should be replaced', () => {
		expect(/require.ensure\("_yyy_",/.test(replaced!)).toBe(true);
	});

	xit('"export from" should be replaced', () => {
		const query = new Query(source, 'test-ts.txt');
		query.printAll();
	});

	it('replaceCode should work with import * ....', () => {
		let source = 'import * as _ from \'lodash\';';
		let fm = new FactoryMap();
		fm.replaceCode('lodash', '"hellow"');
		replaced = new TypescriptParser(new EsReplacer()).replace(source, fm, 'test.ts').replaced;
		var sandbox: any = {
			module: {
				exports: {}
			}
		};
		vm.runInNewContext(replaced!, vm.createContext(sandbox));
		expect(sandbox._).toBe('hellow');
	});

	it('replaceCode should work with import "foobar"', () => {
		let source = 'import \'lodash\';';
		let fm = new FactoryMap();
		fm.replaceCode('lodash', 'foobar()');
		replaced = new TypescriptParser(new EsReplacer()).replace(source, fm, 'test.ts').replaced;
		expect(replaced).toMatch(/\s*foobar\(\);$/);
	});
});

export default {
	ok: 1
};
