// var through = require('through2');
var swig = require('swig-templates');
var Path = require('path');
var fs = require('fs');
var _ = require('lodash');
var defaultOptions = require('./defaultSwigOptions');
// var patchText = require('./patch-text.js');
var api = require('__api');
var log = require('log4js').getLogger(api.packageName);
var swigInjectLoader = require('swig-package-tmpl-loader');

// var parser = require('./template-parser').parser;
var injector;
var transformAdded = false;
var fileHandler = {
	onFile: (file) => {}
};

exports.compile = function() {
	if (transformAdded)
		return;
	transformAdded = true;
	//require('@dr-core/browserify-builder').addTransform(transformFactory);
	injector = require('__injector');
	//var translateHtml = require('@dr/translate-generator/translate-replacer').htmlReplacer();
	_setupSwig();
	return null;
};

exports.activate = function() {
	_setupSwig();
};

function _setupSwig() {
	swigInjectLoader.swigSetup(swig, {
		injector: injector,
		fileContentHandler: function(file, source) {
			fileHandler.onFile(file);
			return source;
			//return translateHtml(source, file, api.getBuildLocale());
		}
	});
}

/** To listern file read, set fileHandler.onFile = function(filePath) {} */
exports.fileHandler = fileHandler;

exports.swig = swig;

// exports.testable = {
// 	preParseTemplate: preParseTemplate
// };

var packageCache = {};

exports.compileTemplate = compileTemplate;
function compileTemplate(swigOptions, str, absFile) {
	var opt = _.assign(_.clone(defaultOptions), {cache: false}, swigOptions);
	swig.setDefaults(opt);
	return swig.render(str, {filename: absFile});
}

exports.runPackage = runPackage;
function runPackage(browserPackage) {
	if (!_.has(packageCache, browserPackage.longName)) {
		try {
			var exports = browserPackage.main ? require(browserPackage.longName) : null;
			packageCache[browserPackage.longName] = exports;
		} catch (err) {
			// MODULE_NOT_FOUND meaning the package has no `main` entry module, skip it
			if (err.code === 'MODULE_NOT_FOUND' && err.message && err.message.indexOf(browserPackage.longName) >= 0)
				return null;
			else
				log.error(err);
			return null;
		}
	}
	return packageCache[browserPackage.longName];
}

var includeTemplCache = {};

exports.renderFile = renderFile;
/**
 * Unlike Swig include tag, this function accept file path as variable
 */
function renderFile(filePath, fromFile, swigOptions, cb) {
	if (filePath.startsWith('npm://')) {
		filePath = swigInjectLoader.resolveTo(filePath, fromFile, injector);
	}
	if (!filePath) {
		log.warn('Empty __renderFile() file path in %s', fromFile);
		return;
	}
	var absPath = Path.resolve(Path.dirname(fromFile), filePath);
	if (cb)
		cb(absPath);
	var str = fs.readFileSync(absPath, 'utf8');
	var absFile = Path.resolve(fromFile);
	var template = includeTemplCache[absFile];
	if (!template)
		template = swig.compile(str, {filename: Path.resolve(fromFile)}, {autoescape: false});
	return template(swigOptions.locals);
}

/**
 * @Deprecated
 * [preParseTemplate description]
 * @param  {string} str            template content
 * @param  {function} replaceHandler function(toReplacePath, templatePath)
 * @return {string}                new template content
 */
// function preParseTemplate(templatePath, str, replaceHandler) {
// 	parser.lexer.options.ranges = true;
// 	var nodes = parser.parse(str);
// 	var textPatches = [];
// 	nodes.forEach(node => {
// 		if (node.name === 'include' || node.name === 'import') {
// 			var value = node.attr.value;
// 			value = (_.startsWith(value, '"') || _.startsWith(value, '\'')) ?
// 				value.substring(1, value.length - 1) : value;
// 			var replaced = replaceHandler(value, templatePath);
// 			if (replaced !== undefined && replaced !== null) {
// 				textPatches.push({
// 					start: node.attr.loc.range[0],
// 					end: node.attr.loc.range[1],
// 					replacement: '"' + replaced + '"'
// 				});
// 				log.debug('line: ', node.loc.lineno, ' replace ', node.name, ' file path ', node.attr.value, ' to ', replaced);
// 			}
// 		}
// 	});
// 	return patchText(str, textPatches);
// }
