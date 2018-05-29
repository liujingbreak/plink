import {TemplateParser, AttributeValueAst, TagAst} from '../utils/ng-html-parser';
import patchText, {Replacement as Rep} from '../utils/patch-text';
const api = require('__api');
const log = require('log4js').getLogger('ng-html-loader');
import * as _ from 'lodash';
const vm = require('vm');

export = function(content: string, map: any) {
	var callback = this.async();
	if (!callback) {
		this.emitError('loader does not support sync mode');
		throw new Error('loader does not support sync mode');
	}
	load(content, this)
	.then(result => this.callback(null, result, map))
	.catch(err => {
		this.callback(err);
		this.emitError(err);
		log.error(err);
	});
};

const toCheckNames = ['href', 'src', 'ng-src', 'ng-href', 'srcset'];

async function load(content: string, loader: any) {
	let ast = new TemplateParser(content).parse();
	let proms: Array<PromiseLike<any>> = [];
	let replacements: Rep[] = [];
	for (let el of ast) {
		for (let name of toCheckNames) {
			if (_.has(el.attrs, name)) {
				proms.push(doAttrAssetsUrl(name, el.attrs[name], el, replacements, loader));
			}
		}
	}
	await Promise.all(proms);
	let updated = patchText(content, replacements);
	// log.warn(updated);
	return updated;
}

function doAttrAssetsUrl(attrName: string, valueToken: AttributeValueAst,
	el: TagAst, replacements: Rep[], loader: any): PromiseLike<any> {
	if (!valueToken)
		return;
	if (attrName === 'srcset') {
		// img srcset
		return doSrcSet(valueToken.text, loader)
			.then(value => replacements.push(new Rep(valueToken.start, valueToken.end, value)));
	} else if (attrName === 'src' && el.name.toUpperCase() === 'IMG') {
		// img src
		return doLoadAssets(valueToken.text, loader)
			.then(url => {
				replacements.push(new Rep(valueToken.start, valueToken.end, url));
			});
	} else { // href, ng-src
		resolveUrl(valueToken.text, loader)
			.then(url => replacements.push(new Rep(valueToken.start, valueToken.end, url)));
	}
}

function doSrcSet(value: string, loader: any) {
	var prom = value.split(/\s*,\s*/).map(urlSet => {
		urlSet = _.trim(urlSet);
		let factors = urlSet.split(/\s+/);
		let image = factors[0];
		return doLoadAssets(image, loader)
		.then(url => {
			return url + ' ' + factors[1];
		});
	});
	return Promise.all(prom)
	.then(urlSets => urlSets.join(', '));
}

function resolveUrl(href: string, loader: any) {
	var res = api.normalizeAssetsUrl(href, loader.resourcePath);
	if (_.isObject(res)) {
		return Promise.resolve(res.isPage ?
			api.entryPageUrl(res.packageName, res.path, res.locale) :
			api.assetsUrl(res.packageName, res.path));
	}
	return Promise.resolve(href);
}

function doLoadAssets(src: string, loader: any) {
	var res = api.normalizeAssetsUrl(src, loader.resourcePath);
	if (_.isObject(res)) {
		return Promise.resolve(res.isPage ?
			api.entryPageUrl(res.packageName, res.path, res.locale) :
			api.assetsUrl(res.packageName, res.path));
	}
	if (/^(?:https?:|\/\/|data:)/.test(src))
		return Promise.resolve(src);
	if (src.charAt(0) === '/')
		return Promise.resolve(src);
	if (src.charAt(0) !== '.')
		src = './' + src;
	return new Promise((resolve, reject) => {
		// Unlike extract-loader, we does not support embedded require statement in source code 
		loader.loadModule(src, (err: Error, source: any, sourceMap: any, module: any) => {
			if (err)
				return reject(err);
			var sandbox = {
				__webpack_public_path__: loader._compiler.options.output.publicPath,
				module: {
					exports: {}
				}
			};
			vm.runInNewContext(source, vm.createContext(sandbox));
			log.warn(loader.resourcePath + ', assets: ', src, 'to', sandbox.module.exports);
			resolve(sandbox.module.exports);
		});
	});
}
