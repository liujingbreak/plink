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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpdWppbmcvYmsvZHItY29tcC1wYWNrYWdlL3NyYy9pbnRlcm5hbC9uZy1hcHAtYnVpbGRlci9pc29tL2FwaS1zaGFyZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSw4Q0FBc0I7QUFDdEIsaUVBQXlDO0FBSXpDLFNBQWdCLGtCQUFrQixDQUFDLFlBQXFCO0lBQ3REOzs7Ozs7Ozs7OztPQVdHO0lBQ0gsT0FBTyxTQUFTLFlBQVksQ0FBOEIsV0FBbUIsRUFBRSxPQUFnQjtRQUM3RixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNqRCxNQUFNLE9BQU8sR0FBRyxhQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsSUFBSSxFQUFFLENBQUM7UUFDOUMsSUFBSSxZQUFZLEVBQUU7WUFDaEIsWUFBWSxHQUFHLGFBQUcsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsUUFBUSxJQUFJLEVBQUUsQ0FBQztZQUN0RCxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUN2QyxPQUFPLG1CQUFTLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7YUFDM0Q7U0FDRjtRQUNELE9BQU8sbUJBQVMsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDakMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQXhCRCxnREF3QkMiLCJmaWxlIjoiZGlzdC9hcGktc2hhcmUuanMiLCJzb3VyY2VzQ29udGVudCI6W251bGxdfQ==
