import assign from 'lodash/assign';
import * as express from 'express';
import {BodyHandler, HeaderHandler} from './path-matcher';
import * as pm from './path-matcher';
// import {IncomingHttpHeaders} from 'http';

// export interface IsomRequest {
// 	method: string;
// 	url: string;
// 	headers: IncomingHttpHeaders;
// 	body: any;
// 	query: any;
// 	responseType: 'arraybuffer' | 'blob' | 'json' | 'text';
// }

interface HandlerParams {
	req: express.Request;
	headers: {[k: string]: any};
	body: any;
	result?: any;
}
export function intercept(req: express.Request, headers: {[k: string]: any}, body: any,
	resHandlers: pm.DirTree<pm.StoredHandler<BodyHandler>[]>, name: string): Promise<HandlerParams|null> {
	// console.log(resHandlers.toString());
	var bodyHandlerProm: Promise<HandlerParams>;
	var handlers: BodyHandler[] = pm.matchedHandlers(resHandlers, req.url);
	if (handlers.length > 0) {
		bodyHandlerProm = Promise.resolve({req, headers, body});
		handlers.forEach(func => {
			bodyHandlerProm = bodyHandlerProm.then(data => {
				const resolvedRes = func(data.req, data.headers, data.body, data.result, {});
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
		return Promise.resolve(null);
	}
	return bodyHandlerProm;
}
// function _filterHandlers(req: express.Request, resHandlers: {[path: string]: Set<BodyHandler|HeaderHandler>}) {
// 	var handlers: Array<BodyHandler|HeaderHandler> = [];
// 	const parsedUrl = Url.parse(req.url);
// 	if (parsedUrl.pathname == null)
// 		return [];
// 	var handlerSet = get(resHandlers, parsedUrl.pathname);
// 	if (handlerSet)
// 		handlers.push(...handlerSet.values());
// 	var defaultHandlerSet = resHandlers['*'];
// 	if (defaultHandlerSet)
// 		handlers.push(...defaultHandlerSet.values());
// 	return handlers;
// }
export class ProxyInstanceForBrowser {
	name: string;
	resHandlers: pm.DirTree<pm.StoredHandler<BodyHandler>[]> = new pm.DirTree();
	reqHandlers: pm.DirTree<pm.StoredHandler<BodyHandler>[]> = new pm.DirTree();
	mockHandlers: pm.DirTree<pm.StoredHandler<BodyHandler>[]> = new pm.DirTree();
	resHeaderHandlers: pm.DirTree<pm.StoredHandler<HeaderHandler>[]> = new pm.DirTree();
	constructor(name: string, protected options: {[k: string]: any} = {}) {
		this.name = name;
	}

	get isRemoveCookieDomain(): boolean {
		return !!this.options.removeCookieDomain;
	}

	addOptions(opt: {[k: string]: any}): ProxyInstanceForBrowser {
		assign(this.options, opt);
		return this;
	}
	/**
	 * @deprecated
	 * @param {*} path sub path after '/http-request-proxy'
	 * @param {*} handler (url: string, method:string,
	 * 	responseHeaders: {[name: string]:string}, responseBody: string | Buffer) => null | Promise<string>
	 */
	interceptResponse(path: string, handler: BodyHandler) {
		pm.addToHandlerTree(path, handler, this.resHandlers);
	}
	/** @deprecated */
	interceptRequest(path: string, handler: BodyHandler) {
		pm.addToHandlerTree(path, handler, this.reqHandlers);
	}
	/**
	 * 
	 * @param path {string} a URI string in format of Url's pathname, support path parameterized path name
	 *  begin with ":" or wildcard "*", e.g.
	 *   "/foo/bar/:id/resting-path", "/foo/bar/*" and "*"
	 * @param handler 
	 */
	mockResponse(path: string, handler: BodyHandler) {
		pm.addToHandlerTree(path, handler, this.mockHandlers);
	}
	/**@deprecated */
	interceptResHeader(path: string, handler: HeaderHandler) {
		pm.addToHandlerTree(path, handler, this.resHeaderHandlers);
	}
}

export type MockSetupFunc = (proxy: ProxyInstanceForBrowser, forName?: (name: string) =>
	ProxyInstanceForBrowser) => void;
