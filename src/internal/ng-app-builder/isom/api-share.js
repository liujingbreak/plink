"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const url_1 = tslib_1.__importDefault(require("url"));
const trimStart_1 = tslib_1.__importDefault(require("lodash/trimStart"));
function createNgRouterPath(baseHref) {
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
        if (baseHref) {
            baseHref = url_1.default.parse(baseHref).pathname || '';
            if (currUrl.indexOf(baseHref)) {
                return trimStart_1.default(currUrl.slice(baseHref.length), '/');
            }
        }
        return trimStart_1.default(currUrl, '/');
    };
}
exports.createNgRouterPath = createNgRouterPath;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9pc29tL2FwaS1zaGFyZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxzREFBc0I7QUFDdEIseUVBQXlDO0FBSXpDLFNBQWdCLGtCQUFrQixDQUFDLFFBQWlCO0lBQ2xEOzs7Ozs7Ozs7OztPQVdHO0lBQ0gsT0FBTyxTQUFTLFlBQVksQ0FBQyxXQUFtQixFQUFFLE9BQWdCO1FBQ2hFLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2pELE1BQU0sT0FBTyxHQUFHLGFBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxJQUFJLEVBQUUsQ0FBQztRQUM5QyxJQUFJLFFBQVEsRUFBRTtZQUNaLFFBQVEsR0FBRyxhQUFHLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFFBQVEsSUFBSSxFQUFFLENBQUM7WUFDOUMsSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUM3QixPQUFPLG1CQUFTLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7YUFDdkQ7U0FDRjtRQUNELE9BQU8sbUJBQVMsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDakMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQXhCRCxnREF3QkMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2lzb20vYXBpLXNoYXJlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFVybCBmcm9tICd1cmwnO1xuaW1wb3J0IHRyaW1TdGFydCBmcm9tICdsb2Rhc2gvdHJpbVN0YXJ0JztcblxuXG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVOZ1JvdXRlclBhdGgoYmFzZUhyZWY/OiBzdHJpbmcpIHtcbiAgLyoqQGZ1bmN0aW9uIG5nUm91dGVyUGF0aFxuICAgKiBAbWVtYmVyT2YgX19hcGlcbiAgICogZS5nLlxuICAgKiBBc3N1bWUgYXBwbGljYXRpb24gaXMgZGVwbG95ZWQgb24gJ2h0dHA6Ly9mb29iYXIuY29tL2Jhc2UtaHJlZicgYXMgXCJkZXBsb3lVcmxcIiBpbiBhbmd1bGFyLmpzb24uXG4gICAqIEN1cnJlbnQgZmVhdHVyZSBwYWNrYWdlIGlzIGBAYmsvZmVhdHVyZS1hYCwgaXRzIGBuZ1JvdXRlUGF0aGAgaXMgYnkgZGVmYXVsdCAnZmVhdHVyZS1hJyxcbiAgICogZmVhdHVyZSBwYWNrYWdlIGBAYmsvZmVhdHVyZS1iYCdzIGBuZ1JvdXRlUGF0aGAgaXMgYnkgZGVmYXVsdCAnZmVhdHVyZS1iJ1xuICAgKiAgYGBgdHNcbiAgICogX19hcGkubmdSb3V0ZXJQYXRoKCdhY3Rpb24nKSAgLy8gXCIvYmFzZS1ocmVmL2ZlYXR1cmUtYS9hY3Rpb25cIlxuICAgKiBfX2FwaS5uZ1JvdXRlclBhdGgoJ0Biay9mZWF0dXJlLWInLCAnYWN0aW9uJykgICAvLyBcIi9iYXNlLWhyZWYvZmVhdHVyZS1iL2FjdGlvblwiXG4gICAqIGBgYFxuICAgKiBAcmV0dXJuIHRoZSBjb25maWd1cmVkIEFuZ3VsYXIgcm91dGVyIHBhdGggZm9yIHNwZWNpZmljIChjdXJyZW50KSBmZWF0dXJlIHBhY2thZ2VcbiAgICovXG4gIHJldHVybiBmdW5jdGlvbiBuZ1JvdXRlclBhdGgocGFja2FnZU5hbWU6IHN0cmluZywgc3ViUGF0aD86IHN0cmluZykge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYXNzZXRzVXJsKHBhY2thZ2VOYW1lLCBzdWJQYXRoKTtcbiAgICBjb25zdCBjdXJyVXJsID0gVXJsLnBhcnNlKHVybCkucGF0aG5hbWUgfHwgJyc7XG4gICAgaWYgKGJhc2VIcmVmKSB7XG4gICAgICBiYXNlSHJlZiA9IFVybC5wYXJzZShiYXNlSHJlZikucGF0aG5hbWUgfHwgJyc7XG4gICAgICBpZiAoY3VyclVybC5pbmRleE9mKGJhc2VIcmVmKSkge1xuICAgICAgICByZXR1cm4gdHJpbVN0YXJ0KGN1cnJVcmwuc2xpY2UoYmFzZUhyZWYubGVuZ3RoKSwgJy8nKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRyaW1TdGFydChjdXJyVXJsLCAnLycpO1xuICB9O1xufVxuIl19
