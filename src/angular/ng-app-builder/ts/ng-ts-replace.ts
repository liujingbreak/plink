import api from '__api';
/* tslint:disable max-line-length */
import * as _ from 'lodash';
import * as log4js from 'log4js';
import {of} from 'rxjs';
import * as Path from 'path';
import {HookReadFunc} from './utils/read-hook-vfshost';
const log = log4js.getLogger(api.packageName);

const apiTmpl = _.template('var __DrApi = require(\'@dr-core/webpack2-builder\'); var __api = __DrApi.getCachedApi(\'<%=packageName%>\') || __DrApi(\'<%=packageName%>\'); __api.default = __api;');
const includeTsFile = Path.join(__dirname, '..', 'src', 'drcp-include.ts');
export let readHook: HookReadFunc = virtualHostReadHook;

function virtualHostReadHook(file: string, buf: ArrayBuffer) {
	// log.warn(file);
	if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
		log.warn(file);
		if (file === includeTsFile) {
			browserLegoConfig();
			log.warn('here');
		}

		let compPkg = api.findPackageByFile(file);
		let len = buf.byteLength;
		let content = Buffer.from(buf).toString();

		let changed = api.browserInjector.injectToFile(file, content);
		if (changed !== content) {
			changed = apiTmpl({packageName: compPkg.longName}) + '\n' + changed;
			let nodeBuf = Buffer.from(changed);
			len = nodeBuf.byteLength;
			let newBuf = new ArrayBuffer(len);
			let dataView = new DataView(newBuf);
			for (let i = 0; i < len; i++) {
				dataView.setUint8(i, nodeBuf.readUInt8(i));
			}
			log.info('Replacing content in ' + file);
			return of(newBuf);
		}
	}
	return of(buf);
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
