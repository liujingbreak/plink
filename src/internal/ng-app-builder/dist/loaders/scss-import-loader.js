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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpdWppbmcvYmsvZHItY29tcC1wYWNrYWdlL3NyYy9pbnRlcm5hbC9uZy1hcHAtYnVpbGRlci90cy9sb2FkZXJzL3Njc3MtaW1wb3J0LWxvYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSwyQkFBMkI7QUFDM0Isd0VBQXdFO0FBQ3hFLHFFQUFxRTtBQUNyRSw2RUFBNkU7QUFDN0UsaUVBQWlFO0FBRWpFLG1CQUFtQjtBQUNuQiwrQ0FBK0M7QUFDL0MsZ0NBQWdDO0FBQ2hDLG9CQUFvQjtBQUNwQix5REFBeUQ7QUFDekQsMERBQTBEO0FBQzFELEtBQUs7QUFDTCx1QkFBdUI7QUFDdkIscURBQXFEO0FBQ3JELG1CQUFtQjtBQUNuQix3QkFBd0I7QUFDeEIseUJBQXlCO0FBQ3pCLG9CQUFvQjtBQUNwQixPQUFPO0FBQ1AsSUFBSTtBQUVKLHVFQUF1RTtBQUN2RSw4RkFBOEY7QUFDOUYsNkJBQTZCO0FBQzdCLHFDQUFxQztBQUNyQyxnRkFBZ0Y7QUFDaEYscUNBQXFDO0FBQ3JDLGVBQWU7QUFDZixvQ0FBb0M7QUFDcEMsK0RBQStEO0FBQy9ELDBCQUEwQjtBQUMxQixnQkFBZ0I7QUFDaEIsOEZBQThGO0FBQzlGLHdCQUF3QjtBQUN4QixNQUFNO0FBQ04sS0FBSztBQUNMLG9DQUFvQztBQUNwQyxJQUFJIiwiZmlsZSI6ImRpc3QvbG9hZGVycy9zY3NzLWltcG9ydC1sb2FkZXIuanMiLCJzb3VyY2VzQ29udGVudCI6W251bGxdfQ==
