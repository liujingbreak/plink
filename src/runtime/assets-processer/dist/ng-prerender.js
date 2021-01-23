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
        if (__api_1.default.argv.hmr) {
            log.warn('Hot module replacement mode is on, no prerendered page will be served\n');
            return (req, res, next) => next();
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmctcHJlcmVuZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibmctcHJlcmVuZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSx1Q0FBZ0Q7QUFDaEQsK0JBQTBCO0FBQzFCLDBDQUE0QjtBQUM1QixrREFBd0I7QUFDeEIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7QUFFNUMsUUFBQSxjQUFjLEdBQUcsdUJBQXVCLENBQUM7QUFDdEQsTUFBTSxTQUFTLEdBQVcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7QUFFMUQsTUFBYSxtQkFBbUI7SUFNOUI7OztTQUdFO0lBQ0YsWUFBWSxHQUFHLGFBQXVCO1FBVHRDLHVCQUF1QjtRQUN2QixtQkFBYyxHQUE4QixFQUFFLENBQUMsQ0FBQyxnQkFBZ0I7UUFTOUQsd0ZBQXdGO1FBQ3hGLHlEQUF5RDtRQUN6RCwwQkFBMEI7UUFDMUIsb0VBQW9FO1FBQ3BFLFdBQVc7UUFDWCxJQUFJO1FBQ0osSUFBSSxDQUFDLG1CQUFtQixDQUFDLGFBQWEsQ0FBQzthQUN0QyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxHQUFHLEtBQUssQ0FBQyxDQUFDO1FBRTVDLGVBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLGtDQUFrQyxFQUFFLEdBQVMsRUFBRTtZQUM3RCxHQUFHLENBQUMsSUFBSSxDQUFDLDZDQUE2QyxDQUFDLENBQUM7WUFDeEQsTUFBTSxLQUFLLEdBQUcsTUFBTSxJQUFJLENBQUMsbUJBQW1CLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDNUQsSUFBSSxDQUFDLGNBQWMsR0FBRyxLQUFLLENBQUM7UUFDOUIsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxZ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QyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNoRCxDQUFDO0NBQ0Y7QUE3RUQsa0RBNkVDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtSZXF1ZXN0LCBSZXNwb25zZSwgTmV4dEZ1bmN0aW9ufSBmcm9tICdleHByZXNzJztcbmltcG9ydCB7IHJlYWRGaWxlLCBleGlzdHNTeW5jIH0gZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IHtqb2lufSBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSk7XG5cbmV4cG9ydCBjb25zdCBST1VURV9NQVBfRklMRSA9ICdwcmVyZW5kZXItcm91dGVzLmpzb24nO1xuY29uc3Qgc3RhdGljRGlyOiBzdHJpbmcgPSBhcGkuY29uZmlnLnJlc29sdmUoJ3N0YXRpY0RpcicpO1xuXG5leHBvcnQgY2xhc3MgUHJlcmVuZGVyRm9yRXhwcmVzcyB7XG4gIC8vIG5vUHJlcmVuZGVyID0gZmFsc2U7XG4gIHByZXJlbmRlclBhZ2VzOiB7W3JvdXRlOiBzdHJpbmddOiBzdHJpbmd9ID0ge307IC8vIHBhZ2UgY29udGVudHNcbiAgLy8gbGFzdFF1ZXJpZWQ6IE1hcDxzdHJpbmcsIG51bWJlcj4gPSBuZXcgTWFwKCk7XG4gIHByZXJlbmRlck1hcDoge1tyb3V0ZTogc3RyaW5nXTogc3RyaW5nfTtcblxuICAvKipcblx0ICogY29uc3RydWN0b3Jcblx0ICogQHBhcmFtIHJvdXRlTWFwRmlsZXMgYXJyYXkgb2YgZGlzdC9zdGF0aWMvPGFwcD4vX3ByZXJlbmRlci9wcmVyZW5kZXItcm91dGVzLmpzb25cblx0ICovXG4gIGNvbnN0cnVjdG9yKC4uLnJvdXRlTWFwRmlsZXM6IHN0cmluZ1tdKSB7XG4gICAgLy8gdGhpcy5wcmVyZW5kZXJNYXBGaWxlID0gam9pbihzdGF0aWNEaXIsIHRoaXMuYXBwbE5hbWUsICdfcHJlcmVuZGVyJywgUk9VVEVfTUFQX0ZJTEUpO1xuICAgIC8vIHRoaXMubm9QcmVyZW5kZXIgPSAhZXhpc3RzU3luYyh0aGlzLnByZXJlbmRlck1hcEZpbGUpO1xuICAgIC8vIGlmICh0aGlzLm5vUHJlcmVuZGVyKSB7XG4gICAgLy8gXHRsb2cud2FybignTm8gcHJlcmVuZGVyIGZpbGVzIGZvdW5kIGluICcsIHRoaXMucHJlcmVuZGVyTWFwRmlsZSk7XG4gICAgLy8gXHRyZXR1cm47XG4gICAgLy8gfVxuICAgIHRoaXMucXVlcnlQcmVyZW5kZXJQYWdlcyhyb3V0ZU1hcEZpbGVzKVxuICAgIC50aGVuKHBhZ2VzID0+IHRoaXMucHJlcmVuZGVyUGFnZXMgPSBwYWdlcyk7XG5cbiAgICBhcGkuZXZlbnRCdXMub24oJ0B3ZmgvYXNzZXRzLXByb2Nlc3Nlci5kb3dubG9hZGVkJywgYXN5bmMgKCkgPT4ge1xuICAgICAgbG9nLmluZm8oJ2Fzc2V0cyBkb3dubG9hZGVkLCB1cGRhdGUgcHJlcmVuZGVyZWQgcGFnZXMnKTtcbiAgICAgIGNvbnN0IHBhZ2VzID0gYXdhaXQgdGhpcy5xdWVyeVByZXJlbmRlclBhZ2VzKHJvdXRlTWFwRmlsZXMpO1xuICAgICAgdGhpcy5wcmVyZW5kZXJQYWdlcyA9IHBhZ2VzO1xuICAgIH0pO1xuICB9XG5cbiAgYXNNaWRkbGV3YXJlKCkge1xuICAgIGlmIChhcGkuYXJndi5obXIpIHtcbiAgICAgIGxvZy53YXJuKCdIb3QgbW9kdWxlIHJlcGxhY2VtZW50IG1vZGUgaXMgb24sIG5vIHByZXJlbmRlcmVkIHBhZ2Ugd2lsbCBiZSBzZXJ2ZWRcXG4nKTtcbiAgICAgIHJldHVybiAocmVxOiBSZXF1ZXN0LCByZXM6IFJlc3BvbnNlLCBuZXh0OiBOZXh0RnVuY3Rpb24pID0+IG5leHQoKTtcbiAgICB9XG4gICAgcmV0dXJuIChyZXE6IFJlcXVlc3QsIHJlczogUmVzcG9uc2UsIG5leHQ6IE5leHRGdW5jdGlvbikgPT4ge1xuICAgICAgaWYgKHJlcS5tZXRob2QgIT09ICdHRVQnKVxuICAgICAgICByZXR1cm4gbmV4dCgpO1xuICAgICAgY29uc3Qgcm91dGUgPSBfLnRyaW1FbmQocmVxLm9yaWdpbmFsVXJsLCAnLycpO1xuICAgICAgaWYgKF8uaGFzKHRoaXMucHJlcmVuZGVyUGFnZXMsIHJvdXRlKSkge1xuICAgICAgICBsb2cuaW5mbygnU2VydmUgd2l0aCBwcmVyZW5kZXIgcGFnZSBmb3IgJywgcm91dGUpO1xuICAgICAgICBpZiAodGhpcy5wcmVyZW5kZXJQYWdlc1tyb3V0ZV0gPT09IG51bGwpIHtcbiAgICAgICAgICByZWFkRmlsZShqb2luKHN0YXRpY0RpciwgdGhpcy5wcmVyZW5kZXJNYXBbcm91dGVdKSwgJ3V0Zi04JywgKGVyciwgY29udCkgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICBsb2cuZXJyb3IoJ0ZhaWxlZCB0byByZWFkIHByZXJlbmRlcmVkIHBhZ2U6ICcgKyB0aGlzLnByZXJlbmRlck1hcFtyb3V0ZV0sIGVycik7XG4gICAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMucHJlcmVuZGVyUGFnZXNbcm91dGVdID0gY29udDtcbiAgICAgICAgICAgIHJlcy5zZW5kKGNvbnQpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlcy5zZW5kKHRoaXMucHJlcmVuZGVyUGFnZXNbcm91dGVdKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbmV4dCgpO1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICBwcm90ZWN0ZWQgcXVlcnlQcmVyZW5kZXJQYWdlcyhyb3V0ZU1hcEZpbGVzOiBzdHJpbmdbXSkge1xuICAgIGNvbnN0IHBhZ2VzOiB7W3JvdXRlOiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG4gICAgY29uc3QgYWxsRG9uZTogQXJyYXk8UHJvbWlzZTx2b2lkPj4gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHByZXJlbmRlck1hcEZpbGUgb2Ygcm91dGVNYXBGaWxlcykge1xuICAgICAgaWYgKCFleGlzdHNTeW5jKHByZXJlbmRlck1hcEZpbGUpKVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIGxvZy5pbmZvKCdyZWFkJywgcHJlcmVuZGVyTWFwRmlsZSk7XG4gICAgICBhbGxEb25lLnB1c2gobmV3IFByb21pc2UoKHJlc29sdmUsIHJlaikgPT4ge1xuICAgICAgICByZWFkRmlsZShwcmVyZW5kZXJNYXBGaWxlLCAndXRmLTgnLCAoZXJyLCBjb250ZW50KSA9PiB7XG4gICAgICAgICAgaWYgKGVycilcbiAgICAgICAgICAgIHJldHVybiByZWooZXJyKTtcbiAgICAgICAgICB0aGlzLnByZXJlbmRlck1hcCA9IEpTT04ucGFyc2UoY29udGVudCk7XG4gICAgICAgICAgXy5mb3JFYWNoKHRoaXMucHJlcmVuZGVyTWFwLCAoZmlsZSwgcm91dGUpID0+IHtcbiAgICAgICAgICAgIHBhZ2VzW3JvdXRlXSA9IGZpbGU7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0pKTtcbiAgICB9XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKGFsbERvbmUpLnRoZW4oKCkgPT4gcGFnZXMpO1xuICB9XG59XG4iXX0=