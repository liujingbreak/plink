const api = require('__api');
const log = require('log4js').getLogger('wfh.api-loader');
//const loaderUtils = require('loader-utils');
const esParser = require('./utils/es-parser');
const _ = require('lodash');
//const fs = require('fs');
const Path = require('path');
const pify = require('pify');
var apiTmpl = _.template('var __DrApi = require(\'@dr-core/webpack2-builder\'); var __api = __DrApi.getCachedApi(\'<%=packageName%>\') || __DrApi(\'<%=packageName%>\'); __api.default = __api;');

api.compsHaveCssScope = [];

module.exports = function(content, map, ast) {
	var callback = this.async();
	if (!callback)
		throw new Error('api-loader is Not a sync loader!');
	loadAsync(content, this, ast)
	.then(result => callback(null, result[0], map, result[1]))
	.catch(err => callback(err));
};

function loadAsync(content, loader, ast) {
	try {
		return parse(content, loader, ast);
	} catch (e) {
		log.error(e);
		loader.emitError(e);
		return Promise.reject(e);
	}
}

function parse(source, loader) {
	var astProm;
	var ast;
	var file = loader.resourcePath;
	var currPackage = api.findPackageByFile(file);
	var hasMainStyle = currPackage && file === currPackage.file && currPackage.style;
	var hasApi = hasMainStyle;
	if (currPackage && !currPackage.dr) {
		log.error('Component has no "dr" property: ', currPackage.longName);
	}

	// var astFromCache = false;

	var resolvePromises = [];
	// var ast = _.get(loaderUtils.getOptions(loader), ['astFromCache', file]);
	// if (ast) {
	// 	astFromCache = true;
	// }
	// if (!ast)
	// 	log.warn('No cached AST, parsing ' + file);
	try {
		astProm = esParser.parseAsync(source, {
			splitLoad: splitPoint => {},
			apiIndentity: () => {
				hasApi = true;
				log.debug('reference __api in %s', file);
			},
			requireApi: () => {
				hasApi = true;
				log.debug('require __api in %s', file);
			},
			es6ImportApi: () => {
				hasApi = true;
				log.debug('ES6 import __api in %s', file);
			},
			dependsStyle: (request) => {
				hasApi = true;
				var p = pify(loader.resolve)(Path.dirname(loader.resourcePath), request);
				resolvePromises.push(p);
			}
		});
	} catch (e) {
		log.error('Failed to parse %s', file);
		throw e;
	}
	return astProm.then(result => {
		ast = result;
		if (hasApi) {
			ast.replacements.push({start: 0, end: 0, replacement: apiTmpl({
				packageName: currPackage.longName
			})});
			if (log.isDebugEnabled()) log.debug(file + ' replacements ' + JSON.stringify(ast.replacements));
		}
		return Promise.all(resolvePromises);
	}, err => {
		log.error('Failed to parse %s', file);
		throw err;
	})
	.then(cssfiles => {
		var cssScopeCompSet = new Set();
		if (hasMainStyle) {
			var mainCss = Path.relative(Path.dirname(file), currPackage.style).replace(/\\/g, '/');
			if (!_.startsWith(mainCss, '../'))
				mainCss = './' + mainCss;
			log.debug('add pacelify style entry %s', mainCss);
			ast.replacements.push({start: 0, end: 0, replacement: 'require("' + mainCss + '");'});
			cssScopeCompSet.add(currPackage);
		}
		for (let cssfile of cssfiles) {
			var comp = api.findPackageByFile(cssfile);
			if (comp == null || comp.dr == null || comp.longName === api.packageName /*@dr-core/webpack2-builder*/)
				continue;
			cssScopeCompSet.add(comp);
		}
		var cls = buildCssScopeClassArray(cssScopeCompSet, file);
		if (cls.length > 0)
			ast.replacements.push({start: 0, end: 0,
				replacement: `__DrApi.writeCssClassToHtml(${JSON.stringify(cls)});`});
		// source = `require('@dr-core/webpack2-builder/browser/css-scope').writeCssClassToHtml(${JSON.stringify(cls)});` + source;
		return [source, ast];
	});
}

function buildCssScopeClassArray(componentSet, file) {
	var cls = [];
	for (let comp of componentSet) {
		let cssScope = _.get(comp, 'dr.cssScope');
		if (cssScope === false)
			log.warn(`${comp.longName} has css files, but its "dr.cssScope" is false which will be ignored.`);
		api.compsHaveCssScope.push(comp.longName);
		if (typeof cssScope !== 'string')
			cls.push(comp.shortName.replace('.', '_'));
		else
			cls.push(cssScope);
	}
	return cls;
}

