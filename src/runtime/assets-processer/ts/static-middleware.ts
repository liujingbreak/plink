import serveZip from 'serve-static-zip';
import {Response, Handler} from 'express';
import Path from 'path';
import api from '__api';

const ms = require('ms');

export function createStaticRoute(staticDir: string, maxAgeMap?: {[extname: string]: string | number}): Handler {
	let maxAgeNumMap = parseMaxAgeMap(maxAgeMap);
	return api.express.static(staticDir, {setHeaders: createSetHeaderFunc(maxAgeNumMap)});
}

export function createZipRoute(maxAgeMap?: {[extname: string]: string}):
serveZip.ZipResourceMiddleware {
	const maxAgeNumMap = parseMaxAgeMap(maxAgeMap);
	const zss = serveZip('', {setHeaders: createSetHeaderFunc(maxAgeNumMap)});
	return zss;
}

function createSetHeaderFunc(maxAgeNumMap: {[extname: string]: number}) {
	return (res: Response, path: string, entry: any) => {
		var ext = Path.extname(path).toLowerCase();
		if (ext.startsWith('.'))
			ext = ext.substring(1);
		if (maxAgeNumMap[ext])
			setCacheControlHeader(res, maxAgeNumMap[ext]);
		res.setHeader('Access-Control-Allow-Origin', '*');
	};
}

function setCacheControlHeader(res: Response, _maxage = 0, immutable = false) {
	var cacheControl = 'public, max-age=' + Math.floor(_maxage / 1000);

	if (immutable) {
		cacheControl += ', immutable';
	}
	res.setHeader('Cache-Control', cacheControl);
}

function parseMaxAgeMap(maxAgeMap: {[extname: string]: string | number}) {
	let maxAgeNumMap: {[extname: string]: number} = {};
	if (maxAgeMap) {
		Object.keys(maxAgeMap).forEach(key => {
			const value = maxAgeMap[key];
			maxAgeNumMap[key] = typeof value === 'string' ? ms(value) : value;
		});
	} else {
		maxAgeNumMap = {};
	}
	return maxAgeNumMap;
}
