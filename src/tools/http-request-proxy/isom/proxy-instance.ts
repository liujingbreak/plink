import * as _ from 'lodash';
import * as express from 'express';

export type HeaderHandler = (req: express.Request, header: {[name: string]: any}) => void;

export type BodyHandler = (req: express.Request,
	hackedReqHeaders: {[name: string]: string},
	requestBody: any,
	lastResult: any) => any;

export class ProxyInstanceForBrowser {
	name: string;
	resHandlers: {[path: string]: Set<BodyHandler | HeaderHandler>} = {};
	reqHandlers: {[path: string]: Set<BodyHandler | HeaderHandler>} = {};
	mockHandlers: {[path: string]: Set<BodyHandler | HeaderHandler>} = {};
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
