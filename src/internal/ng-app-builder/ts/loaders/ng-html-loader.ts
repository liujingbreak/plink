import {TemplateParser, AttributeValueAst, TagAst} from '../utils/ng-html-parser';
import {RawSourceMap} from 'source-map';
import patchText, {Replacement as Rep} from '../utils/patch-text';
import api from '__api';
import {loader as wbLoader} from 'webpack';
const log = require('log4js').getLogger('ng-html-loader');
import * as _ from 'lodash';
import vm = require('vm');
const chalk = require('chalk');

function loader(content: string, map?: RawSourceMap) {
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
}

namespace loader {
	export const compileHtml = load;
}

export = loader;

const toCheckNames = ['href', 'src', 'ng-src', 'ng-href', 'srcset', 'routerLink'];

async function load(content: string, loader: wbLoader.LoaderContext) {
	const ast = new TemplateParser(content).parse();
	const proms: Array<PromiseLike<any>> = [];
	const replacements: Rep[] = [];
	for (const el of ast) {
		for (const name of toCheckNames) {
			if (_.has(el.attrs, name)) {
				if (el.attrs[name].isNg || el.attrs[name].value == null)
					continue;
				proms.push(doAttrAssetsUrl(name, el.attrs[name].value, el, replacements, loader));
			}
		}
	}
	await Promise.all(proms);
	const updated = patchText(content, replacements);
	return updated;
}

async function doAttrAssetsUrl(attrName: string, valueToken: AttributeValueAst,
	el: TagAst, replacements: Rep[], loader: wbLoader.LoaderContext): Promise<any> {
	if (!valueToken)
		return;
	if (attrName === 'srcset') {
		// img srcset
		const value = await doSrcSet(valueToken.text, loader);
		replacements.push(new Rep(valueToken.start, valueToken.end, value));
	} else if (attrName === 'src') {
		// img src
		const url = await doLoadAssets(valueToken.text, loader);
		replacements.push(new Rep(valueToken.start, valueToken.end, url));
	} else { // href, ng-src, routerLink
		const url = await resolveUrl(valueToken.text, loader);
		replacements.push(new Rep(valueToken.start, valueToken.end, url));
	}
}

function doSrcSet(value: string, loader: wbLoader.LoaderContext) {
	var prom = value.split(/\s*,\s*/).map(urlSet => {
		urlSet = _.trim(urlSet);
		const factors = urlSet.split(/\s+/);
		const image = factors[0];
		return doLoadAssets(image, loader)
		.then(url => {
			return url + ' ' + factors[1];
		});
	});
	return Promise.all(prom)
	.then(urlSets => urlSets.join(', '));
}

function resolveUrl(href: string, loader: wbLoader.LoaderContext) {
	if (href === '')
		return Promise.resolve(href);
	var res = api.normalizeAssetsUrl(href, loader.resourcePath);
	if (_.isObject(res)) {
		const resolved = res.isPage ?
			api.entryPageUrl(res.packageName, res.path, res.locale) :
			api.assetsUrl(res.packageName, res.path);
		log.info(`resolve URL/routePath ${chalk.yellow(href)} to ${chalk.cyan(resolved)},\n` +
			chalk.grey(loader.resourcePath));
		return Promise.resolve(resolved);
	}
	return Promise.resolve(href);
}

function doLoadAssets(src: string, loader: wbLoader.LoaderContext) {
	if (src.startsWith('assets://') || src.startsWith('page://')) {
		const res = api.normalizeAssetsUrl(src, loader.resourcePath);
		if (_.isObject(res)) {
			return Promise.resolve(res.isPage ?
				api.entryPageUrl(res.packageName, res.path, res.locale) :
				api.assetsUrl(res.packageName, res.path));
		}
	}

	if (/^(?:https?:|\/\/|data:)/.test(src))
		return Promise.resolve(src);
	if (src.charAt(0) === '/')
		return Promise.resolve(src);
	if (src.charAt(0) === '~') {
		src = src.substring(1);
	} else if (src.startsWith('npm://')) {
		src = src.substring('npm://'.length);
	} else if (src.charAt(0) !== '.' && src.trim().length > 0 && src.indexOf('{') < 0)
		src = './' + src;

	// console.log(api.packageName, loader.resourcePath, src);
	return new Promise<string>((resolve, reject) => {
		// Unlike extract-loader, we does not support embedded require statement in source code 
		loader.loadModule(src, (err: Error, source: any, sourceMap: any, module: any) => {
			if (err)
				return reject(err);
			var sandbox = {
				__webpack_public_path__: _.get(loader, '_compiler.options.output.publicPath', api.config().publicPath),
				module: {
					exports: {}
				}
			};
			vm.runInNewContext(source, vm.createContext(sandbox));
			resolve(sandbox.module.exports as string);
		});
	});
}
