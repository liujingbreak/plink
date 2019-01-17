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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy1wcmVyZW5kZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNEJBQTRCO0FBQzVCLCtCQUErQjtBQUMvQixrQ0FBZ0M7QUFDaEMsNEJBQTBCO0FBQzFCLHVDQUFrRjtBQUNsRiwrQkFBb0Q7QUFFcEQsd0NBQStDO0FBRS9DLGtEQUE0QjtBQUM1QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQ3hELDBEQUF3QjtBQUN4QiwwRkFBNEU7QUFDNUUsOERBQStEO0FBQy9ELDhFQUEyRTtBQUUzRSxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFFakMscUJBQWMsRUFBRSxDQUFDO0FBRWpCLFNBQVMsWUFBWSxDQUFDLFNBQWlCLEVBQUUsR0FBWTtJQUNwRCxNQUFNLE1BQU0sR0FBUSxNQUFNLENBQUMsWUFBWSxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUN2RCxNQUFjLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztJQUMvQixNQUFjLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUM7QUFDNUMsQ0FBQztBQUVEOzs7Ozs7R0FNRztBQUNILFNBQWdCLFdBQVcsQ0FBQyxTQUFpQixFQUFFLFFBQWdCLEVBQUUsUUFBZ0IsRUFBRSxNQUFnQixFQUNsRyxZQUFxQjtJQUNyQixNQUFNLEtBQUssR0FBRyx1QkFBWSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUM3QyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDcEIsSUFBSSxZQUFZLElBQUksSUFBSTtRQUN2QixZQUFZLEdBQUcsV0FBSSxDQUFDLGNBQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQztJQUN0RCxzRkFBc0Y7SUFDdEYsR0FBRyxDQUFDLElBQUks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RyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2pCLE1BQU0sR0FBRyxDQUFDO1NBQ1Y7Z0JBQVM7WUFDVCxNQUFNLFFBQVEsRUFBRSxDQUFDO1lBQ2pCLE1BQU0sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtnQkFDN0IsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNyQyxDQUFDLENBQUMsQ0FBQztTQUNIO1FBQ0QsT0FBTyxPQUFPLENBQUM7SUFDaEIsQ0FBQztDQUFBO0FBakJELGdFQWlCQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9uZy1wcmVyZW5kZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTpuby1jb25zb2xlXG4vLyBMb2FkIHpvbmUuanMgZm9yIHRoZSBzZXJ2ZXIuXG5pbXBvcnQgJ3pvbmUuanMvZGlzdC96b25lLW5vZGUnO1xuaW1wb3J0ICdyZWZsZWN0LW1ldGFkYXRhJztcbmltcG9ydCB7IHJlYWRGaWxlU3luYywgd3JpdGVGaWxlU3luYywgZXhpc3RzU3luYywgZW5zdXJlRGlyU3luYyB9IGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCB7IGpvaW4sIHJlbGF0aXZlLCBzZXAsIGRpcm5hbWUgfSBmcm9tICdwYXRoJztcblxuaW1wb3J0IHsgZW5hYmxlUHJvZE1vZGUgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcblxuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCduZy1wcmVyZW5kZXInKTtcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHsgcHJvdmlkZU1vZHVsZU1hcCB9IGZyb20gJ0BuZ3VuaXZlcnNhbC9tb2R1bGUtbWFwLW5nZmFjdG9yeS1sb2FkZXInO1xuaW1wb3J0IHsgcmVuZGVyTW9kdWxlRmFjdG9yeSB9IGZyb20gJ0Bhbmd1bGFyL3BsYXRmb3JtLXNlcnZlcic7XG5pbXBvcnQge1JPVVRFX01BUF9GSUxFfSBmcm9tICdAZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvbmctcHJlcmVuZGVyJztcblxuY29uc3QgZG9taW5vID0gcmVxdWlyZSgnZG9taW5vJyk7XG5cbmVuYWJsZVByb2RNb2RlKCk7XG5cbmZ1bmN0aW9uIHNldHVwR2xvYmFscyhpbmRleEh0bWw6IHN0cmluZywgdXJsPzogc3RyaW5nKSB7XG5cdGNvbnN0IHdpbmRvdzogYW55ID0gZG9taW5vLmNyZWF0ZVdpbmRvdyhpbmRleEh0bWwsIHVybCk7XG5cdChnbG9iYWwgYXMgYW55KS53aW5kb3cgPSB3aW5kb3c7XG5cdChnbG9iYWwgYXMgYW55KS5kb2N1bWVudCA9IHdpbmRvdy5kb2N1bWVudDtcbn1cblxuLyoqXG4gKiBXcml0ZSBzdGF0aWMgcHJlcmVuZGVyIHBhZ2VzXG4gKiBAcGFyYW0gc3RhdGljRGlyIGRpc3Qvc3RhdGljXG4gKiBAcGFyYW0gaHRtbEZpbGUgZGlzdC9zdGF0aWMvPGFwcD4vaW5kZXguaHRtbFxuICogQHBhcmFtIG1haW5GaWxlIGRpc3Qvc2VydmVyL21haW4uanMgZmlsZSBwYXRoIHdoaWNoIGNhbiBiZSByZXF1aXJlLnJlc29sdmUsIHNob3VsZCBiZSBjb3JyZXNwb25kaW5nIHRvIGFuZ3VsYXIuanNvblxuICogQHBhcmFtIFJPVVRFUyBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlUm91dGVzKHN0YXRpY0Rpcjogc3RyaW5nLCBodG1sRmlsZTogc3RyaW5nLCBtYWluRmlsZTogc3RyaW5nLCBST1VURVM6IHN0cmluZ1tdLFxuXHRvdXRwdXRGb2xkZXI/OiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuXHRjb25zdCBpbmRleCA9IHJlYWRGaWxlU3luYyhodG1sRmlsZSwgJ3V0ZjgnKTtcblx0c2V0dXBHbG9iYWxzKGluZGV4KTtcblx0aWYgKG91dHB1dEZvbGRlciA9PSBudWxsKVxuXHRcdG91dHB1dEZvbGRlciA9IGpvaW4oZGlybmFtZShodG1sRmlsZSksICdfcHJlcmVuZGVyJyk7XG5cdC8vICogTk9URSA6OiBsZWF2ZSB0aGlzIGFzIHJlcXVpcmUoKSBzaW5jZSB0aGlzIGZpbGUgaXMgYnVpbHQgRHluYW1pY2FsbHkgZnJvbSB3ZWJwYWNrXG5cdGxvZy5pbmZvKCdtYWluIGZpbGU6JywgbWFpbkZpbGUpO1xuXHRjb25zdCB7IEFwcFNlcnZlck1vZHVsZU5nRmFjdG9yeSwgTEFaWV9NT0RVTEVfTUFQIH0gPSByZXF1aXJlKG1haW5GaWxlKTtcblx0Ly8gTG9hZCB0aGUgaW5kZXguaHRtbCBmaWxlIGNvbnRhaW5pbmcgcmVmZXJhbmNlcyB0byB5b3VyIGFwcGxpY2F0aW9uIGJ1bmRsZS5cblxuXHRsZXQgcHJldmlvdXNSZW5kZXIgPSBQcm9taXNlLnJlc29sdmUoKTtcblx0Y29uc3Qgcm91dGVyRmlsZU1hcDoge1tyb3V0ZTogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuXHQvLyBJdGVyYXRlIGVhY2ggcm91dGUgcGF0aFxuXHRST1VURVMuZm9yRWFjaChyb3V0ZSA9PiB7XG5cdFx0cm91dGUgPSBlbmNvZGVVUkkoZGVjb2RlVVJJKF8udHJpbUVuZChyb3V0ZSwgJy8nKSkpO1xuXHRcdGNvbnN0IGZ1bGxQYXRoID0gam9pbihvdXRwdXRGb2xkZXIsIHJvdXRlKTtcblxuXHRcdC8vIE1ha2Ugc3VyZSB0aGUgZGlyZWN0b3J5IHN0cnVjdHVyZSBpcyB0aGVyZVxuXHRcdGlmICghZXhpc3RzU3luYyhmdWxsUGF0aCkpIHtcblx0XHRcdGVuc3VyZURpclN5bmMoZnVsbFBhdGgpO1xuXHRcdH1cblx0XHQvLyBXcml0ZXMgcmVuZGVyZWQgSFRNTCB0byBpbmRleC5odG1sLCByZXBsYWNpbmcgdGhlIGZpbGUgaWYgaXQgYWxyZWFkeSBleGlzdHMuXG5cdFx0cHJldmlvdXNSZW5kZXIgPSBwcmV2aW91c1JlbmRlci50aGVuKF8gPT4ge1xuXHRcdFx0cmV0dXJuIHJlbmRlck1vZHVsZUZhY3RvcnkoQXBwU2VydmVyTW9kdWxlTmdGYWN0b3J5LCB7XG5cdFx0XHRcdGRvY3VtZW50OiBpbmRleCxcblx0XHRcdFx0dXJsOiByb3V0ZSxcblx0XHRcdFx0ZXh0cmFQcm92aWRlcnM6IFtcblx0XHRcdFx0XHRwcm92aWRlTW9kdWxlTWFwKExBWllfTU9EVUxFX01BUClcblx0XHRcdF19KTtcblx0XHR9KS50aGVuKGh0bWwgPT4ge1xuXHRcdFx0Y29uc3Qgd2YgPSBqb2luKGZ1bGxQYXRoLCAnaW5kZXguaHRtbCcpO1xuXHRcdFx0d3JpdGVGaWxlU3luYyh3ZiwgaHRtbCk7XG5cdFx0XHRsb2cuaW5mbygnUmVuZGVyICVzIHBhZ2UgYXQgJywgcm91dGUsIHdmKTtcblx0XHRcdGxldCBpbmRleEZpbGUgPSByZWxhdGl2ZShzdGF0aWNEaXIsIHdmKTtcblx0XHRcdGlmIChzZXAgPT09ICdcXFxcJylcblx0XHRcdFx0aW5kZXhGaWxlID0gaW5kZXhGaWxlLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcblx0XHRcdHJvdXRlckZpbGVNYXBbcm91dGVdID0gaW5kZXhGaWxlO1xuXHRcdH0pO1xuXHR9KTtcblx0cmV0dXJuIHByZXZpb3VzUmVuZGVyLnRoZW4oKCkgPT4ge1xuXHRcdGNvbnN0IHJvdXRlTWFwRmlsZSA9IGpvaW4ob3V0cHV0Rm9sZGVyLCBST1VURV9NQVBfRklMRSk7XG5cdFx0d3JpdGVGaWxlU3luYyhyb3V0ZU1hcEZpbGUsIEpTT04uc3RyaW5naWZ5KHJvdXRlckZpbGVNYXAsIG51bGwsICcgICcpLCAndXRmLTgnKTtcblx0XHRsb2cuaW5mbygnd3JpdGUgJywgcm91dGVNYXBGaWxlKTtcblx0XHRyZXR1cm4gcm91dGVNYXBGaWxlO1xuXHR9KTtcbn1cblxuLyoqXG4gKiBXcml0ZSBzdGF0aWMgcHJlcmVuZGVyIHBhZ2VzXG4gKiBAcGFyYW0gc3RhdGljRGlyIGRpc3Qvc3RhdGljXG4gKiBAcGFyYW0gaHRtbEZpbGUgZGlzdC9zdGF0aWMvPGFwcD4vaW5kZXguaHRtbFxuICogQHBhcmFtIG1haW5GaWxlIGRpc3Qvc2VydmVyL21haW4uanMgZmlsZSBwYXRoIHdoaWNoIGNhbiBiZSByZXF1aXJlLnJlc29sdmUsIHNob3VsZCBiZSBjb3JyZXNwb25kaW5nIHRvIGFuZ3VsYXIuanNvblxuICogQHBhcmFtIFJPVVRFUyBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdyaXRlUm91dGVzV2l0aExvY2FsU2VydmVyKHN0YXRpY0Rpcjogc3RyaW5nLCBodG1sRmlsZTogc3RyaW5nLCBtYWluRmlsZTogc3RyaW5nLFxuXHRST1VURVM6IHN0cmluZ1tdLCBvdXRwdXRGb2xkZXI/OiBzdHJpbmcpIHtcblx0Y29uc3QgcGtNZ3IgPSByZXF1aXJlKCdkci1jb21wLXBhY2thZ2Uvd2ZoL2xpYi9wYWNrYWdlTWdyJyk7XG5cdGNvbnN0IHNodXRkb3duOiAoKSA9PiB2b2lkID0gYXdhaXQgcGtNZ3IucnVuU2VydmVyKGFwaS5hcmd2KTtcblx0bGV0IG1hcEZpbGU6IHN0cmluZztcblx0dHJ5IHtcblx0XHRtYXBGaWxlID0gYXdhaXQgd3JpdGVSb3V0ZXMoc3RhdGljRGlyLCBodG1sRmlsZSwgbWFpbkZpbGUsIFJPVVRFUywgb3V0cHV0Rm9sZGVyKTtcblx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0Y29uc29sZS5sb2coZXJyKTtcblx0XHR0aHJvdyBlcnI7XG5cdH0gZmluYWxseSB7XG5cdFx0YXdhaXQgc2h1dGRvd24oKTtcblx0XHRhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuXHRcdFx0cmVxdWlyZSgnbG9nNGpzJykuc2h1dGRvd24ocmVzb2x2ZSk7XG5cdFx0fSk7XG5cdH1cblx0cmV0dXJuIG1hcEZpbGU7XG59XG4iXX0=
