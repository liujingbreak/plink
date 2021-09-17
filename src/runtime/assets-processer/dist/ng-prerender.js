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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrerenderForExpress = exports.ROUTE_MAP_FILE = void 0;
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
const _ = __importStar(require("lodash"));
const __api_1 = __importDefault(require("__api"));
const log = require('log4js').getLogger(__api_1.default.packageName);
exports.ROUTE_MAP_FILE = 'prerender-routes.json';
const staticDir = __api_1.default.config.resolve('staticDir');
class PrerenderForExpress {
    /**
       * constructor
       * @param routeMapFiles array of dist/static/<app>/_prerender/prerender-routes.json
       */
    constructor(...routeMapFiles) {
        // noPrerender = false;
        this.prerenderPages = {}; // page contents
        // this.prerenderMapFile = join(staticDir, this.applName, '_prerender', ROUTE_MAP_FILE);
        // this.noPrerender = !existsSync(this.prerenderMapFile);
        // if (this.noPrerender) {
        // 	log.warn('No prerender files found in ', this.prerenderMapFile);
        // 	return;
        // }
        this.queryPrerenderPages(routeMapFiles)
            .then(pages => this.prerenderPages = pages);
        __api_1.default.eventBus.on('@wfh/assets-processer.downloaded', async () => {
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
    queryPrerenderPages(routeMapFiles) {
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
        return Promise.all(allDone).then(() => pages);
    }
}
exports.PrerenderForExpress = PrerenderForExpress;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmctcHJlcmVuZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibmctcHJlcmVuZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSx1Q0FBZ0Q7QUFDaEQsK0JBQTBCO0FBQzFCLDBDQUE0QjtBQUM1QixrREFBd0I7QUFDeEIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7QUFFNUMsUUFBQSxjQUFjLEdBQUcsdUJBQXVCLENBQUM7QUFDdEQsTUFBTSxTQUFTLEdBQVcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7QUFFMUQsTUFBYSxtQkFBbUI7SUFNOUI7OztTQUdFO0lBQ0YsWUFBWSxHQUFHLGFBQXVCO1FBVHRDLHVCQUF1QjtRQUN2QixtQkFBYyxHQUE4QixFQUFFLENBQUMsQ0FBQyxnQkFBZ0I7UUFTOUQsd0ZBQXdGO1FBQ3hGLHlEQUF5RDtRQUN6RCwwQkFBMEI7UUFDMUIsb0VBQW9FO1FBQ3BFLFdBQVc7UUFDWCxJQUFJO1FBQ0osSUFBSSxDQUFDLG1CQUFtQixDQUFDLGFBQWEsQ0FBQzthQUN0QyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxHQUFHLEtBQUssQ0FBQyxDQUFDO1FBRTVDLGVBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLGtDQUFrQyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzdELEdBQUcsQ0FBQyxJQUFJLENBQUMsNkNBQTZDLENBQUMsQ0FBQztZQUN4RCxNQUFNLEtBQUssR0FBRyxNQUFNLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUM1RCxJQUFJLENBQUMsY0FBYyxHQUFHLEtBQUssQ0FBQztRQUM5QixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxZQUFZO1FBQ1Ys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cG9uc2UsIE5leHRGdW5jdGlvbn0gZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQgeyByZWFkRmlsZSwgZXhpc3RzU3luYyB9IGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCB7am9pbn0gZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUpO1xuXG5leHBvcnQgY29uc3QgUk9VVEVfTUFQX0ZJTEUgPSAncHJlcmVuZGVyLXJvdXRlcy5qc29uJztcbmNvbnN0IHN0YXRpY0Rpcjogc3RyaW5nID0gYXBpLmNvbmZpZy5yZXNvbHZlKCdzdGF0aWNEaXInKTtcblxuZXhwb3J0IGNsYXNzIFByZXJlbmRlckZvckV4cHJlc3Mge1xuICAvLyBub1ByZXJlbmRlciA9IGZhbHNlO1xuICBwcmVyZW5kZXJQYWdlczoge1tyb3V0ZTogc3RyaW5nXTogc3RyaW5nfSA9IHt9OyAvLyBwYWdlIGNvbnRlbnRzXG4gIC8vIGxhc3RRdWVyaWVkOiBNYXA8c3RyaW5nLCBudW1iZXI+ID0gbmV3IE1hcCgpO1xuICBwcmVyZW5kZXJNYXA6IHtbcm91dGU6IHN0cmluZ106IHN0cmluZ307XG5cbiAgLyoqXG5cdCAqIGNvbnN0cnVjdG9yXG5cdCAqIEBwYXJhbSByb3V0ZU1hcEZpbGVzIGFycmF5IG9mIGRpc3Qvc3RhdGljLzxhcHA+L19wcmVyZW5kZXIvcHJlcmVuZGVyLXJvdXRlcy5qc29uXG5cdCAqL1xuICBjb25zdHJ1Y3RvciguLi5yb3V0ZU1hcEZpbGVzOiBzdHJpbmdbXSkge1xuICAgIC8vIHRoaXMucHJlcmVuZGVyTWFwRmlsZSA9IGpvaW4oc3RhdGljRGlyLCB0aGlzLmFwcGxOYW1lLCAnX3ByZXJlbmRlcicsIFJPVVRFX01BUF9GSUxFKTtcbiAgICAvLyB0aGlzLm5vUHJlcmVuZGVyID0gIWV4aXN0c1N5bmModGhpcy5wcmVyZW5kZXJNYXBGaWxlKTtcbiAgICAvLyBpZiAodGhpcy5ub1ByZXJlbmRlcikge1xuICAgIC8vIFx0bG9nLndhcm4oJ05vIHByZXJlbmRlciBmaWxlcyBmb3VuZCBpbiAnLCB0aGlzLnByZXJlbmRlck1hcEZpbGUpO1xuICAgIC8vIFx0cmV0dXJuO1xuICAgIC8vIH1cbiAgICB0aGlzLnF1ZXJ5UHJlcmVuZGVyUGFnZXMocm91dGVNYXBGaWxlcylcbiAgICAudGhlbihwYWdlcyA9PiB0aGlzLnByZXJlbmRlclBhZ2VzID0gcGFnZXMpO1xuXG4gICAgYXBpLmV2ZW50QnVzLm9uKCdAd2ZoL2Fzc2V0cy1wcm9jZXNzZXIuZG93bmxvYWRlZCcsIGFzeW5jICgpID0+IHtcbiAgICAgIGxvZy5pbmZvKCdhc3NldHMgZG93bmxvYWRlZCwgdXBkYXRlIHByZXJlbmRlcmVkIHBhZ2VzJyk7XG4gICAgICBjb25zdCBwYWdlcyA9IGF3YWl0IHRoaXMucXVlcnlQcmVyZW5kZXJQYWdlcyhyb3V0ZU1hcEZpbGVzKTtcbiAgICAgIHRoaXMucHJlcmVuZGVyUGFnZXMgPSBwYWdlcztcbiAgICB9KTtcbiAgfVxuXG4gIGFzTWlkZGxld2FyZSgpIHtcbiAgICAvLyBpZiAoYXBpLmFyZ3YuaG1yKSB7XG4gICAgLy8gICBsb2cud2FybignSG90IG1vZHVsZSByZXBsYWNlbWVudCBtb2RlIGlzIG9uLCBubyBwcmVyZW5kZXJlZCBwYWdlIHdpbGwgYmUgc2VydmVkXFxuJyk7XG4gICAgLy8gICByZXR1cm4gKHJlcTogUmVxdWVzdCwgcmVzOiBSZXNwb25zZSwgbmV4dDogTmV4dEZ1bmN0aW9uKSA9PiBuZXh0KCk7XG4gICAgLy8gfVxuICAgIHJldHVybiAocmVxOiBSZXF1ZXN0LCByZXM6IFJlc3BvbnNlLCBuZXh0OiBOZXh0RnVuY3Rpb24pID0+IHtcbiAgICAgIGlmIChyZXEubWV0aG9kICE9PSAnR0VUJylcbiAgICAgICAgcmV0dXJuIG5leHQoKTtcbiAgICAgIGNvbnN0IHJvdXRlID0gXy50cmltRW5kKHJlcS5vcmlnaW5hbFVybCwgJy8nKTtcbiAgICAgIGlmIChfLmhhcyh0aGlzLnByZXJlbmRlclBhZ2VzLCByb3V0ZSkpIHtcbiAgICAgICAgbG9nLmluZm8oJ1NlcnZlIHdpdGggcHJlcmVuZGVyIHBhZ2UgZm9yICcsIHJvdXRlKTtcbiAgICAgICAgaWYgKHRoaXMucHJlcmVuZGVyUGFnZXNbcm91dGVdID09PSBudWxsKSB7XG4gICAgICAgICAgcmVhZEZpbGUoam9pbihzdGF0aWNEaXIsIHRoaXMucHJlcmVuZGVyTWFwW3JvdXRlXSksICd1dGYtOCcsIChlcnIsIGNvbnQpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgbG9nLmVycm9yKCdGYWlsZWQgdG8gcmVhZCBwcmVyZW5kZXJlZCBwYWdlOiAnICsgdGhpcy5wcmVyZW5kZXJNYXBbcm91dGVdLCBlcnIpO1xuICAgICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnByZXJlbmRlclBhZ2VzW3JvdXRlXSA9IGNvbnQ7XG4gICAgICAgICAgICByZXMuc2VuZChjb250KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXMuc2VuZCh0aGlzLnByZXJlbmRlclBhZ2VzW3JvdXRlXSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5leHQoKTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgcHJvdGVjdGVkIHF1ZXJ5UHJlcmVuZGVyUGFnZXMocm91dGVNYXBGaWxlczogc3RyaW5nW10pIHtcbiAgICBjb25zdCBwYWdlczoge1tyb3V0ZTogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuICAgIGNvbnN0IGFsbERvbmU6IEFycmF5PFByb21pc2U8dm9pZD4+ID0gW107XG4gICAgZm9yIChjb25zdCBwcmVyZW5kZXJNYXBGaWxlIG9mIHJvdXRlTWFwRmlsZXMpIHtcbiAgICAgIGlmICghZXhpc3RzU3luYyhwcmVyZW5kZXJNYXBGaWxlKSlcbiAgICAgICAgY29udGludWU7XG4gICAgICBsb2cuaW5mbygncmVhZCcsIHByZXJlbmRlck1hcEZpbGUpO1xuICAgICAgYWxsRG9uZS5wdXNoKG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWopID0+IHtcbiAgICAgICAgcmVhZEZpbGUocHJlcmVuZGVyTWFwRmlsZSwgJ3V0Zi04JywgKGVyciwgY29udGVudCkgPT4ge1xuICAgICAgICAgIGlmIChlcnIpXG4gICAgICAgICAgICByZXR1cm4gcmVqKGVycik7XG4gICAgICAgICAgdGhpcy5wcmVyZW5kZXJNYXAgPSBKU09OLnBhcnNlKGNvbnRlbnQpO1xuICAgICAgICAgIF8uZm9yRWFjaCh0aGlzLnByZXJlbmRlck1hcCwgKGZpbGUsIHJvdXRlKSA9PiB7XG4gICAgICAgICAgICBwYWdlc1tyb3V0ZV0gPSBmaWxlO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KSk7XG4gICAgfVxuICAgIHJldHVybiBQcm9taXNlLmFsbChhbGxEb25lKS50aGVuKCgpID0+IHBhZ2VzKTtcbiAgfVxufVxuIl19