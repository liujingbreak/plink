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
// import {RawSourceMap} from 'source-map';
const __api_1 = __importDefault(require("__api"));
const log = require('log4js').getLogger('ng-html-loader');
const _ = __importStar(require("lodash"));
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
    return __awaiter(this, void 0, void 0, function* () {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmctaHRtbC1sb2FkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJuZy1odG1sLWxvYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUEyQztBQUMzQyxrREFBd0I7QUFFeEIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQzFELDBDQUE0QjtBQUM1QiwrQkFBZ0M7QUFDaEMseUJBQTBCO0FBQzFCLGdGQUFxRTtBQVFyRSxNQUFNLE1BQU0sR0FDWixVQUFTLE9BQWUsRUFBRSxHQUFrQjtJQUMxQyxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDNUIsSUFBSSxDQUFDLFFBQVEsRUFBRTtRQUNiLElBQUksQ0FBQyxTQUFTLENBQUMsbUNBQW1DLENBQUMsQ0FBQztRQUNwRCxNQUFNLElBQUksS0FBSyxDQUFDLG1DQUFtQyxDQUFDLENBQUM7S0FDdEQ7SUFDRCxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQztTQUNsQixJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUM7U0FDaEQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ1gsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNuQixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3BCLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDakIsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUM7QUFFRixNQUFNLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztBQVExQixTQUFlLElBQUksQ0FBQyxPQUFlLEVBQUUsTUFBcUI7O1FBRXhELE9BQU8scUNBQWMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDLElBQVksRUFBRSxFQUFFO1lBQ25FLE9BQU8sSUFBSSxpQkFBVSxDQUFTLFVBQVUsQ0FBQyxFQUFFO2dCQUN6Qyx3RkFBd0Y7Z0JBQ3hGLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBVSxFQUFFLE1BQVcsRUFBRSxTQUFjLEVBQUUsTUFBVyxFQUFFLEVBQUU7b0JBQy9FLElBQUksR0FBRzt3QkFDTCxPQUFPLFVBQVUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQy9CLElBQUksT0FBTyxHQUFHO3dCQUNaLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLHFDQUFxQyxFQUFFLGVBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxVQUFVLENBQUM7d0JBQ3RHLE1BQU0sRUFBRTs0QkFDTixPQUFPLEVBQUUsRUFBRTt5QkFDWjtxQkFDRixDQUFDO29CQUNGLEVBQUUsQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztvQkFDdEQsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQWlCLENBQUMsQ0FBQztvQkFDbEQsVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUN4QixDQUFDLENBQUMsQ0FBQztZQUNMLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDakIsQ0FBQztDQUFBO0FBdEJELGlCQUFTLE1BQU0sQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIGltcG9ydCB7UmF3U291cmNlTWFwfSBmcm9tICdzb3VyY2UtbWFwJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHtsb2FkZXIgYXMgd2JMb2FkZXJ9IGZyb20gJ3dlYnBhY2snO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCduZy1odG1sLWxvYWRlcicpO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtPYnNlcnZhYmxlfSBmcm9tICdyeGpzJztcbmltcG9ydCB2bSA9IHJlcXVpcmUoJ3ZtJyk7XG5pbXBvcnQge3JlcGxhY2VGb3JIdG1sfSBmcm9tICcuLi9uZy1hb3QtYXNzZXRzL2h0bWwtYXNzZXRzLXJlc29sdmVyJztcblxudHlwZSBSYXdTb3VyY2VNYXAgPSBQYXJhbWV0ZXJzPHdiTG9hZGVyLkxvYWRlckNvbnRleHRbJ2NhbGxiYWNrJ10+WzJdO1xuXG5pbnRlcmZhY2UgTG9hZGVyQ29udGV4dCB7XG4gIGxvYWRNb2R1bGU6IHdiTG9hZGVyLkxvYWRlckNvbnRleHRbJ2xvYWRNb2R1bGUnXTtcbiAgcmVzb3VyY2VQYXRoOiB3YkxvYWRlci5Mb2FkZXJDb250ZXh0WydyZXNvdXJjZVBhdGgnXTtcbn1cbmNvbnN0IGxvYWRlcjogd2JMb2FkZXIuTG9hZGVyICYge2NvbXBpbGVIdG1sOiAoY29udGVudDogc3RyaW5nLCBsb2FkZXI6IExvYWRlckNvbnRleHQpPT4gUHJvbWlzZTxzdHJpbmc+fSA9XG5mdW5jdGlvbihjb250ZW50OiBzdHJpbmcsIG1hcD86IFJhd1NvdXJjZU1hcCkge1xuICB2YXIgY2FsbGJhY2sgPSB0aGlzLmFzeW5jKCk7XG4gIGlmICghY2FsbGJhY2spIHtcbiAgICB0aGlzLmVtaXRFcnJvcignbG9hZGVyIGRvZXMgbm90IHN1cHBvcnQgc3luYyBtb2RlJyk7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdsb2FkZXIgZG9lcyBub3Qgc3VwcG9ydCBzeW5jIG1vZGUnKTtcbiAgfVxuICBsb2FkKGNvbnRlbnQsIHRoaXMpXG4gIC50aGVuKHJlc3VsdCA9PiB0aGlzLmNhbGxiYWNrKG51bGwsIHJlc3VsdCwgbWFwKSlcbiAgLmNhdGNoKGVyciA9PiB7XG4gICAgdGhpcy5jYWxsYmFjayhlcnIpO1xuICAgIHRoaXMuZW1pdEVycm9yKGVycik7XG4gICAgbG9nLmVycm9yKGVycik7XG4gIH0pO1xufTtcblxubG9hZGVyLmNvbXBpbGVIdG1sID0gbG9hZDtcblxuLy8gbmFtZXNwYWNlIGxvYWRlciB7XG4vLyBcdGV4cG9ydCBjb25zdCBjb21waWxlSHRtbCA9IGxvYWQ7XG4vLyB9XG5cbmV4cG9ydCA9IGxvYWRlcjtcblxuYXN5bmMgZnVuY3Rpb24gbG9hZChjb250ZW50OiBzdHJpbmcsIGxvYWRlcjogTG9hZGVyQ29udGV4dCk6IFByb21pc2U8c3RyaW5nPiB7XG5cbiAgcmV0dXJuIHJlcGxhY2VGb3JIdG1sKGNvbnRlbnQsIGxvYWRlci5yZXNvdXJjZVBhdGgsICh0ZXh0OiBzdHJpbmcpID0+IHtcbiAgICByZXR1cm4gbmV3IE9ic2VydmFibGU8c3RyaW5nPihzdWJzY3JpYmVyID0+IHtcbiAgICAgIC8vIFVubGlrZSBleHRyYWN0LWxvYWRlciwgd2UgZG9lcyBub3Qgc3VwcG9ydCBlbWJlZGRlZCByZXF1aXJlIHN0YXRlbWVudCBpbiBzb3VyY2UgY29kZSBcbiAgICAgIGxvYWRlci5sb2FkTW9kdWxlKHRleHQsIChlcnI6IEVycm9yLCBzb3VyY2U6IGFueSwgc291cmNlTWFwOiBhbnksIG1vZHVsZTogYW55KSA9PiB7XG4gICAgICAgIGlmIChlcnIpXG4gICAgICAgICAgcmV0dXJuIHN1YnNjcmliZXIuZXJyb3IoZXJyKTtcbiAgICAgICAgdmFyIHNhbmRib3ggPSB7XG4gICAgICAgICAgX193ZWJwYWNrX3B1YmxpY19wYXRoX186IF8uZ2V0KGxvYWRlciwgJ19jb21waWxlci5vcHRpb25zLm91dHB1dC5wdWJsaWNQYXRoJywgYXBpLmNvbmZpZygpLnB1YmxpY1BhdGgpLFxuICAgICAgICAgIG1vZHVsZToge1xuICAgICAgICAgICAgZXhwb3J0czoge31cbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHZtLnJ1bkluTmV3Q29udGV4dChzb3VyY2UsIHZtLmNyZWF0ZUNvbnRleHQoc2FuZGJveCkpO1xuICAgICAgICBzdWJzY3JpYmVyLm5leHQoc2FuZGJveC5tb2R1bGUuZXhwb3J0cyBhcyBzdHJpbmcpO1xuICAgICAgICBzdWJzY3JpYmVyLmNvbXBsZXRlKCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSkudG9Qcm9taXNlKCk7XG59XG5cblxuXG5cblxuIl19