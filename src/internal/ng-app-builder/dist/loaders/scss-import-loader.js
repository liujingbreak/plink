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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Nzcy1pbXBvcnQtbG9hZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2Nzcy1pbXBvcnQtbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDJCQUEyQjtBQUMzQix3RUFBd0U7QUFDeEUscUVBQXFFO0FBQ3JFLDZFQUE2RTtBQUM3RSxpRUFBaUU7QUFFakUsbUJBQW1CO0FBQ25CLCtDQUErQztBQUMvQyxnQ0FBZ0M7QUFDaEMsb0JBQW9CO0FBQ3BCLHlEQUF5RDtBQUN6RCwwREFBMEQ7QUFDMUQsS0FBSztBQUNMLHVCQUF1QjtBQUN2QixxREFBcUQ7QUFDckQsbUJBQW1CO0FBQ25CLHdCQUF3QjtBQUN4Qix5QkFBeUI7QUFDekIsb0JBQW9CO0FBQ3BCLE9BQU87QUFDUCxJQUFJO0FBRUosdUVBQXVFO0FBQ3ZFLDhGQUE4RjtBQUM5Riw2QkFBNkI7QUFDN0IscUNBQXFDO0FBQ3JDLGdGQUFnRjtBQUNoRixxQ0FBcUM7QUFDckMsZUFBZTtBQUNmLG9DQUFvQztBQUNwQywrREFBK0Q7QUFDL0QsMEJBQTBCO0FBQzFCLGdCQUFnQjtBQUNoQiw4RkFBOEY7QUFDOUYsd0JBQXdCO0FBQ3hCLE1BQU07QUFDTixLQUFLO0FBQ0wsb0NBQW9DO0FBQ3BDLElBQUkiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBpbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbi8vIC8vIGltcG9ydCBwYXRjaFRleHQsIHtSZXBsYWNlbWVudCBhcyBSZXB9IGZyb20gJy4uL3V0aWxzL3BhdGNoLXRleHQnO1xuLy8gaW1wb3J0IHtTY3NzUGFyc2VyLCBTY3NzTGV4ZXJ9IGZyb20gJy4uL3V0aWxzL3NpbXBsZS1zY3NzLXBhcnNlcic7XG4vLyBpbXBvcnQge0ZhY3RvcnlNYXAsIFJlcGxhY2VUeXBlfSBmcm9tICdyZXF1aXJlLWluamVjdG9yL2Rpc3QvZmFjdG9yeS1tYXAnO1xuLy8gY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdzY3NzLWltcG9ydC1sb2FkZXInKTtcblxuLy8gZXhwb3J0ID0gbG9hZGVyO1xuLy8gZnVuY3Rpb24gbG9hZGVyKGNvbnRlbnQ6IHN0cmluZywgbWFwOiBhbnkpIHtcbi8vIFx0dmFyIGNhbGxiYWNrID0gdGhpcy5hc3luYygpO1xuLy8gXHRpZiAoIWNhbGxiYWNrKSB7XG4vLyBcdFx0dGhpcy5lbWl0RXJyb3IoJ2xvYWRlciBkb2VzIG5vdCBzdXBwb3J0IHN5bmMgbW9kZScpO1xuLy8gXHRcdHRocm93IG5ldyBFcnJvcignbG9hZGVyIGRvZXMgbm90IHN1cHBvcnQgc3luYyBtb2RlJyk7XG4vLyBcdH1cbi8vIFx0bG9hZChjb250ZW50LCB0aGlzKVxuLy8gXHQudGhlbihyZXN1bHQgPT4gdGhpcy5jYWxsYmFjayhudWxsLCByZXN1bHQsIG1hcCkpXG4vLyBcdC5jYXRjaChlcnIgPT4ge1xuLy8gXHRcdHRoaXMuY2FsbGJhY2soZXJyKTtcbi8vIFx0XHR0aGlzLmVtaXRFcnJvcihlcnIpO1xuLy8gXHRcdGxvZy5lcnJvcihlcnIpO1xuLy8gXHR9KTtcbi8vIH1cblxuLy8gYXN5bmMgZnVuY3Rpb24gbG9hZChjb250ZW50OiBzdHJpbmcsIGxvYWRlcjogYW55KTogUHJvbWlzZTxzdHJpbmc+IHtcbi8vIFx0Y29uc3QgZmFjTWFwczogRmFjdG9yeU1hcFtdID0gYXBpLmJyb3dzZXJJbmplY3Rvci5mYWN0b3J5TWFwc0ZvckZpbGUobG9hZGVyLnJlc291cmNlUGF0aCk7XG4vLyBcdGlmIChmYWNNYXBzLmxlbmd0aCA9PT0gMClcbi8vIFx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGNvbnRlbnQpO1xuLy8gXHRmb3IgKGNvbnN0IHRva2VuIG9mIG5ldyBTY3NzUGFyc2VyKG5ldyBTY3NzTGV4ZXIoY29udGVudCkpLmdldEFsbEltcG9ydCgpKSB7XG4vLyBcdFx0aWYgKCF0b2tlbi50ZXh0LnN0YXJ0c1dpdGgoJ34nKSlcbi8vIFx0XHRcdGNvbnRpbnVlO1xuLy8gXHRcdGZvciAoY29uc3QgZmFjTWFwIG9mIGZhY01hcHMpIHtcbi8vIFx0XHRcdGNvbnN0IHNldHRpbmcgPSBmYWNNYXAubWF0Y2hSZXF1aXJlKHRva2VuLnRleHQuc2xpY2UoMSkpO1xuLy8gXHRcdFx0aWYgKHNldHRpbmcgPT0gbnVsbClcbi8vIFx0XHRcdFx0Y29udGludWU7XG4vLyBcdFx0XHRjb25zdCByZXBsID0gZmFjTWFwLmdldFJlcGxhY2VtZW50KHNldHRpbmcsIFJlcGxhY2VUeXBlLmltcCwgbG9hZGVyLnJlc291cmNlUGF0aCwgbnVsbCk7XG4vLyBcdFx0XHRjb25zb2xlLmxvZyhyZXBsKTtcbi8vIFx0XHR9XG4vLyBcdH1cbi8vIFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZShjb250ZW50KTtcbi8vIH1cbiJdfQ==