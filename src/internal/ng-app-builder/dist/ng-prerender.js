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
function renderRoutes(index, mainFile, ROUTES, prerenderParams = null, useDominoMockWindow = true) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        // const index = readFileSync(htmlFile, 'utf8');
        if (useDominoMockWindow)
            setupGlobals(index);
        // * NOTE :: leave this as require() since this file is built Dynamically from webpack
        log.info('main file:', mainFile);
        const { AppServerModuleNgFactory, LAZY_MODULE_MAP } = require(mainFile);
        const routeHtmlMap = {};
        for (let route of ROUTES) {
            // console.log(provideModuleMap(LAZY_MODULE_MAP));
            // Writes rendered HTML to index.html, replacing the file if it already exists.
            const html = yield platform_server_1.renderModuleFactory(AppServerModuleNgFactory, {
                document: index,
                url: encodeURI(decodeURI(_.trimEnd(route, '/'))),
                extraProviders: [
                    {
                        provide: 'PRERENDER_PARAM',
                        useValue: prerenderParams
                    },
                    module_map_ngfactory_loader_1.provideModuleMap(LAZY_MODULE_MAP)
                ]
            });
            routeHtmlMap[route] = removeServerSideStyleAttribute(html);
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
            log.error(err);
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
function renderRouteWithLocalServer(html, mainFile, route, prerenderParam, useDominoMockWindow) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        let mapFile;
        mapFile = yield renderRoutes(html, mainFile, [route], prerenderParam, useDominoMockWindow);
        return mapFile[route];
    });
}
exports.renderRouteWithLocalServer = renderRouteWithLocalServer;
/**
 * Work around issue: https://github.com/angular/preboot/issues/75#issuecomment-421266570
 * Angular client application will remove all style elements which are rendered from server side,
 * when it finishes initialization but before those lazy route components finishing rendering,
 * this causes flicker problem for rendering a prerendered page.
 * Check this out (https://github.com/angular/angular/blob/7b70760c8d4f69c498dc4a028beb6dda53acbcbe/packages/platform-browser/src/browser/server-transition.ts#L27)
 */
function removeServerSideStyleAttribute(html) {
    return html.replace(/<style\s+(ng-transition="[^"]*?")/g, '<style ssr');
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy1wcmVyZW5kZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNEJBQTRCO0FBQzVCLCtCQUErQjtBQUMvQixrQ0FBZ0M7QUFDaEMsNEJBQTBCO0FBQzFCLHVDQUFrRjtBQUNsRiwrQkFBb0Q7QUFFcEQsd0NBQStDO0FBRS9DLGtEQUE0QjtBQUM1QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQ3hELDBEQUF3QjtBQUN4QiwwRkFBNEU7QUFDNUUsOERBQStEO0FBQy9ELDhFQUEyRTtBQUUzRSxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFFakMscUJBQWMsRUFBRSxDQUFDO0FBRWpCLFNBQVMsWUFBWSxDQUFDLFNBQWlCLEVBQUUsR0FBWTtJQUNuRCxNQUFNLE1BQU0sR0FBUSxNQUFNLENBQUMsWUFBWSxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUN4RCxJQUFLLE1BQWMsQ0FBQyxNQUFNLEVBQUU7UUFDMUIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUcsTUFBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0tBQy9DO0lBQ0EsTUFBYyxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7SUFDL0IsTUFBYyxDQUFDLFFBQVEsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDO0FBQzdDLENBQUM7QUFFRDs7Ozs7O0dBTUc7QUFDSCxTQUFlLFdBQVcsQ0FBQyxTQUFpQixFQUFFLFFBQWdCLEVBQUUsUUFBZ0IsRUFBRSxNQUFnQixFQUNoRyxhQUFzQjs7UUFDdEIsTUFBTSxLQUFLLEdBQUcsdUJBQVksQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDN0MsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3BCLElBQUksYUFBYSxJQUFJLElBQUk7WUFDdkIsYUFBYSxHQUFHLFdBQUksQ0FBQyxjQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDeEQsTUFBTSxZQUFZLEdBQUcsYUFBYSxDQUFDO1FBQ25DLHNGQUFzRjtRQUN0RixHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxRQUFRLENBQUMsQ0FBQztRQUVqQyxNQUFNLE9BQU8sR0FBRyxNQUFNLFlBQVksQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQzVELDZFQUE2RTtRQUU3RSxNQUFNLGFBQWEsR0FBOEIsRUFBRSxDQUFDO1FBQ3BELDBCQUEwQjtRQUMxQixLQUFLLE1BQU0sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUNuRCxNQUFNLFFBQVEsR0FBRyxXQUFJLENBQUMsWUFBWSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBRTNDLDZDQUE2QztZQUM3QyxJQUFJLENBQUMscUJBQVUsQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDekIsd0JBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQzthQUN6QjtZQUNELE1BQU0sRUFBRSxHQUFHLFdBQUksQ0FBQyxRQUFRLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDeEMsd0JBQWEsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDeEIsR0FBRyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDMUMsSUFBSSxTQUFTLEdBQUcsZUFBUSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUN4QyxJQUFJLFVBQUcsS0FBSyxJQUFJO2dCQUNkLFNBQVMsR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztZQUM1QyxhQUFhLENBQUMsS0FBSyxDQUFDLEdBQUcsU0FBUyxDQUFDO1NBQ2xDO1FBQ0QsTUFBTSxZQUFZLEdBQUcsV0FBSSxDQUFDLFlBQVksRUFBRSw2QkFBYyxDQUFDLENBQUM7UUFDeEQsd0JBQWEsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2hGLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ2pDLE9BQU8sWUFBWSxDQUFDO0lBQ3RCLENBQUM7Q0FBQTtBQUVELFNBQWUsWUFBWSxDQUFDLEtBQWEsRUFBRSxRQUFnQixFQUFFLE1BQWdCLEVBQUUsa0JBQXVCLElBQUksRUFBRSxtQkFBbUIsR0FBRyxJQUFJOztRQUVsSSxnREFBZ0Q7UUFDaEQsSUFBSSxtQkFBbUI7WUFDckIsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3RCLHNGQUFzRjtRQUN0RixHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNqQyxNQUFNLEVBQUUsd0JBQXdCLEVBQUUsZUFBZSxFQUFFLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRXhFLE1BQU0sWUFBWSxHQUE4QixFQUFFLENBQUM7UUFDbkQsS0FBSyxJQUFJLEtBQUssSUFBSSxNQUFNLEVBQUU7WUFDeEIsa0RBQWtEO1lBQ2xELCtFQUErRTtZQUMvRSxNQUFNLElBQUksR0FBRyxNQUFNLHFDQUFtQixDQUFDLHdCQUF3QixFQUFFO2dCQUMvRCxRQUFRLEVBQUUsS0FBSztnQkFDZixHQUFHLEVBQUUsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUNoRCxjQUFjLEVBQUU7b0JBQ2Q7d0JBQ0UsT0FBTyxFQUFFLGlCQUFpQjt3QkFDMUIsUUFBUSxFQUFFLGVBQWU7cUJBQzFCO29CQUNELDhDQUFnQixDQUFDLGVBQWUsQ0FBQztpQkFDcEM7YUFBQyxDQUFDLENBQUM7WUFDSixZQUFZLENBQUMsS0FBSyxDQUFDLEdBQUcsOEJBQThCLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDNUQ7UUFDRCxPQUFPLFlBQVksQ0FBQztJQUN4QixDQUFDO0NBQUE7QUFFRDs7Ozs7O0dBTUc7QUFDSCxTQUFzQiwwQkFBMEIsQ0FBQyxTQUFpQixFQUFFLFFBQWdCLEVBQUUsUUFBZ0IsRUFDcEcsTUFBZ0IsRUFBRSxZQUFxQjs7UUFDdkMsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLG9DQUFvQyxDQUFDLENBQUM7UUFDNUQsTUFBTSxRQUFRLEdBQWUsTUFBTSxLQUFLLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3RCxJQUFJLE9BQWUsQ0FBQztRQUNwQixJQUFJO1lBQ0YsT0FBTyxHQUFHLE1BQU0sV0FBVyxDQUFDLFNBQVMsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxZQUFZLENBQUMsQ0FBQztTQUNsRjtRQUFDLE9BQU8sR0FBRyxFQUFFO1lBQ1osR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNmLE1BQU0sR0FBRyxDQUFDO1NBQ1g7Z0JBQVM7WUFDUixNQUFNLFFBQVEsRUFBRSxDQUFDO1lBQ2pCLE1BQU0sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtnQkFDNUIsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN0QyxDQUFDLENBQUMsQ0FBQztTQUNKO1FBQ0QsT0FBTyxPQUFPLENBQUM7SUFDakIsQ0FBQztDQUFBO0FBakJELGdFQWlCQztBQUVELFNBQXNCLDBCQUEwQixDQUFDLElBQVksRUFBRSxRQUFnQixFQUM3RSxLQUFhLEVBQUUsY0FBbUIsRUFBRSxtQkFBNkI7O1FBRWpFLElBQUksT0FBa0MsQ0FBQztRQUN2QyxPQUFPLEdBQUcsTUFBTSxZQUFZLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxDQUFDLEtBQUssQ0FBQyxFQUFFLGNBQWMsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1FBQzNGLE9BQU8sT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3hCLENBQUM7Q0FBQTtBQU5ELGdFQU1DO0FBRUQ7Ozs7OztHQU1HO0FBQ0gsU0FBUyw4QkFBOEIsQ0FBQyxJQUFZO0lBQ2xELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxvQ0FBb0MsRUFBRSxZQUFZLENBQUMsQ0FBQztBQUMxRSxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L25nLXByZXJlbmRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOm5vLWNvbnNvbGVcbi8vIExvYWQgem9uZS5qcyBmb3IgdGhlIHNlcnZlci5cbmltcG9ydCAnem9uZS5qcy9kaXN0L3pvbmUtbm9kZSc7XG5pbXBvcnQgJ3JlZmxlY3QtbWV0YWRhdGEnO1xuaW1wb3J0IHsgcmVhZEZpbGVTeW5jLCB3cml0ZUZpbGVTeW5jLCBleGlzdHNTeW5jLCBlbnN1cmVEaXJTeW5jIH0gZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IHsgam9pbiwgcmVsYXRpdmUsIHNlcCwgZGlybmFtZSB9IGZyb20gJ3BhdGgnO1xuXG5pbXBvcnQgeyBlbmFibGVQcm9kTW9kZSB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ25nLXByZXJlbmRlcicpO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgeyBwcm92aWRlTW9kdWxlTWFwIH0gZnJvbSAnQG5ndW5pdmVyc2FsL21vZHVsZS1tYXAtbmdmYWN0b3J5LWxvYWRlcic7XG5pbXBvcnQgeyByZW5kZXJNb2R1bGVGYWN0b3J5IH0gZnJvbSAnQGFuZ3VsYXIvcGxhdGZvcm0tc2VydmVyJztcbmltcG9ydCB7Uk9VVEVfTUFQX0ZJTEV9IGZyb20gJ0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9uZy1wcmVyZW5kZXInO1xuXG5jb25zdCBkb21pbm8gPSByZXF1aXJlKCdkb21pbm8nKTtcblxuZW5hYmxlUHJvZE1vZGUoKTtcblxuZnVuY3Rpb24gc2V0dXBHbG9iYWxzKGluZGV4SHRtbDogc3RyaW5nLCB1cmw/OiBzdHJpbmcpIHtcbiAgY29uc3Qgd2luZG93OiBhbnkgPSBkb21pbm8uY3JlYXRlV2luZG93KGluZGV4SHRtbCwgdXJsKTtcbiAgaWYgKChnbG9iYWwgYXMgYW55KS53aW5kb3cpIHtcbiAgICBPYmplY3QuYXNzaWduKHdpbmRvdywgKGdsb2JhbCBhcyBhbnkpLndpbmRvdyk7XG4gIH1cbiAgKGdsb2JhbCBhcyBhbnkpLndpbmRvdyA9IHdpbmRvdztcbiAgKGdsb2JhbCBhcyBhbnkpLmRvY3VtZW50ID0gd2luZG93LmRvY3VtZW50O1xufVxuXG4vKipcbiAqIFdyaXRlIHN0YXRpYyBwcmVyZW5kZXIgcGFnZXNcbiAqIEBwYXJhbSBzdGF0aWNEaXIgZGlzdC9zdGF0aWNcbiAqIEBwYXJhbSBodG1sRmlsZSBkaXN0L3N0YXRpYy88YXBwPi9pbmRleC5odG1sXG4gKiBAcGFyYW0gbWFpbkZpbGUgZGlzdC9zZXJ2ZXIvbWFpbi5qcyBmaWxlIHBhdGggd2hpY2ggY2FuIGJlIHJlcXVpcmUucmVzb2x2ZSwgc2hvdWxkIGJlIGNvcnJlc3BvbmRpbmcgdG8gYW5ndWxhci5qc29uXG4gKiBAcGFyYW0gUk9VVEVTIFxuICovXG5hc3luYyBmdW5jdGlvbiB3cml0ZVJvdXRlcyhzdGF0aWNEaXI6IHN0cmluZywgaHRtbEZpbGU6IHN0cmluZywgbWFpbkZpbGU6IHN0cmluZywgUk9VVEVTOiBzdHJpbmdbXSxcbiAgX291dHB1dEZvbGRlcj86IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IGluZGV4ID0gcmVhZEZpbGVTeW5jKGh0bWxGaWxlLCAndXRmOCcpO1xuICBzZXR1cEdsb2JhbHMoaW5kZXgpO1xuICBpZiAoX291dHB1dEZvbGRlciA9PSBudWxsKVxuICAgIF9vdXRwdXRGb2xkZXIgPSBqb2luKGRpcm5hbWUoaHRtbEZpbGUpLCAnX3ByZXJlbmRlcicpO1xuICBjb25zdCBvdXRwdXRGb2xkZXIgPSBfb3V0cHV0Rm9sZGVyO1xuICAvLyAqIE5PVEUgOjogbGVhdmUgdGhpcyBhcyByZXF1aXJlKCkgc2luY2UgdGhpcyBmaWxlIGlzIGJ1aWx0IER5bmFtaWNhbGx5IGZyb20gd2VicGFja1xuICBsb2cuaW5mbygnbWFpbiBmaWxlOicsIG1haW5GaWxlKTtcblxuICBjb25zdCBodG1sTWFwID0gYXdhaXQgcmVuZGVyUm91dGVzKGluZGV4LCBtYWluRmlsZSwgUk9VVEVTKTtcbiAgLy8gTG9hZCB0aGUgaW5kZXguaHRtbCBmaWxlIGNvbnRhaW5pbmcgcmVmZXJhbmNlcyB0byB5b3VyIGFwcGxpY2F0aW9uIGJ1bmRsZS5cblxuICBjb25zdCByb3V0ZXJGaWxlTWFwOiB7W3JvdXRlOiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG4gIC8vIEl0ZXJhdGUgZWFjaCByb3V0ZSBwYXRoXG4gIGZvciAoY29uc3QgW3JvdXRlLCBodG1sXSBvZiBPYmplY3QuZW50cmllcyhodG1sTWFwKSkge1xuICAgIGNvbnN0IGZ1bGxQYXRoID0gam9pbihvdXRwdXRGb2xkZXIsIHJvdXRlKTtcblxuICAgIC8vIE1ha2Ugc3VyZSB0aGUgZGlyZWN0b3J5IHN0cnVjdHVyZSBpcyB0aGVyZVxuICAgIGlmICghZXhpc3RzU3luYyhmdWxsUGF0aCkpIHtcbiAgICAgIGVuc3VyZURpclN5bmMoZnVsbFBhdGgpO1xuICAgIH1cbiAgICBjb25zdCB3ZiA9IGpvaW4oZnVsbFBhdGgsICdpbmRleC5odG1sJyk7XG4gICAgd3JpdGVGaWxlU3luYyh3ZiwgaHRtbCk7XG4gICAgbG9nLmluZm8oJ1JlbmRlciAlcyBwYWdlIGF0ICcsIHJvdXRlLCB3Zik7XG4gICAgbGV0IGluZGV4RmlsZSA9IHJlbGF0aXZlKHN0YXRpY0Rpciwgd2YpO1xuICAgIGlmIChzZXAgPT09ICdcXFxcJylcbiAgICAgIGluZGV4RmlsZSA9IGluZGV4RmlsZS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgcm91dGVyRmlsZU1hcFtyb3V0ZV0gPSBpbmRleEZpbGU7XG4gIH1cbiAgY29uc3Qgcm91dGVNYXBGaWxlID0gam9pbihvdXRwdXRGb2xkZXIsIFJPVVRFX01BUF9GSUxFKTtcbiAgd3JpdGVGaWxlU3luYyhyb3V0ZU1hcEZpbGUsIEpTT04uc3RyaW5naWZ5KHJvdXRlckZpbGVNYXAsIG51bGwsICcgICcpLCAndXRmLTgnKTtcbiAgbG9nLmluZm8oJ3dyaXRlICcsIHJvdXRlTWFwRmlsZSk7XG4gIHJldHVybiByb3V0ZU1hcEZpbGU7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHJlbmRlclJvdXRlcyhpbmRleDogc3RyaW5nLCBtYWluRmlsZTogc3RyaW5nLCBST1VURVM6IHN0cmluZ1tdLCBwcmVyZW5kZXJQYXJhbXM6IGFueSA9IG51bGwsIHVzZURvbWlub01vY2tXaW5kb3cgPSB0cnVlKVxuOiBQcm9taXNlPHtbcm91dGU6IHN0cmluZ106IHN0cmluZ30+IHtcbiAgICAvLyBjb25zdCBpbmRleCA9IHJlYWRGaWxlU3luYyhodG1sRmlsZSwgJ3V0ZjgnKTtcbiAgICBpZiAodXNlRG9taW5vTW9ja1dpbmRvdylcbiAgICAgIHNldHVwR2xvYmFscyhpbmRleCk7XG4gICAgLy8gKiBOT1RFIDo6IGxlYXZlIHRoaXMgYXMgcmVxdWlyZSgpIHNpbmNlIHRoaXMgZmlsZSBpcyBidWlsdCBEeW5hbWljYWxseSBmcm9tIHdlYnBhY2tcbiAgICBsb2cuaW5mbygnbWFpbiBmaWxlOicsIG1haW5GaWxlKTtcbiAgICBjb25zdCB7IEFwcFNlcnZlck1vZHVsZU5nRmFjdG9yeSwgTEFaWV9NT0RVTEVfTUFQIH0gPSByZXF1aXJlKG1haW5GaWxlKTtcblxuICAgIGNvbnN0IHJvdXRlSHRtbE1hcDoge1tyb3V0ZTogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuICAgIGZvciAobGV0IHJvdXRlIG9mIFJPVVRFUykge1xuICAgICAgLy8gY29uc29sZS5sb2cocHJvdmlkZU1vZHVsZU1hcChMQVpZX01PRFVMRV9NQVApKTtcbiAgICAgIC8vIFdyaXRlcyByZW5kZXJlZCBIVE1MIHRvIGluZGV4Lmh0bWwsIHJlcGxhY2luZyB0aGUgZmlsZSBpZiBpdCBhbHJlYWR5IGV4aXN0cy5cbiAgICAgIGNvbnN0IGh0bWwgPSBhd2FpdCByZW5kZXJNb2R1bGVGYWN0b3J5KEFwcFNlcnZlck1vZHVsZU5nRmFjdG9yeSwge1xuICAgICAgICBkb2N1bWVudDogaW5kZXgsXG4gICAgICAgIHVybDogZW5jb2RlVVJJKGRlY29kZVVSSShfLnRyaW1FbmQocm91dGUsICcvJykpKSxcbiAgICAgICAgZXh0cmFQcm92aWRlcnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBwcm92aWRlOiAnUFJFUkVOREVSX1BBUkFNJyxcbiAgICAgICAgICAgIHVzZVZhbHVlOiBwcmVyZW5kZXJQYXJhbXNcbiAgICAgICAgICB9LFxuICAgICAgICAgIHByb3ZpZGVNb2R1bGVNYXAoTEFaWV9NT0RVTEVfTUFQKVxuICAgICAgXX0pO1xuICAgICAgcm91dGVIdG1sTWFwW3JvdXRlXSA9IHJlbW92ZVNlcnZlclNpZGVTdHlsZUF0dHJpYnV0ZShodG1sKTtcbiAgICB9XG4gICAgcmV0dXJuIHJvdXRlSHRtbE1hcDtcbn1cblxuLyoqXG4gKiBXcml0ZSBzdGF0aWMgcHJlcmVuZGVyIHBhZ2VzXG4gKiBAcGFyYW0gc3RhdGljRGlyIGRpc3Qvc3RhdGljXG4gKiBAcGFyYW0gaHRtbEZpbGUgZGlzdC9zdGF0aWMvPGFwcD4vaW5kZXguaHRtbFxuICogQHBhcmFtIG1haW5GaWxlIGRpc3Qvc2VydmVyL21haW4uanMgZmlsZSBwYXRoIHdoaWNoIGNhbiBiZSByZXF1aXJlLnJlc29sdmUsIHNob3VsZCBiZSBjb3JyZXNwb25kaW5nIHRvIGFuZ3VsYXIuanNvblxuICogQHBhcmFtIFJPVVRFUyBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdyaXRlUm91dGVzV2l0aExvY2FsU2VydmVyKHN0YXRpY0Rpcjogc3RyaW5nLCBodG1sRmlsZTogc3RyaW5nLCBtYWluRmlsZTogc3RyaW5nLFxuICBST1VURVM6IHN0cmluZ1tdLCBvdXRwdXRGb2xkZXI/OiBzdHJpbmcpIHtcbiAgY29uc3QgcGtNZ3IgPSByZXF1aXJlKCdkci1jb21wLXBhY2thZ2Uvd2ZoL2xpYi9wYWNrYWdlTWdyJyk7XG4gIGNvbnN0IHNodXRkb3duOiAoKSA9PiB2b2lkID0gYXdhaXQgcGtNZ3IucnVuU2VydmVyKGFwaS5hcmd2KTtcbiAgbGV0IG1hcEZpbGU6IHN0cmluZztcbiAgdHJ5IHtcbiAgICBtYXBGaWxlID0gYXdhaXQgd3JpdGVSb3V0ZXMoc3RhdGljRGlyLCBodG1sRmlsZSwgbWFpbkZpbGUsIFJPVVRFUywgb3V0cHV0Rm9sZGVyKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgbG9nLmVycm9yKGVycik7XG4gICAgdGhyb3cgZXJyO1xuICB9IGZpbmFsbHkge1xuICAgIGF3YWl0IHNodXRkb3duKCk7XG4gICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgIHJlcXVpcmUoJ2xvZzRqcycpLnNodXRkb3duKHJlc29sdmUpO1xuICAgIH0pO1xuICB9XG4gIHJldHVybiBtYXBGaWxlO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVuZGVyUm91dGVXaXRoTG9jYWxTZXJ2ZXIoaHRtbDogc3RyaW5nLCBtYWluRmlsZTogc3RyaW5nLFxuICByb3V0ZTogc3RyaW5nLCBwcmVyZW5kZXJQYXJhbTogYW55LCB1c2VEb21pbm9Nb2NrV2luZG93PzogYm9vbGVhbik6IFByb21pc2U8c3RyaW5nPiB7XG5cbiAgbGV0IG1hcEZpbGU6IHtbcm91dGU6IHN0cmluZ106IHN0cmluZ307XG4gIG1hcEZpbGUgPSBhd2FpdCByZW5kZXJSb3V0ZXMoaHRtbCwgbWFpbkZpbGUsIFtyb3V0ZV0sIHByZXJlbmRlclBhcmFtLCB1c2VEb21pbm9Nb2NrV2luZG93KTtcbiAgcmV0dXJuIG1hcEZpbGVbcm91dGVdO1xufVxuXG4vKipcbiAqIFdvcmsgYXJvdW5kIGlzc3VlOiBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9wcmVib290L2lzc3Vlcy83NSNpc3N1ZWNvbW1lbnQtNDIxMjY2NTcwXG4gKiBBbmd1bGFyIGNsaWVudCBhcHBsaWNhdGlvbiB3aWxsIHJlbW92ZSBhbGwgc3R5bGUgZWxlbWVudHMgd2hpY2ggYXJlIHJlbmRlcmVkIGZyb20gc2VydmVyIHNpZGUsXG4gKiB3aGVuIGl0IGZpbmlzaGVzIGluaXRpYWxpemF0aW9uIGJ1dCBiZWZvcmUgdGhvc2UgbGF6eSByb3V0ZSBjb21wb25lbnRzIGZpbmlzaGluZyByZW5kZXJpbmcsXG4gKiB0aGlzIGNhdXNlcyBmbGlja2VyIHByb2JsZW0gZm9yIHJlbmRlcmluZyBhIHByZXJlbmRlcmVkIHBhZ2UuIFxuICogQ2hlY2sgdGhpcyBvdXQgKGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXIvYmxvYi83YjcwNzYwYzhkNGY2OWM0OThkYzRhMDI4YmViNmRkYTUzYWNiY2JlL3BhY2thZ2VzL3BsYXRmb3JtLWJyb3dzZXIvc3JjL2Jyb3dzZXIvc2VydmVyLXRyYW5zaXRpb24udHMjTDI3KVxuICovXG5mdW5jdGlvbiByZW1vdmVTZXJ2ZXJTaWRlU3R5bGVBdHRyaWJ1dGUoaHRtbDogc3RyaW5nKSB7XG4gIHJldHVybiBodG1sLnJlcGxhY2UoLzxzdHlsZVxccysobmctdHJhbnNpdGlvbj1cIlteXCJdKj9cIikvZywgJzxzdHlsZSBzc3InKTtcbn1cbiJdfQ==
