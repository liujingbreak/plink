"use strict";
const tslib_1 = require("tslib");
const __api_1 = tslib_1.__importDefault(require("__api"));
const log = require('log4js').getLogger('ng-html-loader');
const _ = tslib_1.__importStar(require("lodash"));
const rxjs_1 = require("rxjs");
const vm = require("vm");
const html_assets_resolver_1 = require("../ng-aot-assets/html-assets-resolver");
const loader = function (content, map) {
    var callback = this.async();
    if (!callback) {
        this.emitError('loader does not support sync mode');
        throw new Error('loader does not support sync mode');
    }
    load(content, this)
        .then(result => this.callback(null, result, map))
        .catch(err => {
        this.callback(err);
        this.emitError(err);
        log.error(err);
    });
};
loader.compileHtml = load;
function load(content, loader) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        return html_assets_resolver_1.replaceForHtml(content, loader.resourcePath, (text) => {
            return new rxjs_1.Observable(subscriber => {
                // Unlike extract-loader, we does not support embedded require statement in source code 
                loader.loadModule(text, (err, source, sourceMap, module) => {
                    if (err)
                        return subscriber.error(err);
                    var sandbox = {
                        __webpack_public_path__: _.get(loader, '_compiler.options.output.publicPath', __api_1.default.config().publicPath),
                        module: {
                            exports: {}
                        }
                    };
                    vm.runInNewContext(source, vm.createContext(sandbox));
                    subscriber.next(sandbox.module.exports);
                    subscriber.complete();
                });
            });
        }).toPromise();
    });
}
module.exports = loader;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9sb2FkZXJzL25nLWh0bWwtbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQ0EsMERBQXdCO0FBRXhCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUMxRCxrREFBNEI7QUFDNUIsK0JBQWdDO0FBQ2hDLHlCQUEwQjtBQUMxQixnRkFBcUU7QUFNckUsTUFBTSxNQUFNLEdBQ1osVUFBUyxPQUFlLEVBQUUsR0FBa0I7SUFDMUMsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQzVCLElBQUksQ0FBQyxRQUFRLEVBQUU7UUFDYixJQUFJLENBQUMsU0FBUyxDQUFDLG1DQUFtQyxDQUFDLENBQUM7UUFDcEQsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO0tBQ3REO0lBQ0QsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUM7U0FDbEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1NBQ2hELEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUNYLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDbkIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNwQixHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2pCLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDO0FBRUYsTUFBTSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7QUFRMUIsU0FBZSxJQUFJLENBQ2pCLE9BQWUsRUFDZixNQUFxQjs7UUFHckIsT0FBTyxxQ0FBYyxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUMsSUFBWSxFQUFFLEVBQUU7WUFDbkUsT0FBTyxJQUFJLGlCQUFVLENBQVMsVUFBVSxDQUFDLEVBQUU7Z0JBQ3pDLHdGQUF3RjtnQkFDeEYsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFVLEVBQUUsTUFBVyxFQUFFLFNBQWMsRUFBRSxNQUFXLEVBQUUsRUFBRTtvQkFDL0UsSUFBSSxHQUFHO3dCQUNMLE9BQU8sVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDL0IsSUFBSSxPQUFPLEdBQUc7d0JBQ1osdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUscUNBQXFDLEVBQUUsZUFBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLFVBQVUsQ0FBQzt3QkFDdEcsTUFBTSxFQUFFOzRCQUNOLE9BQU8sRUFBRSxFQUFFO3lCQUNaO3FCQUNGLENBQUM7b0JBQ0YsRUFBRSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO29CQUN0RCxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsT0FBaUIsQ0FBQyxDQUFDO29CQUNsRCxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ3hCLENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUNqQixDQUFDO0NBQUE7QUF6QkQsaUJBQVMsTUFBTSxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L2xvYWRlcnMvbmctaHRtbC1sb2FkZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1Jhd1NvdXJjZU1hcH0gZnJvbSAnc291cmNlLW1hcCc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCB7bG9hZGVyIGFzIHdiTG9hZGVyfSBmcm9tICd3ZWJwYWNrJztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignbmctaHRtbC1sb2FkZXInKTtcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7T2JzZXJ2YWJsZX0gZnJvbSAncnhqcyc7XG5pbXBvcnQgdm0gPSByZXF1aXJlKCd2bScpO1xuaW1wb3J0IHtyZXBsYWNlRm9ySHRtbH0gZnJvbSAnLi4vbmctYW90LWFzc2V0cy9odG1sLWFzc2V0cy1yZXNvbHZlcic7XG5cbmludGVyZmFjZSBMb2FkZXJDb250ZXh0IHtcbiAgbG9hZE1vZHVsZTogd2JMb2FkZXIuTG9hZGVyQ29udGV4dFsnbG9hZE1vZHVsZSddO1xuICByZXNvdXJjZVBhdGg6IHdiTG9hZGVyLkxvYWRlckNvbnRleHRbJ3Jlc291cmNlUGF0aCddO1xufVxuY29uc3QgbG9hZGVyOiB3YkxvYWRlci5Mb2FkZXIgJiB7Y29tcGlsZUh0bWw6IChjb250ZW50OiBzdHJpbmcsIGxvYWRlcjogTG9hZGVyQ29udGV4dCk9PiBQcm9taXNlPHN0cmluZz59ID1cbmZ1bmN0aW9uKGNvbnRlbnQ6IHN0cmluZywgbWFwPzogUmF3U291cmNlTWFwKSB7XG4gIHZhciBjYWxsYmFjayA9IHRoaXMuYXN5bmMoKTtcbiAgaWYgKCFjYWxsYmFjaykge1xuICAgIHRoaXMuZW1pdEVycm9yKCdsb2FkZXIgZG9lcyBub3Qgc3VwcG9ydCBzeW5jIG1vZGUnKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2xvYWRlciBkb2VzIG5vdCBzdXBwb3J0IHN5bmMgbW9kZScpO1xuICB9XG4gIGxvYWQoY29udGVudCwgdGhpcylcbiAgLnRoZW4ocmVzdWx0ID0+IHRoaXMuY2FsbGJhY2sobnVsbCwgcmVzdWx0LCBtYXApKVxuICAuY2F0Y2goZXJyID0+IHtcbiAgICB0aGlzLmNhbGxiYWNrKGVycik7XG4gICAgdGhpcy5lbWl0RXJyb3IoZXJyKTtcbiAgICBsb2cuZXJyb3IoZXJyKTtcbiAgfSk7XG59O1xuXG5sb2FkZXIuY29tcGlsZUh0bWwgPSBsb2FkO1xuXG4vLyBuYW1lc3BhY2UgbG9hZGVyIHtcbi8vIFx0ZXhwb3J0IGNvbnN0IGNvbXBpbGVIdG1sID0gbG9hZDtcbi8vIH1cblxuZXhwb3J0ID0gbG9hZGVyO1xuXG5hc3luYyBmdW5jdGlvbiBsb2FkKFxuICBjb250ZW50OiBzdHJpbmcsXG4gIGxvYWRlcjogTG9hZGVyQ29udGV4dFxuICApOiBQcm9taXNlPHN0cmluZz4ge1xuXG4gIHJldHVybiByZXBsYWNlRm9ySHRtbChjb250ZW50LCBsb2FkZXIucmVzb3VyY2VQYXRoLCAodGV4dDogc3RyaW5nKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlPHN0cmluZz4oc3Vic2NyaWJlciA9PiB7XG4gICAgICAvLyBVbmxpa2UgZXh0cmFjdC1sb2FkZXIsIHdlIGRvZXMgbm90IHN1cHBvcnQgZW1iZWRkZWQgcmVxdWlyZSBzdGF0ZW1lbnQgaW4gc291cmNlIGNvZGUgXG4gICAgICBsb2FkZXIubG9hZE1vZHVsZSh0ZXh0LCAoZXJyOiBFcnJvciwgc291cmNlOiBhbnksIHNvdXJjZU1hcDogYW55LCBtb2R1bGU6IGFueSkgPT4ge1xuICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgIHJldHVybiBzdWJzY3JpYmVyLmVycm9yKGVycik7XG4gICAgICAgIHZhciBzYW5kYm94ID0ge1xuICAgICAgICAgIF9fd2VicGFja19wdWJsaWNfcGF0aF9fOiBfLmdldChsb2FkZXIsICdfY29tcGlsZXIub3B0aW9ucy5vdXRwdXQucHVibGljUGF0aCcsIGFwaS5jb25maWcoKS5wdWJsaWNQYXRoKSxcbiAgICAgICAgICBtb2R1bGU6IHtcbiAgICAgICAgICAgIGV4cG9ydHM6IHt9XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICB2bS5ydW5Jbk5ld0NvbnRleHQoc291cmNlLCB2bS5jcmVhdGVDb250ZXh0KHNhbmRib3gpKTtcbiAgICAgICAgc3Vic2NyaWJlci5uZXh0KHNhbmRib3gubW9kdWxlLmV4cG9ydHMgYXMgc3RyaW5nKTtcbiAgICAgICAgc3Vic2NyaWJlci5jb21wbGV0ZSgpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pLnRvUHJvbWlzZSgpO1xufVxuXG5cblxuXG5cbiJdfQ==
