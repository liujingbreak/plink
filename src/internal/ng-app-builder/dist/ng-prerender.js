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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy1wcmVyZW5kZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNEJBQTRCO0FBQzVCLCtCQUErQjtBQUMvQixrQ0FBZ0M7QUFDaEMsNEJBQTBCO0FBQzFCLHVDQUFrRjtBQUNsRiwrQkFBb0Q7QUFFcEQsd0NBQStDO0FBRS9DLGtEQUE0QjtBQUM1QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQ3hELDBEQUF3QjtBQUN4QiwwRkFBNEU7QUFDNUUsOERBQStEO0FBQy9ELDhFQUEyRTtBQUUzRSxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFFakMscUJBQWMsRUFBRSxDQUFDO0FBRWpCLFNBQVMsWUFBWSxDQUFDLFNBQWlCLEVBQUUsR0FBWTtJQUNuRCxNQUFNLE1BQU0sR0FBUSxNQUFNLENBQUMsWUFBWSxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUN2RCxNQUFjLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztJQUMvQixNQUFjLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUM7QUFDN0MsQ0FBQztBQUVEOzs7Ozs7R0FNRztBQUNILFNBQWdCLFdBQVcsQ0FBQyxTQUFpQixFQUFFLFFBQWdCLEVBQUUsUUFBZ0IsRUFBRSxNQUFnQixFQUNqRyxhQUFzQjtJQUN0QixNQUFNLEtBQUssR0FBRyx1QkFBWSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUM3QyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDcEIsSUFBSSxhQUFhLElBQUksSUFBSTtRQUN2QixhQUFhLEdBQUcsV0FBSSxDQUFDLGNBQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQztJQUN4RCxNQUFNLFlBQVksR0FBRyxhQUFhLENBQUM7SUFD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QU8sR0FBRyxFQUFFO1lBQ1osT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNqQixNQUFNLEdBQUcsQ0FBQztTQUNYO2dCQUFTO1lBQ1IsTUFBTSxRQUFRLEVBQUUsQ0FBQztZQUNqQixNQUFNLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7Z0JBQzVCLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDdEMsQ0FBQyxDQUFDLENBQUM7U0FDSjtRQUNELE9BQU8sT0FBTyxDQUFDO0lBQ2pCLENBQUM7Q0FBQTtBQWpCRCxnRUFpQkMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvbmctcHJlcmVuZGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6bm8tY29uc29sZVxuLy8gTG9hZCB6b25lLmpzIGZvciB0aGUgc2VydmVyLlxuaW1wb3J0ICd6b25lLmpzL2Rpc3Qvem9uZS1ub2RlJztcbmltcG9ydCAncmVmbGVjdC1tZXRhZGF0YSc7XG5pbXBvcnQgeyByZWFkRmlsZVN5bmMsIHdyaXRlRmlsZVN5bmMsIGV4aXN0c1N5bmMsIGVuc3VyZURpclN5bmMgfSBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgeyBqb2luLCByZWxhdGl2ZSwgc2VwLCBkaXJuYW1lIH0gZnJvbSAncGF0aCc7XG5cbmltcG9ydCB7IGVuYWJsZVByb2RNb2RlIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5cbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignbmctcHJlcmVuZGVyJyk7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCB7IHByb3ZpZGVNb2R1bGVNYXAgfSBmcm9tICdAbmd1bml2ZXJzYWwvbW9kdWxlLW1hcC1uZ2ZhY3RvcnktbG9hZGVyJztcbmltcG9ydCB7IHJlbmRlck1vZHVsZUZhY3RvcnkgfSBmcm9tICdAYW5ndWxhci9wbGF0Zm9ybS1zZXJ2ZXInO1xuaW1wb3J0IHtST1VURV9NQVBfRklMRX0gZnJvbSAnQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L25nLXByZXJlbmRlcic7XG5cbmNvbnN0IGRvbWlubyA9IHJlcXVpcmUoJ2RvbWlubycpO1xuXG5lbmFibGVQcm9kTW9kZSgpO1xuXG5mdW5jdGlvbiBzZXR1cEdsb2JhbHMoaW5kZXhIdG1sOiBzdHJpbmcsIHVybD86IHN0cmluZykge1xuICBjb25zdCB3aW5kb3c6IGFueSA9IGRvbWluby5jcmVhdGVXaW5kb3coaW5kZXhIdG1sLCB1cmwpO1xuICAoZ2xvYmFsIGFzIGFueSkud2luZG93ID0gd2luZG93O1xuICAoZ2xvYmFsIGFzIGFueSkuZG9jdW1lbnQgPSB3aW5kb3cuZG9jdW1lbnQ7XG59XG5cbi8qKlxuICogV3JpdGUgc3RhdGljIHByZXJlbmRlciBwYWdlc1xuICogQHBhcmFtIHN0YXRpY0RpciBkaXN0L3N0YXRpY1xuICogQHBhcmFtIGh0bWxGaWxlIGRpc3Qvc3RhdGljLzxhcHA+L2luZGV4Lmh0bWxcbiAqIEBwYXJhbSBtYWluRmlsZSBkaXN0L3NlcnZlci9tYWluLmpzIGZpbGUgcGF0aCB3aGljaCBjYW4gYmUgcmVxdWlyZS5yZXNvbHZlLCBzaG91bGQgYmUgY29ycmVzcG9uZGluZyB0byBhbmd1bGFyLmpzb25cbiAqIEBwYXJhbSBST1VURVMgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZVJvdXRlcyhzdGF0aWNEaXI6IHN0cmluZywgaHRtbEZpbGU6IHN0cmluZywgbWFpbkZpbGU6IHN0cmluZywgUk9VVEVTOiBzdHJpbmdbXSxcbiAgX291dHB1dEZvbGRlcj86IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IGluZGV4ID0gcmVhZEZpbGVTeW5jKGh0bWxGaWxlLCAndXRmOCcpO1xuICBzZXR1cEdsb2JhbHMoaW5kZXgpO1xuICBpZiAoX291dHB1dEZvbGRlciA9PSBudWxsKVxuICAgIF9vdXRwdXRGb2xkZXIgPSBqb2luKGRpcm5hbWUoaHRtbEZpbGUpLCAnX3ByZXJlbmRlcicpO1xuICBjb25zdCBvdXRwdXRGb2xkZXIgPSBfb3V0cHV0Rm9sZGVyO1xuICAvLyAqIE5PVEUgOjogbGVhdmUgdGhpcyBhcyByZXF1aXJlKCkgc2luY2UgdGhpcyBmaWxlIGlzIGJ1aWx0IER5bmFtaWNhbGx5IGZyb20gd2VicGFja1xuICBsb2cuaW5mbygnbWFpbiBmaWxlOicsIG1haW5GaWxlKTtcbiAgY29uc3QgeyBBcHBTZXJ2ZXJNb2R1bGVOZ0ZhY3RvcnksIExBWllfTU9EVUxFX01BUCB9ID0gcmVxdWlyZShtYWluRmlsZSk7XG4gIC8vIExvYWQgdGhlIGluZGV4Lmh0bWwgZmlsZSBjb250YWluaW5nIHJlZmVyYW5jZXMgdG8geW91ciBhcHBsaWNhdGlvbiBidW5kbGUuXG5cbiAgbGV0IHByZXZpb3VzUmVuZGVyID0gUHJvbWlzZS5yZXNvbHZlKCk7XG4gIGNvbnN0IHJvdXRlckZpbGVNYXA6IHtbcm91dGU6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcbiAgLy8gSXRlcmF0ZSBlYWNoIHJvdXRlIHBhdGhcbiAgUk9VVEVTLmZvckVhY2gocm91dGUgPT4ge1xuICAgIHJvdXRlID0gZW5jb2RlVVJJKGRlY29kZVVSSShfLnRyaW1FbmQocm91dGUsICcvJykpKTtcbiAgICBjb25zdCBmdWxsUGF0aCA9IGpvaW4ob3V0cHV0Rm9sZGVyLCByb3V0ZSk7XG5cbiAgICAvLyBNYWtlIHN1cmUgdGhlIGRpcmVjdG9yeSBzdHJ1Y3R1cmUgaXMgdGhlcmVcbiAgICBpZiAoIWV4aXN0c1N5bmMoZnVsbFBhdGgpKSB7XG4gICAgICBlbnN1cmVEaXJTeW5jKGZ1bGxQYXRoKTtcbiAgICB9XG4gICAgLy8gV3JpdGVzIHJlbmRlcmVkIEhUTUwgdG8gaW5kZXguaHRtbCwgcmVwbGFjaW5nIHRoZSBmaWxlIGlmIGl0IGFscmVhZHkgZXhpc3RzLlxuICAgIHByZXZpb3VzUmVuZGVyID0gcHJldmlvdXNSZW5kZXIudGhlbihfID0+IHtcbiAgICAgIHJldHVybiByZW5kZXJNb2R1bGVGYWN0b3J5KEFwcFNlcnZlck1vZHVsZU5nRmFjdG9yeSwge1xuICAgICAgICBkb2N1bWVudDogaW5kZXgsXG4gICAgICAgIHVybDogcm91dGUsXG4gICAgICAgIGV4dHJhUHJvdmlkZXJzOiBbXG4gICAgICAgICAgcHJvdmlkZU1vZHVsZU1hcChMQVpZX01PRFVMRV9NQVApXG4gICAgICBdfSk7XG4gICAgfSkudGhlbihodG1sID0+IHtcbiAgICAgIGNvbnN0IHdmID0gam9pbihmdWxsUGF0aCwgJ2luZGV4Lmh0bWwnKTtcbiAgICAgIHdyaXRlRmlsZVN5bmMod2YsIGh0bWwpO1xuICAgICAgbG9nLmluZm8oJ1JlbmRlciAlcyBwYWdlIGF0ICcsIHJvdXRlLCB3Zik7XG4gICAgICBsZXQgaW5kZXhGaWxlID0gcmVsYXRpdmUoc3RhdGljRGlyLCB3Zik7XG4gICAgICBpZiAoc2VwID09PSAnXFxcXCcpXG4gICAgICAgIGluZGV4RmlsZSA9IGluZGV4RmlsZS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICByb3V0ZXJGaWxlTWFwW3JvdXRlXSA9IGluZGV4RmlsZTtcbiAgICB9KTtcbiAgfSk7XG4gIHJldHVybiBwcmV2aW91c1JlbmRlci50aGVuKCgpID0+IHtcbiAgICBjb25zdCByb3V0ZU1hcEZpbGUgPSBqb2luKG91dHB1dEZvbGRlciwgUk9VVEVfTUFQX0ZJTEUpO1xuICAgIHdyaXRlRmlsZVN5bmMocm91dGVNYXBGaWxlLCBKU09OLnN0cmluZ2lmeShyb3V0ZXJGaWxlTWFwLCBudWxsLCAnICAnKSwgJ3V0Zi04Jyk7XG4gICAgbG9nLmluZm8oJ3dyaXRlICcsIHJvdXRlTWFwRmlsZSk7XG4gICAgcmV0dXJuIHJvdXRlTWFwRmlsZTtcbiAgfSk7XG59XG5cbi8qKlxuICogV3JpdGUgc3RhdGljIHByZXJlbmRlciBwYWdlc1xuICogQHBhcmFtIHN0YXRpY0RpciBkaXN0L3N0YXRpY1xuICogQHBhcmFtIGh0bWxGaWxlIGRpc3Qvc3RhdGljLzxhcHA+L2luZGV4Lmh0bWxcbiAqIEBwYXJhbSBtYWluRmlsZSBkaXN0L3NlcnZlci9tYWluLmpzIGZpbGUgcGF0aCB3aGljaCBjYW4gYmUgcmVxdWlyZS5yZXNvbHZlLCBzaG91bGQgYmUgY29ycmVzcG9uZGluZyB0byBhbmd1bGFyLmpzb25cbiAqIEBwYXJhbSBST1VURVMgXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB3cml0ZVJvdXRlc1dpdGhMb2NhbFNlcnZlcihzdGF0aWNEaXI6IHN0cmluZywgaHRtbEZpbGU6IHN0cmluZywgbWFpbkZpbGU6IHN0cmluZyxcbiAgUk9VVEVTOiBzdHJpbmdbXSwgb3V0cHV0Rm9sZGVyPzogc3RyaW5nKSB7XG4gIGNvbnN0IHBrTWdyID0gcmVxdWlyZSgnZHItY29tcC1wYWNrYWdlL3dmaC9saWIvcGFja2FnZU1ncicpO1xuICBjb25zdCBzaHV0ZG93bjogKCkgPT4gdm9pZCA9IGF3YWl0IHBrTWdyLnJ1blNlcnZlcihhcGkuYXJndik7XG4gIGxldCBtYXBGaWxlOiBzdHJpbmc7XG4gIHRyeSB7XG4gICAgbWFwRmlsZSA9IGF3YWl0IHdyaXRlUm91dGVzKHN0YXRpY0RpciwgaHRtbEZpbGUsIG1haW5GaWxlLCBST1VURVMsIG91dHB1dEZvbGRlcik7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgdGhyb3cgZXJyO1xuICB9IGZpbmFsbHkge1xuICAgIGF3YWl0IHNodXRkb3duKCk7XG4gICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgIHJlcXVpcmUoJ2xvZzRqcycpLnNodXRkb3duKHJlc29sdmUpO1xuICAgIH0pO1xuICB9XG4gIHJldHVybiBtYXBGaWxlO1xufVxuIl19
