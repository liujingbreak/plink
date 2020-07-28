const wps = require('webpack-sources');
var log = require('log4js').getLogger('wfh.MultiEntryHtmlPlugin');
var _ = require('lodash');
const sourceMappingURL = require('source-map-url');
var cheerio = require('cheerio');
//var fs = require('fs');
var Path = require('path');
var Promise = require('bluebird');
//var readFile = Promise.promisify(fs.readFile);
var nextIdent = 0;

/**
 * Add function to extend this plugin by apply plugin to webpack Compilation object on
 * key "multi-entry-html-compile-html"
 * @param {object} opts
 * @param {Array} opts.inlineChunk: array | string
 * @param {number} opts.inlineJsSize: default 2048, inline any JS file whose size is smaller than this number
 * @param {number} opts.inlineCssSize: number - default 2048, inline any css file whose size is smaller than this number
 * @param {function} opts.onCompile: (filePath, cheerio) => void
 */
class MultiEntryHtmlPlugin {
	constructor(opts) {
		this.ident = __filename + (nextIdent++);
		this.opts = opts;
		if (!opts.inlineChunk)
			opts.inlineChunk = [];
		this.entryFileMap = {};
		this.chunkHtmlMap = {}; // {[chunk: string]: string[]}
		this.entryExternalJsMap = {};
		this.entryExternalCssMap = {};
	}

	addFile(relativePath, chunk, content) {
		this.entryFileMap[relativePath] = content;
		if (!_.has(this.chunkHtmlMap, chunk))
			this.chunkHtmlMap[chunk] = [];
		this.chunkHtmlMap[chunk].push(relativePath);
	}

	addExternalJs(...url) {
		this.addExternalJsForEntry('*', ...url);
	}
	addExternalCss(...url) {
		this.addExternalCssForEntry('*', ...url);
	}

	addExternalJsForEntry(entryName, ...url) {
		var m = this.entryExternalJsMap[entryName];
		if (!m)
			m = this.entryExternalJsMap[entryName] = [];
		m.push(...url);
	}

	addExternalCssForEntry(entryName, ...url) {
		var m = this.entryExternalCssMap[entryName];
		if (!m)
			m = this.entryExternalCssMap[entryName] = [];
		m.push(...url);
	}

	apply(compiler) {
		var plugin = this;
		var applyPluginsAsyncWaterfall;
		// read options.context
		if (!plugin.opts.context) {
			compiler.plugin('entry-option', function(context) {
				plugin.opts.context = context;
			});
		}

		compiler.plugin('emit', function(compilation, callback) {
			applyPluginsAsyncWaterfall = Promise.promisify(compilation.applyPluginsAsyncWaterfall.bind(compilation));
			// default one in case there is no other plugin registered
			compilation.plugin('multi-entry-html-emit-assets', function(htmlAssets, callback) {
				callback(null, htmlAssets);
			});
			var inlineChunks = inlineJsChunk(compilation,
				[...[].concat(plugin.opts.inlineChunk), plugin.opts.promisePolyfillChunk],
				_.isNumber(plugin.opts.inlineJsSize) ? plugin.opts.inlineJsSize : 2048);
			var inlineAssests = inlineAssetsBySize(compilation, _.isNumber(plugin.opts.inlineCssSize) ? plugin.opts.inlineCssSize : 2048);
			assetsByEntry(compilation, inlineChunks, inlineAssests)
			.then(() => callback())
			.catch(callback);
		});

		function assetsByEntry(compilation, inlineChunks, inlineAssests) {
			var all = [];
			_.each(plugin.chunkHtmlMap, (files, entryName) => {
				files = [].concat(files);
				_.each(files, relativePath => {
					var htmlFile = Path.resolve(compiler.options.context, relativePath);
					all.push(doHtmlAsync(compilation, entryName, htmlFile, inlineChunks, inlineAssests));
				});
			});
			return Promise.all(all)
			.catch(err => {
				log.error(err);
				throw err;
			});
		}

		function doHtmlAsync(compilation, entrypointName, file, inlineChunks, inlineAssests) {
			return Promise.coroutine(function*() {
				var relativePath = Path.relative(compiler.options.context || process.cwd(), file);
				// return readFile(file, 'utf8')
				// .then(content => {
				if (!plugin.entryFileMap)
					return Promise.resolve(`Entry page ${relativePath} is failed to compiled by loader`);
				var content = plugin.entryFileMap[relativePath];
				var $;
				try {
					$ = cheerio.load(content, {decodeEntities: false});
				} catch (e) {
					log.error(`File: ${file}\n` + content);
					throw e;
				}
				var body = $('body');
				var head = $('head');
				plugin._insertIE8shim(head);
				if (plugin.opts.onCompile) {
					plugin.opts.onCompile(file, $);
				}
				plugin._insertExternalResource('*', $, body, head, compiler);
				plugin._insertExternalResource(entrypointName, $, body, head, compiler);
				//yield applyPluginsAsync('multi-entry-html-compile-html', file, $);
				var scriptIdx = 0;
				// scriptIdx = plugin._insertPromisePolyfill(body, scriptIdx);
				// var polyfillInserted = false;
				_.each(compilation.entrypoints[entrypointName].chunks, chunk => {
					var s;
					var skipJs = false;
					if (_.has(inlineChunks, chunk.name)) {
						s = plugin._createScriptElement($, inlineChunks[chunk.name]);
						s.attr('data-mehp-index', (scriptIdx++) + '');
						body.append(s);
						skipJs = true;
					}

					// if (!polyfillInserted) {
					// 	var polyfillLink = plugin._createScriptElement($, inlineChunks[plugin.opts.promisePolyfillChunk])
					// 	.attr('data-mehp-index', (scriptIdx++) + '');
					// 	body.append(polyfillLink);
					// 	polyfillInserted = true;
					// }

					_.each(chunk.files, file => {
						if (!skipJs && _.endsWith(file, '.js')) {
							s = plugin._createScriptLinkElement($, resolveBundleUrl(file, compiler.options.output.publicPath));
							s.attr('data-mehp-index', (scriptIdx++) + '');
							body.append(s);
						} else if (_.endsWith(file, '.css')) {
							if (_.has(inlineAssests, file)) {
								s = plugin._createCssStyleElement($, inlineAssests[file]);
							} else {
								s = plugin._createCssLinkElement($, resolveBundleUrl(file, compiler.options.output.publicPath));
								s.attr('data-mehp-index', (scriptIdx++) + '');
							}
							head.append(s);
						}
					});
				});

				var data = yield applyPluginsAsyncWaterfall('multi-entry-html-emit-assets', {
					absPath: file,
					path: relativePath,
					$
				});
				var paths = [].concat(data.path);
				for (let path of paths) {
					path = path.replace(/\.([^.]+)$/, '.html').replace(/\\/g, '/');
					compilation.assets[path] = new wps.CachedSource(new wps.RawSource(
						data.html || $.html()));
				}
			})();
		}

		/**
		 * inlineChunk returns a hash object {key: chunkName, value: inline string}
		 * @param {any} compilation Compilation
		 * @param {string[]} chunkNames
		 * @param {number} bySize inline those chunks whose size is bigger than this parameter
		 * @return {*} {[chunkName: string]: string} chunkCodeMap
		 */
		function inlineJsChunk(compilation, chunkNames, bySize) {
			if (!chunkNames || chunkNames.length === 0)
				return {};
			var nameSet = {};
			_.each([].concat(chunkNames), name => nameSet[name] = 1);
			var inlineCodes = {};
			_.each(compilation.chunks, chunk => {
				// log.info(`chunk ${chunk.name} size: ${source.length}`);
				if (_.has(nameSet, chunk.name)) {
					delete nameSet[chunk.name];
					log.info('inline JS Chunk: %s', chunk.files[0]);
					let source = sourceMappingURL.removeFrom(compilation.assets[chunk.files[0]].source());
					inlineCodes[chunk.name] = source;
				} else if (chunk.isInitial() && bySize > 0) {
					let source = sourceMappingURL.removeFrom(compilation.assets[chunk.files[0]].source());
					if (source.length <= bySize) {
						log.info('inline JS initial Chunk: %s since its size is only %d (<= %d)', chunk.files[0], source.length, bySize);
						inlineCodes[chunk.name] = source;
					}
				}
			});
			return inlineCodes;
		}

		function inlineAssetsBySize(compilation, maxSize) {
			var inlineCodes = {};
			_.each(compilation.assets, (assets, name) => {
				if (name.endsWith('.css')) {
					var source = assets.source();
					var size = source.length;
					if (size > maxSize)
						return;
					log.info(`inline CSS assets "${name}", size: ${size}`);
					inlineCodes[name] = sourceMappingURL.removeFrom(source);
				}
			});
			return inlineCodes;
		}
	}

	_insertExternalResource(entrypointName, $, body, head, compiler) {
		var externalCss = this.entryExternalCssMap[entrypointName];
		if (externalCss)
			externalCss.forEach(link => {
				var s = this._createCssLinkElement($, resolveBundleUrl(link, compiler.options.output.publicPath));
				head.append(s);
			});
		var externalJs = this.entryExternalJsMap[entrypointName];
		if (externalJs)
			externalJs.forEach(link => {
				var s = this._createScriptLinkElement($, resolveBundleUrl(link, compiler.options.output.publicPath));
				body.append(s);
			});
	}

	_createScriptLinkElement($, jsPath) {
		var scriptEl = $('<script>');
		if (!jsPath)
			return null;
		scriptEl.attr('type', 'text/javascript');
		scriptEl.attr('charset', 'utf-8');
		scriptEl.attr('src', jsPath);
		return scriptEl;
	}

	_createCssStyleElement($, content) {
		var el = $('<style>');
		if (!content)
			return null;
		el.attr('type', 'text/css');
		el.html(content);
		return el;
	}

	_createScriptElement($, content) {
		var scriptEl = $('<script>');
		scriptEl.attr('type', 'text/javascript');
		scriptEl.text('\n' + content);
		return scriptEl;
	}

	_createCssLinkElement($, cssPath) {
		var element = $('<link/>');
		if (!cssPath)
			return null;
		var src = resolveBundleUrl(cssPath, cssPath);
		element.attr('rel', 'stylesheet');
		element.attr('href', src);
		element.attr('type', 'text/css');
		return element;
	}

	_insertIE8shim(head) {
		if (this.opts.es5shimUrl) {
			head.append(`<!--[if lte IE 8]> <script src="${this.opts.es5shimUrl}"></script>
			<script src="${this.opts.es5shamUrl}"></script> <![endif]-->`);
		}
	}

	// _insertPromisePolyfill(body, scriptIdx) {
	// 	if (this.opts.promisePolyfillCode == null)
	// 		return;
	// 	body.append(`<script type="text/javascript" charset="utf-8" data-mehp-index="${(scriptIdx++) + ''}">
	// 	${this.opts.promisePolyfillCode}
	// 	</script>`);
	// 	return scriptIdx;
	// }
}

module.exports = MultiEntryHtmlPlugin;

function resolveBundleUrl(bundlePath, urlPrefix) {
	if (!urlPrefix)
		urlPrefix = '';
	if (bundlePath.charAt(0) === '/' || (bundlePath.length >= 7 &&
			(bundlePath.substring(0, 7) === 'http://' || bundlePath.substring(0, 8) === 'https://')))
		return bundlePath;
	else
		return (urlPrefix ? _.trimEnd(urlPrefix, '/') : '') + '/' + bundlePath;
}
