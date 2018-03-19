import api from '__api';
import * as _ from 'lodash';
import * as log4js from 'log4js';
import * as express from 'express';
var log = log4js.getLogger(api.packageName);
import doProxy from './proxy-handler';

export function activate() {
	// api.router().use('/', api.cors());
	testRouter();
	var multiProxies = api.config.get([api.packageName, 'proxies']);
	if (multiProxies) {
		_.each(multiProxies, (target, name) => useProxy(api.router(), target, name));
	} else {
		var proxyTo = api.config.get(api.packageName + '.proxyTo');
		if (proxyTo == null) {
			log.warn('No proxy configuration "%s" found', api.packageName + '.proxies');
			return;
		}
		useProxy(api.router(), proxyTo, '');
	}
}

var proxyInstances: {[k: string]: ProxyInstance} = {};
export function forName(name: string, opts?: {[k: string]: any}): ProxyInstance {
	if (proxyInstances[name])
		return proxyInstances[name];
	var p = new ProxyInstance(name, opts);
	proxyInstances[name] = p;
	return p;
}

export function forEach(callback: (proxyInstance: ProxyInstance) => void): void {
	var multiProxies = api.config.get([api.packageName, 'proxies']);
	if (multiProxies) {
		_.each(multiProxies, (target, name) => callback(forName(name)));
	} else {
		callback(forName(''));
	}
}
export type BodyHandler = (req: express.Request,
	hackedReqHeaders: {[name: string]: string},
	requestBody: any,
	lastResult: any) => any;

export type HeaderHandler = (req: express.Request, header: {[name: string]: any}) => void;
export class ProxyInstance {
	name: string;
	resHandlers: {[path: string]: Set<BodyHandler | HeaderHandler>} = {};
	reqHandlers: {[path: string]: Set<BodyHandler | HeaderHandler>} = {};
	mockHandlers: {[path: string]: Set<BodyHandler | HeaderHandler>} = {};
	resHeaderHandlers: {[path: string]: Set<HeaderHandler>} = {};
	constructor(name: string, private options: {[k: string]: any} = {}) {
		this.name = name;
	}

	get isRemoveCookieDomain(): boolean {
		return !!this.options.removeCookieDomain;
	}

	addOptions(opt: {[k: string]: any}): ProxyInstance {
		_.assign(this.options, opt);
		return this;
	}

	useProxy(router: any, target: string) {
		useProxy(router, target, this.name);
	}
	/**
	 * @param {*} path sub path after '/http-request-proxy'
	 * @param {*} handler (url: string, method:string,
	 * 	responseHeaders: {[name: string]:string}, responseBody: string | Buffer) => null | Promise<string>
	 */
	interceptResponse(path: string, handler: BodyHandler) {
		this.addHandler(path, handler, this.resHandlers);
	}
	interceptRequest(path: string, handler: BodyHandler) {
		this.addHandler(path, handler, this.reqHandlers);
	}
	mockResponse(path: string, handler: BodyHandler) {
		this.addHandler(path, handler, this.mockHandlers);
	}
	interceptResHeader(path: string, handler: HeaderHandler) {
		this.addHandler(path, handler, this.resHeaderHandlers);
	}
	private addHandler(path: string, handler: BodyHandler | HeaderHandler,
		to: {[path: string]: Set<BodyHandler | HeaderHandler>}) {
		if (path !== '*' && !_.startsWith(path, '/'))
			path = '/' + path;
		var list: Set<BodyHandler | HeaderHandler> = _.get(to, path);
		if (list == null) {
			list = new Set<BodyHandler | HeaderHandler>();
			to[path] = list;
		}
		list.add(handler);
	}
}

/**
 * Add proxy middlewares to a specific router path
	* @param {Route} router Express router instance, could be `api.router()`
	* @param {string} target a full http URL, e.g. https://www-demo.foobar.com
	* @param {string} proxyPath sub path the proxy middleware will be handling on
 */
export function useProxy(router: express.Router, target: string, proxyPath: string): void {
	if (proxyPath == null)
		proxyPath = '/';
	if (!proxyPath.startsWith('/'))
		proxyPath = '/' + proxyPath;
	target = _.trimEnd(target, '/');
	var proxyName = _.trimStart(proxyPath, '/');

	router.use(proxyPath, api.cors());
	router.use(proxyPath, (req: express.Request, res: express.Response) => {
		doProxy(target, req, res, forName(proxyName), proxyName);
	});
	log.info('Proxy %s to %s', proxyPath, target);
}

function testRouter(): void {
	api.router().use('/_test', (req: express.Request, res: express.Response) => {
		var s = '<pre>';
		s += JSON.stringify(req.headers, null, '\t') + '</pre>';
		_.forIn(req, (v, k) => {
			if (k.startsWith('_') || _.isFunction(v) || k === 'headers')
				return;
			try {
				log.info(k + ': ' + v);
				s += '<b>' + k + '</b>: ' + v + '<br/>';
			} catch (e) {
				log.error('cant resolve property %s', k);
			}
		});
		res.send(s);
	});
}
