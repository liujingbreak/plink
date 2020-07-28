var _ = require('lodash');
var log = require('log4js').getLogger('wfh.module-dep-helper');
var api = require('__api');
var Path = require('path');
var chalk = require('chalk');

module.exports = DependencyHelper;

function DependencyHelper(entryComponents) {
	this.file2comp = {};
	entryComponents.forEach(c => {
		this.file2comp[c.file] = c;
	});
}

DependencyHelper.prototype = {
	/**
	 * @return Map<string, Set>
	 */
	listCommonJsDepMap(compilation) {
		//var entryPackage2Module = new Map();
		var entryPackage2css = new Map();
		var printText = `Entry Components dependency tree:\ne.g.\n  ${chalk.cyan('Component')} ${chalk.blue('[Chunk]')}\n` +
			`  3rd-partyPackage ${chalk.blue('[Chunk]')}\n`;
		compilation.modules.forEach(m => {
			var file = getModuleFile(m);
			if (!file)
				return;
			var comp = this.file2comp[file];
			if (comp) {
				//var packages = new Set();
				var cssPackages = new Set();
				// var vendorPackages = new Set();
				var packagesDepMap = new Map();
				var splitPackageDepMap = new Map();
				//entryPackage2Module.set(comp.longName, packages);
				entryPackage2css.set(comp.longName, cssPackages);
				printText += `\n${chalk.cyan(comp.longName)} ${chalk.blue('[' + comp.bundle + ']')} depends on:\n`;
				this._traverseDep(m, packagesDepMap, splitPackageDepMap, new Set(), 0, true);
				let count = packagesDepMap.size + splitPackageDepMap.size;
				for (let c of packagesDepMap.entries()) {
					if (count === 1)
						printText += ' └─ ';
					else
						printText += ' ├─ ';
					let chunkText = c[0].bundle ? chalk.blue(`[${c[0].bundle}]`) : chalk.red('[No chunk setting]');
					if (c[1].v)
						printText += `${_.isString(c[0]) ? c[0] : c[0].longName} ${chunkText} ${c[1].c ? 'css' : ''}\n`;
					else {
						if (c[1].c)
							cssPackages.add(c[0]);
						printText += `${chalk.cyan(c[0].longName)} ${chunkText} ${c[1].c ? 'css' : ''}\n`;
					}
					count--;
				}
				for (let c of splitPackageDepMap.entries()) {
					if (count === 1)
						printText += ' └─ ';
					else
						printText += ' ├─ ';
					let chunkText = c[0].bundle ? chalk.blue(`[${c[0].bundle}]`) : chalk.red('[No chunk (split) setting]');
					if (c[1].v)
						printText += `${_.isString(c[0]) ? c[0] : c[0].longName} (split) ${chunkText} ${c[1].c ? 'css' : ''}\n`;
					else {
						printText += `${chalk.cyan(c[0].longName)} (split) ${chunkText} ${c[1].c ? 'css' : ''}\n`;
					}
					count--;
				}
			}
		});
		log.info(printText);
		return {
			//packageMap: entryPackage2Module,
			cssPackageMap: entryPackage2css
		};
	},
	_traverseDep(m, packagesDepMap, splitPackageDepMap, traveled, level, initial) {
		for (let dep of m.dependencies) {
			if (!dep.module || !dep.request)
				continue;
			if (traveled.has(dep.module))
				continue;
			traveled.add(dep.module);
			//('%s├─ %s', _.repeat('| ', level + 1), shortRequest);

			var pMap = initial ? packagesDepMap : splitPackageDepMap;
			var file = getModuleFile(dep.module);
			if (file) {
				if (file.endsWith('lodash.js'))
					log.warn('%s relies on whole lodash.js.\n' +
					'To optimize lodash bundle size, it should be replaced to a ES6 import syntax.', getModuleFile(m));
				var comp = api.findPackageByFile(file);
				if (comp) {
					let data = pMap.get(comp);
					if (data == null) {
						data = {
							v: comp.dr == null,
							c: file.endsWith('.less') || file.endsWith('.scss') || file.endsWith('.css')
						};
						pMap.set(comp, data);
					} else {
						data.c = data.c || file.endsWith('.less') || file.endsWith('.scss') || file.endsWith('.css');
					}
				} else {
					var shortRequest = dep.request.split('!').slice().pop();
					if (!/^\.\.?\//.test(shortRequest)) {
						if (_.has(dep, 'module.resource'))
							shortRequest = Path.relative(api.config().nodePath, dep.module.resource);
						let data = pMap.get(shortRequest);
						if (data == null) {
							data = {
								v: true,
								c: file.endsWith('.less') || file.endsWith('.scss') || file.endsWith('.css')
							};
							pMap.set(shortRequest, data);
						}
					}
				}
			}
			//}
			this._traverseDep(dep.module, packagesDepMap, splitPackageDepMap, traveled, level + 1, initial);
		}
		for (let block of m.blocks) {
			this._traverseDep(block, packagesDepMap, splitPackageDepMap, traveled, level + 1, false);
		}
	}
};

function getModuleFile(m) {
	return m.resource || (m.rootModule && m.rootModule.resource) || null;
	//return (m.identifier() || m.name).split('!').slice().pop();
}
