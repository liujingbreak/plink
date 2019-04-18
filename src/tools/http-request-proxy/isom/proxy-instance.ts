import * as _ from 'lodash';
import * as express from 'express';
import Url from 'url';
// import {IncomingHttpHeaders} from 'http';

export type HeaderHandler = (req: express.Request, header: {[name: string]: any}) => void;

// export interface IsomRequest {
// 	method: string;
// 	url: string;
// 	headers: IncomingHttpHeaders;
// 	body: any;
// 	query: any;
// 	responseType: 'arraybuffer' | 'blob' | 'json' | 'text';
// }
export type BodyHandler = (req: express.Request,
	hackedReqHeaders: {[name: string]: string},
	requestBody: any,
	lastResult: any) => any;

export interface Handlers {
	[path: string]: Set<BodyHandler | HeaderHandler>;
}
interface HandlerParams {
	req: express.Request;
	headers: {[k: string]: any};
	body: any;
	result?: any;
}
export function intercept(req: express.Request, headers: {[k: string]: any}, body: any,
	resHandlers: Handlers, name: string): Promise<any> {
	var bodyHandlerProm: Promise<HandlerParams>;
	var handlers: BodyHandler[] = _filterHandlers(req, resHandlers);
	if (handlers.length > 0) {
		bodyHandlerProm = Promise.resolve({req, headers, body});
		handlers.forEach(func => {
			bodyHandlerProm = bodyHandlerProm.then(data => {
				const resolvedRes = func(data.req, data.headers, data.body, data.result);
				if (resolvedRes != null) {
					return Promise.resolve(resolvedRes)
					.then(result => {
						return Object.assign(data, {result});
					});
				}
				return Promise.resolve(data);
			});
		});
		bodyHandlerProm = bodyHandlerProm.then(data => data.result);
	} else {
		bodyHandlerProm = Promise.resolve(null);
	}
	return bodyHandlerProm;
}
function _filterHandlers(req: express.Request, resHandlers: {[path: string]: Set<BodyHandler|HeaderHandler>}) {
	var handlers: Array<BodyHandler|HeaderHandler> = [];
	var handlerSet = _.get(resHandlers, Url.parse(req.url).pathname);
	if (handlerSet)
		handlers.push(...handlerSet.values());
	var defaultHandlerSet = resHandlers['*'];
	if (defaultHandlerSet)
		handlers.push(...defaultHandlerSet.values());
	return handlers;
}
export class ProxyInstanceForBrowser {
	name: string;
	resHandlers: Handlers = {};
	reqHandlers: Handlers = {};
	mockHandlers: Handlers = {};
	resHeaderHandlers: {[path: string]: Set<HeaderHandler>} = {};
	constructor(name: string, protected options: {[k: string]: any} = {}) {
		this.name = name;
	}

	get isRemoveCookieDomain(): boolean {
		return !!this.options.removeCookieDomain;
	}

	addOptions(opt: {[k: string]: any}): ProxyInstanceForBrowser {
		_.assign(this.options, opt);
		return this;
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

export type MockSetupFunc = (proxy: ProxyInstanceForBrowser, forName?: (name: string) =>
	ProxyInstanceForBrowser) => void;
