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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9sb2FkZXJzL25nLWh0bWwtbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQ0EsMERBQXdCO0FBRXhCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUMxRCxrREFBNEI7QUFDNUIsK0JBQWdDO0FBQ2hDLHlCQUEwQjtBQUMxQixnRkFBcUU7QUFFckUsTUFBTSxNQUFNLEdBQ1osVUFBUyxPQUFlLEVBQUUsR0FBa0I7SUFDMUMsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQzVCLElBQUksQ0FBQyxRQUFRLEVBQUU7UUFDYixJQUFJLENBQUMsU0FBUyxDQUFDLG1DQUFtQyxDQUFDLENBQUM7UUFDcEQsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO0tBQ3REO0lBQ0QsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUM7U0FDbEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1NBQ2hELEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUNYLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDbkIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNwQixHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2pCLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDO0FBRUYsTUFBTSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7QUFRMUIsU0FBZSxJQUFJLENBQUMsT0FBZSxFQUFFLE1BQThCOztRQUNqRSxPQUFPLHFDQUFjLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQyxJQUFZLEVBQUUsRUFBRTtZQUNuRSxPQUFPLElBQUksaUJBQVUsQ0FBUyxVQUFVLENBQUMsRUFBRTtnQkFDekMsd0ZBQXdGO2dCQUN4RixNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDLEdBQVUsRUFBRSxNQUFXLEVBQUUsU0FBYyxFQUFFLE1BQVcsRUFBRSxFQUFFO29CQUMvRSxJQUFJLEdBQUc7d0JBQ0wsT0FBTyxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUMvQixJQUFJLE9BQU8sR0FBRzt3QkFDWix1QkFBdUIsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxxQ0FBcUMsRUFBRSxlQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsVUFBVSxDQUFDO3dCQUN0RyxNQUFNLEVBQUU7NEJBQ04sT0FBTyxFQUFFLEVBQUU7eUJBQ1o7cUJBQ0YsQ0FBQztvQkFDRixFQUFFLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7b0JBQ3RELFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxPQUFpQixDQUFDLENBQUM7b0JBQ2xELFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDeEIsQ0FBQyxDQUFDLENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ2pCLENBQUM7Q0FBQTtBQXJCRCxpQkFBUyxNQUFNLENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvbG9hZGVycy9uZy1odG1sLWxvYWRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7UmF3U291cmNlTWFwfSBmcm9tICdzb3VyY2UtbWFwJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHtsb2FkZXIgYXMgd2JMb2FkZXJ9IGZyb20gJ3dlYnBhY2snO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCduZy1odG1sLWxvYWRlcicpO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtPYnNlcnZhYmxlfSBmcm9tICdyeGpzJztcbmltcG9ydCB2bSA9IHJlcXVpcmUoJ3ZtJyk7XG5pbXBvcnQge3JlcGxhY2VGb3JIdG1sfSBmcm9tICcuLi9uZy1hb3QtYXNzZXRzL2h0bWwtYXNzZXRzLXJlc29sdmVyJztcblxuY29uc3QgbG9hZGVyOiB3YkxvYWRlci5Mb2FkZXIgJiB7Y29tcGlsZUh0bWw6IChjb250ZW50OiBzdHJpbmcsIGxvYWRlcjogd2JMb2FkZXIuTG9hZGVyQ29udGV4dCk9PiBQcm9taXNlPHN0cmluZz59ID1cbmZ1bmN0aW9uKGNvbnRlbnQ6IHN0cmluZywgbWFwPzogUmF3U291cmNlTWFwKSB7XG4gIHZhciBjYWxsYmFjayA9IHRoaXMuYXN5bmMoKTtcbiAgaWYgKCFjYWxsYmFjaykge1xuICAgIHRoaXMuZW1pdEVycm9yKCdsb2FkZXIgZG9lcyBub3Qgc3VwcG9ydCBzeW5jIG1vZGUnKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2xvYWRlciBkb2VzIG5vdCBzdXBwb3J0IHN5bmMgbW9kZScpO1xuICB9XG4gIGxvYWQoY29udGVudCwgdGhpcylcbiAgLnRoZW4ocmVzdWx0ID0+IHRoaXMuY2FsbGJhY2sobnVsbCwgcmVzdWx0LCBtYXApKVxuICAuY2F0Y2goZXJyID0+IHtcbiAgICB0aGlzLmNhbGxiYWNrKGVycik7XG4gICAgdGhpcy5lbWl0RXJyb3IoZXJyKTtcbiAgICBsb2cuZXJyb3IoZXJyKTtcbiAgfSk7XG59O1xuXG5sb2FkZXIuY29tcGlsZUh0bWwgPSBsb2FkO1xuXG4vLyBuYW1lc3BhY2UgbG9hZGVyIHtcbi8vIFx0ZXhwb3J0IGNvbnN0IGNvbXBpbGVIdG1sID0gbG9hZDtcbi8vIH1cblxuZXhwb3J0ID0gbG9hZGVyO1xuXG5hc3luYyBmdW5jdGlvbiBsb2FkKGNvbnRlbnQ6IHN0cmluZywgbG9hZGVyOiB3YkxvYWRlci5Mb2FkZXJDb250ZXh0KTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgcmV0dXJuIHJlcGxhY2VGb3JIdG1sKGNvbnRlbnQsIGxvYWRlci5yZXNvdXJjZVBhdGgsICh0ZXh0OiBzdHJpbmcpID0+IHtcbiAgICByZXR1cm4gbmV3IE9ic2VydmFibGU8c3RyaW5nPihzdWJzY3JpYmVyID0+IHtcbiAgICAgIC8vIFVubGlrZSBleHRyYWN0LWxvYWRlciwgd2UgZG9lcyBub3Qgc3VwcG9ydCBlbWJlZGRlZCByZXF1aXJlIHN0YXRlbWVudCBpbiBzb3VyY2UgY29kZSBcbiAgICAgIGxvYWRlci5sb2FkTW9kdWxlKHRleHQsIChlcnI6IEVycm9yLCBzb3VyY2U6IGFueSwgc291cmNlTWFwOiBhbnksIG1vZHVsZTogYW55KSA9PiB7XG4gICAgICAgIGlmIChlcnIpXG4gICAgICAgICAgcmV0dXJuIHN1YnNjcmliZXIuZXJyb3IoZXJyKTtcbiAgICAgICAgdmFyIHNhbmRib3ggPSB7XG4gICAgICAgICAgX193ZWJwYWNrX3B1YmxpY19wYXRoX186IF8uZ2V0KGxvYWRlciwgJ19jb21waWxlci5vcHRpb25zLm91dHB1dC5wdWJsaWNQYXRoJywgYXBpLmNvbmZpZygpLnB1YmxpY1BhdGgpLFxuICAgICAgICAgIG1vZHVsZToge1xuICAgICAgICAgICAgZXhwb3J0czoge31cbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHZtLnJ1bkluTmV3Q29udGV4dChzb3VyY2UsIHZtLmNyZWF0ZUNvbnRleHQoc2FuZGJveCkpO1xuICAgICAgICBzdWJzY3JpYmVyLm5leHQoc2FuZGJveC5tb2R1bGUuZXhwb3J0cyBhcyBzdHJpbmcpO1xuICAgICAgICBzdWJzY3JpYmVyLmNvbXBsZXRlKCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSkudG9Qcm9taXNlKCk7XG59XG5cblxuXG5cblxuIl19
