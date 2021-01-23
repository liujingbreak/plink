"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderRouteWithLocalServer = exports.writeRoutesWithLocalServer = void 0;
// tslint:disable:no-console
// Load zone.js for the server.
require("zone.js/dist/zone-node");
require("reflect-metadata");
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
const core_1 = require("@angular/core");
const _ = __importStar(require("lodash"));
const log = require('log4js').getLogger('ng-prerender');
const __api_1 = __importDefault(require("__api"));
const module_map_ngfactory_loader_1 = require("@nguniversal/module-map-ngfactory-loader");
const platform_server_1 = require("@angular/platform-server");
const ng_prerender_1 = require("@wfh/assets-processer/dist/ng-prerender");
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
    return __awaiter(this, void 0, void 0, function* () {
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
    return __awaiter(this, void 0, void 0, function* () {
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
    return __awaiter(this, void 0, void 0, function* () {
        const pkMgr = require('@wfh/plink/wfh/lib/packageMgr');
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
    return __awaiter(this, void 0, void 0, function* () {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmctcHJlcmVuZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibmctcHJlcmVuZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSw0QkFBNEI7QUFDNUIsK0JBQStCO0FBQy9CLGtDQUFnQztBQUNoQyw0QkFBMEI7QUFDMUIsdUNBQWtGO0FBQ2xGLCtCQUFvRDtBQUVwRCx3Q0FBK0M7QUFFL0MsMENBQTRCO0FBQzVCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDeEQsa0RBQXdCO0FBQ3hCLDBGQUE0RTtBQUM1RSw4REFBK0Q7QUFDL0QsMEVBQXVFO0FBRXZFLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUVqQyxxQkFBYyxFQUFFLENBQUM7QUFFakIsU0FBUyxZQUFZLENBQUMsU0FBaUIsRUFBRSxHQUFZO0lBQ25ELE1BQU0sTUFBTSxHQUFRLE1BQU0sQ0FBQyxZQUFZLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ3hELElBQUssTUFBYyxDQUFDLE1BQU0sRUFBRTtRQUMxQixNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRyxNQUFjLENBQUMsTUFBTSxDQUFDLENBQUM7S0FDL0M7SUFDQSxNQUFjLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztJQUMvQixNQUFjLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUM7QUFDN0MsQ0FBQztBQUVEOzs7Ozs7R0FNRztBQUNILFNBQWUsV0FBVyxDQUFDLFNBQWlCLEVBQUUsUUFBZ0IsRUFBRSxRQUFnQixFQUFFLE1BQWdCLEVBQ2hHLGFBQXNCOztRQUN0QixNQUFNLEtBQUssR0FBRyx1QkFBWSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUM3QyxZQUFZLENBQUMsS0FBSyxDQUFDLENB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LG1CQUFtQixDQUFDLENBQUM7UUFDM0YsT0FBTyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDeEIsQ0FBQztDQUFBO0FBTkQsZ0VBTUM7QUFFRDs7Ozs7O0dBTUc7QUFDSCxTQUFTLDhCQUE4QixDQUFDLElBQVk7SUFDbEQsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLG9DQUFvQyxFQUFFLFlBQVksQ0FBQyxDQUFDO0FBQzFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTpuby1jb25zb2xlXG4vLyBMb2FkIHpvbmUuanMgZm9yIHRoZSBzZXJ2ZXIuXG5pbXBvcnQgJ3pvbmUuanMvZGlzdC96b25lLW5vZGUnO1xuaW1wb3J0ICdyZWZsZWN0LW1ldGFkYXRhJztcbmltcG9ydCB7IHJlYWRGaWxlU3luYywgd3JpdGVGaWxlU3luYywgZXhpc3RzU3luYywgZW5zdXJlRGlyU3luYyB9IGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCB7IGpvaW4sIHJlbGF0aXZlLCBzZXAsIGRpcm5hbWUgfSBmcm9tICdwYXRoJztcblxuaW1wb3J0IHsgZW5hYmxlUHJvZE1vZGUgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcblxuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCduZy1wcmVyZW5kZXInKTtcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHsgcHJvdmlkZU1vZHVsZU1hcCB9IGZyb20gJ0BuZ3VuaXZlcnNhbC9tb2R1bGUtbWFwLW5nZmFjdG9yeS1sb2FkZXInO1xuaW1wb3J0IHsgcmVuZGVyTW9kdWxlRmFjdG9yeSB9IGZyb20gJ0Bhbmd1bGFyL3BsYXRmb3JtLXNlcnZlcic7XG5pbXBvcnQge1JPVVRFX01BUF9GSUxFfSBmcm9tICdAd2ZoL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9uZy1wcmVyZW5kZXInO1xuXG5jb25zdCBkb21pbm8gPSByZXF1aXJlKCdkb21pbm8nKTtcblxuZW5hYmxlUHJvZE1vZGUoKTtcblxuZnVuY3Rpb24gc2V0dXBHbG9iYWxzKGluZGV4SHRtbDogc3RyaW5nLCB1cmw/OiBzdHJpbmcpIHtcbiAgY29uc3Qgd2luZG93OiBhbnkgPSBkb21pbm8uY3JlYXRlV2luZG93KGluZGV4SHRtbCwgdXJsKTtcbiAgaWYgKChnbG9iYWwgYXMgYW55KS53aW5kb3cpIHtcbiAgICBPYmplY3QuYXNzaWduKHdpbmRvdywgKGdsb2JhbCBhcyBhbnkpLndpbmRvdyk7XG4gIH1cbiAgKGdsb2JhbCBhcyBhbnkpLndpbmRvdyA9IHdpbmRvdztcbiAgKGdsb2JhbCBhcyBhbnkpLmRvY3VtZW50ID0gd2luZG93LmRvY3VtZW50O1xufVxuXG4vKipcbiAqIFdyaXRlIHN0YXRpYyBwcmVyZW5kZXIgcGFnZXNcbiAqIEBwYXJhbSBzdGF0aWNEaXIgZGlzdC9zdGF0aWNcbiAqIEBwYXJhbSBodG1sRmlsZSBkaXN0L3N0YXRpYy88YXBwPi9pbmRleC5odG1sXG4gKiBAcGFyYW0gbWFpbkZpbGUgZGlzdC9zZXJ2ZXIvbWFpbi5qcyBmaWxlIHBhdGggd2hpY2ggY2FuIGJlIHJlcXVpcmUucmVzb2x2ZSwgc2hvdWxkIGJlIGNvcnJlc3BvbmRpbmcgdG8gYW5ndWxhci5qc29uXG4gKiBAcGFyYW0gUk9VVEVTIFxuICovXG5hc3luYyBmdW5jdGlvbiB3cml0ZVJvdXRlcyhzdGF0aWNEaXI6IHN0cmluZywgaHRtbEZpbGU6IHN0cmluZywgbWFpbkZpbGU6IHN0cmluZywgUk9VVEVTOiBzdHJpbmdbXSxcbiAgX291dHB1dEZvbGRlcj86IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IGluZGV4ID0gcmVhZEZpbGVTeW5jKGh0bWxGaWxlLCAndXRmOCcpO1xuICBzZXR1cEdsb2JhbHMoaW5kZXgpO1xuICBpZiAoX291dHB1dEZvbGRlciA9PSBudWxsKVxuICAgIF9vdXRwdXRGb2xkZXIgPSBqb2luKGRpcm5hbWUoaHRtbEZpbGUpLCAnX3ByZXJlbmRlcicpO1xuICBjb25zdCBvdXRwdXRGb2xkZXIgPSBfb3V0cHV0Rm9sZGVyO1xuICAvLyAqIE5PVEUgOjogbGVhdmUgdGhpcyBhcyByZXF1aXJlKCkgc2luY2UgdGhpcyBmaWxlIGlzIGJ1aWx0IER5bmFtaWNhbGx5IGZyb20gd2VicGFja1xuICBsb2cuaW5mbygnbWFpbiBmaWxlOicsIG1haW5GaWxlKTtcblxuICBjb25zdCBodG1sTWFwID0gYXdhaXQgcmVuZGVyUm91dGVzKGluZGV4LCBtYWluRmlsZSwgUk9VVEVTKTtcbiAgLy8gTG9hZCB0aGUgaW5kZXguaHRtbCBmaWxlIGNvbnRhaW5pbmcgcmVmZXJhbmNlcyB0byB5b3VyIGFwcGxpY2F0aW9uIGJ1bmRsZS5cblxuICBjb25zdCByb3V0ZXJGaWxlTWFwOiB7W3JvdXRlOiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG4gIC8vIEl0ZXJhdGUgZWFjaCByb3V0ZSBwYXRoXG4gIGZvciAoY29uc3QgW3JvdXRlLCBodG1sXSBvZiBPYmplY3QuZW50cmllcyhodG1sTWFwKSkge1xuICAgIGNvbnN0IGZ1bGxQYXRoID0gam9pbihvdXRwdXRGb2xkZXIsIHJvdXRlKTtcblxuICAgIC8vIE1ha2Ugc3VyZSB0aGUgZGlyZWN0b3J5IHN0cnVjdHVyZSBpcyB0aGVyZVxuICAgIGlmICghZXhpc3RzU3luYyhmdWxsUGF0aCkpIHtcbiAgICAgIGVuc3VyZURpclN5bmMoZnVsbFBhdGgpO1xuICAgIH1cbiAgICBjb25zdCB3ZiA9IGpvaW4oZnVsbFBhdGgsICdpbmRleC5odG1sJyk7XG4gICAgd3JpdGVGaWxlU3luYyh3ZiwgaHRtbCk7XG4gICAgbG9nLmluZm8oJ1JlbmRlciAlcyBwYWdlIGF0ICcsIHJvdXRlLCB3Zik7XG4gICAgbGV0IGluZGV4RmlsZSA9IHJlbGF0aXZlKHN0YXRpY0Rpciwgd2YpO1xuICAgIGlmIChzZXAgPT09ICdcXFxcJylcbiAgICAgIGluZGV4RmlsZSA9IGluZGV4RmlsZS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgcm91dGVyRmlsZU1hcFtyb3V0ZV0gPSBpbmRleEZpbGU7XG4gIH1cbiAgY29uc3Qgcm91dGVNYXBGaWxlID0gam9pbihvdXRwdXRGb2xkZXIsIFJPVVRFX01BUF9GSUxFKTtcbiAgd3JpdGVGaWxlU3luYyhyb3V0ZU1hcEZpbGUsIEpTT04uc3RyaW5naWZ5KHJvdXRlckZpbGVNYXAsIG51bGwsICcgICcpLCAndXRmLTgnKTtcbiAgbG9nLmluZm8oJ3dyaXRlICcsIHJvdXRlTWFwRmlsZSk7XG4gIHJldHVybiByb3V0ZU1hcEZpbGU7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHJlbmRlclJvdXRlcyhpbmRleDogc3RyaW5nLCBtYWluRmlsZTogc3RyaW5nLCBST1VURVM6IHN0cmluZ1tdLCBwcmVyZW5kZXJQYXJhbXM6IGFueSA9IG51bGwsIHVzZURvbWlub01vY2tXaW5kb3cgPSB0cnVlKVxuOiBQcm9taXNlPHtbcm91dGU6IHN0cmluZ106IHN0cmluZ30+IHtcbiAgICAvLyBjb25zdCBpbmRleCA9IHJlYWRGaWxlU3luYyhodG1sRmlsZSwgJ3V0ZjgnKTtcbiAgICBpZiAodXNlRG9taW5vTW9ja1dpbmRvdylcbiAgICAgIHNldHVwR2xvYmFscyhpbmRleCk7XG4gICAgLy8gKiBOT1RFIDo6IGxlYXZlIHRoaXMgYXMgcmVxdWlyZSgpIHNpbmNlIHRoaXMgZmlsZSBpcyBidWlsdCBEeW5hbWljYWxseSBmcm9tIHdlYnBhY2tcbiAgICBsb2cuaW5mbygnbWFpbiBmaWxlOicsIG1haW5GaWxlKTtcbiAgICBjb25zdCB7IEFwcFNlcnZlck1vZHVsZU5nRmFjdG9yeSwgTEFaWV9NT0RVTEVfTUFQIH0gPSByZXF1aXJlKG1haW5GaWxlKTtcblxuICAgIGNvbnN0IHJvdXRlSHRtbE1hcDoge1tyb3V0ZTogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuICAgIGZvciAobGV0IHJvdXRlIG9mIFJPVVRFUykge1xuICAgICAgLy8gY29uc29sZS5sb2cocHJvdmlkZU1vZHVsZU1hcChMQVpZX01PRFVMRV9NQVApKTtcbiAgICAgIC8vIFdyaXRlcyByZW5kZXJlZCBIVE1MIHRvIGluZGV4Lmh0bWwsIHJlcGxhY2luZyB0aGUgZmlsZSBpZiBpdCBhbHJlYWR5IGV4aXN0cy5cbiAgICAgIGNvbnN0IGh0bWwgPSBhd2FpdCByZW5kZXJNb2R1bGVGYWN0b3J5KEFwcFNlcnZlck1vZHVsZU5nRmFjdG9yeSwge1xuICAgICAgICBkb2N1bWVudDogaW5kZXgsXG4gICAgICAgIHVybDogZW5jb2RlVVJJKGRlY29kZVVSSShfLnRyaW1FbmQocm91dGUsICcvJykpKSxcbiAgICAgICAgZXh0cmFQcm92aWRlcnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBwcm92aWRlOiAnUFJFUkVOREVSX1BBUkFNJyxcbiAgICAgICAgICAgIHVzZVZhbHVlOiBwcmVyZW5kZXJQYXJhbXNcbiAgICAgICAgICB9LFxuICAgICAgICAgIHByb3ZpZGVNb2R1bGVNYXAoTEFaWV9NT0RVTEVfTUFQKVxuICAgICAgXX0pO1xuICAgICAgcm91dGVIdG1sTWFwW3JvdXRlXSA9IHJlbW92ZVNlcnZlclNpZGVTdHlsZUF0dHJpYnV0ZShodG1sKTtcbiAgICB9XG4gICAgcmV0dXJuIHJvdXRlSHRtbE1hcDtcbn1cblxuLyoqXG4gKiBXcml0ZSBzdGF0aWMgcHJlcmVuZGVyIHBhZ2VzXG4gKiBAcGFyYW0gc3RhdGljRGlyIGRpc3Qvc3RhdGljXG4gKiBAcGFyYW0gaHRtbEZpbGUgZGlzdC9zdGF0aWMvPGFwcD4vaW5kZXguaHRtbFxuICogQHBhcmFtIG1haW5GaWxlIGRpc3Qvc2VydmVyL21haW4uanMgZmlsZSBwYXRoIHdoaWNoIGNhbiBiZSByZXF1aXJlLnJlc29sdmUsIHNob3VsZCBiZSBjb3JyZXNwb25kaW5nIHRvIGFuZ3VsYXIuanNvblxuICogQHBhcmFtIFJPVVRFUyBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdyaXRlUm91dGVzV2l0aExvY2FsU2VydmVyKHN0YXRpY0Rpcjogc3RyaW5nLCBodG1sRmlsZTogc3RyaW5nLCBtYWluRmlsZTogc3RyaW5nLFxuICBST1VURVM6IHN0cmluZ1tdLCBvdXRwdXRGb2xkZXI/OiBzdHJpbmcpIHtcbiAgY29uc3QgcGtNZ3IgPSByZXF1aXJlKCdAd2ZoL3BsaW5rL3dmaC9saWIvcGFja2FnZU1ncicpO1xuICBjb25zdCBzaHV0ZG93bjogKCkgPT4gdm9pZCA9IGF3YWl0IHBrTWdyLnJ1blNlcnZlcihhcGkuYXJndik7XG4gIGxldCBtYXBGaWxlOiBzdHJpbmc7XG4gIHRyeSB7XG4gICAgbWFwRmlsZSA9IGF3YWl0IHdyaXRlUm91dGVzKHN0YXRpY0RpciwgaHRtbEZpbGUsIG1haW5GaWxlLCBST1VURVMsIG91dHB1dEZvbGRlcik7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGxvZy5lcnJvcihlcnIpO1xuICAgIHRocm93IGVycjtcbiAgfSBmaW5hbGx5IHtcbiAgICBhd2FpdCBzaHV0ZG93bigpO1xuICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICByZXF1aXJlKCdsb2c0anMnKS5zaHV0ZG93bihyZXNvbHZlKTtcbiAgICB9KTtcbiAgfVxuICByZXR1cm4gbWFwRmlsZTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlbmRlclJvdXRlV2l0aExvY2FsU2VydmVyKGh0bWw6IHN0cmluZywgbWFpbkZpbGU6IHN0cmluZyxcbiAgcm91dGU6IHN0cmluZywgcHJlcmVuZGVyUGFyYW06IGFueSwgdXNlRG9taW5vTW9ja1dpbmRvdz86IGJvb2xlYW4pOiBQcm9taXNlPHN0cmluZz4ge1xuXG4gIGxldCBtYXBGaWxlOiB7W3JvdXRlOiBzdHJpbmddOiBzdHJpbmd9O1xuICBtYXBGaWxlID0gYXdhaXQgcmVuZGVyUm91dGVzKGh0bWwsIG1haW5GaWxlLCBbcm91dGVdLCBwcmVyZW5kZXJQYXJhbSwgdXNlRG9taW5vTW9ja1dpbmRvdyk7XG4gIHJldHVybiBtYXBGaWxlW3JvdXRlXTtcbn1cblxuLyoqXG4gKiBXb3JrIGFyb3VuZCBpc3N1ZTogaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvcHJlYm9vdC9pc3N1ZXMvNzUjaXNzdWVjb21tZW50LTQyMTI2NjU3MFxuICogQW5ndWxhciBjbGllbnQgYXBwbGljYXRpb24gd2lsbCByZW1vdmUgYWxsIHN0eWxlIGVsZW1lbnRzIHdoaWNoIGFyZSByZW5kZXJlZCBmcm9tIHNlcnZlciBzaWRlLFxuICogd2hlbiBpdCBmaW5pc2hlcyBpbml0aWFsaXphdGlvbiBidXQgYmVmb3JlIHRob3NlIGxhenkgcm91dGUgY29tcG9uZW50cyBmaW5pc2hpbmcgcmVuZGVyaW5nLFxuICogdGhpcyBjYXVzZXMgZmxpY2tlciBwcm9ibGVtIGZvciByZW5kZXJpbmcgYSBwcmVyZW5kZXJlZCBwYWdlLiBcbiAqIENoZWNrIHRoaXMgb3V0IChodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyL2Jsb2IvN2I3MDc2MGM4ZDRmNjljNDk4ZGM0YTAyOGJlYjZkZGE1M2FjYmNiZS9wYWNrYWdlcy9wbGF0Zm9ybS1icm93c2VyL3NyYy9icm93c2VyL3NlcnZlci10cmFuc2l0aW9uLnRzI0wyNylcbiAqL1xuZnVuY3Rpb24gcmVtb3ZlU2VydmVyU2lkZVN0eWxlQXR0cmlidXRlKGh0bWw6IHN0cmluZykge1xuICByZXR1cm4gaHRtbC5yZXBsYWNlKC88c3R5bGVcXHMrKG5nLXRyYW5zaXRpb249XCJbXlwiXSo/XCIpL2csICc8c3R5bGUgc3NyJyk7XG59XG4iXX0=