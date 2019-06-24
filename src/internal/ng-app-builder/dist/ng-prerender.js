"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable:no-console
// Load zone.js for the server.
require("zone.js/dist/zone-node");
require("reflect-metadata");
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
const core_1 = require("@angular/core");
const _ = tslib_1.__importStar(require("lodash"));
const log = require('log4js').getLogger('ng-prerender');
const __api_1 = tslib_1.__importDefault(require("__api"));
const module_map_ngfactory_loader_1 = require("@nguniversal/module-map-ngfactory-loader");
const platform_server_1 = require("@angular/platform-server");
const ng_prerender_1 = require("@dr-core/assets-processer/dist/ng-prerender");
const domino = require('domino');
core_1.enableProdMode();
function setupGlobals(indexHtml, url) {
    const window = domino.createWindow(indexHtml, url);
    global.window = window;
    global.document = window.document;
}
/**
 * Write static prerender pages
 * @param staticDir dist/static
 * @param htmlFile dist/static/<app>/index.html
 * @param mainFile dist/server/main.js file path which can be require.resolve, should be corresponding to angular.json
 * @param ROUTES
 */
function writeRoutes(staticDir, htmlFile, mainFile, ROUTES, _outputFolder) {
    const index = fs_extra_1.readFileSync(htmlFile, 'utf8');
    setupGlobals(index);
    if (_outputFolder == null)
        _outputFolder = path_1.join(path_1.dirname(htmlFile), '_prerender');
    const outputFolder = _outputFolder;
    // * NOTE :: leave this as require() since this file is built Dynamically from webpack
    log.info('main file:', mainFile);
    const { AppServerModuleNgFactory, LAZY_MODULE_MAP } = require(mainFile);
    // Load the index.html file containing referances to your application bundle.
    let previousRender = Promise.resolve();
    const routerFileMap = {};
    // Iterate each route path
    ROUTES.forEach(route => {
        route = encodeURI(decodeURI(_.trimEnd(route, '/')));
        const fullPath = path_1.join(outputFolder, route);
        // Make sure the directory structure is there
        if (!fs_extra_1.existsSync(fullPath)) {
            fs_extra_1.ensureDirSync(fullPath);
        }
        // Writes rendered HTML to index.html, replacing the file if it already exists.
        previousRender = previousRender.then(_ => {
            return platform_server_1.renderModuleFactory(AppServerModuleNgFactory, {
                document: index,
                url: route,
                extraProviders: [
                    module_map_ngfactory_loader_1.provideModuleMap(LAZY_MODULE_MAP)
                ]
            });
        }).then(html => {
            const wf = path_1.join(fullPath, 'index.html');
            fs_extra_1.writeFileSync(wf, html);
            log.info('Render %s page at ', route, wf);
            let indexFile = path_1.relative(staticDir, wf);
            if (path_1.sep === '\\')
                indexFile = indexFile.replace(/\\/g, '/');
            routerFileMap[route] = indexFile;
        });
    });
    return previousRender.then(() => {
        const routeMapFile = path_1.join(outputFolder, ng_prerender_1.ROUTE_MAP_FILE);
        fs_extra_1.writeFileSync(routeMapFile, JSON.stringify(routerFileMap, null, '  '), 'utf-8');
        log.info('write ', routeMapFile);
        return routeMapFile;
    });
}
exports.writeRoutes = writeRoutes;
/**
 * Write static prerender pages
 * @param staticDir dist/static
 * @param htmlFile dist/static/<app>/index.html
 * @param mainFile dist/server/main.js file path which can be require.resolve, should be corresponding to angular.json
 * @param ROUTES
 */
function writeRoutesWithLocalServer(staticDir, htmlFile, mainFile, ROUTES, outputFolder) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const pkMgr = require('dr-comp-package/wfh/lib/packageMgr');
        const shutdown = yield pkMgr.runServer(__api_1.default.argv);
        let mapFile;
        try {
            mapFile = yield writeRoutes(staticDir, htmlFile, mainFile, ROUTES, outputFolder);
        }
        catch (err) {
            console.log(err);
            throw err;
        }
        finally {
            yield shutdown();
            yield new Promise((resolve) => {
                require('log4js').shutdown(resolve);
            });
        }
        return mapFile;
    });
}
exports.writeRoutesWithLocalServer = writeRoutesWithLocalServer;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy1wcmVyZW5kZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNEJBQTRCO0FBQzVCLCtCQUErQjtBQUMvQixrQ0FBZ0M7QUFDaEMsNEJBQTBCO0FBQzFCLHVDQUFrRjtBQUNsRiwrQkFBb0Q7QUFFcEQsd0NBQStDO0FBRS9DLGtEQUE0QjtBQUM1QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQ3hELDBEQUF3QjtBQUN4QiwwRkFBNEU7QUFDNUUsOERBQStEO0FBQy9ELDhFQUEyRTtBQUUzRSxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFFakMscUJBQWMsRUFBRSxDQUFDO0FBRWpCLFNBQVMsWUFBWSxDQUFDLFNBQWlCLEVBQUUsR0FBWTtJQUNwRCxNQUFNLE1BQU0sR0FBUSxNQUFNLENBQUMsWUFBWSxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUN2RCxNQUFjLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztJQUMvQixNQUFjLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUM7QUFDNUMsQ0FBQztBQUVEOzs7Ozs7R0FNRztBQUNILFNBQWdCLFdBQVcsQ0FBQyxTQUFpQixFQUFFLFFBQWdCLEVBQUUsUUFBZ0IsRUFBRSxNQUFnQixFQUNsRyxhQUFzQjtJQUN0QixNQUFNLEtBQUssR0FBRyx1QkFBWSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUM3QyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDcEIsSUFBSSxhQUFhLElBQUksSUFBSTtRQUN4QixhQUFhLEdBQUcsV0FBSSxDQUFDLGNBQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQztJQUN2RCxNQUFNLFlBQVksR0FBRyxhQUFhLENBQUM7SUFD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QU8sR0FBRyxFQUFFO1lBQ2IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNqQixNQUFNLEdBQUcsQ0FBQztTQUNWO2dCQUFTO1lBQ1QsTUFBTSxRQUFRLEVBQUUsQ0FBQztZQUNqQixNQUFNLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7Z0JBQzdCLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDckMsQ0FBQyxDQUFDLENBQUM7U0FDSDtRQUNELE9BQU8sT0FBTyxDQUFDO0lBQ2hCLENBQUM7Q0FBQTtBQWpCRCxnRUFpQkMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvbmctcHJlcmVuZGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6bm8tY29uc29sZVxuLy8gTG9hZCB6b25lLmpzIGZvciB0aGUgc2VydmVyLlxuaW1wb3J0ICd6b25lLmpzL2Rpc3Qvem9uZS1ub2RlJztcbmltcG9ydCAncmVmbGVjdC1tZXRhZGF0YSc7XG5pbXBvcnQgeyByZWFkRmlsZVN5bmMsIHdyaXRlRmlsZVN5bmMsIGV4aXN0c1N5bmMsIGVuc3VyZURpclN5bmMgfSBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgeyBqb2luLCByZWxhdGl2ZSwgc2VwLCBkaXJuYW1lIH0gZnJvbSAncGF0aCc7XG5cbmltcG9ydCB7IGVuYWJsZVByb2RNb2RlIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5cbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignbmctcHJlcmVuZGVyJyk7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCB7IHByb3ZpZGVNb2R1bGVNYXAgfSBmcm9tICdAbmd1bml2ZXJzYWwvbW9kdWxlLW1hcC1uZ2ZhY3RvcnktbG9hZGVyJztcbmltcG9ydCB7IHJlbmRlck1vZHVsZUZhY3RvcnkgfSBmcm9tICdAYW5ndWxhci9wbGF0Zm9ybS1zZXJ2ZXInO1xuaW1wb3J0IHtST1VURV9NQVBfRklMRX0gZnJvbSAnQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L25nLXByZXJlbmRlcic7XG5cbmNvbnN0IGRvbWlubyA9IHJlcXVpcmUoJ2RvbWlubycpO1xuXG5lbmFibGVQcm9kTW9kZSgpO1xuXG5mdW5jdGlvbiBzZXR1cEdsb2JhbHMoaW5kZXhIdG1sOiBzdHJpbmcsIHVybD86IHN0cmluZykge1xuXHRjb25zdCB3aW5kb3c6IGFueSA9IGRvbWluby5jcmVhdGVXaW5kb3coaW5kZXhIdG1sLCB1cmwpO1xuXHQoZ2xvYmFsIGFzIGFueSkud2luZG93ID0gd2luZG93O1xuXHQoZ2xvYmFsIGFzIGFueSkuZG9jdW1lbnQgPSB3aW5kb3cuZG9jdW1lbnQ7XG59XG5cbi8qKlxuICogV3JpdGUgc3RhdGljIHByZXJlbmRlciBwYWdlc1xuICogQHBhcmFtIHN0YXRpY0RpciBkaXN0L3N0YXRpY1xuICogQHBhcmFtIGh0bWxGaWxlIGRpc3Qvc3RhdGljLzxhcHA+L2luZGV4Lmh0bWxcbiAqIEBwYXJhbSBtYWluRmlsZSBkaXN0L3NlcnZlci9tYWluLmpzIGZpbGUgcGF0aCB3aGljaCBjYW4gYmUgcmVxdWlyZS5yZXNvbHZlLCBzaG91bGQgYmUgY29ycmVzcG9uZGluZyB0byBhbmd1bGFyLmpzb25cbiAqIEBwYXJhbSBST1VURVMgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZVJvdXRlcyhzdGF0aWNEaXI6IHN0cmluZywgaHRtbEZpbGU6IHN0cmluZywgbWFpbkZpbGU6IHN0cmluZywgUk9VVEVTOiBzdHJpbmdbXSxcblx0X291dHB1dEZvbGRlcj86IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG5cdGNvbnN0IGluZGV4ID0gcmVhZEZpbGVTeW5jKGh0bWxGaWxlLCAndXRmOCcpO1xuXHRzZXR1cEdsb2JhbHMoaW5kZXgpO1xuXHRpZiAoX291dHB1dEZvbGRlciA9PSBudWxsKVxuXHRcdF9vdXRwdXRGb2xkZXIgPSBqb2luKGRpcm5hbWUoaHRtbEZpbGUpLCAnX3ByZXJlbmRlcicpO1xuXHRjb25zdCBvdXRwdXRGb2xkZXIgPSBfb3V0cHV0Rm9sZGVyO1xuXHQvLyAqIE5PVEUgOjogbGVhdmUgdGhpcyBhcyByZXF1aXJlKCkgc2luY2UgdGhpcyBmaWxlIGlzIGJ1aWx0IER5bmFtaWNhbGx5IGZyb20gd2VicGFja1xuXHRsb2cuaW5mbygnbWFpbiBmaWxlOicsIG1haW5GaWxlKTtcblx0Y29uc3QgeyBBcHBTZXJ2ZXJNb2R1bGVOZ0ZhY3RvcnksIExBWllfTU9EVUxFX01BUCB9ID0gcmVxdWlyZShtYWluRmlsZSk7XG5cdC8vIExvYWQgdGhlIGluZGV4Lmh0bWwgZmlsZSBjb250YWluaW5nIHJlZmVyYW5jZXMgdG8geW91ciBhcHBsaWNhdGlvbiBidW5kbGUuXG5cblx0bGV0IHByZXZpb3VzUmVuZGVyID0gUHJvbWlzZS5yZXNvbHZlKCk7XG5cdGNvbnN0IHJvdXRlckZpbGVNYXA6IHtbcm91dGU6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcblx0Ly8gSXRlcmF0ZSBlYWNoIHJvdXRlIHBhdGhcblx0Uk9VVEVTLmZvckVhY2gocm91dGUgPT4ge1xuXHRcdHJvdXRlID0gZW5jb2RlVVJJKGRlY29kZVVSSShfLnRyaW1FbmQocm91dGUsICcvJykpKTtcblx0XHRjb25zdCBmdWxsUGF0aCA9IGpvaW4ob3V0cHV0Rm9sZGVyLCByb3V0ZSk7XG5cblx0XHQvLyBNYWtlIHN1cmUgdGhlIGRpcmVjdG9yeSBzdHJ1Y3R1cmUgaXMgdGhlcmVcblx0XHRpZiAoIWV4aXN0c1N5bmMoZnVsbFBhdGgpKSB7XG5cdFx0XHRlbnN1cmVEaXJTeW5jKGZ1bGxQYXRoKTtcblx0XHR9XG5cdFx0Ly8gV3JpdGVzIHJlbmRlcmVkIEhUTUwgdG8gaW5kZXguaHRtbCwgcmVwbGFjaW5nIHRoZSBmaWxlIGlmIGl0IGFscmVhZHkgZXhpc3RzLlxuXHRcdHByZXZpb3VzUmVuZGVyID0gcHJldmlvdXNSZW5kZXIudGhlbihfID0+IHtcblx0XHRcdHJldHVybiByZW5kZXJNb2R1bGVGYWN0b3J5KEFwcFNlcnZlck1vZHVsZU5nRmFjdG9yeSwge1xuXHRcdFx0XHRkb2N1bWVudDogaW5kZXgsXG5cdFx0XHRcdHVybDogcm91dGUsXG5cdFx0XHRcdGV4dHJhUHJvdmlkZXJzOiBbXG5cdFx0XHRcdFx0cHJvdmlkZU1vZHVsZU1hcChMQVpZX01PRFVMRV9NQVApXG5cdFx0XHRdfSk7XG5cdFx0fSkudGhlbihodG1sID0+IHtcblx0XHRcdGNvbnN0IHdmID0gam9pbihmdWxsUGF0aCwgJ2luZGV4Lmh0bWwnKTtcblx0XHRcdHdyaXRlRmlsZVN5bmMod2YsIGh0bWwpO1xuXHRcdFx0bG9nLmluZm8oJ1JlbmRlciAlcyBwYWdlIGF0ICcsIHJvdXRlLCB3Zik7XG5cdFx0XHRsZXQgaW5kZXhGaWxlID0gcmVsYXRpdmUoc3RhdGljRGlyLCB3Zik7XG5cdFx0XHRpZiAoc2VwID09PSAnXFxcXCcpXG5cdFx0XHRcdGluZGV4RmlsZSA9IGluZGV4RmlsZS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cdFx0XHRyb3V0ZXJGaWxlTWFwW3JvdXRlXSA9IGluZGV4RmlsZTtcblx0XHR9KTtcblx0fSk7XG5cdHJldHVybiBwcmV2aW91c1JlbmRlci50aGVuKCgpID0+IHtcblx0XHRjb25zdCByb3V0ZU1hcEZpbGUgPSBqb2luKG91dHB1dEZvbGRlciwgUk9VVEVfTUFQX0ZJTEUpO1xuXHRcdHdyaXRlRmlsZVN5bmMocm91dGVNYXBGaWxlLCBKU09OLnN0cmluZ2lmeShyb3V0ZXJGaWxlTWFwLCBudWxsLCAnICAnKSwgJ3V0Zi04Jyk7XG5cdFx0bG9nLmluZm8oJ3dyaXRlICcsIHJvdXRlTWFwRmlsZSk7XG5cdFx0cmV0dXJuIHJvdXRlTWFwRmlsZTtcblx0fSk7XG59XG5cbi8qKlxuICogV3JpdGUgc3RhdGljIHByZXJlbmRlciBwYWdlc1xuICogQHBhcmFtIHN0YXRpY0RpciBkaXN0L3N0YXRpY1xuICogQHBhcmFtIGh0bWxGaWxlIGRpc3Qvc3RhdGljLzxhcHA+L2luZGV4Lmh0bWxcbiAqIEBwYXJhbSBtYWluRmlsZSBkaXN0L3NlcnZlci9tYWluLmpzIGZpbGUgcGF0aCB3aGljaCBjYW4gYmUgcmVxdWlyZS5yZXNvbHZlLCBzaG91bGQgYmUgY29ycmVzcG9uZGluZyB0byBhbmd1bGFyLmpzb25cbiAqIEBwYXJhbSBST1VURVMgXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB3cml0ZVJvdXRlc1dpdGhMb2NhbFNlcnZlcihzdGF0aWNEaXI6IHN0cmluZywgaHRtbEZpbGU6IHN0cmluZywgbWFpbkZpbGU6IHN0cmluZyxcblx0Uk9VVEVTOiBzdHJpbmdbXSwgb3V0cHV0Rm9sZGVyPzogc3RyaW5nKSB7XG5cdGNvbnN0IHBrTWdyID0gcmVxdWlyZSgnZHItY29tcC1wYWNrYWdlL3dmaC9saWIvcGFja2FnZU1ncicpO1xuXHRjb25zdCBzaHV0ZG93bjogKCkgPT4gdm9pZCA9IGF3YWl0IHBrTWdyLnJ1blNlcnZlcihhcGkuYXJndik7XG5cdGxldCBtYXBGaWxlOiBzdHJpbmc7XG5cdHRyeSB7XG5cdFx0bWFwRmlsZSA9IGF3YWl0IHdyaXRlUm91dGVzKHN0YXRpY0RpciwgaHRtbEZpbGUsIG1haW5GaWxlLCBST1VURVMsIG91dHB1dEZvbGRlcik7XG5cdH0gY2F0Y2ggKGVycikge1xuXHRcdGNvbnNvbGUubG9nKGVycik7XG5cdFx0dGhyb3cgZXJyO1xuXHR9IGZpbmFsbHkge1xuXHRcdGF3YWl0IHNodXRkb3duKCk7XG5cdFx0YXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcblx0XHRcdHJlcXVpcmUoJ2xvZzRqcycpLnNodXRkb3duKHJlc29sdmUpO1xuXHRcdH0pO1xuXHR9XG5cdHJldHVybiBtYXBGaWxlO1xufVxuIl19
