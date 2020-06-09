// tslint:disable:no-console
// Load zone.js for the server.
import 'zone.js/dist/zone-node';
import 'reflect-metadata';
import { readFileSync, writeFileSync, existsSync, ensureDirSync } from 'fs-extra';
import { join, relative, sep, dirname } from 'path';

import { enableProdMode } from '@angular/core';

import * as _ from 'lodash';
const log = require('log4js').getLogger('ng-prerender');
import api from '__api';
import { provideModuleMap } from '@nguniversal/module-map-ngfactory-loader';
import { renderModuleFactory } from '@angular/platform-server';
import {ROUTE_MAP_FILE} from '@dr-core/assets-processer/dist/ng-prerender';

const domino = require('domino');

enableProdMode();

function setupGlobals(indexHtml: string, url?: string) {
  const window: any = domino.createWindow(indexHtml, url);
  if ((global as any).window) {
    Object.assign(window, (global as any).window);
  }
  (global as any).window = window;
  (global as any).document = window.document;
}

/**
 * Write static prerender pages
 * @param staticDir dist/static
 * @param htmlFile dist/static/<app>/index.html
 * @param mainFile dist/server/main.js file path which can be require.resolve, should be corresponding to angular.json
 * @param ROUTES 
 */
async function writeRoutes(staticDir: string, htmlFile: string, mainFile: string, ROUTES: string[],
  _outputFolder?: string): Promise<string> {
  const index = readFileSync(htmlFile, 'utf8');
  setupGlobals(index);
  if (_outputFolder == null)
    _outputFolder = join(dirname(htmlFile), '_prerender');
  const outputFolder = _outputFolder;
  // * NOTE :: leave this as require() since this file is built Dynamically from webpack
  log.info('main file:', mainFile);

  const htmlMap = await renderRoutes(index, mainFile, ROUTES);
  // Load the index.html file containing referances to your application bundle.

  const routerFileMap: {[route: string]: string} = {};
  // Iterate each route path
  for (const [route, html] of Object.entries(htmlMap)) {
    const fullPath = join(outputFolder, route);

    // Make sure the directory structure is there
    if (!existsSync(fullPath)) {
      ensureDirSync(fullPath);
    }
    const wf = join(fullPath, 'index.html');
    writeFileSync(wf, html);
    log.info('Render %s page at ', route, wf);
    let indexFile = relative(staticDir, wf);
    if (sep === '\\')
      indexFile = indexFile.replace(/\\/g, '/');
    routerFileMap[route] = indexFile;
  }
  const routeMapFile = join(outputFolder, ROUTE_MAP_FILE);
  writeFileSync(routeMapFile, JSON.stringify(routerFileMap, null, '  '), 'utf-8');
  log.info('write ', routeMapFile);
  return routeMapFile;
}

async function renderRoutes(index: string, mainFile: string, ROUTES: string[], useDominoMockWindow = true)
: Promise<{[route: string]: string}> {
    // const index = readFileSync(htmlFile, 'utf8');
    if (useDominoMockWindow)
      setupGlobals(index);
    // if (_outputFolder == null)
    //   _outputFolder = join(dirname(htmlFile), '_prerender');
    // const outputFolder = _outputFolder;
    // * NOTE :: leave this as require() since this file is built Dynamically from webpack
    log.info('main file:', mainFile);
    const { AppServerModuleNgFactory, LAZY_MODULE_MAP } = require(mainFile);

    const routeHtmlMap: {[route: string]: string} = {};
    for (let route of ROUTES) {
      // const fullPath = join(outputFolder, route);

      // // Make sure the directory structure is there
      // if (!existsSync(fullPath)) {
      //   ensureDirSync(fullPath);
      // }
      // Writes rendered HTML to index.html, replacing the file if it already exists.
      const html = await renderModuleFactory(AppServerModuleNgFactory, {
        document: index,
        url: encodeURI(decodeURI(_.trimEnd(route, '/'))),
        extraProviders: [
          provideModuleMap(LAZY_MODULE_MAP)
      ]});
      routeHtmlMap[route] = html;
    }
    return routeHtmlMap;
}

/**
 * Write static prerender pages
 * @param staticDir dist/static
 * @param htmlFile dist/static/<app>/index.html
 * @param mainFile dist/server/main.js file path which can be require.resolve, should be corresponding to angular.json
 * @param ROUTES 
 */
export async function writeRoutesWithLocalServer(staticDir: string, htmlFile: string, mainFile: string,
  ROUTES: string[], outputFolder?: string) {
  const pkMgr = require('dr-comp-package/wfh/lib/packageMgr');
  const shutdown: () => void = await pkMgr.runServer(api.argv);
  let mapFile: string;
  try {
    mapFile = await writeRoutes(staticDir, htmlFile, mainFile, ROUTES, outputFolder);
  } catch (err) {
    console.log(err);
    throw err;
  } finally {
    await shutdown();
    await new Promise((resolve) => {
      require('log4js').shutdown(resolve);
    });
  }
  return mapFile;
}

export async function renderRouteWithLocalServer(html: string, mainFile: string,
  route: string, useDominoMockWindow?: boolean): Promise<string> {

  let mapFile: {[route: string]: string};
  mapFile = await renderRoutes(html, mainFile, [route], useDominoMockWindow);
  return mapFile[route];
}
