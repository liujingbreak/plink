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
function writeRoutes(staticDir, htmlFile, mainFile, ROUTES, outputFolder) {
    const index = fs_extra_1.readFileSync(htmlFile, 'utf8');
    setupGlobals(index);
    if (outputFolder == null)
        outputFolder = path_1.join(path_1.dirname(htmlFile), '_prerender');
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy1wcmVyZW5kZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNEJBQTRCO0FBQzVCLCtCQUErQjtBQUMvQixrQ0FBZ0M7QUFDaEMsNEJBQTBCO0FBQzFCLHVDQUFrRjtBQUNsRiwrQkFBb0Q7QUFFcEQsd0NBQStDO0FBRS9DLGtEQUE0QjtBQUM1QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQ3hELDBEQUF3QjtBQUN4QiwwRkFBNEU7QUFDNUUsOERBQStEO0FBQy9ELDhFQUEyRTtBQUUzRSxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFFakMscUJBQWMsRUFBRSxDQUFDO0FBRWpCLFNBQVMsWUFBWSxDQUFDLFNBQWlCLEVBQUUsR0FBWTtJQUNuRCxNQUFNLE1BQU0sR0FBUSxNQUFNLENBQUMsWUFBWSxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUN2RCxNQUFjLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztJQUMvQixNQUFjLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUM7QUFDN0MsQ0FBQztBQUVEOzs7Ozs7R0FNRztBQUNILFNBQWdCLFdBQVcsQ0FBQyxTQUFpQixFQUFFLFFBQWdCLEVBQUUsUUFBZ0IsRUFBRSxNQUFnQixFQUNqRyxZQUFxQjtJQUNyQixNQUFNLEtBQUssR0FBRyx1QkFBWSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUM3QyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDcEIsSUFBSSxZQUFZLElBQUksSUFBSTtRQUN0QixZQUFZLEdBQUcsV0FBSSxDQUFDLGNBQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQztJQUN2RCxzRkFBc0Y7SUFDdEYsR0FBRyxDQUFDLElBQUks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RyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2pCLE1BQU0sR0FBRyxDQUFDO1NBQ1g7Z0JBQVM7WUFDUixNQUFNLFFBQVEsRUFBRSxDQUFDO1lBQ2pCLE1BQU0sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtnQkFDNUIsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN0QyxDQUFDLENBQUMsQ0FBQztTQUNKO1FBQ0QsT0FBTyxPQUFPLENBQUM7SUFDakIsQ0FBQztDQUFBO0FBakJELGdFQWlCQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9uZy1wcmVyZW5kZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTpuby1jb25zb2xlXG4vLyBMb2FkIHpvbmUuanMgZm9yIHRoZSBzZXJ2ZXIuXG5pbXBvcnQgJ3pvbmUuanMvZGlzdC96b25lLW5vZGUnO1xuaW1wb3J0ICdyZWZsZWN0LW1ldGFkYXRhJztcbmltcG9ydCB7IHJlYWRGaWxlU3luYywgd3JpdGVGaWxlU3luYywgZXhpc3RzU3luYywgZW5zdXJlRGlyU3luYyB9IGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCB7IGpvaW4sIHJlbGF0aXZlLCBzZXAsIGRpcm5hbWUgfSBmcm9tICdwYXRoJztcblxuaW1wb3J0IHsgZW5hYmxlUHJvZE1vZGUgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcblxuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCduZy1wcmVyZW5kZXInKTtcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHsgcHJvdmlkZU1vZHVsZU1hcCB9IGZyb20gJ0BuZ3VuaXZlcnNhbC9tb2R1bGUtbWFwLW5nZmFjdG9yeS1sb2FkZXInO1xuaW1wb3J0IHsgcmVuZGVyTW9kdWxlRmFjdG9yeSB9IGZyb20gJ0Bhbmd1bGFyL3BsYXRmb3JtLXNlcnZlcic7XG5pbXBvcnQge1JPVVRFX01BUF9GSUxFfSBmcm9tICdAZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvbmctcHJlcmVuZGVyJztcblxuY29uc3QgZG9taW5vID0gcmVxdWlyZSgnZG9taW5vJyk7XG5cbmVuYWJsZVByb2RNb2RlKCk7XG5cbmZ1bmN0aW9uIHNldHVwR2xvYmFscyhpbmRleEh0bWw6IHN0cmluZywgdXJsPzogc3RyaW5nKSB7XG4gIGNvbnN0IHdpbmRvdzogYW55ID0gZG9taW5vLmNyZWF0ZVdpbmRvdyhpbmRleEh0bWwsIHVybCk7XG4gIChnbG9iYWwgYXMgYW55KS53aW5kb3cgPSB3aW5kb3c7XG4gIChnbG9iYWwgYXMgYW55KS5kb2N1bWVudCA9IHdpbmRvdy5kb2N1bWVudDtcbn1cblxuLyoqXG4gKiBXcml0ZSBzdGF0aWMgcHJlcmVuZGVyIHBhZ2VzXG4gKiBAcGFyYW0gc3RhdGljRGlyIGRpc3Qvc3RhdGljXG4gKiBAcGFyYW0gaHRtbEZpbGUgZGlzdC9zdGF0aWMvPGFwcD4vaW5kZXguaHRtbFxuICogQHBhcmFtIG1haW5GaWxlIGRpc3Qvc2VydmVyL21haW4uanMgZmlsZSBwYXRoIHdoaWNoIGNhbiBiZSByZXF1aXJlLnJlc29sdmUsIHNob3VsZCBiZSBjb3JyZXNwb25kaW5nIHRvIGFuZ3VsYXIuanNvblxuICogQHBhcmFtIFJPVVRFUyBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlUm91dGVzKHN0YXRpY0Rpcjogc3RyaW5nLCBodG1sRmlsZTogc3RyaW5nLCBtYWluRmlsZTogc3RyaW5nLCBST1VURVM6IHN0cmluZ1tdLFxuICBvdXRwdXRGb2xkZXI/OiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBpbmRleCA9IHJlYWRGaWxlU3luYyhodG1sRmlsZSwgJ3V0ZjgnKTtcbiAgc2V0dXBHbG9iYWxzKGluZGV4KTtcbiAgaWYgKG91dHB1dEZvbGRlciA9PSBudWxsKVxuICAgIG91dHB1dEZvbGRlciA9IGpvaW4oZGlybmFtZShodG1sRmlsZSksICdfcHJlcmVuZGVyJyk7XG4gIC8vICogTk9URSA6OiBsZWF2ZSB0aGlzIGFzIHJlcXVpcmUoKSBzaW5jZSB0aGlzIGZpbGUgaXMgYnVpbHQgRHluYW1pY2FsbHkgZnJvbSB3ZWJwYWNrXG4gIGxvZy5pbmZvKCdtYWluIGZpbGU6JywgbWFpbkZpbGUpO1xuICBjb25zdCB7IEFwcFNlcnZlck1vZHVsZU5nRmFjdG9yeSwgTEFaWV9NT0RVTEVfTUFQIH0gPSByZXF1aXJlKG1haW5GaWxlKTtcbiAgLy8gTG9hZCB0aGUgaW5kZXguaHRtbCBmaWxlIGNvbnRhaW5pbmcgcmVmZXJhbmNlcyB0byB5b3VyIGFwcGxpY2F0aW9uIGJ1bmRsZS5cblxuICBsZXQgcHJldmlvdXNSZW5kZXIgPSBQcm9taXNlLnJlc29sdmUoKTtcbiAgY29uc3Qgcm91dGVyRmlsZU1hcDoge1tyb3V0ZTogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuICAvLyBJdGVyYXRlIGVhY2ggcm91dGUgcGF0aFxuICBST1VURVMuZm9yRWFjaChyb3V0ZSA9PiB7XG4gICAgcm91dGUgPSBlbmNvZGVVUkkoZGVjb2RlVVJJKF8udHJpbUVuZChyb3V0ZSwgJy8nKSkpO1xuICAgIGNvbnN0IGZ1bGxQYXRoID0gam9pbihvdXRwdXRGb2xkZXIsIHJvdXRlKTtcblxuICAgIC8vIE1ha2Ugc3VyZSB0aGUgZGlyZWN0b3J5IHN0cnVjdHVyZSBpcyB0aGVyZVxuICAgIGlmICghZXhpc3RzU3luYyhmdWxsUGF0aCkpIHtcbiAgICAgIGVuc3VyZURpclN5bmMoZnVsbFBhdGgpO1xuICAgIH1cbiAgICAvLyBXcml0ZXMgcmVuZGVyZWQgSFRNTCB0byBpbmRleC5odG1sLCByZXBsYWNpbmcgdGhlIGZpbGUgaWYgaXQgYWxyZWFkeSBleGlzdHMuXG4gICAgcHJldmlvdXNSZW5kZXIgPSBwcmV2aW91c1JlbmRlci50aGVuKF8gPT4ge1xuICAgICAgcmV0dXJuIHJlbmRlck1vZHVsZUZhY3RvcnkoQXBwU2VydmVyTW9kdWxlTmdGYWN0b3J5LCB7XG4gICAgICAgIGRvY3VtZW50OiBpbmRleCxcbiAgICAgICAgdXJsOiByb3V0ZSxcbiAgICAgICAgZXh0cmFQcm92aWRlcnM6IFtcbiAgICAgICAgICBwcm92aWRlTW9kdWxlTWFwKExBWllfTU9EVUxFX01BUClcbiAgICAgIF19KTtcbiAgICB9KS50aGVuKGh0bWwgPT4ge1xuICAgICAgY29uc3Qgd2YgPSBqb2luKGZ1bGxQYXRoLCAnaW5kZXguaHRtbCcpO1xuICAgICAgd3JpdGVGaWxlU3luYyh3ZiwgaHRtbCk7XG4gICAgICBsb2cuaW5mbygnUmVuZGVyICVzIHBhZ2UgYXQgJywgcm91dGUsIHdmKTtcbiAgICAgIGxldCBpbmRleEZpbGUgPSByZWxhdGl2ZShzdGF0aWNEaXIsIHdmKTtcbiAgICAgIGlmIChzZXAgPT09ICdcXFxcJylcbiAgICAgICAgaW5kZXhGaWxlID0gaW5kZXhGaWxlLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgIHJvdXRlckZpbGVNYXBbcm91dGVdID0gaW5kZXhGaWxlO1xuICAgIH0pO1xuICB9KTtcbiAgcmV0dXJuIHByZXZpb3VzUmVuZGVyLnRoZW4oKCkgPT4ge1xuICAgIGNvbnN0IHJvdXRlTWFwRmlsZSA9IGpvaW4ob3V0cHV0Rm9sZGVyLCBST1VURV9NQVBfRklMRSk7XG4gICAgd3JpdGVGaWxlU3luYyhyb3V0ZU1hcEZpbGUsIEpTT04uc3RyaW5naWZ5KHJvdXRlckZpbGVNYXAsIG51bGwsICcgICcpLCAndXRmLTgnKTtcbiAgICBsb2cuaW5mbygnd3JpdGUgJywgcm91dGVNYXBGaWxlKTtcbiAgICByZXR1cm4gcm91dGVNYXBGaWxlO1xuICB9KTtcbn1cblxuLyoqXG4gKiBXcml0ZSBzdGF0aWMgcHJlcmVuZGVyIHBhZ2VzXG4gKiBAcGFyYW0gc3RhdGljRGlyIGRpc3Qvc3RhdGljXG4gKiBAcGFyYW0gaHRtbEZpbGUgZGlzdC9zdGF0aWMvPGFwcD4vaW5kZXguaHRtbFxuICogQHBhcmFtIG1haW5GaWxlIGRpc3Qvc2VydmVyL21haW4uanMgZmlsZSBwYXRoIHdoaWNoIGNhbiBiZSByZXF1aXJlLnJlc29sdmUsIHNob3VsZCBiZSBjb3JyZXNwb25kaW5nIHRvIGFuZ3VsYXIuanNvblxuICogQHBhcmFtIFJPVVRFUyBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdyaXRlUm91dGVzV2l0aExvY2FsU2VydmVyKHN0YXRpY0Rpcjogc3RyaW5nLCBodG1sRmlsZTogc3RyaW5nLCBtYWluRmlsZTogc3RyaW5nLFxuICBST1VURVM6IHN0cmluZ1tdLCBvdXRwdXRGb2xkZXI/OiBzdHJpbmcpIHtcbiAgY29uc3QgcGtNZ3IgPSByZXF1aXJlKCdkci1jb21wLXBhY2thZ2Uvd2ZoL2xpYi9wYWNrYWdlTWdyJyk7XG4gIGNvbnN0IHNodXRkb3duOiAoKSA9PiB2b2lkID0gYXdhaXQgcGtNZ3IucnVuU2VydmVyKGFwaS5hcmd2KTtcbiAgbGV0IG1hcEZpbGU6IHN0cmluZztcbiAgdHJ5IHtcbiAgICBtYXBGaWxlID0gYXdhaXQgd3JpdGVSb3V0ZXMoc3RhdGljRGlyLCBodG1sRmlsZSwgbWFpbkZpbGUsIFJPVVRFUywgb3V0cHV0Rm9sZGVyKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgY29uc29sZS5sb2coZXJyKTtcbiAgICB0aHJvdyBlcnI7XG4gIH0gZmluYWxseSB7XG4gICAgYXdhaXQgc2h1dGRvd24oKTtcbiAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgcmVxdWlyZSgnbG9nNGpzJykuc2h1dGRvd24ocmVzb2x2ZSk7XG4gICAgfSk7XG4gIH1cbiAgcmV0dXJuIG1hcEZpbGU7XG59XG4iXX0=
