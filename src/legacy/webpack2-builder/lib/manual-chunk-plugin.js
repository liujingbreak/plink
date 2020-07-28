var log = require('log4js').getLogger('wfh.ManualChunkPlugin');
var logFd = log; //require('log4js').getLogger('wfh.ManualChunkPlugin.fd');
var logD = log; //require('log4js').getLogger('wfh.ManualChunkPlugin.d');

var divideLog = require('log4js').getLogger('wfh.ManualChunkPlugin.divideModule');
var _ = require('lodash');
var Path = require('path');
// var Tapable = require('tapable');
var chalk = require('chalk');
var nextIdent = 0;

var showDependency = false;
var showFileDep = true;

/**
 * ManualChunkPlugin
 * @param {string} opts.manifest name runtime chunk
 * @param {string} opts.defaultChunkName when encountering a module has not chunk name setting,
 * move it to a default chunk with name of this value
 * @param {boolean} opts.hasExtractTextWebpackPlugin default is false
 * @param {function(file: string)} opts.getChunkName a function callback used to provide chunk name to which file belongs
 */
// class ManualChunkPlugin extends Tapable {
// TODO: Webpack 4
class ManualChunkPlugin {
	constructor(opts) {
		// super();
		this.ident = __filename + (nextIdent++);
		this.opts = opts;
		if (!opts.manifest)
			opts.manifest = 'manifest';
		if (opts.testStyle == null)
			opts.testStyle = /\.(?:css|less|scss)$/;
	}

	apply(compiler) {
		var ident = this.ident;
		this.compiler = compiler;

		compiler.plugin('compilation', (compilation) => {
			if (compilation.compiler.parentCompilation)
				return; // Skip child compilation like what extract-text-webpack-plugin creates
			this.bundleChunkMap = {}; // a hash object, key: bundle name, value: chunk instance
			this.bundleAsyncChunkMap = {}; // a hash object, key: bundle name, value: chunk instance

			compilation.plugin(['optimize-chunks', 'optimize-extracted-chunks'], (chunks) => {
				// only optimize once
				if (compilation[ident])
					return;
				compilation[ident] = true;
				log.debug('optimize: %s', chunks.map(c => c.name).join(', '));

				chunks.forEach(chunk => {
					if (chunk.name ) {
						if (this.opts.hasExtractTextWebpackPlugin) {
							if (chunk.isInitial())
								this.bundleChunkMap[chunk.name] = chunk;
							else
								this.bundleAsyncChunkMap[chunk.name] = chunk;
						} else
							this.bundleChunkMap[chunk.name] = chunk;
					}
				});

				this.divideModule(compilation, chunks);
			});
		});
		compiler.plugin('emit', (compilation, callback) => {
			log.debug(_.pad(' emit ', 40, '-'));
			this.printChunks(compilation, compilation.chunks);
			callback();
		});
	}

	divideModule(compilation, chunks) {
		divideLog.debug(_.repeat('-', 10) + ' divide module ' + _.repeat('-', 10));
		chunks = chunks.slice();
		// create initial manifest chunk
		var self = this;

		var divededChunkMap = {};
		chunks.forEach(chunk => {
			var divededChunkSet = divededChunkMap[chunk.debugId] = {};
			var isInitialChunk = chunk.isInitial();
			divideLog.debug('Scan original chunk [%s]', this.getChunkName(chunk));

			_.each(chunk.getModules ? chunk.getModules() : chunk.modules, (m, idx) => {
				divideLog.debug('\tscan module %s (%s)', m.debugId, this.simpleModuleId(m));
				var file = _.get(m, ['fileDependencies', 0]);
				if (!file)
					return;
				var bundle;
				if (self.opts.getChunkName)
					bundle = self.opts.getChunkName(file);

				if (bundle == null) {
					divideLog.warn('Use chunk [%s] for %s', self.opts.defaultChunkName,
						chalk.red(Path.relative(self.compiler.options.context || process.cwd(), file)));
					bundle = self.opts.defaultChunkName;
				}
				var chunkMap = this.bundleChunkMap;
				if (!isInitialChunk && this.opts.hasExtractTextWebpackPlugin)
					chunkMap = this.bundleAsyncChunkMap;
				if (chunk.name == null && !_.has(chunkMap, bundle)) {
					chunk.name = isInitialChunk ? bundle : bundle + '.split';
					chunkMap[bundle] = chunk;
					return;
				}
				if (bundle === _.trimEnd(chunk.name, '.split')) {
					chunkMap[bundle] = chunk;
					return;
				}
				self.onEachChunk(compilation, chunkMap, m, bundle, divededChunkSet, chunk, isInitialChunk);
			});
			divideLog.debug('');
		});

		this.removeEmptyChunk(compilation);

		var manifestChunk = compilation.addChunk(this.opts.manifest);
		_.each(compilation.entrypoints, (entrypoint, name) => {
			entrypoint.insertChunk(manifestChunk, entrypoint.chunks[0]);
			manifestChunk.addChunk(entrypoint.chunks[1]);
			entrypoint.chunks[1].addParent(manifestChunk);
		});
	}

	onEachChunk(compilation, bundleChunkMap, m, bundle, divededChunkSet, chunk, isInitialChunk) {
		var newChunk;
		if (_.has(bundleChunkMap, bundle)) {
			newChunk = bundleChunkMap[bundle];
			divideLog.debug('\t\texisting chunk [%s]', this.getChunkName(newChunk));
			if (chunk === newChunk)
				return;
		} else {
			newChunk = compilation.addChunk(isInitialChunk ? bundle : bundle + '.split');
			divideLog.debug('\t\tcreate %s chunk [%s] %s', isInitialChunk ? 'initial' : 'async', bundle, this.getChunkName(newChunk));
			bundleChunkMap[bundle] = newChunk;
		}
		// move module
		chunk.moveModule(m, newChunk);
		divideLog.debug(`\t\tmove module ${m.debugId} "%s" from chunk [%s] to [%s]`, this.simpleModuleId(m), this.getChunkName(chunk), this.getChunkName(newChunk));

		if (isInitialChunk) {
			if (_.get(divededChunkSet, [newChunk.debugId, 'asInit']))
				return;
			_.set(divededChunkSet, [newChunk.debugId, 'asInit'], true);
			divideLog.debug('\t\tchunk [%s] is splitted as initial chunk', this.getChunkName(chunk));
			newChunk.addChunk(chunk);
			if (chunk.parents && chunk.parents.length > 0)
				chunk.parents.forEach(p => {
					p.removeChunk(chunk);
					p.addChunk(newChunk);
					newChunk.addParent(p);
				});
			chunk.parents = [newChunk];
			_.each(chunk.entrypoints, (entrypoint) => {
				var existing = entrypoint.chunks.indexOf(newChunk);
				if (existing >= 0)
					entrypoint.chunks.splice(existing, 1);
				entrypoint.insertChunk(newChunk, chunk);
			});
		} else {
			// require.ensure() loaded chunk
			//_.each(chunk.blocks, block => );
			if (_.get(divededChunkSet, [newChunk.debugId, 'asAsync']))
				return;
			_.set(divededChunkSet, [newChunk.debugId, 'asAsync'], true);
			divideLog.debug('\t\tchunk [%s] is splitted as async chunk', this.getChunkName(chunk));
			this.addAsyncChunk(chunk, newChunk);
		}
	}

	addAsyncChunk(chunk, newChunk) {
		chunk.parents.forEach(p => {
			newChunk.addParent(p);
			p.addChunk(newChunk);
		});
		_.each(chunk.blocks, block => {
			newChunk.addBlock(block);
			if (block.chunks.indexOf(newChunk) < 0)
				block.chunks.push(newChunk);
		});
	}

	removeEmptyChunk(compilation) {
		_.remove(compilation.chunks, chunk => {
			if (chunk == null)
				log.error(chunk);
			// if (chunk.isInitial() && chunk.blocks.length > 0 && this.opts.hasExtractTextWebpackPlugin) {
			// 	log.info('chunk %s is both initial and async loaded', this.getChunkName(chunk));
			// 	var cssChunk = null;
			// 	for (var m of chunk.getModules()) {
			// 		if (this.opts.testStyle.test(m.rawRequest)) {
			// 			if (cssChunk == null) {
			// 				cssChunk = compilation.addChunk(chunk.name + '-style');
			// 			}
			// 			// chunk.moveModule(m, cssChunk);
			// 			m.addChunk(cssChunk);
			// 			cssChunk.addModule(m);
			// 		}
			// 	}
			// 	if (cssChunk) {
			// 		this.addAsyncChunk(chunk, cssChunk);
			// 	}
			// }
			if (chunk && chunk.isEmpty() && !chunk.hasRuntime()) {
				log.info('Empty chunk %s', this.getChunkName(chunk));
				chunk.remove('empty');
				// compilation.chunks.splice(compilation.chunks.indexOf(chunk), 1);
				if (chunk.name)
					delete compilation.namedChunks[chunk.name];
				_.each(compilation.entrypoints, (entrypoint, name) => {
					var i = entrypoint.chunks.indexOf(chunk);
					if (i >= 0 )
						entrypoint.chunks.splice(i, 1);
				});
				_.each(chunk.blocks, block => {
					var i = block.chunks.indexOf(chunk);
					if (i >= 0 )
						block.chunks.splice(i, 1);
				});
				return true;
			}
			return false;
		});
	}

	simpleModuleId(m) {
		return Path.relative(this.compiler.options.context, (m.identifier() || m.name).split('!').slice().pop());
	}

	printChunks(compilation, chunks) {
		var self = this;
		chunks.forEach((chunk) => {
			log.debug('chunk: %s, parents:(%s), isInitial: %s, ids: %s',
				this.getChunkName(chunk),
				chunk.parents.map(p => this.getChunkName(p)).join(', '), chunk.isInitial(), chunk.ids);
			log.debug('\tchildren: (%s)', chunk.chunks.map(ck => this.getChunkName(ck)).join(', '));
			log.debug('\t%s %s', chunk.hasRuntime() ? '(has runtime)' : '', chunk.hasEntryModule() ? `(has entryModule: ${this.simpleModuleId(chunk.entryModule)})` : '');

			log.debug('  ├─ modules');
			(chunk.getModules ? chunk.getModules() : chunk.modules).forEach((module) => {
				// Explore each source file path that was included into the module:
				log.debug('  │  ├─ %s', this.simpleModuleId(module));
				if (showFileDep)
					_.each(module.fileDependencies, filepath => {
						logFd.debug('  │  │  ├─ %s', chalk.blue('(fileDependency): ' + Path.relative(this.compiler.options.context, filepath)));
					});
				_.each(module.blocks, block => {
					log.debug('  │  │  ├─ (block %s): %s', block.constructor.name,
						_.map(block.chunks, ck => {
							return this.getChunkName(ck);
						}).join(', '));
					if (showDependency) {
						_.each(block.dependencies, bDep => {
							logD.debug(`  │  │  │  ├─ ${bDep.constructor.name}`);
							if (bDep.module)
								logD.debug(`  │  │  │  │  ├─ .module ${self.simpleModuleId(bDep.module)}`);
						});
					}
				});
				if (showDependency) {
					_.each(module.dependencies, dep => {
						var source = module._source.source();
						logD.debug('  │  │  ├─ %s', chalk.blue('(dependency %s): ' + dep.constructor.name),
							dep.range ? source.substring(dep.range[0], dep.range[1]) : '');
						if (dep.module)
							logD.debug(`  │  │  │  ├─ .module ${chalk.blue(self.simpleModuleId(dep.module))}`);
					});
				}
			});
			log.debug('  │  ');

			// Explore each asset filename generated by the chunk:
			chunk.files.forEach(function(filename) {
				log.debug('  ├── file: %s', filename);
				// Get the asset source for each file generated by the chunk:
				//var source = compilation.assets[filename].source();
			});
		});
		this.printChunksByEntry(compilation);
	}

	getChunkName(chunk) {
		var id = chunk.debugId;
		if (chunk.id)
			id = chunk.id + '-' + chunk.debugId;
		return '#' + id + ' ' + chalk.green(chunk.name || '');
	}

	printChunksByEntry(compilation) {
		log.info('Entrypoint chunk tree:');
		_.each(compilation.entrypoints, (entrypoint, name) => {
			log.info('entrypoint %s', chalk.green(name));
			_.each(entrypoint.chunks, chunk => log.info('  ├─ %s', chunk.files[0]));
		});
	}
}

module.exports = ManualChunkPlugin;
// module.exports = require('manual-chunk-plugin');
