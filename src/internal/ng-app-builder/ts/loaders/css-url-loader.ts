import api from '__api';
import * as wb from 'webpack';
import {publicUrl} from 'dr-comp-package/wfh/dist/assets-url';
// import * as Path from 'path';
// import * as _ from 'lodash';
import vm = require('vm');
import patchText, {ReplacementInf} from '../utils/patch-text';
import {Observable, of} from 'rxjs';
import {concatMap, map} from 'rxjs/operators';
import {ScssParser, ScssLexer} from '../utils/simple-scss-parser';
// import {loader as wbLoader} from 'webpack';
const log = require('log4js').getLogger(api.packageName + '/css-url-loader');

const urlLoader: wb.loader.Loader = function(content: string, map) {
	var callback = this.async();
	var file = this.resourcePath;
	const self = this;
	const replacements: ReplacementInf[] = [];

	replaceUrl(this, content, file).subscribe({
		next(repl) {
			replacements.push(repl);
		},
		error(e) {
			self.emitError(e);
			log.error(e);
			callback(e);
		},
		complete() {
			const replaced = patchText(content, replacements);
			if (replacements.length > 0)
				log.debug(file, replaced);
			callback(null, replaced, map);
		}
	});
};

export = urlLoader;

function replaceUrl(loaderCtx: wb.loader.LoaderContext, css: string, file: string): Observable<ReplacementInf> {
	return new Observable<ReplacementInf>(subscriber => {
		const lexer = new ScssLexer(css);
		const parser = new ScssParser(lexer);
		const resUrls = parser.getResUrl(css);
		for (const {start, end, text} of resUrls) {
			subscriber.next({start, end, text} as ReplacementInf);
		}
		subscriber.complete();
	}).pipe(concatMap( repl => {
		var resolvedTo = replaceAssetsUrl(file, repl.text);
		if (resolvedTo.startsWith('~')) {
			return loadModule(loaderCtx, repl.text.slice(1)).pipe(map(url => {
				repl.text = url;
				return repl;
			}));
		} else if (!resolvedTo.startsWith('/') && !resolvedTo.startsWith('#') && resolvedTo.indexOf(':') < 0) {
			return loadModule(loaderCtx, repl.text).pipe(map(url => {
				repl.text = url;
				return repl;
			}));
		} else {
			log.debug('url: %s  -> %s', repl.text, resolvedTo);
			return of(repl);
		}
	}));
}

function loadModule(loaderCtx: wb.loader.LoaderContext, url: string) {
	return new Observable<string>(loadModuleSub => {
		loaderCtx.loadModule(url, (err: Error, source: any) => {
			if (err)
				return loadModuleSub.error(err);
			var sandbox = {
				// Later on, Angular's postcss plugin will prefix `deployUrl/publicPath` to url string
				__webpack_public_path__: '/',
				module: {
					exports: {}
				}
			};
			vm.runInNewContext(source, vm.createContext(sandbox));
			const newUrl = sandbox.module.exports as string;
			loadModuleSub.next(newUrl);
			log.debug('url: %s  -> %s', url, newUrl);
			loadModuleSub.complete();
		});
	});
}

function replaceAssetsUrl(file: string, url: string) {
	var res = api.normalizeAssetsUrl(url, file);
	if (typeof res === 'string')
		return res;
	else if (res.isTilde)
		return `~${res.packageName}/${res.path}`;
	else
		return publicUrl('', api.config().outputPathMap, null, res.packageName, res.path);
}
