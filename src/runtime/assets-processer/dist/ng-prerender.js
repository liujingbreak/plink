"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrerenderForExpress = exports.ROUTE_MAP_FILE = void 0;
const tslib_1 = require("tslib");
const path_1 = require("path");
const plink_1 = require("@wfh/plink");
const fs_extra_1 = require("fs-extra");
const _ = tslib_1.__importStar(require("lodash"));
const __api_1 = tslib_1.__importDefault(require("__api"));
const log = (0, plink_1.log4File)(__filename);
exports.ROUTE_MAP_FILE = 'prerender-routes.json';
const staticDir = __api_1.default.config.resolve('staticDir');
class PrerenderForExpress {
    /**
       * constructor
       * @param routeMapFiles array of dist/static/<app>/_prerender/prerender-routes.json
       */
    constructor(...routeMapFiles) {
        var _a;
        // noPrerender = false;
        this.prerenderPages = {}; // page contents
        // lastQueried: Map<string, number> = new Map();
        this.prerenderMap = {};
        // this.prerenderMapFile = join(staticDir, this.applName, '_prerender', ROUTE_MAP_FILE);
        // this.noPrerender = !existsSync(this.prerenderMapFile);
        // if (this.noPrerender) {
        // 	log.warn('No prerender files found in ', this.prerenderMapFile);
        // 	return;
        // }
        void this.queryPrerenderPages(routeMapFiles)
            .then(pages => this.prerenderPages = pages);
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        (_a = __api_1.default.eventBus) === null || _a === void 0 ? void 0 : _a.on('@wfh/assets-processer.downloaded', async () => {
            log.info('assets downloaded, update prerendered pages');
            const pages = await this.queryPrerenderPages(routeMapFiles);
            this.prerenderPages = pages;
        });
    }
    asMiddleware() {
        // if (api.argv.hmr) {
        //   log.warn('Hot module replacement mode is on, no prerendered page will be served\n');
        //   return (req: Request, res: Response, next: NextFunction) => next();
        // }
        return (req, res, next) => {
            if (req.method !== 'GET')
                return next();
            const route = _.trimEnd(req.originalUrl, '/');
            if (_.has(this.prerenderPages, route)) {
                log.info('Serve with prerender page for ', route);
                if (this.prerenderPages[route] === null) {
                    (0, fs_extra_1.readFile)((0, path_1.join)(staticDir, this.prerenderMap[route]), 'utf-8', (err, cont) => {
                        if (err) {
                            log.error('Failed to read prerendered page: ' + this.prerenderMap[route], err);
                            next();
                        }
                        this.prerenderPages[route] = cont;
                        res.send(cont);
                    });
                }
                else {
                    res.send(this.prerenderPages[route]);
                }
            }
            else {
                next();
            }
        };
    }
    async queryPrerenderPages(routeMapFiles) {
        const pages = {};
        const allDone = [];
        for (const prerenderMapFile of routeMapFiles) {
            if (!(0, fs_extra_1.existsSync)(prerenderMapFile))
                continue;
            log.info('read', prerenderMapFile);
            allDone.push(new Promise((resolve, rej) => {
                (0, fs_extra_1.readFile)(prerenderMapFile, 'utf-8', (err, content) => {
                    if (err)
                        return rej(err);
                    this.prerenderMap = JSON.parse(content);
                    _.forEach(this.prerenderMap, (file, route) => {
                        pages[route] = file;
                    });
                    resolve();
                });
            }));
        }
        await Promise.all(allDone);
        return pages;
    }
}
exports.PrerenderForExpress = PrerenderForExpress;
//# sourceMappingURL=ng-prerender.js.map