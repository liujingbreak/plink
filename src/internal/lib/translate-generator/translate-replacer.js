// var Path = require('path');
// var through = require('through2');
// var acorn = require('acorn');
var _ = require('lodash');
// var acornImpInject = require('acorn-dynamic-import/lib/inject').default;
// var acornjsx = require('acorn-jsx/inject')(acorn);
var api = require('__api');
var log = require('log4js').getLogger(api.packageName);
var cheerio = require('cheerio');
var jsParser = require('./jsParser');
var patchText = require('./patch-text');
var bResolve = require('browser-resolve');
var yamljs = require('yamljs');
var fs = require('fs');

//acornjsx = acornImpInject(acornjsx);

exports.replaceJS = replaceJS;
function replaceJS(source, file, locale, skipPackageCache, onLoadRes, ast) {
	return checkSkipPackageAndGetRes(file, locale, skipPackageCache, onLoadRes)
	.then(res => {
		//var ast = acorn.parse(source, {locations: true});
		var replacements = (ast && ast.replacements) ? ast.replacements : [];
		var newAst = jsParser(source, (keyNode, callExpNode) => {
			var replaced;
			if (!res) {
				replaced = keyNode;
				log.warn('missing i18n message file for: "%s" in file %s', keyNode, file);
			} else if (!_.has(res, keyNode)) {
				log.warn('missing i18n message for: "%s" in file %s', keyNode, file);
				replaced = keyNode;
			} else
				replaced = res[keyNode];
			replacements.push({
				start: callExpNode.start,
				end: callExpNode.end,
				replacement: '"' + replaced + '"'
			});
			log.debug('Replace JS i18n message "%s" with:\n%s', keyNode, replaced);
		}, file, ast);
		return [patchText(source, replacements), newAst];
	});
}

exports.htmlReplacer = function(source, file, locale) {
	var skipPackageCache = {};
	return function(source, file, locale) {
		return replaceHtml(source, file, locale, skipPackageCache);
	};
};

exports.replaceHtml = replaceHtml;
function replaceHtml(source, file, locale, skipPackageCache, onLoadRes) {
	return checkSkipPackageAndGetRes(file, locale, skipPackageCache, onLoadRes)
	.then(res => {
		if (!res)
			return source;
		var $ = cheerio.load(source, {decodeEntities: false});
		$('.t').each(onElement);
		$('.dr-translate').each(onElement);
		$('[t]').each(onElement);
		$('[dr-translate]').each(onElement);
		$('[t-a]').each((i, dom) => {
			var el = $(dom);
			replaceAttrs(el, el.attr('t-a').split(/\s+|,/));
		});
		$('[placeholder]').each((i, dom) => {
			var el = $(dom);
			replaceAttrs(el, ['placeholder']);
		});
		$('img[alt]').each((i, dom) => {
			var el = $(dom);
			replaceAttrs(el, ['alt']);
		});

		function replaceAttrs(el, attrNames) {
			for (let attr of attrNames) {
				var attrValue = el.attr(attr);
				if (!attrValue)
					continue;
				var translated = res[attrValue];
				if (translated)
					el.attr(attr, translated);
				else
					log.warn('missing i18n message for: "%s" in %s', el.attr(attr), file);
			}
		}

		function onElement(i, dom) {
			var el = $(dom);
			var key = el.html();
			// if (!_.has(res, key))
			// 	log.debug('missing i18n message for: %s', key);
			var translated = res[key];
			if (translated)
				el.html(translated);
			else
				log.warn('missing i18n message for: "%s" in %s', key, file);
			log.debug('Replace HTML i18n message "%s" with:\n%s', key, res[key]);
		}
		return $.html();
	});
}

// var resourceCache = {};
// exports.cleanCache = function() {
// 	resourceCache = {};
// };

function checkSkipPackageAndGetRes(file, locale, skipPackageCache, onLoadRes) {
	var drPackage = api.findPackageByFile(file);
	if (!drPackage || skipPackageCache && _.has(skipPackageCache, drPackage.longName)) {
		//log.debug('skip file: %s', file);
		return Promise.resolve(false);
	} else if (!drPackage.translatable) {
		log.debug('skip non-translatable package file: %s', file);
		skipPackageCache[drPackage.longName] = 1;
		return Promise.resolve(false);
	}
	var solved;
	var resName = drPackage.longName + '/i18n/message-' + locale + '.yaml';
	try {
		solved = bResolve.sync(resName, {paths: api.compileNodePath});
	} catch (e) {
		solved = false;
	}
	if (solved) {
		// if (_.has(resourceCache, 'solved'))
		// 	return resourceCache[solved];
		if (onLoadRes)
			return onLoadRes(resName);
		else
			return Promise.resolve(yamljs.parse(fs.readFileSync(solved, 'utf8')));
		//resourceCache[solved] = res;
		//return res;
	}
	return Promise.resolve(false);
}
