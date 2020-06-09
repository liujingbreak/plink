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
    if (global.window) {
        Object.assign(window, global.window);
    }
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
function renderRoutes(index, mainFile, ROUTES, useDominoMockWindow = true) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        // const index = readFileSync(htmlFile, 'utf8');
        if (useDominoMockWindow)
            setupGlobals(index);
        // if (_outputFolder == null)
        //   _outputFolder = join(dirname(htmlFile), '_prerender');
        // const outputFolder = _outputFolder;
        // * NOTE :: leave this as require() since this file is built Dynamically from webpack
        log.info('main file:', mainFile);
        const { AppServerModuleNgFactory, LAZY_MODULE_MAP } = require(mainFile);
        const routeHtmlMap = {};
        for (let route of ROUTES) {
            // const fullPath = join(outputFolder, route);
            // // Make sure the directory structure is there
            // if (!existsSync(fullPath)) {
            //   ensureDirSync(fullPath);
            // }
            // Writes rendered HTML to index.html, replacing the file if it already exists.
            const html = yield platform_server_1.renderModuleFactory(AppServerModuleNgFactory, {
                document: index,
                url: encodeURI(decodeURI(_.trimEnd(route, '/'))),
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
function renderRouteWithLocalServer(html, mainFile, route, useDominoMockWindow) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        let mapFile;
        mapFile = yield renderRoutes(html, mainFile, [route], useDominoMockWindow);
        return mapFile[route];
    });
}
exports.renderRouteWithLocalServer = renderRouteWithLocalServer;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy1wcmVyZW5kZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNEJBQTRCO0FBQzVCLCtCQUErQjtBQUMvQixrQ0FBZ0M7QUFDaEMsNEJBQTBCO0FBQzFCLHVDQUFrRjtBQUNsRiwrQkFBb0Q7QUFFcEQsd0NBQStDO0FBRS9DLGtEQUE0QjtBQUM1QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQ3hELDBEQUF3QjtBQUN4QiwwRkFBNEU7QUFDNUUsOERBQStEO0FBQy9ELDhFQUEyRTtBQUUzRSxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFFakMscUJBQWMsRUFBRSxDQUFDO0FBRWpCLFNBQVMsWUFBWSxDQUFDLFNBQWlCLEVBQUUsR0FBWTtJQUNuRCxNQUFNLE1BQU0sR0FBUSxNQUFNLENBQUMsWUFBWSxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUN4RCxJQUFLLE1BQWMsQ0FBQyxNQUFNLEVBQUU7UUFDMUIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUcsTUFBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0tBQy9DO0lBQ0EsTUFBYyxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7SUFDL0IsTUFBYyxDQUFDLFFBQVEsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDO0FBQzdDLENBQUM7QUFFRDs7Ozs7O0dBTUc7QUFDSCxTQUFlLFdBQVcsQ0FBQyxTQUFpQixFQUFFLFFBQWdCLEVBQUUsUUFBZ0IsRUFBRSxNQUFnQixFQUNoRyxhQUFzQjs7UUFDdEIsTUFBTSxLQUFLLEdBQUcsdUJBQVksQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDN0MsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3BCLElBQUksYUFBYSxJQUFJLElBQUk7WUFD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Q3hCLENBQUM7Q0FBQTtBQU5ELGdFQU1DIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L25nLXByZXJlbmRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOm5vLWNvbnNvbGVcbi8vIExvYWQgem9uZS5qcyBmb3IgdGhlIHNlcnZlci5cbmltcG9ydCAnem9uZS5qcy9kaXN0L3pvbmUtbm9kZSc7XG5pbXBvcnQgJ3JlZmxlY3QtbWV0YWRhdGEnO1xuaW1wb3J0IHsgcmVhZEZpbGVTeW5jLCB3cml0ZUZpbGVTeW5jLCBleGlzdHNTeW5jLCBlbnN1cmVEaXJTeW5jIH0gZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IHsgam9pbiwgcmVsYXRpdmUsIHNlcCwgZGlybmFtZSB9IGZyb20gJ3BhdGgnO1xuXG5pbXBvcnQgeyBlbmFibGVQcm9kTW9kZSB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ25nLXByZXJlbmRlcicpO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgeyBwcm92aWRlTW9kdWxlTWFwIH0gZnJvbSAnQG5ndW5pdmVyc2FsL21vZHVsZS1tYXAtbmdmYWN0b3J5LWxvYWRlcic7XG5pbXBvcnQgeyByZW5kZXJNb2R1bGVGYWN0b3J5IH0gZnJvbSAnQGFuZ3VsYXIvcGxhdGZvcm0tc2VydmVyJztcbmltcG9ydCB7Uk9VVEVfTUFQX0ZJTEV9IGZyb20gJ0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9uZy1wcmVyZW5kZXInO1xuXG5jb25zdCBkb21pbm8gPSByZXF1aXJlKCdkb21pbm8nKTtcblxuZW5hYmxlUHJvZE1vZGUoKTtcblxuZnVuY3Rpb24gc2V0dXBHbG9iYWxzKGluZGV4SHRtbDogc3RyaW5nLCB1cmw/OiBzdHJpbmcpIHtcbiAgY29uc3Qgd2luZG93OiBhbnkgPSBkb21pbm8uY3JlYXRlV2luZG93KGluZGV4SHRtbCwgdXJsKTtcbiAgaWYgKChnbG9iYWwgYXMgYW55KS53aW5kb3cpIHtcbiAgICBPYmplY3QuYXNzaWduKHdpbmRvdywgKGdsb2JhbCBhcyBhbnkpLndpbmRvdyk7XG4gIH1cbiAgKGdsb2JhbCBhcyBhbnkpLndpbmRvdyA9IHdpbmRvdztcbiAgKGdsb2JhbCBhcyBhbnkpLmRvY3VtZW50ID0gd2luZG93LmRvY3VtZW50O1xufVxuXG4vKipcbiAqIFdyaXRlIHN0YXRpYyBwcmVyZW5kZXIgcGFnZXNcbiAqIEBwYXJhbSBzdGF0aWNEaXIgZGlzdC9zdGF0aWNcbiAqIEBwYXJhbSBodG1sRmlsZSBkaXN0L3N0YXRpYy88YXBwPi9pbmRleC5odG1sXG4gKiBAcGFyYW0gbWFpbkZpbGUgZGlzdC9zZXJ2ZXIvbWFpbi5qcyBmaWxlIHBhdGggd2hpY2ggY2FuIGJlIHJlcXVpcmUucmVzb2x2ZSwgc2hvdWxkIGJlIGNvcnJlc3BvbmRpbmcgdG8gYW5ndWxhci5qc29uXG4gKiBAcGFyYW0gUk9VVEVTIFxuICovXG5hc3luYyBmdW5jdGlvbiB3cml0ZVJvdXRlcyhzdGF0aWNEaXI6IHN0cmluZywgaHRtbEZpbGU6IHN0cmluZywgbWFpbkZpbGU6IHN0cmluZywgUk9VVEVTOiBzdHJpbmdbXSxcbiAgX291dHB1dEZvbGRlcj86IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IGluZGV4ID0gcmVhZEZpbGVTeW5jKGh0bWxGaWxlLCAndXRmOCcpO1xuICBzZXR1cEdsb2JhbHMoaW5kZXgpO1xuICBpZiAoX291dHB1dEZvbGRlciA9PSBudWxsKVxuICAgIF9vdXRwdXRGb2xkZXIgPSBqb2luKGRpcm5hbWUoaHRtbEZpbGUpLCAnX3ByZXJlbmRlcicpO1xuICBjb25zdCBvdXRwdXRGb2xkZXIgPSBfb3V0cHV0Rm9sZGVyO1xuICAvLyAqIE5PVEUgOjogbGVhdmUgdGhpcyBhcyByZXF1aXJlKCkgc2luY2UgdGhpcyBmaWxlIGlzIGJ1aWx0IER5bmFtaWNhbGx5IGZyb20gd2VicGFja1xuICBsb2cuaW5mbygnbWFpbiBmaWxlOicsIG1haW5GaWxlKTtcblxuICBjb25zdCBodG1sTWFwID0gYXdhaXQgcmVuZGVyUm91dGVzKGluZGV4LCBtYWluRmlsZSwgUk9VVEVTKTtcbiAgLy8gTG9hZCB0aGUgaW5kZXguaHRtbCBmaWxlIGNvbnRhaW5pbmcgcmVmZXJhbmNlcyB0byB5b3VyIGFwcGxpY2F0aW9uIGJ1bmRsZS5cblxuICBjb25zdCByb3V0ZXJGaWxlTWFwOiB7W3JvdXRlOiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG4gIC8vIEl0ZXJhdGUgZWFjaCByb3V0ZSBwYXRoXG4gIGZvciAoY29uc3QgW3JvdXRlLCBodG1sXSBvZiBPYmplY3QuZW50cmllcyhodG1sTWFwKSkge1xuICAgIGNvbnN0IGZ1bGxQYXRoID0gam9pbihvdXRwdXRGb2xkZXIsIHJvdXRlKTtcblxuICAgIC8vIE1ha2Ugc3VyZSB0aGUgZGlyZWN0b3J5IHN0cnVjdHVyZSBpcyB0aGVyZVxuICAgIGlmICghZXhpc3RzU3luYyhmdWxsUGF0aCkpIHtcbiAgICAgIGVuc3VyZURpclN5bmMoZnVsbFBhdGgpO1xuICAgIH1cbiAgICBjb25zdCB3ZiA9IGpvaW4oZnVsbFBhdGgsICdpbmRleC5odG1sJyk7XG4gICAgd3JpdGVGaWxlU3luYyh3ZiwgaHRtbCk7XG4gICAgbG9nLmluZm8oJ1JlbmRlciAlcyBwYWdlIGF0ICcsIHJvdXRlLCB3Zik7XG4gICAgbGV0IGluZGV4RmlsZSA9IHJlbGF0aXZlKHN0YXRpY0Rpciwgd2YpO1xuICAgIGlmIChzZXAgPT09ICdcXFxcJylcbiAgICAgIGluZGV4RmlsZSA9IGluZGV4RmlsZS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgcm91dGVyRmlsZU1hcFtyb3V0ZV0gPSBpbmRleEZpbGU7XG4gIH1cbiAgY29uc3Qgcm91dGVNYXBGaWxlID0gam9pbihvdXRwdXRGb2xkZXIsIFJPVVRFX01BUF9GSUxFKTtcbiAgd3JpdGVGaWxlU3luYyhyb3V0ZU1hcEZpbGUsIEpTT04uc3RyaW5naWZ5KHJvdXRlckZpbGVNYXAsIG51bGwsICcgICcpLCAndXRmLTgnKTtcbiAgbG9nLmluZm8oJ3dyaXRlICcsIHJvdXRlTWFwRmlsZSk7XG4gIHJldHVybiByb3V0ZU1hcEZpbGU7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHJlbmRlclJvdXRlcyhpbmRleDogc3RyaW5nLCBtYWluRmlsZTogc3RyaW5nLCBST1VURVM6IHN0cmluZ1tdLCB1c2VEb21pbm9Nb2NrV2luZG93ID0gdHJ1ZSlcbjogUHJvbWlzZTx7W3JvdXRlOiBzdHJpbmddOiBzdHJpbmd9PiB7XG4gICAgLy8gY29uc3QgaW5kZXggPSByZWFkRmlsZVN5bmMoaHRtbEZpbGUsICd1dGY4Jyk7XG4gICAgaWYgKHVzZURvbWlub01vY2tXaW5kb3cpXG4gICAgICBzZXR1cEdsb2JhbHMoaW5kZXgpO1xuICAgIC8vIGlmIChfb3V0cHV0Rm9sZGVyID09IG51bGwpXG4gICAgLy8gICBfb3V0cHV0Rm9sZGVyID0gam9pbihkaXJuYW1lKGh0bWxGaWxlKSwgJ19wcmVyZW5kZXInKTtcbiAgICAvLyBjb25zdCBvdXRwdXRGb2xkZXIgPSBfb3V0cHV0Rm9sZGVyO1xuICAgIC8vICogTk9URSA6OiBsZWF2ZSB0aGlzIGFzIHJlcXVpcmUoKSBzaW5jZSB0aGlzIGZpbGUgaXMgYnVpbHQgRHluYW1pY2FsbHkgZnJvbSB3ZWJwYWNrXG4gICAgbG9nLmluZm8oJ21haW4gZmlsZTonLCBtYWluRmlsZSk7XG4gICAgY29uc3QgeyBBcHBTZXJ2ZXJNb2R1bGVOZ0ZhY3RvcnksIExBWllfTU9EVUxFX01BUCB9ID0gcmVxdWlyZShtYWluRmlsZSk7XG5cbiAgICBjb25zdCByb3V0ZUh0bWxNYXA6IHtbcm91dGU6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcbiAgICBmb3IgKGxldCByb3V0ZSBvZiBST1VURVMpIHtcbiAgICAgIC8vIGNvbnN0IGZ1bGxQYXRoID0gam9pbihvdXRwdXRGb2xkZXIsIHJvdXRlKTtcblxuICAgICAgLy8gLy8gTWFrZSBzdXJlIHRoZSBkaXJlY3Rvcnkgc3RydWN0dXJlIGlzIHRoZXJlXG4gICAgICAvLyBpZiAoIWV4aXN0c1N5bmMoZnVsbFBhdGgpKSB7XG4gICAgICAvLyAgIGVuc3VyZURpclN5bmMoZnVsbFBhdGgpO1xuICAgICAgLy8gfVxuICAgICAgLy8gV3JpdGVzIHJlbmRlcmVkIEhUTUwgdG8gaW5kZXguaHRtbCwgcmVwbGFjaW5nIHRoZSBmaWxlIGlmIGl0IGFscmVhZHkgZXhpc3RzLlxuICAgICAgY29uc3QgaHRtbCA9IGF3YWl0IHJlbmRlck1vZHVsZUZhY3RvcnkoQXBwU2VydmVyTW9kdWxlTmdGYWN0b3J5LCB7XG4gICAgICAgIGRvY3VtZW50OiBpbmRleCxcbiAgICAgICAgdXJsOiBlbmNvZGVVUkkoZGVjb2RlVVJJKF8udHJpbUVuZChyb3V0ZSwgJy8nKSkpLFxuICAgICAgICBleHRyYVByb3ZpZGVyczogW1xuICAgICAgICAgIHByb3ZpZGVNb2R1bGVNYXAoTEFaWV9NT0RVTEVfTUFQKVxuICAgICAgXX0pO1xuICAgICAgcm91dGVIdG1sTWFwW3JvdXRlXSA9IGh0bWw7XG4gICAgfVxuICAgIHJldHVybiByb3V0ZUh0bWxNYXA7XG59XG5cbi8qKlxuICogV3JpdGUgc3RhdGljIHByZXJlbmRlciBwYWdlc1xuICogQHBhcmFtIHN0YXRpY0RpciBkaXN0L3N0YXRpY1xuICogQHBhcmFtIGh0bWxGaWxlIGRpc3Qvc3RhdGljLzxhcHA+L2luZGV4Lmh0bWxcbiAqIEBwYXJhbSBtYWluRmlsZSBkaXN0L3NlcnZlci9tYWluLmpzIGZpbGUgcGF0aCB3aGljaCBjYW4gYmUgcmVxdWlyZS5yZXNvbHZlLCBzaG91bGQgYmUgY29ycmVzcG9uZGluZyB0byBhbmd1bGFyLmpzb25cbiAqIEBwYXJhbSBST1VURVMgXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB3cml0ZVJvdXRlc1dpdGhMb2NhbFNlcnZlcihzdGF0aWNEaXI6IHN0cmluZywgaHRtbEZpbGU6IHN0cmluZywgbWFpbkZpbGU6IHN0cmluZyxcbiAgUk9VVEVTOiBzdHJpbmdbXSwgb3V0cHV0Rm9sZGVyPzogc3RyaW5nKSB7XG4gIGNvbnN0IHBrTWdyID0gcmVxdWlyZSgnZHItY29tcC1wYWNrYWdlL3dmaC9saWIvcGFja2FnZU1ncicpO1xuICBjb25zdCBzaHV0ZG93bjogKCkgPT4gdm9pZCA9IGF3YWl0IHBrTWdyLnJ1blNlcnZlcihhcGkuYXJndik7XG4gIGxldCBtYXBGaWxlOiBzdHJpbmc7XG4gIHRyeSB7XG4gICAgbWFwRmlsZSA9IGF3YWl0IHdyaXRlUm91dGVzKHN0YXRpY0RpciwgaHRtbEZpbGUsIG1haW5GaWxlLCBST1VURVMsIG91dHB1dEZvbGRlcik7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgdGhyb3cgZXJyO1xuICB9IGZpbmFsbHkge1xuICAgIGF3YWl0IHNodXRkb3duKCk7XG4gICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgIHJlcXVpcmUoJ2xvZzRqcycpLnNodXRkb3duKHJlc29sdmUpO1xuICAgIH0pO1xuICB9XG4gIHJldHVybiBtYXBGaWxlO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVuZGVyUm91dGVXaXRoTG9jYWxTZXJ2ZXIoaHRtbDogc3RyaW5nLCBtYWluRmlsZTogc3RyaW5nLFxuICByb3V0ZTogc3RyaW5nLCB1c2VEb21pbm9Nb2NrV2luZG93PzogYm9vbGVhbik6IFByb21pc2U8c3RyaW5nPiB7XG5cbiAgbGV0IG1hcEZpbGU6IHtbcm91dGU6IHN0cmluZ106IHN0cmluZ307XG4gIG1hcEZpbGUgPSBhd2FpdCByZW5kZXJSb3V0ZXMoaHRtbCwgbWFpbkZpbGUsIFtyb3V0ZV0sIHVzZURvbWlub01vY2tXaW5kb3cpO1xuICByZXR1cm4gbWFwRmlsZVtyb3V0ZV07XG59XG4iXX0=
