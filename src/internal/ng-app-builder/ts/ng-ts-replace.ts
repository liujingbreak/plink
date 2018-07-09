/* tslint:disable max-line-length */
import api from '__api';
import * as _ from 'lodash';
import * as log4js from 'log4js';
import {of, throwError} from 'rxjs';
import {HookReadFunc} from './utils/read-hook-vfshost';
import {AngularCliParam} from './ng/common';
import ApiAotCompiler from './utils/ts-before-aot';
import {transpileModule} from 'typescript';
import {readFileSync} from 'fs';
import * as ts from 'typescript';

const log = log4js.getLogger(api.packageName);

const apiTmpl = _.template('var __DrApi = require(\'@dr-core/webpack2-builder/browser/api\');\
var __api = __DrApi.getCachedApi(\'<%=packageName%>\') || __DrApi(\'<%=packageName%>\');\
 __api.default = __api;');
// const includeTsFile = Path.join(__dirname, '..', 'src', 'drcp-include.ts');

export default function createTsReadHook(ngParam: AngularCliParam): HookReadFunc {
	let drcpIncludeBuf: ArrayBuffer;

	let tsconfigFile = ngParam.browserOptions.tsConfig;
	let tsCompilerOptions = readTsConfig(tsconfigFile);

	return function(file: string, buf: ArrayBuffer) {
		try {
			if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
				if (/[\\\/]drcp-include\.ts/.test(file)) {
					if (drcpIncludeBuf)
						return of(drcpIncludeBuf);
					let content = Buffer.from(buf).toString();
					const legoConfig = browserLegoConfig();
					let body: string;
					if (_.get(ngParam, 'builderConfig.options.hmr')) {
						content = `import 'webpack-hot-middleware/client';
						// Used for reflect-metadata in JIT. If you use AOT (and only Angular decorators), you can remove.
						import hmrBootstrap from './hmr';
						`.replace(/^[ \t]+/gm, '') + content;

						body = 'hmrBootstrap(module, bootstrap);';
					} else {
						body = 'bootstrap();';
					}
					if (!ngParam.browserOptions.aot) {
						content = 'import \'core-js/es7/reflect\';\n' + content;
					}
					content = content.replace(/\/\/ handleBootStrap placeholder/, body);
					if (ngParam.ssr) {
						content += '\nconsole.log("set global.LEGO_CONFIG");';
						content += '\nObject.assign(global, {\
							__drcpEntryPage: null, \
							__drcpEntryPackage: null\
						});\n';
						content += '(global as any)';
					} else {
						content += '\nObject.assign(window, {\
							__drcpEntryPage: null, \
							__drcpEntryPackage: null\
						});\n';
						content += '\n(window as any)';
					}
					content += `.LEGO_CONFIG = ${JSON.stringify(legoConfig, null, '  ')};\n`;
					drcpIncludeBuf = string2buffer(content);
					log.info(file + ':\n' + content);
					return of(drcpIncludeBuf);
				}
				const compPkg = api.findPackageByFile(file);

				const content = Buffer.from(buf).toString();
				let changed = api.browserInjector.injectToFile(file, content);

				changed = new ApiAotCompiler(file, changed).parse(source => transpileSingleTs(source, tsCompilerOptions));
				if (changed !== content) {
					changed = apiTmpl({packageName: compPkg.longName}) + '\n' + changed;
					if (ngParam.ssr)
						changed = 'import "@dr-core/ng-app-builder/src/drcp-include";\n' + changed;
					return of(string2buffer(changed));
				}
			}
			return of(buf);
		} catch (ex) {
			log.error(ex);
			return throwError(ex);
		}
	};
}

function readTsConfig(tsconfigFile: string): ts.CompilerOptions {
	let tsconfig = ts.readConfigFile(tsconfigFile, (file) => readFileSync(file, 'utf-8')).config;
	return ts.parseJsonConfigFileContent(tsconfig, ts.sys, process.cwd().replace(/\\/g, '/'), undefined, tsconfigFile).options;
}
/**
 * Refer to https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API#transpiling-a-single-file
 * @param tsCode 
 */
function transpileSingleTs(tsCode: string, compilerOptions: ts.CompilerOptions): string {
	let res = transpileModule(tsCode, {compilerOptions});
	if (res.diagnostics && res.diagnostics.length > 0) {
		let msg = `Failed to transpile TS expression: ${tsCode}\n` + res.diagnostics.join('\n');
		log.error(msg);
		throw new Error(msg);
	}
	return res.outputText;
}

export function string2buffer(input: string): ArrayBuffer {
	const nodeBuf = Buffer.from(input);
	const len = nodeBuf.byteLength;
	const newBuf = new ArrayBuffer(len);
	const dataView = new DataView(newBuf);
	for (let i = 0; i < len; i++) {
		dataView.setUint8(i, nodeBuf.readUInt8(i));
	}
	return newBuf;
}

function browserLegoConfig() {
	var browserPropSet: any = {};
	var legoConfig: any = {}; // legoConfig is global configuration properties which apply to all entries and modules
	_.each([
		'staticAssetsURL', 'serverURL', 'packageContextPathMapping',
		'locales', 'devMode', 'outputPathMap'
	], prop => browserPropSet[prop] = 1);
	_.each(api.config().browserSideConfigProp, prop => browserPropSet[prop] = true);
	_.forOwn(browserPropSet, (nothing, propPath) => _.set(legoConfig, propPath, _.get(api.config(), propPath)));
	var compressedInfo = compressOutputPathMap(legoConfig.outputPathMap);
	legoConfig.outputPathMap = compressedInfo.diffMap;
	legoConfig._outputAsNames = compressedInfo.sames;
	legoConfig.buildLocale = api.getBuildLocale();
	log.debug('DefinePlugin LEGO_CONFIG: ', legoConfig);
	return legoConfig;
}

function compressOutputPathMap(pathMap: any) {
	var newMap: any = {};
	var sameAsNames: string[] = [];
	_.each(pathMap, (value, key) => {
		var parsed = api.packageUtils.parseName(key);
		if (parsed.name !== value) {
			newMap[key] = value;
		} else {
			sameAsNames.push(key);
		}
	});
	return {
		sames: sameAsNames,
		diffMap: newMap
	};
}
