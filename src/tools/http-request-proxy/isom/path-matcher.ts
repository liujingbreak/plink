import {DirTree} from './dir-tree';
import express from 'express';
import Url from 'url';
// import get from 'lodash/get';
// import trimStart from 'lodash/trimStart';
import trim from 'lodash/trim';
import escapeRegExp from 'lodash/escapeRegExp';

export {DirTree};
export interface MockContext {
	urlParam?: {[name: string]: string};
}

export type BodyHandler = (req: express.Request,
	hackedReqHeaders: {[name: string]: string},
	requestBody: any,
	lastResult: any, ctx: MockContext) => any;

export type HeaderHandler = (req: express.Request, header: {[name: string]: any}) => void;

export interface Handlers {
	[path: string]: Set<BodyHandler | HeaderHandler>;
}

export interface StoredHandler<H> {
	treePath: string;
	restingRegex?: RegExp;
	handler: H;
}

export function addToHandlerTree<H extends (BodyHandler | HeaderHandler)>(
	path: string, handler: H, tree: DirTree<StoredHandler<H>[]>) {
	if (path.startsWith('/'))
		path = path.slice(1);
	let leadingPath = path;
	const splittedPath = path.split('/');
	let restingRegex: RegExp | undefined;
	const paramIdx = splittedPath.findIndex(element => element.startsWith(':') || /\s*\*\s*/.test(element));
	if (paramIdx >= 0) {
		leadingPath = splittedPath.slice(0, paramIdx).join('/');
		restingRegex = new RegExp('^' + splittedPath.slice(paramIdx).map(el => {
			if (el.startsWith(':')) {
				return '([^/]+)';
			} else if (el === '*') {
				return '.*';
			} else {
				return escapeRegExp(el);
			}
		}).join('\\/') + '$');
		// tslint:disable-next-line:no-console
		console.log(`path ${path}'s regexp:`, restingRegex);
	}

	const data: StoredHandler<H> = {
		handler,
		treePath: leadingPath,
		restingRegex
	};
	const existing = tree.getData(leadingPath);
	if (existing) {
		existing.push(data);
	} else {
		tree.putData(leadingPath, [data]);
	}
}

export function matchedHandlers<H>(tree: DirTree<StoredHandler<H>[]>, reqUrl: string): H[] {
	reqUrl = trim(reqUrl, '/');
	const found: H[] = [];
	lookup(found, tree, reqUrl);
	const parsedReqUrl = Url.parse(reqUrl);
	if (parsedReqUrl.query) {
		lookup(found, tree, parsedReqUrl.pathname || '');
	}
	return found;
}

function lookup<H>(found: H[], tree: DirTree<StoredHandler<H>[]>, reqUrl: string) {
	tree.getAllData(reqUrl).forEach(shandlers => {
		for (const sh of shandlers) {
			let restingReqUrl = reqUrl.slice(sh.treePath.length);
			restingReqUrl = trim(restingReqUrl, '/');
			if (sh.restingRegex == null) {
				if (restingReqUrl.length === 0) {
					found.push(sh.handler);
					continue;
				}
				continue;
			}
			const re = sh.restingRegex.exec(restingReqUrl);
			if (re) {
				found.push(sh.handler);
			}
		}
		return false;
	});
}


