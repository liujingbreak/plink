import api from '__api';
/* tslint:disable max-line-length */
import * as _ from 'lodash';
import * as log4js from 'log4js';
import {of, throwError} from 'rxjs';
// import * as Path from 'path';
import {HookReadFunc} from './utils/read-hook-vfshost';
import {AngularCliParam} from './ng/common';
const log = log4js.getLogger(api.packageName);

const apiTmpl = _.template('var __DrApi = require(\'@dr-core/webpack2-builder\'); var __api = __DrApi.getCachedApi(\'<%=packageName%>\') || __DrApi(\'<%=packageName%>\'); __api.default = __api;');
// const includeTsFile = Path.join(__dirname, '..', 'src', 'drcp-include.ts');

export default function createTsReadHook(ngParam: AngularCliParam): HookReadFunc {
	let drcpIncludeBuf: ArrayBuffer;

	return function(file: string, buf: ArrayBuffer) {
		try {
			// log.warn(file);
			if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
				if (/[\\\/]drcp-include\.ts/.test(file)) {
					if (drcpIncludeBuf)
						return of(drcpIncludeBuf);
					let content = Buffer.from(buf).toString();
					let legoConfig = browserLegoConfig();
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
					content += `\n(window as any).LEGO_CONFIG = ${JSON.stringify(legoConfig, null, '  ')};\n`;
					drcpIncludeBuf = string2buffer(content);
					log.info(file + ':\n' + content);
					return of(drcpIncludeBuf);
				}
				let compPkg = api.findPackageByFile(file);
				let content = Buffer.from(buf).toString();

				let changed = api.browserInjector.injectToFile(file, content);
				if (changed !== content) {
					changed = apiTmpl({packageName: compPkg.longName}) + '\n' + changed;
					log.info('Replacing content in ' + file);
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

export function string2buffer(input: string): ArrayBuffer {
	let nodeBuf = Buffer.from(input);
	let len = nodeBuf.byteLength;
	let newBuf = new ArrayBuffer(len);
	let dataView = new DataView(newBuf);
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
