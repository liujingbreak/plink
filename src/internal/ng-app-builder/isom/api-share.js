"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNgRouterPath = void 0;
const url_1 = __importDefault(require("url"));
const trimStart_1 = __importDefault(require("lodash/trimStart"));
function createNgRouterPath(baseHrefPath) {
    /**@function ngRouterPath
     * @memberOf __api
     * e.g.
     * Assume application is deployed on 'http://foobar.com/base-href' as "deployUrl" in angular.json.
     * Current feature package is `@bk/feature-a`, its `ngRoutePath` is by default 'feature-a',
     * feature package `@bk/feature-b`'s `ngRoutePath` is by default 'feature-b'
     *  ```ts
     * __api.ngRouterPath('action')  // "/base-href/feature-a/action"
     * __api.ngRouterPath('@bk/feature-b', 'action')   // "/base-href/feature-b/action"
     * ```
     * @return the configured Angular router path for specific (current) feature package
     */
    return function ngRouterPath(packageName, subPath) {
        const url = this.assetsUrl(packageName, subPath);
        const currUrl = url_1.default.parse(url).pathname || '';
        if (baseHrefPath) {
            baseHrefPath = url_1.default.parse(baseHrefPath).pathname || '';
            if (currUrl.indexOf(baseHrefPath) === 0) {
                return trimStart_1.default(currUrl.slice(baseHrefPath.length), '/');
            }
        }
        return trimStart_1.default(currUrl, '/');
    };
}
exports.createNgRouterPath = createNgRouterPath;

//# sourceMappingURL=api-share.js.map
