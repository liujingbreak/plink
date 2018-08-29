/* tslint:disable no-console */
import ApiAotCompiler from '../utils/ts-before-aot';
import * as fs from 'fs';
import * as Path from 'path';
import log4js = require('log4js');
const log = log4js.getLogger('api-aotSpec');
import api from '__api';

describe('apiAotCompiler', () => {
	it('should recoganize identifier __api', () => {
		Object.assign(Object.getPrototypeOf(api), {
			findPackageByFile(file: string) {
				return {longName: 'test'};
			},
			getNodeApiForPackage(pk: {longName: string}) {
				return {
					packageName: 'PACKAGE_NAME',
					config: () => {
						return {PACKAGE_NAME: 'CONFIG'};
					},
					assetsUrl() {
						return 'ASSETS';
					},
					publicPath: 'PUBLIC_PATH'
				};
			}
		});
		const compiler = new ApiAotCompiler('test.ts',
			fs.readFileSync(Path.resolve(__dirname, '../../ts/spec/api-aot-sample.ts.txt'), 'utf8'));
		log.info(compiler.parse(source => {
			console.log(source);
			return source;
		}));
		log.info(compiler.replacements.map(({text}) => text).join('\n'));
		expect(compiler.replacements.map(({text}) => text)).toEqual([
			'"PACKAGE_NAME"',
			'"ASSETS"',
			'"ASSETS"',
			'"CONFIG"',
			'"PUBLIC_PATH"'
		]);
	});
});
