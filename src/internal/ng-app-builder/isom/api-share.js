"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const url_1 = tslib_1.__importDefault(require("url"));
const trimStart_1 = tslib_1.__importDefault(require("lodash/trimStart"));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9pc29tL2FwaS1zaGFyZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxzREFBc0I7QUFDdEIseUVBQXlDO0FBSXpDLFNBQWdCLGtCQUFrQixDQUFDLFlBQXFCO0lBQ3REOzs7Ozs7Ozs7OztPQVdHO0lBQ0gsT0FBTyxTQUFTLFlBQVksQ0FBOEIsV0FBbUIsRUFBRSxPQUFnQjtRQUM3RixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNqRCxNQUFNLE9BQU8sR0FBRyxhQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsSUFBSSxFQUFFLENBQUM7UUFDOUMsSUFBSSxZQUFZLEVBQUU7WUFDaEIsWUFBWSxHQUFHLGFBQUcsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsUUFBUSxJQUFJLEVBQUUsQ0FBQztZQUN0RCxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUN2QyxPQUFPLG1CQUFTLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7YUFDM0Q7U0FDRjtRQUNELE9BQU8sbUJBQVMsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDakMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQXhCRCxnREF3QkMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2lzb20vYXBpLXNoYXJlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFVybCBmcm9tICd1cmwnO1xuaW1wb3J0IHRyaW1TdGFydCBmcm9tICdsb2Rhc2gvdHJpbVN0YXJ0JztcbmltcG9ydCB7RXh0ZW5kZWRBcGl9IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC9hc3NldHMtdXJsJztcbmltcG9ydCBOb2RlQXBpIGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC9wYWNrYWdlLW1nci9ub2RlLXBhY2thZ2UtYXBpJztcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZU5nUm91dGVyUGF0aChiYXNlSHJlZlBhdGg/OiBzdHJpbmcpIHtcbiAgLyoqQGZ1bmN0aW9uIG5nUm91dGVyUGF0aFxuICAgKiBAbWVtYmVyT2YgX19hcGlcbiAgICogZS5nLlxuICAgKiBBc3N1bWUgYXBwbGljYXRpb24gaXMgZGVwbG95ZWQgb24gJ2h0dHA6Ly9mb29iYXIuY29tL2Jhc2UtaHJlZicgYXMgXCJkZXBsb3lVcmxcIiBpbiBhbmd1bGFyLmpzb24uXG4gICAqIEN1cnJlbnQgZmVhdHVyZSBwYWNrYWdlIGlzIGBAYmsvZmVhdHVyZS1hYCwgaXRzIGBuZ1JvdXRlUGF0aGAgaXMgYnkgZGVmYXVsdCAnZmVhdHVyZS1hJyxcbiAgICogZmVhdHVyZSBwYWNrYWdlIGBAYmsvZmVhdHVyZS1iYCdzIGBuZ1JvdXRlUGF0aGAgaXMgYnkgZGVmYXVsdCAnZmVhdHVyZS1iJ1xuICAgKiAgYGBgdHNcbiAgICogX19hcGkubmdSb3V0ZXJQYXRoKCdhY3Rpb24nKSAgLy8gXCIvYmFzZS1ocmVmL2ZlYXR1cmUtYS9hY3Rpb25cIlxuICAgKiBfX2FwaS5uZ1JvdXRlclBhdGgoJ0Biay9mZWF0dXJlLWInLCAnYWN0aW9uJykgICAvLyBcIi9iYXNlLWhyZWYvZmVhdHVyZS1iL2FjdGlvblwiXG4gICAqIGBgYFxuICAgKiBAcmV0dXJuIHRoZSBjb25maWd1cmVkIEFuZ3VsYXIgcm91dGVyIHBhdGggZm9yIHNwZWNpZmljIChjdXJyZW50KSBmZWF0dXJlIHBhY2thZ2VcbiAgICovXG4gIHJldHVybiBmdW5jdGlvbiBuZ1JvdXRlclBhdGgodGhpczogRXh0ZW5kZWRBcGkgJiBOb2RlQXBpLCBwYWNrYWdlTmFtZTogc3RyaW5nLCBzdWJQYXRoPzogc3RyaW5nKSB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5hc3NldHNVcmwocGFja2FnZU5hbWUsIHN1YlBhdGgpO1xuICAgIGNvbnN0IGN1cnJVcmwgPSBVcmwucGFyc2UodXJsKS5wYXRobmFtZSB8fCAnJztcbiAgICBpZiAoYmFzZUhyZWZQYXRoKSB7XG4gICAgICBiYXNlSHJlZlBhdGggPSBVcmwucGFyc2UoYmFzZUhyZWZQYXRoKS5wYXRobmFtZSB8fCAnJztcbiAgICAgIGlmIChjdXJyVXJsLmluZGV4T2YoYmFzZUhyZWZQYXRoKSA9PT0gMCkge1xuICAgICAgICByZXR1cm4gdHJpbVN0YXJ0KGN1cnJVcmwuc2xpY2UoYmFzZUhyZWZQYXRoLmxlbmd0aCksICcvJyk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cmltU3RhcnQoY3VyclVybCwgJy8nKTtcbiAgfTtcbn1cbiJdfQ==
