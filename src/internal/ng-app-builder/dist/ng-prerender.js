"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Load zone.js for the server.
require("zone.js/dist/zone-node");
require("reflect-metadata");
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
const core_1 = require("@angular/core");
const _ = require("lodash");
const log = require('log4js').getLogger('ng-prerender');
// const request = require('request');
// Faster server renders w/ Prod mode (dev mode never needed)
core_1.enableProdMode();
// Import module map for lazy loading
const module_map_ngfactory_loader_1 = require("@nguniversal/module-map-ngfactory-loader");
const platform_server_1 = require("@angular/platform-server");
const ROUTE_MAP_FILE = 'prerender-routes.json';
function writeRoutes(destDir, applName, ROUTES) {
    const mainServerExports = require(path_1.join(destDir, 'server', applName, 'main'));
    const indexHtmlFile = path_1.join(destDir, 'static', applName, 'index.html');
    const outputFolder = path_1.join(destDir, 'static', applName, '_prerender');
    const staticDir = path_1.join(destDir, 'static');
    // * NOTE :: leave this as require() since this file is built Dynamically from webpack
    const { AppServerModuleNgFactory, LAZY_MODULE_MAP } = mainServerExports;
    // Load the index.html file containing referances to your application bundle.
    const index = fs_extra_1.readFileSync(indexHtmlFile, 'utf8');
    let previousRender = Promise.resolve();
    let routerFileMap = {};
    // Iterate each route path
    ROUTES.forEach(route => {
        route = _.trimEnd(route, '/');
        const fullPath = path_1.join(outputFolder, route);
        // Make sure the directory structure is there
        if (!fs_extra_1.existsSync(fullPath)) {
            fs_extra_1.ensureDirSync(fullPath);
        }
        // Writes rendered HTML to index.html, replacing the file if it already exists.
        previousRender = previousRender.then(_ => platform_server_1.renderModuleFactory(AppServerModuleNgFactory, {
            document: index,
            url: route,
            extraProviders: [
                module_map_ngfactory_loader_1.provideModuleMap(LAZY_MODULE_MAP)
            ]
        })).then(html => {
            let wf = path_1.join(fullPath, 'index.html');
            fs_extra_1.writeFileSync(wf, html);
            log.info('Render %s page at ', route, wf);
            routerFileMap[route] = path_1.relative(staticDir, wf);
        });
    });
    previousRender.then(() => {
        const routeMapFile = path_1.join(outputFolder, ROUTE_MAP_FILE);
        fs_extra_1.writeFileSync(routeMapFile, JSON.stringify(routerFileMap, null, '  '), 'utf-8');
        log.info('write ', routeMapFile);
    });
}
exports.writeRoutes = writeRoutes;
class PrerenderForExpress {
    constructor(staticDir, applName) {
        this.staticDir = staticDir;
        this.applName = applName;
        this.noPrerender = false;
        this.prerenderPages = {};
        this.prerenderMapFile = path_1.join(this.staticDir, this.applName, '_prerender', ROUTE_MAP_FILE);
        this.noPrerender = !fs_extra_1.existsSync(this.prerenderMapFile);
        if (this.noPrerender) {
            log.warn('No prerender files found in ', this.prerenderMapFile);
            return;
        }
        this.queryPrerenderPages();
    }
    asMiddleware() {
        return (req, res, next) => {
            const route = _.trimEnd(req.originalUrl, '/');
            if (_.has(this.prerenderPages, route)) {
                log.info('Serve with prerender page for ', route);
                if (this.prerenderPages[route] === null) {
                    fs_extra_1.readFile(path_1.join(this.staticDir, this.prerenderMap[route]), 'utf-8', (err, cont) => {
                        this.prerenderPages[route] = cont;
                        res.send(cont);
                    });
                }
                else {
                    res.send(this.prerenderPages[route]);
                }
            }
            else {
                next();
            }
        };
    }
    queryPrerenderPages() {
        if (this.noPrerender)
            return;
        fs_extra_1.readFile(this.prerenderMapFile, 'utf-8', (err, content) => {
            this.prerenderMap = JSON.parse(content);
            _.forEach(this.prerenderMap, (file, route) => {
                this.prerenderPages[route] = null;
            });
        });
    }
}
exports.PrerenderForExpress = PrerenderForExpress;

//# sourceMappingURL=ng-prerender.js.map
