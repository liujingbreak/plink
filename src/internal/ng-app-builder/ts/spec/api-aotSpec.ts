import ApiAotCompiler from '../utils/ts-before-aot';
import * as fs from 'fs';
import * as Path from 'path';
import log4js = require('log4js');
const log = log4js.getLogger('api-aotSpec');

describe('apiAotCompiler', () => {
	xit('should recoganize identifier __api', () => {
		const compiler = new ApiAotCompiler('test.ts',
			fs.readFileSync(Path.resolve(__dirname, '../../ts/spec/api-aot-sample.ts.txt'), 'utf8'));
		compiler.parse(source => source);
		expect(compiler.replacements.map(({text}) => text)).toEqual([
			'__api.packageName',
			'__api[\'config\']',
			'__api.assetsUrl(\'credit-appl/detail\')',
			'__api.publicPath'
		]);
		log.info(compiler.replacements.map(({text}) => text).join('\n'));
	});
});
