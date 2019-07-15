"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
const _ = tslib_1.__importStar(require("lodash"));
const __api_1 = tslib_1.__importDefault(require("__api"));
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
        __api_1.default.eventBus.on('@dr-core/assets-processer.downloaded', () => {
            log.info('assets downloaded, update prerendered pages');
            this.queryPrerenderPages(routeMapFiles)
                .then(pages => this.prerenderPages = pages);
        });
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
                        pages[route] = null;
                    });
                    resolve();
                });
            }));
        }
        return Promise.all(allDone).then(() => pages);
    }
}
exports.PrerenderForExpress = PrerenderForExpress;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL25nLXByZXJlbmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSx1Q0FBZ0Q7QUFDaEQsK0JBQTBCO0FBQzFCLGtEQUE0QjtBQUM1QiwwREFBd0I7QUFDeEIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7QUFFNUMsUUFBQSxjQUFjLEdBQUcsdUJBQXVCLENBQUM7QUFDdEQsTUFBTSxTQUFTLEdBQVcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7QUFFMUQsTUFBYSxtQkFBbUI7SUFNOUI7OztTQUdFO0lBQ0YsWUFBWSxHQUFHLGFBQXVCO1FBVHRDLHVCQUF1QjtRQUN2QixtQkFBYyxHQUE4QixFQUFFLENBQUMsQ0FBQyxnQkFBZ0I7UUFTOUQsd0ZBQXdGO1FBQ3hGLHlEQUF5RDtRQUN6RCwwQkFBMEI7UUFDMUIsb0VBQW9FO1FBQ3BFLFdBQVc7UUFDWCxJQUFJO1FBQ0osSUFBSSxDQUFDLG1CQUFtQixDQUFDLGFBQWEsQ0FBQzthQUN0QyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxHQUFHLEtBQUssQ0FBQyxDQUFDO1FBRTVDLGVBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLHNDQUFzQyxFQUFFLEdBQUcsRUFBRTtZQUMzRCxHQUFHLENBQUMsSUFBSSxDQUFDLDZDQUE2QyxDQUFDLENBQUM7WUFDeEQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGFBQWEsQ0FBQztpQkFDdEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGNBQWMsR0FBRyxLQUFLLENBQUMsQ0FBQztRQUM5QyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxZQUFZO1FBQ1YsSUFBSSxlQUFHLENBQUMs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QUMsQ0FBQztJQUNoRCxDQUFDO0NBQ0Y7QUE3RUQsa0RBNkVDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvbmctcHJlcmVuZGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtSZXF1ZXN0LCBSZXNwb25zZSwgTmV4dEZ1bmN0aW9ufSBmcm9tICdleHByZXNzJztcbmltcG9ydCB7IHJlYWRGaWxlLCBleGlzdHNTeW5jIH0gZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IHtqb2lufSBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSk7XG5cbmV4cG9ydCBjb25zdCBST1VURV9NQVBfRklMRSA9ICdwcmVyZW5kZXItcm91dGVzLmpzb24nO1xuY29uc3Qgc3RhdGljRGlyOiBzdHJpbmcgPSBhcGkuY29uZmlnLnJlc29sdmUoJ3N0YXRpY0RpcicpO1xuXG5leHBvcnQgY2xhc3MgUHJlcmVuZGVyRm9yRXhwcmVzcyB7XG4gIC8vIG5vUHJlcmVuZGVyID0gZmFsc2U7XG4gIHByZXJlbmRlclBhZ2VzOiB7W3JvdXRlOiBzdHJpbmddOiBzdHJpbmd9ID0ge307IC8vIHBhZ2UgY29udGVudHNcbiAgLy8gbGFzdFF1ZXJpZWQ6IE1hcDxzdHJpbmcsIG51bWJlcj4gPSBuZXcgTWFwKCk7XG4gIHByZXJlbmRlck1hcDoge1tyb3V0ZTogc3RyaW5nXTogc3RyaW5nfTtcblxuICAvKipcblx0ICogY29uc3RydWN0b3Jcblx0ICogQHBhcmFtIHJvdXRlTWFwRmlsZXMgYXJyYXkgb2YgZGlzdC9zdGF0aWMvPGFwcD4vX3ByZXJlbmRlci9wcmVyZW5kZXItcm91dGVzLmpzb25cblx0ICovXG4gIGNvbnN0cnVjdG9yKC4uLnJvdXRlTWFwRmlsZXM6IHN0cmluZ1tdKSB7XG4gICAgLy8gdGhpcy5wcmVyZW5kZXJNYXBGaWxlID0gam9pbihzdGF0aWNEaXIsIHRoaXMuYXBwbE5hbWUsICdfcHJlcmVuZGVyJywgUk9VVEVfTUFQX0ZJTEUpO1xuICAgIC8vIHRoaXMubm9QcmVyZW5kZXIgPSAhZXhpc3RzU3luYyh0aGlzLnByZXJlbmRlck1hcEZpbGUpO1xuICAgIC8vIGlmICh0aGlzLm5vUHJlcmVuZGVyKSB7XG4gICAgLy8gXHRsb2cud2FybignTm8gcHJlcmVuZGVyIGZpbGVzIGZvdW5kIGluICcsIHRoaXMucHJlcmVuZGVyTWFwRmlsZSk7XG4gICAgLy8gXHRyZXR1cm47XG4gICAgLy8gfVxuICAgIHRoaXMucXVlcnlQcmVyZW5kZXJQYWdlcyhyb3V0ZU1hcEZpbGVzKVxuICAgIC50aGVuKHBhZ2VzID0+IHRoaXMucHJlcmVuZGVyUGFnZXMgPSBwYWdlcyk7XG5cbiAgICBhcGkuZXZlbnRCdXMub24oJ0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIuZG93bmxvYWRlZCcsICgpID0+IHtcbiAgICAgIGxvZy5pbmZvKCdhc3NldHMgZG93bmxvYWRlZCwgdXBkYXRlIHByZXJlbmRlcmVkIHBhZ2VzJyk7XG4gICAgICB0aGlzLnF1ZXJ5UHJlcmVuZGVyUGFnZXMocm91dGVNYXBGaWxlcylcbiAgICAgIC50aGVuKHBhZ2VzID0+IHRoaXMucHJlcmVuZGVyUGFnZXMgPSBwYWdlcyk7XG4gICAgfSk7XG4gIH1cblxuICBhc01pZGRsZXdhcmUoKSB7XG4gICAgaWYgKGFwaS5hcmd2Lmhtcikge1xuICAgICAgbG9nLndhcm4oJ0hvdCBtb2R1bGUgcmVwbGFjZW1lbnQgbW9kZSBpcyBvbiwgbm8gcHJlcmVuZGVyZWQgcGFnZSB3aWxsIGJlIHNlcnZlZFxcbicpO1xuICAgICAgcmV0dXJuIChyZXE6IFJlcXVlc3QsIHJlczogUmVzcG9uc2UsIG5leHQ6IE5leHRGdW5jdGlvbikgPT4gbmV4dCgpO1xuICAgIH1cbiAgICByZXR1cm4gKHJlcTogUmVxdWVzdCwgcmVzOiBSZXNwb25zZSwgbmV4dDogTmV4dEZ1bmN0aW9uKSA9PiB7XG4gICAgICBpZiAocmVxLm1ldGhvZCAhPT0gJ0dFVCcpXG4gICAgICAgIHJldHVybiBuZXh0KCk7XG4gICAgICBjb25zdCByb3V0ZSA9IF8udHJpbUVuZChyZXEub3JpZ2luYWxVcmwsICcvJyk7XG4gICAgICBpZiAoXy5oYXModGhpcy5wcmVyZW5kZXJQYWdlcywgcm91dGUpKSB7XG4gICAgICAgIGxvZy5pbmZvKCdTZXJ2ZSB3aXRoIHByZXJlbmRlciBwYWdlIGZvciAnLCByb3V0ZSk7XG4gICAgICAgIGlmICh0aGlzLnByZXJlbmRlclBhZ2VzW3JvdXRlXSA9PT0gbnVsbCkge1xuICAgICAgICAgIHJlYWRGaWxlKGpvaW4oc3RhdGljRGlyLCB0aGlzLnByZXJlbmRlck1hcFtyb3V0ZV0pLCAndXRmLTgnLCAoZXJyLCBjb250KSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgIGxvZy5lcnJvcignRmFpbGVkIHRvIHJlYWQgcHJlcmVuZGVyZWQgcGFnZTogJyArIHRoaXMucHJlcmVuZGVyTWFwW3JvdXRlXSwgZXJyKTtcbiAgICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5wcmVyZW5kZXJQYWdlc1tyb3V0ZV0gPSBjb250O1xuICAgICAgICAgICAgcmVzLnNlbmQoY29udCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzLnNlbmQodGhpcy5wcmVyZW5kZXJQYWdlc1tyb3V0ZV0pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuZXh0KCk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIHByb3RlY3RlZCBxdWVyeVByZXJlbmRlclBhZ2VzKHJvdXRlTWFwRmlsZXM6IHN0cmluZ1tdKSB7XG4gICAgY29uc3QgcGFnZXM6IHtbcm91dGU6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcbiAgICBjb25zdCBhbGxEb25lOiBBcnJheTxQcm9taXNlPHZvaWQ+PiA9IFtdO1xuICAgIGZvciAoY29uc3QgcHJlcmVuZGVyTWFwRmlsZSBvZiByb3V0ZU1hcEZpbGVzKSB7XG4gICAgICBpZiAoIWV4aXN0c1N5bmMocHJlcmVuZGVyTWFwRmlsZSkpXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgbG9nLmluZm8oJ3JlYWQnLCBwcmVyZW5kZXJNYXBGaWxlKTtcbiAgICAgIGFsbERvbmUucHVzaChuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqKSA9PiB7XG4gICAgICAgIHJlYWRGaWxlKHByZXJlbmRlck1hcEZpbGUsICd1dGYtOCcsIChlcnIsIGNvbnRlbnQpID0+IHtcbiAgICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgICAgcmV0dXJuIHJlaihlcnIpO1xuICAgICAgICAgIHRoaXMucHJlcmVuZGVyTWFwID0gSlNPTi5wYXJzZShjb250ZW50KTtcbiAgICAgICAgICBfLmZvckVhY2godGhpcy5wcmVyZW5kZXJNYXAsIChmaWxlLCByb3V0ZSkgPT4ge1xuICAgICAgICAgICAgcGFnZXNbcm91dGVdID0gbnVsbDtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSkpO1xuICAgIH1cbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoYWxsRG9uZSkudGhlbigoKSA9PiBwYWdlcyk7XG4gIH1cbn1cbiJdfQ==
