// Load zone.js for the server.
import 'zone.js/dist/zone-node';
import 'reflect-metadata';
import { readFileSync, readFile, writeFileSync, existsSync, ensureDirSync } from 'fs-extra';
import { join, relative, sep } from 'path';

import { enableProdMode } from '@angular/core';

import {Request, Response, NextFunction} from 'express';
import * as _ from 'lodash';
const log = require('log4js').getLogger('ng-prerender');
import api from '__api';
import { provideModuleMap } from '@nguniversal/module-map-ngfactory-loader';
import { renderModuleFactory } from '@angular/platform-server';

const domino = require('domino');

const ROUTE_MAP_FILE = 'prerender-routes.json';
enableProdMode();

function setupGlobals(indexHtml: string, url?: string) {
	const window: any = domino.createWindow(indexHtml, url);
	(global as any).window = window;
	(global as any).document = window.document;
}

export function writeRoutes(destDir: string, applName: string, ROUTES: string[]): Promise<string> {
	const indexHtmlFile = join(destDir, 'static', applName, 'index.html');
	const index = readFileSync(indexHtmlFile, 'utf8');
	setupGlobals(index);
	const mainServerExports = require(join(destDir, 'server', applName, 'main'));
	const outputFolder = join(destDir, 'static', applName, '_prerender');
	const staticDir = join(destDir, 'static');
	// * NOTE :: leave this as require() since this file is built Dynamically from webpack
	const { AppServerModuleNgFactory, LAZY_MODULE_MAP } = mainServerExports;
	// Load the index.html file containing referances to your application bundle.

	let previousRender = Promise.resolve();
	let routerFileMap: {[route: string]: string} = {};
	// Iterate each route path
	ROUTES.forEach(route => {
		route = _.trimEnd(route, '/');
		const fullPath = join(outputFolder, route);

		// Make sure the directory structure is there
		if (!existsSync(fullPath)) {
			ensureDirSync(fullPath);
		}
		// Writes rendered HTML to index.html, replacing the file if it already exists.
		previousRender = previousRender.then(_ => {
			return renderModuleFactory(AppServerModuleNgFactory, {
				document: index,
				url: route,
				extraProviders: [
					provideModuleMap(LAZY_MODULE_MAP)
			]});
		}).then(html => {
			let wf = join(fullPath, 'index.html');
			writeFileSync(wf, html);
			log.info('Render %s page at ', route, wf);
			let indexFile = relative(staticDir, wf);
			if (sep === '\\')
				indexFile = indexFile.replace(/\\/g, '/');
			routerFileMap[route] = indexFile;
		});
	});
	return previousRender.then(() => {
		const routeMapFile = join(outputFolder, ROUTE_MAP_FILE);
		writeFileSync(routeMapFile, JSON.stringify(routerFileMap, null, '  '), 'utf-8');
		log.info('write ', routeMapFile);
		return routeMapFile;
	});
}

export async function writeRoutesWithLocalServer(destDir: string, applName: string, ROUTES: string[]) {
	const pkMgr = require('dr-comp-package/wfh/lib/packageMgr');
	const shutdown: () => void = await pkMgr.runServer(api.argv);
	let mapFile: string;
	try {
		mapFile = await writeRoutes(destDir, applName, ROUTES);
	} catch (err) {
		throw err;
	} finally {
		await shutdown();
		await new Promise((resolve) => {
			require('log4js').shutdown(resolve);
		});
	}
	return mapFile;
}

export class PrerenderForExpress {
	noPrerender = false;
	prerenderPages: {[route: string]: string} = {};
	// lastQueried: Map<string, number> = new Map();
	prerenderMap: {[route: string]: string};
	prerenderMapFile: string;

	constructor(public staticDir: string, public applName: string) {
		this.prerenderMapFile = join(this.staticDir, this.applName, '_prerender', ROUTE_MAP_FILE);
		this.noPrerender = !existsSync(this.prerenderMapFile);
		if (this.noPrerender) {
			log.warn('No prerender files found in ', this.prerenderMapFile);
			return;
		}
		this.queryPrerenderPages();
	}

	asMiddleware() {
		if (api.argv.hmr) {
			log.warn('Hot module replacement mode is on, no prerendered page will be served\n');
			return (req: Request, res: Response, next: NextFunction) => next();
		}
		return (req: Request, res: Response, next: NextFunction) => {
			if (req.method !== 'GET')
				return next();
			const route = _.trimEnd(req.originalUrl, '/');
			if (_.has(this.prerenderPages, route)) {
				log.info('Serve with prerender page for ', route);
				if (this.prerenderPages[route] === null) {
					readFile(join(this.staticDir, this.prerenderMap[route]), 'utf-8', (err, cont) => {
						if (err) {
							log.error('Failed to read prerendered page: ' + this.prerenderMap[route], err);
							next();
						}
						this.prerenderPages[route] = cont;
						res.send(cont);
					});
				} else {
					res.send(this.prerenderPages[route]);
				}
			} else {
				next();
			}
		};
	}

	protected queryPrerenderPages() {
		if (this.noPrerender)
			return;
		readFile(this.prerenderMapFile, 'utf-8', (err, content) => {
			this.prerenderMap = JSON.parse(content);
			_.forEach(this.prerenderMap, (file, route) => {
				this.prerenderPages[route] = null;
			});
		});
	}
}
