"use strict";
const tslib_1 = require("tslib");
// import {RawSourceMap} from 'source-map';
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9sb2FkZXJzL25nLWh0bWwtbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsMkNBQTJDO0FBQzNDLDBEQUF3QjtBQUV4QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFDMUQsa0RBQTRCO0FBQzVCLCtCQUFnQztBQUNoQyx5QkFBMEI7QUFDMUIsZ0ZBQXFFO0FBUXJFLE1BQU0sTUFBTSxHQUNaLFVBQVMsT0FBZSxFQUFFLEdBQWtCO0lBQzFDLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUM1QixJQUFJLENBQUMsUUFBUSxFQUFFO1FBQ2IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO1FBQ3BELE1BQU0sSUFBSSxLQUFLLENBQUMsbUNBQW1DLENBQUMsQ0FBQztLQUN0RDtJQUNELElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDO1NBQ2xCLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQztTQUNoRCxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDWCxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ25CLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDcEIsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNqQixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQztBQUVGLE1BQU0sQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO0FBUTFCLFNBQWUsSUFBSSxDQUNqQixPQUFlLEVBQ2YsTUFBcUI7O1FBR3JCLE9BQU8scUNBQWMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDLElBQVksRUFBRSxFQUFFO1lBQ25FLE9BQU8sSUFBSSxpQkFBVSxDQUFTLFVBQVUsQ0FBQyxFQUFFO2dCQUN6Qyx3RkFBd0Y7Z0JBQ3hGLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBVSxFQUFFLE1BQVcsRUFBRSxTQUFjLEVBQUUsTUFBVyxFQUFFLEVBQUU7b0JBQy9FLElBQUksR0FBRzt3QkFDTCxPQUFPLFVBQVUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQy9CLElBQUksT0FBTyxHQUFHO3dCQUNaLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLHFDQUFxQyxFQUFFLGVBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxVQUFVLENBQUM7d0JBQ3RHLE1BQU0sRUFBRTs0QkFDTixPQUFPLEVBQUUsRUFBRTt5QkFDWjtxQkFDRixDQUFDO29CQUNGLEVBQUUsQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztvQkFDdEQsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQWlCLENBQUMsQ0FBQztvQkFDbEQsVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUN4QixDQUFDLENBQUMsQ0FBQztZQUNMLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDakIsQ0FBQztDQUFBO0FBekJELGlCQUFTLE1BQU0sQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9sb2FkZXJzL25nLWh0bWwtbG9hZGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gaW1wb3J0IHtSYXdTb3VyY2VNYXB9IGZyb20gJ3NvdXJjZS1tYXAnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQge2xvYWRlciBhcyB3YkxvYWRlcn0gZnJvbSAnd2VicGFjayc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ25nLWh0bWwtbG9hZGVyJyk7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge09ic2VydmFibGV9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHZtID0gcmVxdWlyZSgndm0nKTtcbmltcG9ydCB7cmVwbGFjZUZvckh0bWx9IGZyb20gJy4uL25nLWFvdC1hc3NldHMvaHRtbC1hc3NldHMtcmVzb2x2ZXInO1xuXG50eXBlIFJhd1NvdXJjZU1hcCA9IFBhcmFtZXRlcnM8d2JMb2FkZXIuTG9hZGVyQ29udGV4dFsnY2FsbGJhY2snXT5bMl07XG5cbmludGVyZmFjZSBMb2FkZXJDb250ZXh0IHtcbiAgbG9hZE1vZHVsZTogd2JMb2FkZXIuTG9hZGVyQ29udGV4dFsnbG9hZE1vZHVsZSddO1xuICByZXNvdXJjZVBhdGg6IHdiTG9hZGVyLkxvYWRlckNvbnRleHRbJ3Jlc291cmNlUGF0aCddO1xufVxuY29uc3QgbG9hZGVyOiB3YkxvYWRlci5Mb2FkZXIgJiB7Y29tcGlsZUh0bWw6IChjb250ZW50OiBzdHJpbmcsIGxvYWRlcjogTG9hZGVyQ29udGV4dCk9PiBQcm9taXNlPHN0cmluZz59ID1cbmZ1bmN0aW9uKGNvbnRlbnQ6IHN0cmluZywgbWFwPzogUmF3U291cmNlTWFwKSB7XG4gIHZhciBjYWxsYmFjayA9IHRoaXMuYXN5bmMoKTtcbiAgaWYgKCFjYWxsYmFjaykge1xuICAgIHRoaXMuZW1pdEVycm9yKCdsb2FkZXIgZG9lcyBub3Qgc3VwcG9ydCBzeW5jIG1vZGUnKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2xvYWRlciBkb2VzIG5vdCBzdXBwb3J0IHN5bmMgbW9kZScpO1xuICB9XG4gIGxvYWQoY29udGVudCwgdGhpcylcbiAgLnRoZW4ocmVzdWx0ID0+IHRoaXMuY2FsbGJhY2sobnVsbCwgcmVzdWx0LCBtYXApKVxuICAuY2F0Y2goZXJyID0+IHtcbiAgICB0aGlzLmNhbGxiYWNrKGVycik7XG4gICAgdGhpcy5lbWl0RXJyb3IoZXJyKTtcbiAgICBsb2cuZXJyb3IoZXJyKTtcbiAgfSk7XG59O1xuXG5sb2FkZXIuY29tcGlsZUh0bWwgPSBsb2FkO1xuXG4vLyBuYW1lc3BhY2UgbG9hZGVyIHtcbi8vIFx0ZXhwb3J0IGNvbnN0IGNvbXBpbGVIdG1sID0gbG9hZDtcbi8vIH1cblxuZXhwb3J0ID0gbG9hZGVyO1xuXG5hc3luYyBmdW5jdGlvbiBsb2FkKFxuICBjb250ZW50OiBzdHJpbmcsXG4gIGxvYWRlcjogTG9hZGVyQ29udGV4dFxuICApOiBQcm9taXNlPHN0cmluZz4ge1xuXG4gIHJldHVybiByZXBsYWNlRm9ySHRtbChjb250ZW50LCBsb2FkZXIucmVzb3VyY2VQYXRoLCAodGV4dDogc3RyaW5nKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlPHN0cmluZz4oc3Vic2NyaWJlciA9PiB7XG4gICAgICAvLyBVbmxpa2UgZXh0cmFjdC1sb2FkZXIsIHdlIGRvZXMgbm90IHN1cHBvcnQgZW1iZWRkZWQgcmVxdWlyZSBzdGF0ZW1lbnQgaW4gc291cmNlIGNvZGUgXG4gICAgICBsb2FkZXIubG9hZE1vZHVsZSh0ZXh0LCAoZXJyOiBFcnJvciwgc291cmNlOiBhbnksIHNvdXJjZU1hcDogYW55LCBtb2R1bGU6IGFueSkgPT4ge1xuICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgIHJldHVybiBzdWJzY3JpYmVyLmVycm9yKGVycik7XG4gICAgICAgIHZhciBzYW5kYm94ID0ge1xuICAgICAgICAgIF9fd2VicGFja19wdWJsaWNfcGF0aF9fOiBfLmdldChsb2FkZXIsICdfY29tcGlsZXIub3B0aW9ucy5vdXRwdXQucHVibGljUGF0aCcsIGFwaS5jb25maWcoKS5wdWJsaWNQYXRoKSxcbiAgICAgICAgICBtb2R1bGU6IHtcbiAgICAgICAgICAgIGV4cG9ydHM6IHt9XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICB2bS5ydW5Jbk5ld0NvbnRleHQoc291cmNlLCB2bS5jcmVhdGVDb250ZXh0KHNhbmRib3gpKTtcbiAgICAgICAgc3Vic2NyaWJlci5uZXh0KHNhbmRib3gubW9kdWxlLmV4cG9ydHMgYXMgc3RyaW5nKTtcbiAgICAgICAgc3Vic2NyaWJlci5jb21wbGV0ZSgpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pLnRvUHJvbWlzZSgpO1xufVxuXG5cblxuXG5cbiJdfQ==
