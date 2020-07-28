/* eslint-disable valid-jsdoc */
/* eslint max-lines: 1 */
var api = require('__api');
var fs = require('fs-extra');
var Path = require('path');
var _ = require('lodash');
var glob = require('glob');
var log = require('log4js').getLogger('wfh.' + Path.basename(__filename));
var noParseHelper = require('./noParseHelper');
var pify = require('pify');
//var chalk = require('chalk');
const http = require('http');
const DependencyHelper = require('../lib/utils/module-dep-helper');

var writeFileAsync = pify(fs.writeFile.bind(fs));
//const HtmlWebpackPlugin = require('html-webpack-plugin');
const TEMP_DIR = 'webpack-temp';
const useSymlinks = true;

exports.chunk4package = chunk4package;
exports.TEMP_DIR = TEMP_DIR;
// More customized plugins
exports.createParams = function(contextPath) {
	var noParse = api.config().browserifyNoParse ?
		api.config().browserifyNoParse.map(line => {
			var packagePath = api.packageUtils.findBrowserPackagePath(line);
			log.debug('noParse package: %s', packagePath + '/**/*');
			var regStr = noParseHelper.glob2regexp(packagePath + '/**/*');
			log.info('no parse: ', regStr);
			return new RegExp(noParseHelper.glob2regexp(packagePath + '/**/*'));
		}) : [];

	var bundleEntryCompsMap = {}; // {chunkName: string, component[]}
	var entryChunkHtmls = {}; // entryPage
	var entryChunkViews = {}; // entryView
	var entryViewSet = {};
	var browserPropSet = {};
	var file2EntryChunk = {};
	var webpackConfigEntry = {};
	var entryComponents = [];

	_eachComponent(
		function onComp(component) {
			noparse4Package(component, noParse);
			var browserSideConfigProp = _.get(component, ['dr', 'browserSideConfigProp']);
			if (browserSideConfigProp != null && !Array.isArray(browserSideConfigProp)) {
				browserSideConfigProp = [browserSideConfigProp];
			}
			if (browserSideConfigProp)
				log.debug('Found "dr.browserSideConfigProp" in %s, %s', component.longName, browserSideConfigProp);
			_.each(browserSideConfigProp, prop => browserPropSet[prop] = true);
		},
		function onEntryComp(entryComp) {
			if (entryComp.dr.angularCompiler && !api.argv.ng)
				return;
			entryComponents.push(entryComp);
			var bundle = chunk4package(entryComp);
			if (_.has(bundleEntryCompsMap, bundle))
				bundleEntryCompsMap[bundle].push(entryComp);
			else
				bundleEntryCompsMap[bundle] = [entryComp];

			if (!_.has(entryChunkHtmls, bundle))
				entryChunkHtmls[bundle] = [];
			_eachEntryPageForComp(entryComp.entryPages, entryComp, (packagePath, pageAbsPath, pathRelPath) => {
				entryChunkHtmls[bundle].push(pageAbsPath);
			});

			if (!_.has(entryChunkViews, bundle))
				entryChunkViews[bundle] = [];
			_eachEntryPageForComp(entryComp.entryViews, entryComp, (packagePath, pageAbsPath, pathRelPath) => {
				entryViewSet[Path.relative(contextPath || process.cwd(), pageAbsPath)] = 1; // TODO: windows
				//entryChunkHtmlAndView[bundle].push(pageAbsPath);
				entryChunkViews[bundle].push(pageAbsPath);
			});
		});

	var legoConfig = {}; // legoConfig is global configuration properties which apply to all entries and modules
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

	// write webpackConfig.entry
	if (api.argv.dll) {
		webpackConfigEntry[api.argv.dll] = [];
		entryComponents = [];
		setupDllEntries(webpackConfigEntry[api.argv.dll], entryComponents);
	} else
		_.each(bundleEntryCompsMap, (moduleInfos, bundle) => {
			let file = Path.resolve(api.config().destDir, TEMP_DIR, 'entry_' + bundle + '.js');
			webpackConfigEntry[bundle] = file;
			file2EntryChunk[file] = bundle;
		});

	var autoImportFile2Chunk = require('../lib/utils/auto-import.js');
	return {
		params: [webpackConfigEntry, new noParseHelper.NoParseChecker(noParse), _.assign(autoImportFile2Chunk, file2EntryChunk), legoConfig, chunk4package,
			sendlivereload, createEntryHtmlOutputPathPlugin(entryViewSet),
			function() {
				return entryHtmlCssScopePlugin.call(this, new DependencyHelper(entryComponents));
			}],

		writeEntryFileAsync(moduleRules) {
			if (api.argv.dll)
				return Promise.resolve(null);
			fs.mkdirsSync(Path.resolve(api.config().destDir, TEMP_DIR));
			var allWritten = _.map(bundleEntryCompsMap, (moduleInfos, bundle) => {
				return writeEntryFileForBundle(bundle, moduleInfos, entryChunkHtmls[bundle], entryChunkViews[bundle], moduleRules);
			});
			return Promise.all(allWritten).then(() => {
				return log.info('Webpack entry: %s', JSON.stringify(webpackConfigEntry, null, '  '));
			});
		}
	};
};

var entryJsTemplate = api.argv.dll ? _.template(fs.readFileSync(
	Path.join(__dirname, 'dll-entry.js.tmpl'), 'utf8')) :
	_.template(fs.readFileSync(Path.join(__dirname, 'entry.js.tmpl'), 'utf8'));

var excludeEntryPageLoaders = {
	'html-loader': 1
};
var excludeEntryViewLoaders = {
	'html-loader': 1,
	'@dr/template-builder': 1,
	'@dr/translate-generator': 1
};
/**
 * @param {*} bundle
 * @param {*} packages
 * @param {*} htmlFiles string[]
 */
function writeEntryFileForBundle(bundle, packages, htmlFiles, viewFiles, rules) {
	var file = Path.resolve(api.config().destDir, TEMP_DIR, (api.argv.dll ? 'dll-' : 'entry_') + bundle + '.js');
	var htmlLoaderStr4Type = {};
	var requireHtmlNames = htmlFiles.map(eachHtmlName(excludeEntryPageLoaders));
	var requireViewNames = viewFiles.map(eachHtmlName(excludeEntryViewLoaders));

	function eachHtmlName(excludeLoades) {
		return function(htmlFile) {
			var ext = Path.extname(htmlFile);
			var htmlLoaderStr = htmlLoaderStr4Type[ext];
			if (!htmlLoaderStr) {
				var htmlRule = _.find(rules, rule => (rule.test instanceof RegExp) && rule.test.toString() === '/\\' + ext + '$/');
				htmlLoaderStr = '!lib/entry-html-loader';
				_.each(htmlRule.use, loader => {
					if (_.isString(loader) && _.has(excludeLoades, loader) || _.has(excludeLoades, loader.loader))
						return;
					htmlLoaderStr += '!' + (loader.loader ? loader.loader : loader);
				});
				htmlLoaderStr4Type[ext] = htmlLoaderStr;
			}

			var requireHtmlName = Path.relative(Path.dirname(file), htmlFile).replace(/\\/g, '/');
			if (!(requireHtmlName.startsWith('..') || Path.isAbsolute(requireHtmlName)))
				requireHtmlName = './' + requireHtmlName;
			return htmlLoaderStr + '!' + requireHtmlName;
		};
	}
	return writeFileAsync(file, entryJsTemplate({
		packages,
		requireHtmlNames,
		requireViewNames,
		lrEnabled: api.config.get('devMode') && !api.argv.hmr,
		hmrEnabled: api.argv.hmr,
		lrPort: api.config.get('livereload.port')
	}))
	.then(() => file);
}

function setupDllEntries(webpackConfigEntries, entryComponents) {
	var testScopes = ['', ...api.config().packageScopes];
	var packageNamePat = /^(?:@[^\/]+\/)?[^\/]+$/;
	return api.argv.package.map(name => {
		if (packageNamePat.test(name)) {
			let foundScope = false;
			for (let scope of testScopes) {
				if (scope.length > 0)
					scope = '@' + scope + '/';
				try {
					require.resolve(scope + name + '/package.json');
					name = scope + name;
					foundScope = true;
					break;
				} catch (e) {}
			}
			if (!foundScope)
				throw new Error(`Package ${name} is not found in Node path`);
			entryComponents.push({
				longName: name,
				bundle: api.argv.dll,
				file: api.packageInfo.moduleMap[name].file
			});
		} else {
			entryComponents.push({
				longName: name,
				bundle: api.argv.dll,
				file: require.resolve(name)
			});
		}
		webpackConfigEntries.push(name);
	});
}

function _eachComponent(onComponent, onEntryComponent) {
	let includes;
	let excludes = api.argv.x;
	if (api.argv.package && api.argv.package.length > 0)
		includes = api.argv.package;
	_.each(api.packageInfo.allModules, function(component) {
		onComponent(component);
		if ((component.entryPages || component.entryViews) && component.browser/* && component.compiler === 'webpack'*/) {
			if (includes) {
				if (!_.includes(includes, component.parsedName.name) && !_.includes(includes, component.longName))
					return;
			}
			if (excludes != null) {
				if (_.includes(excludes, component.parsedName.name) || _.includes(excludes, component.longName))
					return;
			}
			if (!chunk4package(component)) {
				log.warn('No chunk configured for entry component %s', component.longName);
			}
			onEntryComponent(component);
		}
	});
}

exports.createEntryHtmlOutputPathPlugin = createEntryHtmlOutputPathPlugin;
/**
 * Change output path for each package's entry page or entry view (server render template)
 */
function createEntryHtmlOutputPathPlugin(entryViewSet) {
	return function() {
		var compiler = this;
		compiler.plugin('compilation', function(compilation) {
			compilation.plugin('multi-entry-html-emit-assets', function(htmlAssets, callback) {
				log.debug('htmlAssets.path: %s', htmlAssets.path);
				var isView = false;
				if (_.has(entryViewSet, htmlAssets.path)) {
					log.info('Entry view: %s', htmlAssets.path);
					isView = true;
				}
				var component = api.findPackageByFile(Path.resolve(compiler.options.context, htmlAssets.path));
				var dir = api.config.get(['outputPathMap', component.longName]);
				if (dir == null)
					dir = api.config.get(['outputPathMap', component.shortName]);
				if (dir == null)
					dir = component.shortName;

				var relative = Path.relative(useSymlinks ? component.realPackagePath : component.packagePath, htmlAssets.path);
				if (!isView) {
					htmlAssets.path = Path.join(_.trimStart(dir, '/'), relative);
				} else
					htmlAssets.path = Path.join('../server', _.trimStart(dir, '/'), relative);

				var stag = htmlAssets.$('<script>');
				stag.attr('type', 'text/javascript');
				stag.text(`
				var __drcpEntryPage = '${relative.replace(/\\/g, '/')}';
					__drcpEntryPackage = '${component.longName}';
					_reqLego('${component.longName}');
					`);
				htmlAssets.$('body').append(stag);
				callback(null, htmlAssets);
			});
		});
	};
}

/**
 * For CSS scope, add pacakge short name as class name to HTML element during server rendering
 */
function entryHtmlCssScopePlugin(moduleDep) {
	var depInfo;
	this.plugin('after-emit', function(compilation, callback) {
		depInfo = null;
		callback();
	});
	this.plugin('compilation', function(compilation) {
		if (compilation.compiler.parentCompilation)
			return;
		compilation.plugin('optimize', function() {
			if (!depInfo)
				depInfo = moduleDep.listCommonJsDepMap(compilation);
		});
		compilation.plugin('multi-entry-html-emit-assets', (assets, cb) => {
			var html = assets.$('html');
			var comp = api.findPackageByFile(assets.absPath);
			if (comp && _.get(comp, 'dr.cssScope') !== false) {
				var cls = _.get(comp, 'dr.cssScope');
				html.addClass(_.isString(cls) ? cls : comp.shortName);
				if (!depInfo)
					depInfo = moduleDep.listCommonJsDepMap(compilation);
				var initialScopes = depInfo.cssPackageMap.get(comp.longName);
				if (initialScopes) {
					for (const depComp of initialScopes) {
						let cls = _.get(depComp.longName, 'dr.cssScope');
						html.addClass(_.isString(cls) ? cls : depComp.shortName.replace('.', '_'));
					}
				}
			}
			cb(null, assets);
		});
	});
}

/**
 * @param onPage function(packagePath, pageAbsPath, pathRelPath)
 */
function _eachEntryPageForComp(pages, entryComp, onPage) {
	_.each(pages, page => {
		var pagePathInfo = _resolvePagePath(page, entryComp, api.packageInfo.moduleMap);
		glob.sync(pagePathInfo.abs).forEach(singlePath => {
			onPage(pagePathInfo.package, singlePath, Path.relative(pagePathInfo.package, singlePath));
		});
	});
}

var npmPat = /npm:\/\/((?:@[^/]+\/)?[^/]+)\/(.*?$)/;
function _resolvePagePath(page, instance, moduleMap) {
	if (page.startsWith('npm://')) {
		var matched = npmPat.exec(page.replace(/\\/g, '/'));
		var packageName = matched[1];
		var path = matched[2];
		let packagePath = useSymlinks ?
			moduleMap[packageName].realPackagePath : moduleMap[packageName].packagePath;
		return {
			packageName,
			'package': packagePath,
			path,
			abs: Path.resolve(packagePath, path)
		};
	} else {
		let packagePath = useSymlinks ?
			instance.realPackagePath : instance.packagePath;
		return {
			packageName: instance.longName,
			'package': packagePath,
			path: page,
			abs: Path.resolve(packagePath, page)
		};
	}
}

function sendlivereload() {
	//var changedFile = argv['only-css'] ? 'yyy.css' : 'xxx.js';
	return new Promise((resolve, reject) => {
		var req = http.request({
			method: 'GET',
			hostname: 'localhost',
			port: api.config.get('livereload.port'),
			path: '/changed?files=xxx.js'
		}, response => {
			// response.on('data', (chunk) => {
			// 	log.info(chunk.toString('utf8'));
			// });
			response.resume();
			response.on('end', () => resolve());
		})
		.on('error', err => resolve()); // Never mind, server is not on.
		req.end();
	});
}

function noparse4Package(component, noParse) {
	if (component.browserifyNoParse) {
		//var root = api.config().rootPath;
		var debugStr = '';
		component.browserifyNoParse.forEach(function(noParseFile) {
			var item = Path.resolve(useSymlinks ? component.realPackagePath : component.packagePath, noParseFile);
			if (item.indexOf('*') >= 0) {
				let regStr = noParseHelper.glob2regexp(item);
				debugStr += regStr;
				debugStr += '\n';
				noParse.push(new RegExp(regStr));
			} else {
				debugStr += item;
				debugStr += '\n';
				noParse.push(item);
			}
		});
		log.debug('noParse:' + debugStr);
	}
}

function chunk4package(component) {
	return component.bundle;
}

function compressOutputPathMap(pathMap) {
	var newMap = {};
	var sameAsNames = [];
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
