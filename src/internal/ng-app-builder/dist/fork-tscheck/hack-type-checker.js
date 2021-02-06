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
const require_injector_1 = __importDefault(require("require-injector"));
const path_1 = __importDefault(require("path"));
const ngDevkitNode = __importStar(require("@angular-devkit/core/node"));
const ng_ts_replace_1 = __importDefault(require("../ng-ts-replace"));
const read_hook_vfshost_1 = __importDefault(require("../utils/read-hook-vfshost"));
const fs = __importStar(require("fs"));
const __plink_1 = __importDefault(require("__plink"));
function init() {
    const hooker = new ng_ts_replace_1.default(require.resolve('@wfh/plink/wfh/tsconfig-base.json'), false);
    class HackedHost extends read_hook_vfshost_1.default {
        constructor() {
            super(fs, hooker.hookFunc);
        }
    }
    const nodeInjector = new require_injector_1.default();
    nodeInjector.fromDir(path_1.default.resolve('node_modules/@ngtools/webpack'))
        .factory('@angular-devkit/core/node', (file) => {
        __plink_1.default.logger.info(file + ' is hacked');
        return Object.assign(Object.assign({}, ngDevkitNode), { NodeJsSyncHost: HackedHost });
    });
}
exports.init = init;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGFjay10eXBlLWNoZWNrZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJoYWNrLXR5cGUtY2hlY2tlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsd0VBQWtDO0FBQ2xDLGdEQUF3QjtBQUN4Qix3RUFBMEQ7QUFDMUQscUVBQTRDO0FBQzVDLG1GQUFzRDtBQUN0RCx1Q0FBeUI7QUFDekIsc0RBQTRCO0FBRTVCLFNBQWdCLElBQUk7SUFDbEIsTUFBTSxNQUFNLEdBQUcsSUFBSSx1QkFBWSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsbUNBQW1DLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUU3RixNQUFNLFVBQVcsU0FBUSwyQkFBWTtRQUNuQztZQUNFLEtBQUssQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzdCLENBQUM7S0FDRjtJQUVELE1BQU0sWUFBWSxHQUFHLElBQUksMEJBQUUsRUFBRSxDQUFDO0lBQzlCLFlBQVksQ0FBQyxPQUFPLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO1NBQ2xFLE9BQU8sQ0FBQywyQkFBMkIsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO1FBQzdDLGlCQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsWUFBWSxDQUFDLENBQUM7UUFDdkMsdUNBQ0ssWUFBWSxLQUNmLGNBQWMsRUFBRSxVQUFVLElBQzFCO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBbEJELG9CQWtCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBSSiBmcm9tICdyZXF1aXJlLWluamVjdG9yJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgbmdEZXZraXROb2RlIGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlL25vZGUnO1xuaW1wb3J0IFRTUmVhZEhvb2tlciBmcm9tICcuLi9uZy10cy1yZXBsYWNlJztcbmltcG9ydCBSZWFkSG9va0hvc3QgZnJvbSAnLi4vdXRpbHMvcmVhZC1ob29rLXZmc2hvc3QnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHBsaW5rIGZyb20gJ19fcGxpbmsnO1xuXG5leHBvcnQgZnVuY3Rpb24gaW5pdCgpIHtcbiAgY29uc3QgaG9va2VyID0gbmV3IFRTUmVhZEhvb2tlcihyZXF1aXJlLnJlc29sdmUoJ0B3ZmgvcGxpbmsvd2ZoL3RzY29uZmlnLWJhc2UuanNvbicpLCBmYWxzZSk7XG5cbiAgY2xhc3MgSGFja2VkSG9zdCBleHRlbmRzIFJlYWRIb29rSG9zdCB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICBzdXBlcihmcywgaG9va2VyLmhvb2tGdW5jKTtcbiAgICB9XG4gIH1cblxuICBjb25zdCBub2RlSW5qZWN0b3IgPSBuZXcgUkooKTtcbiAgbm9kZUluamVjdG9yLmZyb21EaXIoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvQG5ndG9vbHMvd2VicGFjaycpKVxuICAuZmFjdG9yeSgnQGFuZ3VsYXItZGV2a2l0L2NvcmUvbm9kZScsIChmaWxlKSA9PiB7XG4gICAgcGxpbmsubG9nZ2VyLmluZm8oZmlsZSArICcgaXMgaGFja2VkJyk7XG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLm5nRGV2a2l0Tm9kZSxcbiAgICAgIE5vZGVKc1N5bmNIb3N0OiBIYWNrZWRIb3N0XG4gICAgfTtcbiAgfSk7XG59XG4iXX0=