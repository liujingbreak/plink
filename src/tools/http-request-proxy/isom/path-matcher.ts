import {DirTree} from './dir-tree';
import express from 'express';
// import Url from 'url';
// import get from 'lodash/get';
import trimStart from 'lodash/trimStart';
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
	restingPath: string;
	restingRegex: RegExp;
	handler: H;
}

export function addToHandlerTree<H extends (BodyHandler | HeaderHandler)>(
	path: string, handler: H, tree: DirTree<StoredHandler<H>>) {

	if (path.startsWith('/'))
		path = path.slice(1);
	let leadingPath = path;
	const splittedPath = path.split('/');
	const paramIdx = splittedPath.findIndex(element => element.startsWith(':') || /\s*\*\s*/.test(element));
	if (paramIdx >= 0) {
		leadingPath = splittedPath.slice(0, paramIdx).join('/');
	}
	tree.putData(leadingPath, {
		handler,
		treePath: leadingPath,
		restingPath: path.slice(leadingPath.length),
		restingRegex: new RegExp(splittedPath.slice(paramIdx).map(el => {
			if (el.startsWith(':')) {
				return '([^/]+)';
			} else if (el === '*') {
				return '.*';
			} else {
				return escapeRegExp(el);
			}
		}).join('\\/'))
	});
}

export function matchedHandlers<H>(tree: DirTree<StoredHandler<H>>, reqUrl: string): H[] {
	reqUrl = trimStart(reqUrl);
	const found = tree.getAllData(reqUrl).filter(sh => {
		let restingReqUrl = reqUrl.slice(sh.treePath.length);
		restingReqUrl = trimStart(restingReqUrl, '/');
		const re = sh.restingRegex.exec(restingReqUrl);
		if (re) {
			return true;
		}
		return false;
	}).map(sh => sh.handler);
	return found;
}


