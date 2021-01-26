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
        __api_1.default.eventBus.on('@wfh/assets-processer.downloaded', () => __awaiter(this, void 0, void 0, function* () {
            log.info('assets downloaded, update prerendered pages');
            const pages = yield this.queryPrerenderPages(routeMapFiles);
            this.prerenderPages = pages;
        }));
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
                    fs_extra_1.readFile(path_1.join(staticDir, this.prerenderMap[route]), 'utf-8', (err, cont) => {
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
            if (!fs_extra_1.existsSync(prerenderMapFile))
                continue;
            log.info('read', prerenderMapFile);
            allDone.push(new Promise((resolve, rej) => {
                fs_extra_1.readFile(prerenderMapFile, 'utf-8', (err, content) => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmctcHJlcmVuZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibmctcHJlcmVuZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSx1Q0FBZ0Q7QUFDaEQsK0JBQTBCO0FBQzFCLDBDQUE0QjtBQUM1QixrREFBd0I7QUFDeEIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7QUFFNUMsUUFBQSxjQUFjLEdBQUcsdUJBQXVCLENBQUM7QUFDdEQsTUFBTSxTQUFTLEdBQVcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7QUFFMUQsTUFBYSxtQkFBbUI7SUFNOUI7OztTQUdFO0lBQ0YsWUFBWSxHQUFHLGFBQXVCO1FBVHRDLHVCQUF1QjtRQUN2QixtQkFBYyxHQUE4QixFQUFFLENBQUMsQ0FBQyxnQkFBZ0I7UUFTOUQsd0ZBQXdGO1FBQ3hGLHlEQUF5RDtRQUN6RCwwQkFBMEI7UUFDMUIsb0VBQW9FO1FBQ3BFLFdBQVc7UUFDWCxJQUFJO1FBQ0osSUFBSSxDQUFDLG1CQUFtQixDQUFDLGFBQWEsQ0FBQzthQUN0QyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxHQUFHLEtBQUssQ0FBQyxDQUFDO1FBRTVDLGVBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLGtDQUFrQyxFQUFFLEdBQVMsRUFBRTtZQUM3RCxHQUFHLENBQUMsSUFBSSxDQUFDLDZDQUE2QyxDQUFDLENBQUM7WUFDeEQsTUFBTSxLQUFLLEdBQUcsTUFBTSxJQUFJLENBQUMsbUJBQW1CLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDNUQsSUFBSSxDQUFDLGNBQWMsR0FBRyxLQUFLLENBQUM7UUFDOUIsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxZ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RnVuY3Rpb259IGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0IHsgcmVhZEZpbGUsIGV4aXN0c1N5bmMgfSBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQge2pvaW59IGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lKTtcblxuZXhwb3J0IGNvbnN0IFJPVVRFX01BUF9GSUxFID0gJ3ByZXJlbmRlci1yb3V0ZXMuanNvbic7XG5jb25zdCBzdGF0aWNEaXI6IHN0cmluZyA9IGFwaS5jb25maWcucmVzb2x2ZSgnc3RhdGljRGlyJyk7XG5cbmV4cG9ydCBjbGFzcyBQcmVyZW5kZXJGb3JFeHByZXNzIHtcbiAgLy8gbm9QcmVyZW5kZXIgPSBmYWxzZTtcbiAgcHJlcmVuZGVyUGFnZXM6IHtbcm91dGU6IHN0cmluZ106IHN0cmluZ30gPSB7fTsgLy8gcGFnZSBjb250ZW50c1xuICAvLyBsYXN0UXVlcmllZDogTWFwPHN0cmluZywgbnVtYmVyPiA9IG5ldyBNYXAoKTtcbiAgcHJlcmVuZGVyTWFwOiB7W3JvdXRlOiBzdHJpbmddOiBzdHJpbmd9O1xuXG4gIC8qKlxuXHQgKiBjb25zdHJ1Y3RvclxuXHQgKiBAcGFyYW0gcm91dGVNYXBGaWxlcyBhcnJheSBvZiBkaXN0L3N0YXRpYy88YXBwPi9fcHJlcmVuZGVyL3ByZXJlbmRlci1yb3V0ZXMuanNvblxuXHQgKi9cbiAgY29uc3RydWN0b3IoLi4ucm91dGVNYXBGaWxlczogc3RyaW5nW10pIHtcbiAgICAvLyB0aGlzLnByZXJlbmRlck1hcEZpbGUgPSBqb2luKHN0YXRpY0RpciwgdGhpcy5hcHBsTmFtZSwgJ19wcmVyZW5kZXInLCBST1VURV9NQVBfRklMRSk7XG4gICAgLy8gdGhpcy5ub1ByZXJlbmRlciA9ICFleGlzdHNTeW5jKHRoaXMucHJlcmVuZGVyTWFwRmlsZSk7XG4gICAgLy8gaWYgKHRoaXMubm9QcmVyZW5kZXIpIHtcbiAgICAvLyBcdGxvZy53YXJuKCdObyBwcmVyZW5kZXIgZmlsZXMgZm91bmQgaW4gJywgdGhpcy5wcmVyZW5kZXJNYXBGaWxlKTtcbiAgICAvLyBcdHJldHVybjtcbiAgICAvLyB9XG4gICAgdGhpcy5xdWVyeVByZXJlbmRlclBhZ2VzKHJvdXRlTWFwRmlsZXMpXG4gICAgLnRoZW4ocGFnZXMgPT4gdGhpcy5wcmVyZW5kZXJQYWdlcyA9IHBhZ2VzKTtcblxuICAgIGFwaS5ldmVudEJ1cy5vbignQHdmaC9hc3NldHMtcHJvY2Vzc2VyLmRvd25sb2FkZWQnLCBhc3luYyAoKSA9PiB7XG4gICAgICBsb2cuaW5mbygnYXNzZXRzIGRvd25sb2FkZWQsIHVwZGF0ZSBwcmVyZW5kZXJlZCBwYWdlcycpO1xuICAgICAgY29uc3QgcGFnZXMgPSBhd2FpdCB0aGlzLnF1ZXJ5UHJlcmVuZGVyUGFnZXMocm91dGVNYXBGaWxlcyk7XG4gICAgICB0aGlzLnByZXJlbmRlclBhZ2VzID0gcGFnZXM7XG4gICAgfSk7XG4gIH1cblxuICBhc01pZGRsZXdhcmUoKSB7XG4gICAgLy8gaWYgKGFwaS5hcmd2Lmhtcikge1xuICAgIC8vICAgbG9nLndhcm4oJ0hvdCBtb2R1bGUgcmVwbGFjZW1lbnQgbW9kZSBpcyBvbiwgbm8gcHJlcmVuZGVyZWQgcGFnZSB3aWxsIGJlIHNlcnZlZFxcbicpO1xuICAgIC8vICAgcmV0dXJuIChyZXE6IFJlcXVlc3QsIHJlczogUmVzcG9uc2UsIG5leHQ6IE5leHRGdW5jdGlvbikgPT4gbmV4dCgpO1xuICAgIC8vIH1cbiAgICByZXR1cm4gKHJlcTogUmVxdWVzdCwgcmVzOiBSZXNwb25zZSwgbmV4dDogTmV4dEZ1bmN0aW9uKSA9PiB7XG4gICAgICBpZiAocmVxLm1ldGhvZCAhPT0gJ0dFVCcpXG4gICAgICAgIHJldHVybiBuZXh0KCk7XG4gICAgICBjb25zdCByb3V0ZSA9IF8udHJpbUVuZChyZXEub3JpZ2luYWxVcmwsICcvJyk7XG4gICAgICBpZiAoXy5oYXModGhpcy5wcmVyZW5kZXJQYWdlcywgcm91dGUpKSB7XG4gICAgICAgIGxvZy5pbmZvKCdTZXJ2ZSB3aXRoIHByZXJlbmRlciBwYWdlIGZvciAnLCByb3V0ZSk7XG4gICAgICAgIGlmICh0aGlzLnByZXJlbmRlclBhZ2VzW3JvdXRlXSA9PT0gbnVsbCkge1xuICAgICAgICAgIHJlYWRGaWxlKGpvaW4oc3RhdGljRGlyLCB0aGlzLnByZXJlbmRlck1hcFtyb3V0ZV0pLCAndXRmLTgnLCAoZXJyLCBjb250KSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgIGxvZy5lcnJvcignRmFpbGVkIHRvIHJlYWQgcHJlcmVuZGVyZWQgcGFnZTogJyArIHRoaXMucHJlcmVuZGVyTWFwW3JvdXRlXSwgZXJyKTtcbiAgICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5wcmVyZW5kZXJQYWdlc1tyb3V0ZV0gPSBjb250O1xuICAgICAgICAgICAgcmVzLnNlbmQoY29udCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzLnNlbmQodGhpcy5wcmVyZW5kZXJQYWdlc1tyb3V0ZV0pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuZXh0KCk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIHByb3RlY3RlZCBxdWVyeVByZXJlbmRlclBhZ2VzKHJvdXRlTWFwRmlsZXM6IHN0cmluZ1tdKSB7XG4gICAgY29uc3QgcGFnZXM6IHtbcm91dGU6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcbiAgICBjb25zdCBhbGxEb25lOiBBcnJheTxQcm9taXNlPHZvaWQ+PiA9IFtdO1xuICAgIGZvciAoY29uc3QgcHJlcmVuZGVyTWFwRmlsZSBvZiByb3V0ZU1hcEZpbGVzKSB7XG4gICAgICBpZiAoIWV4aXN0c1N5bmMocHJlcmVuZGVyTWFwRmlsZSkpXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgbG9nLmluZm8oJ3JlYWQnLCBwcmVyZW5kZXJNYXBGaWxlKTtcbiAgICAgIGFsbERvbmUucHVzaChuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqKSA9PiB7XG4gICAgICAgIHJlYWRGaWxlKHByZXJlbmRlck1hcEZpbGUsICd1dGYtOCcsIChlcnIsIGNvbnRlbnQpID0+IHtcbiAgICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgICAgcmV0dXJuIHJlaihlcnIpO1xuICAgICAgICAgIHRoaXMucHJlcmVuZGVyTWFwID0gSlNPTi5wYXJzZShjb250ZW50KTtcbiAgICAgICAgICBfLmZvckVhY2godGhpcy5wcmVyZW5kZXJNYXAsIChmaWxlLCByb3V0ZSkgPT4ge1xuICAgICAgICAgICAgcGFnZXNbcm91dGVdID0gZmlsZTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSkpO1xuICAgIH1cbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoYWxsRG9uZSkudGhlbigoKSA9PiBwYWdlcyk7XG4gIH1cbn1cbiJdfQ==