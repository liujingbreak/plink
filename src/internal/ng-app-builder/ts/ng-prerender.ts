// Load zone.js for the server.
import 'zone.js/dist/zone-node';
import 'reflect-metadata';
import { readFileSync, readFile, writeFileSync, existsSync, ensureDirSync } from 'fs-extra';
import { join, relative } from 'path';

import { enableProdMode } from '@angular/core';

import {Request, Response, NextFunction} from 'express';
import * as _ from 'lodash';
const log = require('log4js').getLogger('ng-prerender');
// const request = require('request');
// Faster server renders w/ Prod mode (dev mode never needed)
enableProdMode();

// Import module map for lazy loading
import { provideModuleMap } from '@nguniversal/module-map-ngfactory-loader';
import { renderModuleFactory } from '@angular/platform-server';

const ROUTE_MAP_FILE = 'prerender-routes.json';

export function writeRoutes(destDir: string, applName: string, ROUTES: string[]) {
	const mainServerExports = require(join(destDir, 'server', applName, 'main'));
	const indexHtmlFile = join(destDir, 'static', applName, 'index.html');
	const outputFolder = join(destDir, 'static', applName, '_prerender');
	const staticDir = join(destDir, 'static');
	// * NOTE :: leave this as require() since this file is built Dynamically from webpack
	const { AppServerModuleNgFactory, LAZY_MODULE_MAP } = mainServerExports;
	// Load the index.html file containing referances to your application bundle.
	const index = readFileSync(indexHtmlFile, 'utf8');

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
		previousRender = previousRender.then(_ => renderModuleFactory(AppServerModuleNgFactory, {
			document: index,
			url: route,
			extraProviders: [
				provideModuleMap(LAZY_MODULE_MAP)
			]
		})).then(html => {
			let wf = join(fullPath, 'index.html');
			writeFileSync(wf, html);
			log.info('Render %s page at ', route, wf);
			routerFileMap[route] = relative(staticDir, wf);
		});
	});
	previousRender.then(() => {
		const routeMapFile = join(outputFolder, ROUTE_MAP_FILE);
		writeFileSync(routeMapFile, JSON.stringify(routerFileMap, null, '  '), 'utf-8');
		log.info('write ', routeMapFile);
	});
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
		return (req: Request, res: Response, next: NextFunction) => {
			const route = _.trimEnd(req.originalUrl, '/');
			if (_.has(this.prerenderPages, route)) {
				log.info('Serve with prerender page for ', route);
				if (this.prerenderPages[route] === null) {
					readFile(join(this.staticDir, this.prerenderMap[route]), 'utf-8', (err, cont) => {
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
