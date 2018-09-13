// import api from '__api';
// // import patchText, {Replacement as Rep} from '../utils/patch-text';
// import {ScssParser, ScssLexer} from '../utils/simple-scss-parser';
// import {FactoryMap, ReplaceType} from 'require-injector/dist/factory-map';
// const log = require('log4js').getLogger('scss-import-loader');

// export = loader;
// function loader(content: string, map: any) {
// 	var callback = this.async();
// 	if (!callback) {
// 		this.emitError('loader does not support sync mode');
// 		throw new Error('loader does not support sync mode');
// 	}
// 	load(content, this)
// 	.then(result => this.callback(null, result, map))
// 	.catch(err => {
// 		this.callback(err);
// 		this.emitError(err);
// 		log.error(err);
// 	});
// }

// async function load(content: string, loader: any): Promise<string> {
// 	const facMaps: FactoryMap[] = api.browserInjector.factoryMapsForFile(loader.resourcePath);
// 	if (facMaps.length === 0)
// 		return Promise.resolve(content);
// 	for (const token of new ScssParser(new ScssLexer(content)).getAllImport()) {
// 		if (!token.text.startsWith('~'))
// 			continue;
// 		for (const facMap of facMaps) {
// 			const setting = facMap.matchRequire(token.text.slice(1));
// 			if (setting == null)
// 				continue;
// 			const repl = facMap.getReplacement(setting, ReplaceType.imp, loader.resourcePath, null);
// 			console.log(repl);
// 		}
// 	}
// 	return Promise.resolve(content);
// }
