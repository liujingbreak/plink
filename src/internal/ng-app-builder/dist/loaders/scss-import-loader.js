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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9sb2FkZXJzL3Njc3MtaW1wb3J0LWxvYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSwyQkFBMkI7QUFDM0Isd0VBQXdFO0FBQ3hFLHFFQUFxRTtBQUNyRSw2RUFBNkU7QUFDN0UsaUVBQWlFO0FBRWpFLG1CQUFtQjtBQUNuQiwrQ0FBK0M7QUFDL0MsZ0NBQWdDO0FBQ2hDLG9CQUFvQjtBQUNwQix5REFBeUQ7QUFDekQsMERBQTBEO0FBQzFELEtBQUs7QUFDTCx1QkFBdUI7QUFDdkIscURBQXFEO0FBQ3JELG1CQUFtQjtBQUNuQix3QkFBd0I7QUFDeEIseUJBQXlCO0FBQ3pCLG9CQUFvQjtBQUNwQixPQUFPO0FBQ1AsSUFBSTtBQUVKLHVFQUF1RTtBQUN2RSw4RkFBOEY7QUFDOUYsNkJBQTZCO0FBQzdCLHFDQUFxQztBQUNyQyxnRkFBZ0Y7QUFDaEYscUNBQXFDO0FBQ3JDLGVBQWU7QUFDZixvQ0FBb0M7QUFDcEMsK0RBQStEO0FBQy9ELDBCQUEwQjtBQUMxQixnQkFBZ0I7QUFDaEIsOEZBQThGO0FBQzlGLHdCQUF3QjtBQUN4QixNQUFNO0FBQ04sS0FBSztBQUNMLG9DQUFvQztBQUNwQyxJQUFJIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L2xvYWRlcnMvc2Nzcy1pbXBvcnQtbG9hZGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG4vLyAvLyBpbXBvcnQgcGF0Y2hUZXh0LCB7UmVwbGFjZW1lbnQgYXMgUmVwfSBmcm9tICcuLi91dGlscy9wYXRjaC10ZXh0Jztcbi8vIGltcG9ydCB7U2Nzc1BhcnNlciwgU2Nzc0xleGVyfSBmcm9tICcuLi91dGlscy9zaW1wbGUtc2Nzcy1wYXJzZXInO1xuLy8gaW1wb3J0IHtGYWN0b3J5TWFwLCBSZXBsYWNlVHlwZX0gZnJvbSAncmVxdWlyZS1pbmplY3Rvci9kaXN0L2ZhY3RvcnktbWFwJztcbi8vIGNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignc2Nzcy1pbXBvcnQtbG9hZGVyJyk7XG5cbi8vIGV4cG9ydCA9IGxvYWRlcjtcbi8vIGZ1bmN0aW9uIGxvYWRlcihjb250ZW50OiBzdHJpbmcsIG1hcDogYW55KSB7XG4vLyBcdHZhciBjYWxsYmFjayA9IHRoaXMuYXN5bmMoKTtcbi8vIFx0aWYgKCFjYWxsYmFjaykge1xuLy8gXHRcdHRoaXMuZW1pdEVycm9yKCdsb2FkZXIgZG9lcyBub3Qgc3VwcG9ydCBzeW5jIG1vZGUnKTtcbi8vIFx0XHR0aHJvdyBuZXcgRXJyb3IoJ2xvYWRlciBkb2VzIG5vdCBzdXBwb3J0IHN5bmMgbW9kZScpO1xuLy8gXHR9XG4vLyBcdGxvYWQoY29udGVudCwgdGhpcylcbi8vIFx0LnRoZW4ocmVzdWx0ID0+IHRoaXMuY2FsbGJhY2sobnVsbCwgcmVzdWx0LCBtYXApKVxuLy8gXHQuY2F0Y2goZXJyID0+IHtcbi8vIFx0XHR0aGlzLmNhbGxiYWNrKGVycik7XG4vLyBcdFx0dGhpcy5lbWl0RXJyb3IoZXJyKTtcbi8vIFx0XHRsb2cuZXJyb3IoZXJyKTtcbi8vIFx0fSk7XG4vLyB9XG5cbi8vIGFzeW5jIGZ1bmN0aW9uIGxvYWQoY29udGVudDogc3RyaW5nLCBsb2FkZXI6IGFueSk6IFByb21pc2U8c3RyaW5nPiB7XG4vLyBcdGNvbnN0IGZhY01hcHM6IEZhY3RvcnlNYXBbXSA9IGFwaS5icm93c2VySW5qZWN0b3IuZmFjdG9yeU1hcHNGb3JGaWxlKGxvYWRlci5yZXNvdXJjZVBhdGgpO1xuLy8gXHRpZiAoZmFjTWFwcy5sZW5ndGggPT09IDApXG4vLyBcdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZShjb250ZW50KTtcbi8vIFx0Zm9yIChjb25zdCB0b2tlbiBvZiBuZXcgU2Nzc1BhcnNlcihuZXcgU2Nzc0xleGVyKGNvbnRlbnQpKS5nZXRBbGxJbXBvcnQoKSkge1xuLy8gXHRcdGlmICghdG9rZW4udGV4dC5zdGFydHNXaXRoKCd+JykpXG4vLyBcdFx0XHRjb250aW51ZTtcbi8vIFx0XHRmb3IgKGNvbnN0IGZhY01hcCBvZiBmYWNNYXBzKSB7XG4vLyBcdFx0XHRjb25zdCBzZXR0aW5nID0gZmFjTWFwLm1hdGNoUmVxdWlyZSh0b2tlbi50ZXh0LnNsaWNlKDEpKTtcbi8vIFx0XHRcdGlmIChzZXR0aW5nID09IG51bGwpXG4vLyBcdFx0XHRcdGNvbnRpbnVlO1xuLy8gXHRcdFx0Y29uc3QgcmVwbCA9IGZhY01hcC5nZXRSZXBsYWNlbWVudChzZXR0aW5nLCBSZXBsYWNlVHlwZS5pbXAsIGxvYWRlci5yZXNvdXJjZVBhdGgsIG51bGwpO1xuLy8gXHRcdFx0Y29uc29sZS5sb2cocmVwbCk7XG4vLyBcdFx0fVxuLy8gXHR9XG4vLyBcdHJldHVybiBQcm9taXNlLnJlc29sdmUoY29udGVudCk7XG4vLyB9XG4iXX0=
