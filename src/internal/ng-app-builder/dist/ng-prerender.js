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
function renderRouteWithLocalServer(html, mainFile, route) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        let mapFile;
        mapFile = yield renderRoutes(html, mainFile, [route]);
        return mapFile[route];
    });
}
exports.renderRouteWithLocalServer = renderRouteWithLocalServer;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy1wcmVyZW5kZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNEJBQTRCO0FBQzVCLCtCQUErQjtBQUMvQixrQ0FBZ0M7QUFDaEMsNEJBQTBCO0FBQzFCLHVDQUFrRjtBQUNsRiwrQkFBb0Q7QUFFcEQsd0NBQStDO0FBRS9DLGtEQUE0QjtBQUM1QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQ3hELDBEQUF3QjtBQUN4QiwwRkFBNEU7QUFDNUUsOERBQStEO0FBQy9ELDhFQUEyRTtBQUUzRSxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFFakMscUJBQWMsRUFBRSxDQUFDO0FBRWpCLFNBQVMsWUFBWSxDQUFDLFNBQWlCLEVBQUUsR0FBWTtJQUNuRCxNQUFNLE1BQU0sR0FBUSxNQUFNLENBQUMsWUFBWSxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUN2RCxNQUFjLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztJQUMvQixNQUFjLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUM7QUFDN0MsQ0FBQztBQUVEOzs7Ozs7R0FNRztBQUNILFNBQWUsV0FBVyxDQUFDLFNBQWlCLEVBQUUsUUFBZ0IsRUFBRSxRQUFnQixFQUFFLE1BQWdCLEVBQ2hHLGFBQXNCOztRQUN0QixNQUFNLEtBQUssR0FBRyx1QkFBWSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUM3QyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDcEIsSUFBSSxhQUFhLElBQUksSUFBSTtZQUN2QixhQUFhLEdBQUcsV0FBSSxDQUFDLGNBQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUN4RCxNQUFNLFlBQVksR0FBRyxhQUFhLENBQUM7UUFD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Z0IsRUFBRSxZQUFxQjs7UUFDdkMsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLG9DQUFvQyxDQUFDLENBQUM7UUFDNUQsTUFBTSxRQUFRLEdBQWUsTUFBTSxLQUFLLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3RCxJQUFJLE9BQWUsQ0FBQztRQUNwQixJQUFJO1lBQ0YsT0FBTyxHQUFHLE1BQU0sV0FBVyxDQUFDLFNBQVMsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxZQUFZLENBQUMsQ0FBQztTQUNsRjtRQUFDLE9BQU8sR0FBRyxFQUFFO1lBQ1osT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNqQixNQUFNLEdBQUcsQ0FBQztTQUNYO2dCQUFTO1lBQ1IsTUFBTSxRQUFRLEVBQUUsQ0FBQztZQUNqQixNQUFNLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7Z0JBQzVCLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDdEMsQ0FBQyxDQUFDLENBQUM7U0FDSjtRQUNELE9BQU8sT0FBTyxDQUFDO0lBQ2pCLENBQUM7Q0FBQTtBQWpCRCxnRUFpQkM7QUFFRCxTQUFzQiwwQkFBMEIsQ0FBQyxJQUFZLEVBQUUsUUFBZ0IsRUFDN0UsS0FBYTs7UUFFYixJQUFJLE9BQWtDLENBQUM7UUFDdkMsT0FBTyxHQUFHLE1BQU0sWUFBWSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ3RELE9BQU8sT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3hCLENBQUM7Q0FBQTtBQU5ELGdFQU1DIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L25nLXByZXJlbmRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOm5vLWNvbnNvbGVcbi8vIExvYWQgem9uZS5qcyBmb3IgdGhlIHNlcnZlci5cbmltcG9ydCAnem9uZS5qcy9kaXN0L3pvbmUtbm9kZSc7XG5pbXBvcnQgJ3JlZmxlY3QtbWV0YWRhdGEnO1xuaW1wb3J0IHsgcmVhZEZpbGVTeW5jLCB3cml0ZUZpbGVTeW5jLCBleGlzdHNTeW5jLCBlbnN1cmVEaXJTeW5jIH0gZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IHsgam9pbiwgcmVsYXRpdmUsIHNlcCwgZGlybmFtZSB9IGZyb20gJ3BhdGgnO1xuXG5pbXBvcnQgeyBlbmFibGVQcm9kTW9kZSB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ25nLXByZXJlbmRlcicpO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgeyBwcm92aWRlTW9kdWxlTWFwIH0gZnJvbSAnQG5ndW5pdmVyc2FsL21vZHVsZS1tYXAtbmdmYWN0b3J5LWxvYWRlcic7XG5pbXBvcnQgeyByZW5kZXJNb2R1bGVGYWN0b3J5IH0gZnJvbSAnQGFuZ3VsYXIvcGxhdGZvcm0tc2VydmVyJztcbmltcG9ydCB7Uk9VVEVfTUFQX0ZJTEV9IGZyb20gJ0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9uZy1wcmVyZW5kZXInO1xuXG5jb25zdCBkb21pbm8gPSByZXF1aXJlKCdkb21pbm8nKTtcblxuZW5hYmxlUHJvZE1vZGUoKTtcblxuZnVuY3Rpb24gc2V0dXBHbG9iYWxzKGluZGV4SHRtbDogc3RyaW5nLCB1cmw/OiBzdHJpbmcpIHtcbiAgY29uc3Qgd2luZG93OiBhbnkgPSBkb21pbm8uY3JlYXRlV2luZG93KGluZGV4SHRtbCwgdXJsKTtcbiAgKGdsb2JhbCBhcyBhbnkpLndpbmRvdyA9IHdpbmRvdztcbiAgKGdsb2JhbCBhcyBhbnkpLmRvY3VtZW50ID0gd2luZG93LmRvY3VtZW50O1xufVxuXG4vKipcbiAqIFdyaXRlIHN0YXRpYyBwcmVyZW5kZXIgcGFnZXNcbiAqIEBwYXJhbSBzdGF0aWNEaXIgZGlzdC9zdGF0aWNcbiAqIEBwYXJhbSBodG1sRmlsZSBkaXN0L3N0YXRpYy88YXBwPi9pbmRleC5odG1sXG4gKiBAcGFyYW0gbWFpbkZpbGUgZGlzdC9zZXJ2ZXIvbWFpbi5qcyBmaWxlIHBhdGggd2hpY2ggY2FuIGJlIHJlcXVpcmUucmVzb2x2ZSwgc2hvdWxkIGJlIGNvcnJlc3BvbmRpbmcgdG8gYW5ndWxhci5qc29uXG4gKiBAcGFyYW0gUk9VVEVTIFxuICovXG5hc3luYyBmdW5jdGlvbiB3cml0ZVJvdXRlcyhzdGF0aWNEaXI6IHN0cmluZywgaHRtbEZpbGU6IHN0cmluZywgbWFpbkZpbGU6IHN0cmluZywgUk9VVEVTOiBzdHJpbmdbXSxcbiAgX291dHB1dEZvbGRlcj86IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IGluZGV4ID0gcmVhZEZpbGVTeW5jKGh0bWxGaWxlLCAndXRmOCcpO1xuICBzZXR1cEdsb2JhbHMoaW5kZXgpO1xuICBpZiAoX291dHB1dEZvbGRlciA9PSBudWxsKVxuICAgIF9vdXRwdXRGb2xkZXIgPSBqb2luKGRpcm5hbWUoaHRtbEZpbGUpLCAnX3ByZXJlbmRlcicpO1xuICBjb25zdCBvdXRwdXRGb2xkZXIgPSBfb3V0cHV0Rm9sZGVyO1xuICAvLyAqIE5PVEUgOjogbGVhdmUgdGhpcyBhcyByZXF1aXJlKCkgc2luY2UgdGhpcyBmaWxlIGlzIGJ1aWx0IER5bmFtaWNhbGx5IGZyb20gd2VicGFja1xuICBsb2cuaW5mbygnbWFpbiBmaWxlOicsIG1haW5GaWxlKTtcblxuICBjb25zdCBodG1sTWFwID0gYXdhaXQgcmVuZGVyUm91dGVzKGluZGV4LCBtYWluRmlsZSwgUk9VVEVTKTtcbiAgLy8gTG9hZCB0aGUgaW5kZXguaHRtbCBmaWxlIGNvbnRhaW5pbmcgcmVmZXJhbmNlcyB0byB5b3VyIGFwcGxpY2F0aW9uIGJ1bmRsZS5cblxuICBjb25zdCByb3V0ZXJGaWxlTWFwOiB7W3JvdXRlOiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG4gIC8vIEl0ZXJhdGUgZWFjaCByb3V0ZSBwYXRoXG4gIGZvciAoY29uc3QgW3JvdXRlLCBodG1sXSBvZiBPYmplY3QuZW50cmllcyhodG1sTWFwKSkge1xuICAgIGNvbnN0IGZ1bGxQYXRoID0gam9pbihvdXRwdXRGb2xkZXIsIHJvdXRlKTtcblxuICAgIC8vIE1ha2Ugc3VyZSB0aGUgZGlyZWN0b3J5IHN0cnVjdHVyZSBpcyB0aGVyZVxuICAgIGlmICghZXhpc3RzU3luYyhmdWxsUGF0aCkpIHtcbiAgICAgIGVuc3VyZURpclN5bmMoZnVsbFBhdGgpO1xuICAgIH1cbiAgICBjb25zdCB3ZiA9IGpvaW4oZnVsbFBhdGgsICdpbmRleC5odG1sJyk7XG4gICAgd3JpdGVGaWxlU3luYyh3ZiwgaHRtbCk7XG4gICAgbG9nLmluZm8oJ1JlbmRlciAlcyBwYWdlIGF0ICcsIHJvdXRlLCB3Zik7XG4gICAgbGV0IGluZGV4RmlsZSA9IHJlbGF0aXZlKHN0YXRpY0Rpciwgd2YpO1xuICAgIGlmIChzZXAgPT09ICdcXFxcJylcbiAgICAgIGluZGV4RmlsZSA9IGluZGV4RmlsZS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgcm91dGVyRmlsZU1hcFtyb3V0ZV0gPSBpbmRleEZpbGU7XG4gIH1cbiAgY29uc3Qgcm91dGVNYXBGaWxlID0gam9pbihvdXRwdXRGb2xkZXIsIFJPVVRFX01BUF9GSUxFKTtcbiAgd3JpdGVGaWxlU3luYyhyb3V0ZU1hcEZpbGUsIEpTT04uc3RyaW5naWZ5KHJvdXRlckZpbGVNYXAsIG51bGwsICcgICcpLCAndXRmLTgnKTtcbiAgbG9nLmluZm8oJ3dyaXRlICcsIHJvdXRlTWFwRmlsZSk7XG4gIHJldHVybiByb3V0ZU1hcEZpbGU7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHJlbmRlclJvdXRlcyhpbmRleDogc3RyaW5nLCBtYWluRmlsZTogc3RyaW5nLCBST1VURVM6IHN0cmluZ1tdKTogUHJvbWlzZTx7W3JvdXRlOiBzdHJpbmddOiBzdHJpbmd9PiB7XG4gICAgLy8gY29uc3QgaW5kZXggPSByZWFkRmlsZVN5bmMoaHRtbEZpbGUsICd1dGY4Jyk7XG4gICAgc2V0dXBHbG9iYWxzKGluZGV4KTtcbiAgICAvLyBpZiAoX291dHB1dEZvbGRlciA9PSBudWxsKVxuICAgIC8vICAgX291dHB1dEZvbGRlciA9IGpvaW4oZGlybmFtZShodG1sRmlsZSksICdfcHJlcmVuZGVyJyk7XG4gICAgLy8gY29uc3Qgb3V0cHV0Rm9sZGVyID0gX291dHB1dEZvbGRlcjtcbiAgICAvLyAqIE5PVEUgOjogbGVhdmUgdGhpcyBhcyByZXF1aXJlKCkgc2luY2UgdGhpcyBmaWxlIGlzIGJ1aWx0IER5bmFtaWNhbGx5IGZyb20gd2VicGFja1xuICAgIGxvZy5pbmZvKCdtYWluIGZpbGU6JywgbWFpbkZpbGUpO1xuICAgIGNvbnN0IHsgQXBwU2VydmVyTW9kdWxlTmdGYWN0b3J5LCBMQVpZX01PRFVMRV9NQVAgfSA9IHJlcXVpcmUobWFpbkZpbGUpO1xuXG4gICAgY29uc3Qgcm91dGVIdG1sTWFwOiB7W3JvdXRlOiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG4gICAgZm9yIChsZXQgcm91dGUgb2YgUk9VVEVTKSB7XG4gICAgICAvLyBjb25zdCBmdWxsUGF0aCA9IGpvaW4ob3V0cHV0Rm9sZGVyLCByb3V0ZSk7XG5cbiAgICAgIC8vIC8vIE1ha2Ugc3VyZSB0aGUgZGlyZWN0b3J5IHN0cnVjdHVyZSBpcyB0aGVyZVxuICAgICAgLy8gaWYgKCFleGlzdHNTeW5jKGZ1bGxQYXRoKSkge1xuICAgICAgLy8gICBlbnN1cmVEaXJTeW5jKGZ1bGxQYXRoKTtcbiAgICAgIC8vIH1cbiAgICAgIC8vIFdyaXRlcyByZW5kZXJlZCBIVE1MIHRvIGluZGV4Lmh0bWwsIHJlcGxhY2luZyB0aGUgZmlsZSBpZiBpdCBhbHJlYWR5IGV4aXN0cy5cbiAgICAgIGNvbnN0IGh0bWwgPSBhd2FpdCByZW5kZXJNb2R1bGVGYWN0b3J5KEFwcFNlcnZlck1vZHVsZU5nRmFjdG9yeSwge1xuICAgICAgICBkb2N1bWVudDogaW5kZXgsXG4gICAgICAgIHVybDogZW5jb2RlVVJJKGRlY29kZVVSSShfLnRyaW1FbmQocm91dGUsICcvJykpKSxcbiAgICAgICAgZXh0cmFQcm92aWRlcnM6IFtcbiAgICAgICAgICBwcm92aWRlTW9kdWxlTWFwKExBWllfTU9EVUxFX01BUClcbiAgICAgIF19KTtcbiAgICAgIHJvdXRlSHRtbE1hcFtyb3V0ZV0gPSBodG1sO1xuICAgIH1cbiAgICByZXR1cm4gcm91dGVIdG1sTWFwO1xufVxuXG4vKipcbiAqIFdyaXRlIHN0YXRpYyBwcmVyZW5kZXIgcGFnZXNcbiAqIEBwYXJhbSBzdGF0aWNEaXIgZGlzdC9zdGF0aWNcbiAqIEBwYXJhbSBodG1sRmlsZSBkaXN0L3N0YXRpYy88YXBwPi9pbmRleC5odG1sXG4gKiBAcGFyYW0gbWFpbkZpbGUgZGlzdC9zZXJ2ZXIvbWFpbi5qcyBmaWxlIHBhdGggd2hpY2ggY2FuIGJlIHJlcXVpcmUucmVzb2x2ZSwgc2hvdWxkIGJlIGNvcnJlc3BvbmRpbmcgdG8gYW5ndWxhci5qc29uXG4gKiBAcGFyYW0gUk9VVEVTIFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gd3JpdGVSb3V0ZXNXaXRoTG9jYWxTZXJ2ZXIoc3RhdGljRGlyOiBzdHJpbmcsIGh0bWxGaWxlOiBzdHJpbmcsIG1haW5GaWxlOiBzdHJpbmcsXG4gIFJPVVRFUzogc3RyaW5nW10sIG91dHB1dEZvbGRlcj86IHN0cmluZykge1xuICBjb25zdCBwa01nciA9IHJlcXVpcmUoJ2RyLWNvbXAtcGFja2FnZS93ZmgvbGliL3BhY2thZ2VNZ3InKTtcbiAgY29uc3Qgc2h1dGRvd246ICgpID0+IHZvaWQgPSBhd2FpdCBwa01nci5ydW5TZXJ2ZXIoYXBpLmFyZ3YpO1xuICBsZXQgbWFwRmlsZTogc3RyaW5nO1xuICB0cnkge1xuICAgIG1hcEZpbGUgPSBhd2FpdCB3cml0ZVJvdXRlcyhzdGF0aWNEaXIsIGh0bWxGaWxlLCBtYWluRmlsZSwgUk9VVEVTLCBvdXRwdXRGb2xkZXIpO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgIHRocm93IGVycjtcbiAgfSBmaW5hbGx5IHtcbiAgICBhd2FpdCBzaHV0ZG93bigpO1xuICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICByZXF1aXJlKCdsb2c0anMnKS5zaHV0ZG93bihyZXNvbHZlKTtcbiAgICB9KTtcbiAgfVxuICByZXR1cm4gbWFwRmlsZTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlbmRlclJvdXRlV2l0aExvY2FsU2VydmVyKGh0bWw6IHN0cmluZywgbWFpbkZpbGU6IHN0cmluZyxcbiAgcm91dGU6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG5cbiAgbGV0IG1hcEZpbGU6IHtbcm91dGU6IHN0cmluZ106IHN0cmluZ307XG4gIG1hcEZpbGUgPSBhd2FpdCByZW5kZXJSb3V0ZXMoaHRtbCwgbWFpbkZpbGUsIFtyb3V0ZV0pO1xuICByZXR1cm4gbWFwRmlsZVtyb3V0ZV07XG59XG4iXX0=
