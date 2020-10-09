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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpdWppbmcvYmsvZHItY29tcC1wYWNrYWdlL3NyYy9pbnRlcm5hbC9uZy1hcHAtYnVpbGRlci90cy9uZy1wcmVyZW5kZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDRCQUE0QjtBQUM1QiwrQkFBK0I7QUFDL0Isa0NBQWdDO0FBQ2hDLDRCQUEwQjtBQUMxQix1Q0FBa0Y7QUFDbEYsK0JBQW9EO0FBRXBELHdDQUErQztBQUUvQywwQ0FBNEI7QUFDNUIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUN4RCxrREFBd0I7QUFDeEIsMEZBQTRFO0FBQzVFLDhEQUErRDtBQUMvRCwwRUFBdUU7QUFFdkUsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBRWpDLHFCQUFjLEVBQUUsQ0FBQztBQUVqQixTQUFTLFlBQVksQ0FBQyxTQUFpQixFQUFFLEdBQVk7SUFDbkQsTUFBTSxNQUFNLEdBQVEsTUFBTSxDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDeEQsSUFBSyxNQUFjLENBQUMsTUFBTSxFQUFFO1FBQzFCLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFHLE1BQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQztLQUMvQztJQUNBLE1BQWMsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0lBQy9CLE1BQWMsQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQztBQUM3QyxDQUFDO0FBRUQ7Ozs7OztHQU1HO0FBQ0gsU0FBZSxXQUFXLENBQUMsU0FBaUIsRUFBRSxRQUFnQixFQUFFLFFBQWdCLEVBQUUsTUFBZ0IsRUFDaEcsYUFBc0I7O1FBQ3RCLE1BQU0sS0FBSyxHQUFHLHVCQUFZLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQzdDLFlB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Q3BDO2FBQUMsQ0FBQyxDQUFDO1lBQ0osWUFBWSxDQUFDLEtBQUssQ0FBQyxHQUFHLDhCQUE4QixDQUFDLElBQUksQ0FBQyxDQUFDO1NBQzVEO1FBQ0QsT0FBTyxZQUFZLENBQUM7SUFDeEIsQ0FBQztDQUFBO0FBRUQ7Ozs7OztHQU1HO0FBQ0gsU0FBc0IsMEJBQTBCLENBQUMsU0FBaUIsRUFBRSxRQUFnQixFQUFFLFFBQWdCLEVBQ3BHLE1BQWdCLEVBQUUsWUFBcUI7O1FBQ3ZDLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO1FBQ3ZELE1BQU0sUUFBUSxHQUFlLE1BQU0sS0FBSyxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0QsSUFBSSxPQUFlLENBQUM7UUFDcEIsSUFBSTtZQUNGLE9BQU8sR0FBRyxNQUFNLFdBQVcsQ0FBQyxTQUFTLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsWUFBWSxDQUFDLENBQUM7U0FDbEY7UUFBQyxPQUFPLEdBQUcsRUFBRTtZQUNaLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDZixNQUFNLEdBQUcsQ0FBQztTQUNYO2dCQUFTO1lBQ1IsTUFBTSxRQUFRLEVBQUUsQ0FBQztZQUNqQixNQUFNLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7Z0JBQzVCLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDdEMsQ0FBQyxDQUFDLENBQUM7U0FDSjtRQUNELE9BQU8sT0FBTyxDQUFDO0lBQ2pCLENBQUM7Q0FBQTtBQWpCRCxnRUFpQkM7QUFFRCxTQUFzQiwwQkFBMEIsQ0FBQyxJQUFZLEVBQUUsUUFBZ0IsRUFDN0UsS0FBYSxFQUFFLGNBQW1CLEVBQUUsbUJBQTZCOztRQUVqRSxJQUFJLE9BQWtDLENBQUM7UUFDdkMsT0FBTyxHQUFHLE1BQU0sWUFBWSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxjQUFjLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztRQUMzRixPQUFPLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN4QixDQUFDO0NBQUE7QUFORCxnRUFNQztBQUVEOzs7Ozs7R0FNRztBQUNILFNBQVMsOEJBQThCLENBQUMsSUFBWTtJQUNsRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsb0NBQW9DLEVBQUUsWUFBWSxDQUFDLENBQUM7QUFDMUUsQ0FBQyIsImZpbGUiOiJkaXN0L25nLXByZXJlbmRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbbnVsbF19
