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
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const index = fs_extra_1.readFileSync(htmlFile, 'utf8');
        setupGlobals(index);
        if (_outputFolder == null)
            _outputFolder = path_1.join(path_1.dirname(htmlFile), '_prerender');
        const outputFolder = _outputFolder;
        // * NOTE :: leave this as require() since this file is built Dynamically from webpack
        log.info('main file:', mainFile);
        const htmlMap = yield renderRoutes(index, mainFile, ROUTES);
        // Load the index.html file containing referances to your application bundle.
        const routerFileMap = {};
        // Iterate each route path
        for (const [route, html] of Object.entries(htmlMap)) {
            const fullPath = path_1.join(outputFolder, route);
            // Make sure the directory structure is there
            if (!fs_extra_1.existsSync(fullPath)) {
                fs_extra_1.ensureDirSync(fullPath);
            }
            const wf = path_1.join(fullPath, 'index.html');
            fs_extra_1.writeFileSync(wf, html);
            log.info('Render %s page at ', route, wf);
            let indexFile = path_1.relative(staticDir, wf);
            if (path_1.sep === '\\')
                indexFile = indexFile.replace(/\\/g, '/');
            routerFileMap[route] = indexFile;
        }
        const routeMapFile = path_1.join(outputFolder, ng_prerender_1.ROUTE_MAP_FILE);
        fs_extra_1.writeFileSync(routeMapFile, JSON.stringify(routerFileMap, null, '  '), 'utf-8');
        log.info('write ', routeMapFile);
        return routeMapFile;
    });
}
function renderRoutes(index, mainFile, ROUTES) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        // const index = readFileSync(htmlFile, 'utf8');
        setupGlobals(index);
        // if (_outputFolder == null)
        //   _outputFolder = join(dirname(htmlFile), '_prerender');
        // const outputFolder = _outputFolder;
        // * NOTE :: leave this as require() since this file is built Dynamically from webpack
        log.info('main file:', mainFile);
        const { AppServerModuleNgFactory, LAZY_MODULE_MAP } = require(mainFile);
        const routeHtmlMap = {};
        for (let route of ROUTES) {
            route = encodeURI(decodeURI(_.trimEnd(route, '/')));
            // const fullPath = join(outputFolder, route);
            // // Make sure the directory structure is there
            // if (!existsSync(fullPath)) {
            //   ensureDirSync(fullPath);
            // }
            // Writes rendered HTML to index.html, replacing the file if it already exists.
            const html = yield platform_server_1.renderModuleFactory(AppServerModuleNgFactory, {
                document: index,
                url: route,
                extraProviders: [
                    module_map_ngfactory_loader_1.provideModuleMap(LAZY_MODULE_MAP)
                ]
            });
            routeHtmlMap[route] = html;
        }
        return routeHtmlMap;
    });
}
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
function renderRouteWithLocalServer(html, mainFile, route) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        let mapFile;
        mapFile = yield renderRoutes(html, mainFile, [route]);
        return mapFile[route];
    });
}
exports.renderRouteWithLocalServer = renderRouteWithLocalServer;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy1wcmVyZW5kZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNEJBQTRCO0FBQzVCLCtCQUErQjtBQUMvQixrQ0FBZ0M7QUFDaEMsNEJBQTBCO0FBQzFCLHVDQUFrRjtBQUNsRiwrQkFBb0Q7QUFFcEQsd0NBQStDO0FBRS9DLGtEQUE0QjtBQUM1QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQ3hELDBEQUF3QjtBQUN4QiwwRkFBNEU7QUFDNUUsOERBQStEO0FBQy9ELDhFQUEyRTtBQUUzRSxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFFakMscUJBQWMsRUFBRSxDQUFDO0FBRWpCLFNBQVMsWUFBWSxDQUFDLFNBQWlCLEVBQUUsR0FBWTtJQUNuRCxNQUFNLE1BQU0sR0FBUSxNQUFNLENBQUMsWUFBWSxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUN2RCxNQUFjLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztJQUMvQixNQUFjLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUM7QUFDN0MsQ0FBQztBQUVEOzs7Ozs7R0FNRztBQUNILFNBQWUsV0FBVyxDQUFDLFNBQWlCLEVBQUUsUUFBZ0IsRUFBRSxRQUFnQixFQUFFLE1BQWdCLEVBQ2hHLGFBQXNCOztRQUN0QixNQUFNLEtBQUssR0FBRyx1QkFBWSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUM3QyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDcEIsSUFBSSxhQUFhLElBQUksSUFBSTtZQUN2QixhQUFhLEdBQUcsV0FBSSxDQUFDLGNBQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUN4RCxNQUFNLFlBQVksR0FBRyxhQUFhLENBQUM7UUFD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QUFnQixFQUFFLFFBQWdCLEVBQ3BHLE1BQWdCLEVBQUUsWUFBcUI7O1FBQ3ZDLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO1FBQzVELE1BQU0sUUFBUSxHQUFlLE1BQU0sS0FBSyxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0QsSUFBSSxPQUFlLENBQUM7UUFDcEIsSUFBSTtZQUNGLE9BQU8sR0FBRyxNQUFNLFdBQVcsQ0FBQyxTQUFTLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsWUFBWSxDQUFDLENBQUM7U0FDbEY7UUFBQyxPQUFPLEdBQUcsRUFBRTtZQUNaLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDakIsTUFBTSxHQUFHLENBQUM7U0FDWDtnQkFBUztZQUNSLE1BQU0sUUFBUSxFQUFFLENBQUM7WUFDakIsTUFBTSxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO2dCQUM1QixPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3RDLENBQUMsQ0FBQyxDQUFDO1NBQ0o7UUFDRCxPQUFPLE9BQU8sQ0FBQztJQUNqQixDQUFDO0NBQUE7QUFqQkQsZ0VBaUJDO0FBRUQsU0FBc0IsMEJBQTBCLENBQUMsSUFBWSxFQUFFLFFBQWdCLEVBQzdFLEtBQWE7O1FBRWIsSUFBSSxPQUFrQyxDQUFDO1FBQ3ZDLE9BQU8sR0FBRyxNQUFNLFlBQVksQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUN0RCxPQUFPLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN4QixDQUFDO0NBQUE7QUFORCxnRUFNQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9uZy1wcmVyZW5kZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTpuby1jb25zb2xlXG4vLyBMb2FkIHpvbmUuanMgZm9yIHRoZSBzZXJ2ZXIuXG5pbXBvcnQgJ3pvbmUuanMvZGlzdC96b25lLW5vZGUnO1xuaW1wb3J0ICdyZWZsZWN0LW1ldGFkYXRhJztcbmltcG9ydCB7IHJlYWRGaWxlU3luYywgd3JpdGVGaWxlU3luYywgZXhpc3RzU3luYywgZW5zdXJlRGlyU3luYyB9IGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCB7IGpvaW4sIHJlbGF0aXZlLCBzZXAsIGRpcm5hbWUgfSBmcm9tICdwYXRoJztcblxuaW1wb3J0IHsgZW5hYmxlUHJvZE1vZGUgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcblxuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCduZy1wcmVyZW5kZXInKTtcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHsgcHJvdmlkZU1vZHVsZU1hcCB9IGZyb20gJ0BuZ3VuaXZlcnNhbC9tb2R1bGUtbWFwLW5nZmFjdG9yeS1sb2FkZXInO1xuaW1wb3J0IHsgcmVuZGVyTW9kdWxlRmFjdG9yeSB9IGZyb20gJ0Bhbmd1bGFyL3BsYXRmb3JtLXNlcnZlcic7XG5pbXBvcnQge1JPVVRFX01BUF9GSUxFfSBmcm9tICdAZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvbmctcHJlcmVuZGVyJztcblxuY29uc3QgZG9taW5vID0gcmVxdWlyZSgnZG9taW5vJyk7XG5cbmVuYWJsZVByb2RNb2RlKCk7XG5cbmZ1bmN0aW9uIHNldHVwR2xvYmFscyhpbmRleEh0bWw6IHN0cmluZywgdXJsPzogc3RyaW5nKSB7XG4gIGNvbnN0IHdpbmRvdzogYW55ID0gZG9taW5vLmNyZWF0ZVdpbmRvdyhpbmRleEh0bWwsIHVybCk7XG4gIChnbG9iYWwgYXMgYW55KS53aW5kb3cgPSB3aW5kb3c7XG4gIChnbG9iYWwgYXMgYW55KS5kb2N1bWVudCA9IHdpbmRvdy5kb2N1bWVudDtcbn1cblxuLyoqXG4gKiBXcml0ZSBzdGF0aWMgcHJlcmVuZGVyIHBhZ2VzXG4gKiBAcGFyYW0gc3RhdGljRGlyIGRpc3Qvc3RhdGljXG4gKiBAcGFyYW0gaHRtbEZpbGUgZGlzdC9zdGF0aWMvPGFwcD4vaW5kZXguaHRtbFxuICogQHBhcmFtIG1haW5GaWxlIGRpc3Qvc2VydmVyL21haW4uanMgZmlsZSBwYXRoIHdoaWNoIGNhbiBiZSByZXF1aXJlLnJlc29sdmUsIHNob3VsZCBiZSBjb3JyZXNwb25kaW5nIHRvIGFuZ3VsYXIuanNvblxuICogQHBhcmFtIFJPVVRFUyBcbiAqL1xuYXN5bmMgZnVuY3Rpb24gd3JpdGVSb3V0ZXMoc3RhdGljRGlyOiBzdHJpbmcsIGh0bWxGaWxlOiBzdHJpbmcsIG1haW5GaWxlOiBzdHJpbmcsIFJPVVRFUzogc3RyaW5nW10sXG4gIF9vdXRwdXRGb2xkZXI/OiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBpbmRleCA9IHJlYWRGaWxlU3luYyhodG1sRmlsZSwgJ3V0ZjgnKTtcbiAgc2V0dXBHbG9iYWxzKGluZGV4KTtcbiAgaWYgKF9vdXRwdXRGb2xkZXIgPT0gbnVsbClcbiAgICBfb3V0cHV0Rm9sZGVyID0gam9pbihkaXJuYW1lKGh0bWxGaWxlKSwgJ19wcmVyZW5kZXInKTtcbiAgY29uc3Qgb3V0cHV0Rm9sZGVyID0gX291dHB1dEZvbGRlcjtcbiAgLy8gKiBOT1RFIDo6IGxlYXZlIHRoaXMgYXMgcmVxdWlyZSgpIHNpbmNlIHRoaXMgZmlsZSBpcyBidWlsdCBEeW5hbWljYWxseSBmcm9tIHdlYnBhY2tcbiAgbG9nLmluZm8oJ21haW4gZmlsZTonLCBtYWluRmlsZSk7XG5cbiAgY29uc3QgaHRtbE1hcCA9IGF3YWl0IHJlbmRlclJvdXRlcyhpbmRleCwgbWFpbkZpbGUsIFJPVVRFUyk7XG4gIC8vIExvYWQgdGhlIGluZGV4Lmh0bWwgZmlsZSBjb250YWluaW5nIHJlZmVyYW5jZXMgdG8geW91ciBhcHBsaWNhdGlvbiBidW5kbGUuXG5cbiAgY29uc3Qgcm91dGVyRmlsZU1hcDoge1tyb3V0ZTogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuICAvLyBJdGVyYXRlIGVhY2ggcm91dGUgcGF0aFxuICBmb3IgKGNvbnN0IFtyb3V0ZSwgaHRtbF0gb2YgT2JqZWN0LmVudHJpZXMoaHRtbE1hcCkpIHtcbiAgICBjb25zdCBmdWxsUGF0aCA9IGpvaW4ob3V0cHV0Rm9sZGVyLCByb3V0ZSk7XG5cbiAgICAvLyBNYWtlIHN1cmUgdGhlIGRpcmVjdG9yeSBzdHJ1Y3R1cmUgaXMgdGhlcmVcbiAgICBpZiAoIWV4aXN0c1N5bmMoZnVsbFBhdGgpKSB7XG4gICAgICBlbnN1cmVEaXJTeW5jKGZ1bGxQYXRoKTtcbiAgICB9XG4gICAgY29uc3Qgd2YgPSBqb2luKGZ1bGxQYXRoLCAnaW5kZXguaHRtbCcpO1xuICAgIHdyaXRlRmlsZVN5bmMod2YsIGh0bWwpO1xuICAgIGxvZy5pbmZvKCdSZW5kZXIgJXMgcGFnZSBhdCAnLCByb3V0ZSwgd2YpO1xuICAgIGxldCBpbmRleEZpbGUgPSByZWxhdGl2ZShzdGF0aWNEaXIsIHdmKTtcbiAgICBpZiAoc2VwID09PSAnXFxcXCcpXG4gICAgICBpbmRleEZpbGUgPSBpbmRleEZpbGUucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIHJvdXRlckZpbGVNYXBbcm91dGVdID0gaW5kZXhGaWxlO1xuICB9XG4gIGNvbnN0IHJvdXRlTWFwRmlsZSA9IGpvaW4ob3V0cHV0Rm9sZGVyLCBST1VURV9NQVBfRklMRSk7XG4gIHdyaXRlRmlsZVN5bmMocm91dGVNYXBGaWxlLCBKU09OLnN0cmluZ2lmeShyb3V0ZXJGaWxlTWFwLCBudWxsLCAnICAnKSwgJ3V0Zi04Jyk7XG4gIGxvZy5pbmZvKCd3cml0ZSAnLCByb3V0ZU1hcEZpbGUpO1xuICByZXR1cm4gcm91dGVNYXBGaWxlO1xufVxuXG5hc3luYyBmdW5jdGlvbiByZW5kZXJSb3V0ZXMoaW5kZXg6IHN0cmluZywgbWFpbkZpbGU6IHN0cmluZywgUk9VVEVTOiBzdHJpbmdbXSk6IFByb21pc2U8e1tyb3V0ZTogc3RyaW5nXTogc3RyaW5nfT4ge1xuICAgIC8vIGNvbnN0IGluZGV4ID0gcmVhZEZpbGVTeW5jKGh0bWxGaWxlLCAndXRmOCcpO1xuICAgIHNldHVwR2xvYmFscyhpbmRleCk7XG4gICAgLy8gaWYgKF9vdXRwdXRGb2xkZXIgPT0gbnVsbClcbiAgICAvLyAgIF9vdXRwdXRGb2xkZXIgPSBqb2luKGRpcm5hbWUoaHRtbEZpbGUpLCAnX3ByZXJlbmRlcicpO1xuICAgIC8vIGNvbnN0IG91dHB1dEZvbGRlciA9IF9vdXRwdXRGb2xkZXI7XG4gICAgLy8gKiBOT1RFIDo6IGxlYXZlIHRoaXMgYXMgcmVxdWlyZSgpIHNpbmNlIHRoaXMgZmlsZSBpcyBidWlsdCBEeW5hbWljYWxseSBmcm9tIHdlYnBhY2tcbiAgICBsb2cuaW5mbygnbWFpbiBmaWxlOicsIG1haW5GaWxlKTtcbiAgICBjb25zdCB7IEFwcFNlcnZlck1vZHVsZU5nRmFjdG9yeSwgTEFaWV9NT0RVTEVfTUFQIH0gPSByZXF1aXJlKG1haW5GaWxlKTtcblxuICAgIGNvbnN0IHJvdXRlSHRtbE1hcDoge1tyb3V0ZTogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuICAgIGZvciAobGV0IHJvdXRlIG9mIFJPVVRFUykge1xuICAgICAgcm91dGUgPSBlbmNvZGVVUkkoZGVjb2RlVVJJKF8udHJpbUVuZChyb3V0ZSwgJy8nKSkpO1xuICAgICAgLy8gY29uc3QgZnVsbFBhdGggPSBqb2luKG91dHB1dEZvbGRlciwgcm91dGUpO1xuXG4gICAgICAvLyAvLyBNYWtlIHN1cmUgdGhlIGRpcmVjdG9yeSBzdHJ1Y3R1cmUgaXMgdGhlcmVcbiAgICAgIC8vIGlmICghZXhpc3RzU3luYyhmdWxsUGF0aCkpIHtcbiAgICAgIC8vICAgZW5zdXJlRGlyU3luYyhmdWxsUGF0aCk7XG4gICAgICAvLyB9XG4gICAgICAvLyBXcml0ZXMgcmVuZGVyZWQgSFRNTCB0byBpbmRleC5odG1sLCByZXBsYWNpbmcgdGhlIGZpbGUgaWYgaXQgYWxyZWFkeSBleGlzdHMuXG4gICAgICBjb25zdCBodG1sID0gYXdhaXQgcmVuZGVyTW9kdWxlRmFjdG9yeShBcHBTZXJ2ZXJNb2R1bGVOZ0ZhY3RvcnksIHtcbiAgICAgICAgZG9jdW1lbnQ6IGluZGV4LFxuICAgICAgICB1cmw6IHJvdXRlLFxuICAgICAgICBleHRyYVByb3ZpZGVyczogW1xuICAgICAgICAgIHByb3ZpZGVNb2R1bGVNYXAoTEFaWV9NT0RVTEVfTUFQKVxuICAgICAgXX0pO1xuICAgICAgcm91dGVIdG1sTWFwW3JvdXRlXSA9IGh0bWw7XG4gICAgfVxuICAgIHJldHVybiByb3V0ZUh0bWxNYXA7XG59XG5cbi8qKlxuICogV3JpdGUgc3RhdGljIHByZXJlbmRlciBwYWdlc1xuICogQHBhcmFtIHN0YXRpY0RpciBkaXN0L3N0YXRpY1xuICogQHBhcmFtIGh0bWxGaWxlIGRpc3Qvc3RhdGljLzxhcHA+L2luZGV4Lmh0bWxcbiAqIEBwYXJhbSBtYWluRmlsZSBkaXN0L3NlcnZlci9tYWluLmpzIGZpbGUgcGF0aCB3aGljaCBjYW4gYmUgcmVxdWlyZS5yZXNvbHZlLCBzaG91bGQgYmUgY29ycmVzcG9uZGluZyB0byBhbmd1bGFyLmpzb25cbiAqIEBwYXJhbSBST1VURVMgXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB3cml0ZVJvdXRlc1dpdGhMb2NhbFNlcnZlcihzdGF0aWNEaXI6IHN0cmluZywgaHRtbEZpbGU6IHN0cmluZywgbWFpbkZpbGU6IHN0cmluZyxcbiAgUk9VVEVTOiBzdHJpbmdbXSwgb3V0cHV0Rm9sZGVyPzogc3RyaW5nKSB7XG4gIGNvbnN0IHBrTWdyID0gcmVxdWlyZSgnZHItY29tcC1wYWNrYWdlL3dmaC9saWIvcGFja2FnZU1ncicpO1xuICBjb25zdCBzaHV0ZG93bjogKCkgPT4gdm9pZCA9IGF3YWl0IHBrTWdyLnJ1blNlcnZlcihhcGkuYXJndik7XG4gIGxldCBtYXBGaWxlOiBzdHJpbmc7XG4gIHRyeSB7XG4gICAgbWFwRmlsZSA9IGF3YWl0IHdyaXRlUm91dGVzKHN0YXRpY0RpciwgaHRtbEZpbGUsIG1haW5GaWxlLCBST1VURVMsIG91dHB1dEZvbGRlcik7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgdGhyb3cgZXJyO1xuICB9IGZpbmFsbHkge1xuICAgIGF3YWl0IHNodXRkb3duKCk7XG4gICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgIHJlcXVpcmUoJ2xvZzRqcycpLnNodXRkb3duKHJlc29sdmUpO1xuICAgIH0pO1xuICB9XG4gIHJldHVybiBtYXBGaWxlO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVuZGVyUm91dGVXaXRoTG9jYWxTZXJ2ZXIoaHRtbDogc3RyaW5nLCBtYWluRmlsZTogc3RyaW5nLFxuICByb3V0ZTogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcblxuICBsZXQgbWFwRmlsZToge1tyb3V0ZTogc3RyaW5nXTogc3RyaW5nfTtcbiAgbWFwRmlsZSA9IGF3YWl0IHJlbmRlclJvdXRlcyhodG1sLCBtYWluRmlsZSwgW3JvdXRlXSk7XG4gIHJldHVybiBtYXBGaWxlW3JvdXRlXTtcbn1cbiJdfQ==
