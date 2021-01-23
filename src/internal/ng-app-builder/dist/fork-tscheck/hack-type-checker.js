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
exports.init = void 0;
const injector_factory_1 = require("@wfh/plink/wfh/dist/injector-factory");
const path_1 = __importDefault(require("path"));
const ngDevkitNode = __importStar(require("@angular-devkit/core/node"));
const ng_ts_replace_1 = __importDefault(require("../ng-ts-replace"));
const read_hook_vfshost_1 = __importDefault(require("../utils/read-hook-vfshost"));
const fs = __importStar(require("fs"));
function init() {
    const hooker = new ng_ts_replace_1.default(require.resolve('@wfh/plink/wfh/tsconfig-base.json'), false);
    class HackedHost extends read_hook_vfshost_1.default {
        constructor() {
            super(fs, hooker.hookFunc);
        }
    }
    injector_factory_1.nodeInjector.fromDir(path_1.default.resolve('node_modules/@ngtools/webpack'))
        .factory('@angular-devkit/core/node', (file) => {
        return Object.assign(Object.assign({}, ngDevkitNode), { NodeJsSyncHost: HackedHost });
    });
}
exports.init = init;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGFjay10eXBlLWNoZWNrZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJoYWNrLXR5cGUtY2hlY2tlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMkVBQWtFO0FBQ2xFLGdEQUF3QjtBQUN4Qix3RUFBMEQ7QUFDMUQscUVBQTRDO0FBQzVDLG1GQUFzRDtBQUN0RCx1Q0FBeUI7QUFFekIsU0FBZ0IsSUFBSTtJQUNsQixNQUFNLE1BQU0sR0FBRyxJQUFJLHVCQUFZLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxtQ0FBbUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBRTdGLE1BQU0sVUFBVyxTQUFRLDJCQUFZO1FBQ25DO1lBQ0UsS0FBSyxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDN0IsQ0FBQztLQUNGO0lBRUQsK0JBQVksQ0FBQyxPQUFPLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO1NBQ2xFLE9BQU8sQ0FBQywyQkFBMkIsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO1FBQzdDLHVDQUNLLFlBQVksS0FDZixjQUFjLEVBQUUsVUFBVSxJQUMxQjtJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQWhCRCxvQkFnQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge25vZGVJbmplY3Rvcn0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9pbmplY3Rvci1mYWN0b3J5JztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgbmdEZXZraXROb2RlIGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlL25vZGUnO1xuaW1wb3J0IFRTUmVhZEhvb2tlciBmcm9tICcuLi9uZy10cy1yZXBsYWNlJztcbmltcG9ydCBSZWFkSG9va0hvc3QgZnJvbSAnLi4vdXRpbHMvcmVhZC1ob29rLXZmc2hvc3QnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuXG5leHBvcnQgZnVuY3Rpb24gaW5pdCgpIHtcbiAgY29uc3QgaG9va2VyID0gbmV3IFRTUmVhZEhvb2tlcihyZXF1aXJlLnJlc29sdmUoJ0B3ZmgvcGxpbmsvd2ZoL3RzY29uZmlnLWJhc2UuanNvbicpLCBmYWxzZSk7XG5cbiAgY2xhc3MgSGFja2VkSG9zdCBleHRlbmRzIFJlYWRIb29rSG9zdCB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICBzdXBlcihmcywgaG9va2VyLmhvb2tGdW5jKTtcbiAgICB9XG4gIH1cblxuICBub2RlSW5qZWN0b3IuZnJvbURpcihQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy9Abmd0b29scy93ZWJwYWNrJykpXG4gIC5mYWN0b3J5KCdAYW5ndWxhci1kZXZraXQvY29yZS9ub2RlJywgKGZpbGUpID0+IHtcbiAgICByZXR1cm4ge1xuICAgICAgLi4ubmdEZXZraXROb2RlLFxuICAgICAgTm9kZUpzU3luY0hvc3Q6IEhhY2tlZEhvc3RcbiAgICB9O1xuICB9KTtcbn1cbiJdfQ==