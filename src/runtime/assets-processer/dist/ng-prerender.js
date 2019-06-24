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
        __api_1.default.eventBus.on('@dr-core/assets-processer.downloaded', () => tslib_1.__awaiter(this, void 0, void 0, function* () {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL25nLXByZXJlbmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSx1Q0FBZ0Q7QUFDaEQsK0JBQTBCO0FBQzFCLGtEQUE0QjtBQUM1QiwwREFBd0I7QUFDeEIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7QUFFNUMsUUFBQSxjQUFjLEdBQUcsdUJBQXVCLENBQUM7QUFDdEQsTUFBTSxTQUFTLEdBQVcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7QUFFMUQsTUFBYSxtQkFBbUI7SUFNL0I7OztPQUdHO0lBQ0gsWUFBWSxHQUFHLGFBQXVCO1FBVHRDLHVCQUF1QjtRQUN2QixtQkFBYyxHQUE4QixFQUFFLENBQUMsQ0FBQyxnQkFBZ0I7UUFTL0Qsd0ZBQXdGO1FBQ3hGLHlEQUF5RDtRQUN6RCwwQkFBMEI7UUFDMUIsb0VBQW9FO1FBQ3BFLFdBQVc7UUFDWCxJQUFJO1FBQ0osSUFBSSxDQUFDLG1CQUFtQixDQUFDLGFBQWEsQ0FBQzthQUN0QyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxHQUFHLEtBQUssQ0FBQyxDQUFDO1FBRTVDLGVBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLHNDQUFzQyxFQUFFLEdBQVMsRUFBRTtZQUNsRSxHQUFHLENBQUMsSUFBSSxDQUFDLDZDQUE2QyxDQUFDLENBQUM7WUFDeEQsTUFBTSxLQUFLLEdBQUcsTUFBTSxJQUFJLENBQUMsbUJBQW1CLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDNUQsSUFBSSxDQUFDLGNBQWMsR0FBRyxLQUFLLENBQUM7UUFDN0IsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxZQUFZO1FBQ1gsSUFBSSxlQUFHLENBQUMsSUFBSSxD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O0lBQy9DLENBQUM7Q0FDRDtBQTdFRCxrREE2RUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9uZy1wcmVyZW5kZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1JlcXVlc3QsIFJlc3BvbnNlLCBOZXh0RnVuY3Rpb259IGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0IHsgcmVhZEZpbGUsIGV4aXN0c1N5bmMgfSBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQge2pvaW59IGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lKTtcblxuZXhwb3J0IGNvbnN0IFJPVVRFX01BUF9GSUxFID0gJ3ByZXJlbmRlci1yb3V0ZXMuanNvbic7XG5jb25zdCBzdGF0aWNEaXI6IHN0cmluZyA9IGFwaS5jb25maWcucmVzb2x2ZSgnc3RhdGljRGlyJyk7XG5cbmV4cG9ydCBjbGFzcyBQcmVyZW5kZXJGb3JFeHByZXNzIHtcblx0Ly8gbm9QcmVyZW5kZXIgPSBmYWxzZTtcblx0cHJlcmVuZGVyUGFnZXM6IHtbcm91dGU6IHN0cmluZ106IHN0cmluZ30gPSB7fTsgLy8gcGFnZSBjb250ZW50c1xuXHQvLyBsYXN0UXVlcmllZDogTWFwPHN0cmluZywgbnVtYmVyPiA9IG5ldyBNYXAoKTtcblx0cHJlcmVuZGVyTWFwOiB7W3JvdXRlOiBzdHJpbmddOiBzdHJpbmd9O1xuXG5cdC8qKlxuXHQgKiBjb25zdHJ1Y3RvclxuXHQgKiBAcGFyYW0gcm91dGVNYXBGaWxlcyBhcnJheSBvZiBkaXN0L3N0YXRpYy88YXBwPi9fcHJlcmVuZGVyL3ByZXJlbmRlci1yb3V0ZXMuanNvblxuXHQgKi9cblx0Y29uc3RydWN0b3IoLi4ucm91dGVNYXBGaWxlczogc3RyaW5nW10pIHtcblx0XHQvLyB0aGlzLnByZXJlbmRlck1hcEZpbGUgPSBqb2luKHN0YXRpY0RpciwgdGhpcy5hcHBsTmFtZSwgJ19wcmVyZW5kZXInLCBST1VURV9NQVBfRklMRSk7XG5cdFx0Ly8gdGhpcy5ub1ByZXJlbmRlciA9ICFleGlzdHNTeW5jKHRoaXMucHJlcmVuZGVyTWFwRmlsZSk7XG5cdFx0Ly8gaWYgKHRoaXMubm9QcmVyZW5kZXIpIHtcblx0XHQvLyBcdGxvZy53YXJuKCdObyBwcmVyZW5kZXIgZmlsZXMgZm91bmQgaW4gJywgdGhpcy5wcmVyZW5kZXJNYXBGaWxlKTtcblx0XHQvLyBcdHJldHVybjtcblx0XHQvLyB9XG5cdFx0dGhpcy5xdWVyeVByZXJlbmRlclBhZ2VzKHJvdXRlTWFwRmlsZXMpXG5cdFx0LnRoZW4ocGFnZXMgPT4gdGhpcy5wcmVyZW5kZXJQYWdlcyA9IHBhZ2VzKTtcblxuXHRcdGFwaS5ldmVudEJ1cy5vbignQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci5kb3dubG9hZGVkJywgYXN5bmMgKCkgPT4ge1xuXHRcdFx0bG9nLmluZm8oJ2Fzc2V0cyBkb3dubG9hZGVkLCB1cGRhdGUgcHJlcmVuZGVyZWQgcGFnZXMnKTtcblx0XHRcdGNvbnN0IHBhZ2VzID0gYXdhaXQgdGhpcy5xdWVyeVByZXJlbmRlclBhZ2VzKHJvdXRlTWFwRmlsZXMpO1xuXHRcdFx0dGhpcy5wcmVyZW5kZXJQYWdlcyA9IHBhZ2VzO1xuXHRcdH0pO1xuXHR9XG5cblx0YXNNaWRkbGV3YXJlKCkge1xuXHRcdGlmIChhcGkuYXJndi5obXIpIHtcblx0XHRcdGxvZy53YXJuKCdIb3QgbW9kdWxlIHJlcGxhY2VtZW50IG1vZGUgaXMgb24sIG5vIHByZXJlbmRlcmVkIHBhZ2Ugd2lsbCBiZSBzZXJ2ZWRcXG4nKTtcblx0XHRcdHJldHVybiAocmVxOiBSZXF1ZXN0LCByZXM6IFJlc3BvbnNlLCBuZXh0OiBOZXh0RnVuY3Rpb24pID0+IG5leHQoKTtcblx0XHR9XG5cdFx0cmV0dXJuIChyZXE6IFJlcXVlc3QsIHJlczogUmVzcG9uc2UsIG5leHQ6IE5leHRGdW5jdGlvbikgPT4ge1xuXHRcdFx0aWYgKHJlcS5tZXRob2QgIT09ICdHRVQnKVxuXHRcdFx0XHRyZXR1cm4gbmV4dCgpO1xuXHRcdFx0Y29uc3Qgcm91dGUgPSBfLnRyaW1FbmQocmVxLm9yaWdpbmFsVXJsLCAnLycpO1xuXHRcdFx0aWYgKF8uaGFzKHRoaXMucHJlcmVuZGVyUGFnZXMsIHJvdXRlKSkge1xuXHRcdFx0XHRsb2cuaW5mbygnU2VydmUgd2l0aCBwcmVyZW5kZXIgcGFnZSBmb3IgJywgcm91dGUpO1xuXHRcdFx0XHRpZiAodGhpcy5wcmVyZW5kZXJQYWdlc1tyb3V0ZV0gPT09IG51bGwpIHtcblx0XHRcdFx0XHRyZWFkRmlsZShqb2luKHN0YXRpY0RpciwgdGhpcy5wcmVyZW5kZXJNYXBbcm91dGVdKSwgJ3V0Zi04JywgKGVyciwgY29udCkgPT4ge1xuXHRcdFx0XHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRcdFx0XHRsb2cuZXJyb3IoJ0ZhaWxlZCB0byByZWFkIHByZXJlbmRlcmVkIHBhZ2U6ICcgKyB0aGlzLnByZXJlbmRlck1hcFtyb3V0ZV0sIGVycik7XG5cdFx0XHRcdFx0XHRcdG5leHQoKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHRoaXMucHJlcmVuZGVyUGFnZXNbcm91dGVdID0gY29udDtcblx0XHRcdFx0XHRcdHJlcy5zZW5kKGNvbnQpO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHJlcy5zZW5kKHRoaXMucHJlcmVuZGVyUGFnZXNbcm91dGVdKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bmV4dCgpO1xuXHRcdFx0fVxuXHRcdH07XG5cdH1cblxuXHRwcm90ZWN0ZWQgcXVlcnlQcmVyZW5kZXJQYWdlcyhyb3V0ZU1hcEZpbGVzOiBzdHJpbmdbXSkge1xuXHRcdGNvbnN0IHBhZ2VzOiB7W3JvdXRlOiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG5cdFx0Y29uc3QgYWxsRG9uZTogQXJyYXk8UHJvbWlzZTx2b2lkPj4gPSBbXTtcblx0XHRmb3IgKGNvbnN0IHByZXJlbmRlck1hcEZpbGUgb2Ygcm91dGVNYXBGaWxlcykge1xuXHRcdFx0aWYgKCFleGlzdHNTeW5jKHByZXJlbmRlck1hcEZpbGUpKVxuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdGxvZy5pbmZvKCdyZWFkJywgcHJlcmVuZGVyTWFwRmlsZSk7XG5cdFx0XHRhbGxEb25lLnB1c2gobmV3IFByb21pc2UoKHJlc29sdmUsIHJlaikgPT4ge1xuXHRcdFx0XHRyZWFkRmlsZShwcmVyZW5kZXJNYXBGaWxlLCAndXRmLTgnLCAoZXJyLCBjb250ZW50KSA9PiB7XG5cdFx0XHRcdFx0aWYgKGVycilcblx0XHRcdFx0XHRcdHJldHVybiByZWooZXJyKTtcblx0XHRcdFx0XHR0aGlzLnByZXJlbmRlck1hcCA9IEpTT04ucGFyc2UoY29udGVudCk7XG5cdFx0XHRcdFx0Xy5mb3JFYWNoKHRoaXMucHJlcmVuZGVyTWFwLCAoZmlsZSwgcm91dGUpID0+IHtcblx0XHRcdFx0XHRcdHBhZ2VzW3JvdXRlXSA9IGZpbGU7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0cmVzb2x2ZSgpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pKTtcblx0XHR9XG5cdFx0cmV0dXJuIFByb21pc2UuYWxsKGFsbERvbmUpLnRoZW4oKCkgPT4gcGFnZXMpO1xuXHR9XG59XG4iXX0=
