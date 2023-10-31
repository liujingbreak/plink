// tslint:disable max-line-length
import {ParseInfo, ParseExportInfo} from './parse-esnext-import';
import * as _ from 'lodash';
var Path = require('path');
import {toAssignment} from './parse-esnext-import';

export interface Config {
	[key: string]: any;
	enableFactoryParamFile?: boolean | undefined;
}
export interface FactorySetting {
	method: keyof ReplaceActions;
	prefix: string;
	value?: FactoryFunc | any;
	execResult?: RegExpExecArray;
	subPath?: string;
	replacement?: (file: string, execResult: RegExpExecArray) => any | string;
}

export interface ReplaceTypeValue {
	replacement: string;
	value: any | FactoryFunc;
}
/** // TODO */
export enum ReplaceType {
	rq= 0, // require()
	ima, // import()
	imp, // import expression
	rs // require.ensure()
}

export interface RegexSetting extends FactorySetting {
	regex: RegExp;
}

// export type FactorySetting = FactorySettingObj;

export interface ReplacedResult {replaceAll: boolean; code: string;}
interface ReplaceActions {
	[method: string]: (this: FactoryMap, replaceWith: FactoryFunc | any, type: ReplaceType, fileParam: string, execResult: RegExpExecArray,
		astInfo: ParseInfo, prefix?: any, subPath?: string) => null | string | ReplacedResult;
}

interface InjectActions {
	[method: string]: InjectActionFunc;
}
type InjectActionFunc = (this: FactoryMap, value: FactoryFunc | any,
	calleeModuleId: string,
	calleeModule: any,
	requireCall: (m: any, file: string) => FactorySetting,
	subPath?: string) => FactorySetting;

export type FactoryFunc = (sourceFilePath: string, regexpExecResult?: RegExpExecArray) => any;

export class FactoryMap implements FactoryMapInterf {
	config: Config;
	requireMap: {[k: string]: FactorySetting} = {};
	beginWithSearch: any[] = []; // Binary search
	regexSettings: RegexSetting[] = [];
	beginWithSorted: boolean = false;
	private resolvePaths: string[] | null = null;
	// static METHODS: string[] = ['factory', 'substitute', 'value', 'swigTemplateDir', 'replaceCode', 'variable'];

	constructor(config?: Config) {
		if (config === undefined)
			this.config = {};
		else
			this.config = config;
	}

	factory(requiredModule: string | RegExp, factoryFunc: FactoryFunc): FactoryMapInterf {
		return this._addSetting('factory', requiredModule, factoryFunc);
	}

	substitute(requiredModule: string | RegExp, newModule: string| FactoryFunc): FactoryMapInterf {
		return this._addSetting('substitute', requiredModule, newModule);
	}
	value(requiredModule: string | RegExp, newModule: {replacement: any}| FactoryFunc | any): FactoryMapInterf {
		return this._addSetting('value', requiredModule, newModule);
	}

	swigTemplateDir(requiredModule: string, dir: string): FactoryMapInterf {
		return this._addSetting('swigTemplateDir', requiredModule, dir);
	}

	replaceCode(requiredModule: string | RegExp, newModule: string| FactoryFunc): FactoryMapInterf {
		return this._addSetting('replaceCode', requiredModule, newModule);
	}

	alias(requiredModule: string | RegExp, newModule: string| FactoryFunc): FactoryMapInterf {
		return this._addSetting('substitute', requiredModule, newModule);
	}
	// asInterface() {
	// 	return ((this as any) as FactoryMapInterf & FactoryMap);
	// }

	getInjector(name: string): FactorySetting | null {
		return this.matchRequire(name);
	}
	// you can extend with new method here

	matchRequire(name: string): FactorySetting | null {
		if (!name)
			return null;
		var webpackLoaderPrefix = '';
		var webpackLoaderIdx = name.lastIndexOf('!');
		if (webpackLoaderIdx >= 0) {
			webpackLoaderPrefix = name.substring(0, webpackLoaderIdx + 1);
			name = name.substring(webpackLoaderIdx + 1);
		}

		let setting: FactorySetting;
		if (_.has(this.requireMap, name)) {
			setting = _.extend({}, this.requireMap[name]);
			setting.prefix = webpackLoaderPrefix;
			return setting;
		} else {
			const isPackage = !_.startsWith(name, '.') && !Path.isAbsolute(name);
			if (isPackage && (_.startsWith(name, '@') || name.indexOf('/') > 0)) {
				var m = /^((?:@[^\/]+\/)?[^\/]+)(\/.+?)?$/.exec(name);
				if (m && _.has(this.requireMap, m[1])) {
					setting = _.extend({}, this.requireMap[m[1]]);
					setting.subPath = m[2];
					setting.prefix = webpackLoaderPrefix;
					return setting;
				}
			}
			let foundReg =  _.find(this.regexSettings, s => {
				s.execResult = s.regex.exec(name) || undefined;
				return s.execResult != null;
			});
			if (foundReg) {
				foundReg = _.extend({}, foundReg);
				foundReg.prefix = webpackLoaderPrefix;
				return foundReg;
			}
			return null;
		}
	}

	/**
	 *
	 * @param  {any} factorySetting matchRequire() returned value
	 * @param  {ReplaceType} type       "rq" for "require()", "rs" for "require.ensure"
	 * @param  {string} fileParam  current replacing file path
	 * @return {string}            replacement text
	 */
	getReplacement(factorySetting: FactorySetting, type: ReplaceType, fileParam: string, info?: ParseInfo | ParseExportInfo): string | ReplacedResult | null {
		if (!factorySetting)
			throw new Error('This is require-injector\' fault, error due to null factorySetting, tell author about it.');
		return replaceActions[factorySetting.method].call(this,
			factorySetting.value, type, fileParam, factorySetting.execResult,
			info, factorySetting.prefix, factorySetting.subPath);
	}

	getInjected(factorySetting: FactorySetting, calleeModuleId: string, calleeModule: any,
		requireCall: (m: any, file: string) => FactorySetting): any {
		if (!factorySetting)
			throw new Error('This is require-injector\'s fault, error due to null factorySetting, tell author about it.');
		return injectActions[factorySetting.method].call(this, factorySetting.value,
			calleeModuleId, calleeModule, requireCall, factorySetting.subPath);
	}

	addResolvePath(dir: string) {
		if (this.resolvePaths == null)
			this.resolvePaths = [];
		this.resolvePaths.push(dir);
		return this;
	}

	_addSetting(this: FactoryMap, method: string, name: string | RegExp, value: FactoryFunc | any) {
		if (_.isRegExp(name)) {
			this.regexSettings.push( {
				regex: name,
				method,
				value,
				subPath: '',
				prefix: ''
			});
		} else {
			this.requireMap[name] = {
				method,
				value,
				subPath: '',
				prefix: ''
			};
		}
		return this;
	}
}

let replaceActions: ReplaceActions = {
	factory(this: FactoryMap, value: FactoryFunc, type: ReplaceType, fileParam: string, execResult: RegExpExecArray,
		astInfo: ParseInfo, prefix?: any, subPath?: string): string | ReplacedResult | null {
		const sourcePath = JSON.stringify(this.config.enableFactoryParamFile ? fileParam : '');
		const execFactory = '(' + value.toString() + ')(' + sourcePath +
				(execResult ? ',' + JSON.stringify(execResult) : '') + ')';

		if (type === ReplaceType.rq || type === ReplaceType.ima) { // for require() or import()
			return execFactory;
		} else if (type === ReplaceType.imp) {
			return {
				replaceAll: true,
				code: toAssignment(astInfo, execFactory)
			};
		}
		return null;
	},

	substitute(this: FactoryMap, setting: FactoryFunc | string, type: ReplaceType, fileParam: string, execResult: RegExpExecArray,
		astInfo: ParseInfo, prefix?: any, subPath?: string): string | ReplacedResult | null {
		if (type === ReplaceType.rs) { // for require.ensure
			if (_.isFunction(setting))
				return JSON.stringify(setting(fileParam, execResult) + subPath);
			return JSON.stringify(setting + subPath);
		} else if (type === ReplaceType.rq) {
			if (_.isFunction(setting))
				return 'require(' + JSON.stringify(prefix + setting(fileParam, execResult)) + subPath + ')';
			return 'require(' + JSON.stringify(prefix + setting + subPath) + ')';
		} else if (type === ReplaceType.ima) {
			if (_.isFunction(setting))
				return 'import(' + JSON.stringify(prefix + setting(fileParam, execResult)) + subPath + ')';
			return 'import(' + JSON.stringify(prefix + setting) + subPath + ')';
		} else if (type === ReplaceType.imp) {
			var replaced = _.isFunction(setting) ? setting(fileParam, execResult) : setting;
			replaced = JSON.stringify(prefix + replaced + subPath);
			return {
				replaceAll: false,
				code: replaced
			};
		}
		return null;
	},

	value(this: FactoryMap, setting: FactoryFunc | {replacement: FactoryFunc | string}, type: ReplaceType, fileParam: string, execResult: RegExpExecArray,
		astInfo: ParseInfo, prefix?: any, subPath?: string): ReplacedResult | string | null {
		if (type === ReplaceType.rq || type === ReplaceType.imp || type === ReplaceType.ima) {
			var replaced;
			if (_.has(setting, 'replacement')) {
				const setting1 = setting as {replacement: FactoryFunc};
				replaced = (_.isFunction(setting1.replacement)) ?
					(setting1.replacement as FactoryFunc)(fileParam, execResult) :
					setting1.replacement as any;
			} else {
				replaced = _.isFunction(setting) ? JSON.stringify(setting(fileParam, execResult)) :
					JSON.stringify(setting);
			}
			return type === ReplaceType.imp ? {
					replaceAll: true,
					code: toAssignment(astInfo, replaced)
				} : replaced;
		}
		return null;
	},

	replaceCode(setting: FactoryFunc | string, type: ReplaceType, fileParam: string, execResult: RegExpExecArray,
		astInfo: ParseInfo, prefix?: any, subPath?: string): ReplacedResult | string {
		var replaced = setting as string;
		if (_.isFunction(setting))
			replaced = setting(fileParam, execResult);
		return type === ReplaceType.imp ? {
			replaceAll: true,
			code: toAssignment(astInfo, replaced)
		} : replaced;
	},

	variable(setting: string, type: ReplaceType, fileParam: string, execResult: RegExpExecArray,
		astInfo: ParseInfo) {
		if (type === ReplaceType.rq || type === ReplaceType.ima) {
			return setting as string;
		}
		if (type === ReplaceType.imp)
			return {
				replaceAll: true,
				code: toAssignment(astInfo, setting as string)
			};
		return null;
	}

	// resolvePath(dir: FactorySetting, type: string, fileParam: string, execResult: RegExpExecArray,
	// 	astInfo: ParseInfo): string {
	// 	return dir as string;
	// }
};

export interface FactoryMapInterf {
	/**
	 * Replacing a required module with a function returned value. Not working for `require.ensure()`
	 * @param requiredModule the original module name which is required for, it can't be a relative file path.
	 * @param factoryFunc A function invoked with 1 argument: `sourceFilePath` and returns a value which then will replace the original module of `requiredModule`.
	 * 
	 * **Note**: In browser side replacement mode, it replaces entire `require('requiredModule')` expression in source code with Immediately-Invoked Function Expression (IIFE) of the factory function`.toString()`:
		```js
// require('requiredModule'); ->
'(' + factory.toString() + ')(sourceFilePath, regexpExecResult)';
```
		> In replacement mode, parameter `sourceFilePath` will be null by default, since this would expose
		original source file path of your file system, if you still want to obtain `sourceFilePath`, set option `.enableFactoryParamFile`
		to `true`

		The factory eventually stands in source code, not NodeJS runtime.
		Thus you can not have any reference to any closure variable in factory function.
	 */
	factory(requiredModule: string | RegExp, factoryFunc: FactoryFunc): FactoryMapInterf;
	/**
	 * Or
		`alias(requiredModule, newModule)`

		Replacing a required module with requiring another module.
		> Also support `npm://package` reference in Swig template tags `include` and `import`,
		check this out [swig-package-tmpl-loader injection](https://www.npmjs.com/package/swig-package-tmpl-loader#injection)

		> It works very like **Webpack**'s `resolve.alias`,
		it also matches module name which is consist of node package name and specific path

		e.g.
		When injector is configured as
		```js
		rj.fromDir('.').alias('moduleA', 'moduleB');
		```
		Then the file contains `require('moduleA/foo/bar.js')` will be replaced with `require('moduleB/foo/bar.js')`
	 * @param requiredModule the original module name which is required for, it can't be relative file path, only supports absolute path, a package name or Regular Expression.
	> Package name like `lodash/throttle` also works, as long as it can be resolved to same absolute path all the time.
	 * @param newModule the new module name that is replaced with.
	 * If `newModule` is a function, it will be passed in 2 parameters: `sourceFilePath` and `regexpExecResult`, and must return string value of replaced module name.
	*/
	substitute(requiredModule: string | RegExp, newModule: string| FactoryFunc): FactoryMapInterf;
	/**
	 * Replacing a required module with any object or primitive value.
		> Not work for `require.ensure()`
	 * @param requiredModule the original module name which is required for, it can't be a relative file path.
	 * @param newModule the value to replace `requiredModule` exports.
	 * 
	 * When `.injectToFile()` is called or `.transform` is used for Browserify, meaning it is not a Node environment, the solution is actually replacing entire `require('requiredModule')`‘’ expression with result of `JSON.stringify(value)`.
		Sometimes, the value is variable reference,
		you wouldn't want `JSON.stringify` for it, you can use an object expression:
		- `{string}` `value.replacement`: The replaced string literal as variable expression, same as what `.replaceCode()` does.
		- `{object}` `value.value`: Node require injection value
		```js
		rj.fromDir('dir1')
		.value('replaceMe', {
			replacement: 'window.jQuery', // for Browserify transform
			value: cheerio   // for Node require() injection
		})
		```
		If `value` is a function, it will be passed in 2 parameters: `sourceFilePath` and `regexpExecResult`, and must return some value.
	*/
	value(requiredModule: string | RegExp, newModule: ReplaceTypeValue | FactoryFunc | any): FactoryMapInterf;
	/**
	 * Replace `npm://package` reference in Swig template tags `include` and `import`,
check this out [swig-package-tmpl-loader injection](https://www.npmjs.com/package/swig-package-tmpl-loader#injection)
	 * @param requiredModule 
	 * @param dir 
	 */
	swigTemplateDir(requiredModule: string, dir: string): FactoryMapInterf;
	/**
	 * Arbitrary JS code replacement
	> Only work in replacement mode, not NodeJs side

	```js
	var rjReplace = rj({noNode: true});
	rjReplace.fromPackage([packageA...])
		.replaceCode('foobar', JSON.stringify({foo: 'bar'}));
	```
	In which "`var foobar = require('foobar');"` is replaced with:
	```js
	var  foobar = {"foo": "bar"};
	```
	 * @param requiredModule 
	 * @param newModule 
	 */
	replaceCode(requiredModule: string | RegExp, newModule: string| FactoryFunc): FactoryMapInterf;
	/**
	 * Same as substitute()
	 * @param requiredModule 
	 * @param newModule 
	 */
	alias(requiredModule: string | RegExp, newModule: string| FactoryFunc): FactoryMapInterf;
}

let injectActions: InjectActions = {
	factory(setting: FactorySetting,
		calleeModuleId: string,
		calleeModule?: any,
		requireCall?: (m: any, file: string) => FactorySetting,
		subPath?: string) {
		if (_.isFunction(setting)) {
			return setting(calleeModuleId);
		} else {
			return setting;
		}
	},

	value(setting: FactorySetting,
		calleeModuleId: string,
		calleeModule: any,
		requireCall: (m: any, file: string) => FactorySetting,
		subPath?: string) {
		if (_.has(setting, 'value'))
			return setting.value;
		else
			return setting;
	},

	replaceCode(setting: FactorySetting,
		calleeModuleId: string,
		calleeModule: any,
		requireCall: (m: any, file: string) => FactorySetting,
		subPath?: string): any {
		// tslint:disable-next-line:no-console
		console.log('require-injector does not support "replaceCode()" for NodeJS environment');
	},

	substitute(setting: any, calleeModuleId: string, calleeModule: any,
		requireCall: (m: any, file: string) => FactorySetting, subPath?: string) {
		return requireCall.call(calleeModule, setting + subPath);
	},

	variable(setting: FactorySetting,
		calleeModuleId: string,
		calleeModule?: any,
		requireCall?: (m: any, file: string) => FactorySetting,
		subPath?: string) {
		return setting;
	}
};

export class FactoryMapCollection implements FactoryMapInterf {
	maps: FactoryMapInterf[];
	constructor(maps: FactoryMapInterf[]) {
		this.maps = maps;
	}
	factory(requiredModule: string | RegExp, factoryFunc: FactoryFunc): FactoryMapInterf {
		return this._addSetting('factory', requiredModule, factoryFunc);
	}

	substitute(requiredModule: string | RegExp, newModule: string| FactoryFunc): FactoryMapInterf {
		return this._addSetting('substitute', requiredModule, newModule);
	}
	value(requiredModule: string | RegExp, newModule: any| FactoryFunc): FactoryMapInterf {
		return this._addSetting('value', requiredModule, newModule);
	}

	swigTemplateDir(requiredModule: string, dir: string): FactoryMapInterf {
		return this._addSetting('swigTemplateDir', requiredModule, dir);
	}

	replaceCode(requiredModule: string | RegExp, newModule: string| FactoryFunc): FactoryMapInterf {
		return this._addSetting('replaceCode', requiredModule, newModule);
	}

	alias(requiredModule: string | RegExp, newModule: string| FactoryFunc): FactoryMapInterf {
		return this._addSetting('substitute', requiredModule, newModule);
	}
	protected _addSetting(this: FactoryMapCollection, method: string, requiredModule: string | RegExp, newModule: string| FactoryFunc): FactoryMapInterf {
		for (const factoryMap of this.maps) {
			(factoryMap as FactoryMap)._addSetting(method, requiredModule, newModule);
		}
		return this;
	}
}

