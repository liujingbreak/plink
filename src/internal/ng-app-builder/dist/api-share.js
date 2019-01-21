"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const url_1 = tslib_1.__importDefault(require("url"));
const trimStart_1 = tslib_1.__importDefault(require("lodash/trimStart"));
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
function ngRouterPath(packageName, subPath) {
    const url = this.assetsUrl(packageName, subPath);
    return trimStart_1.default(url_1.default.parse(url).pathname, '/');
}
exports.ngRouterPath = ngRouterPath;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9hcGktc2hhcmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsc0RBQXNCO0FBQ3RCLHlFQUF5QztBQUV6Qzs7Ozs7Ozs7Ozs7R0FXRztBQUNILFNBQWdCLFlBQVksQ0FBQyxXQUFtQixFQUFFLE9BQWdCO0lBQ2pFLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ2pELE9BQU8sbUJBQVMsQ0FBQyxhQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUNoRCxDQUFDO0FBSEQsb0NBR0MiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvYXBpLXNoYXJlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFVybCBmcm9tICd1cmwnO1xuaW1wb3J0IHRyaW1TdGFydCBmcm9tICdsb2Rhc2gvdHJpbVN0YXJ0JztcblxuLyoqQGZ1bmN0aW9uIG5nUm91dGVyUGF0aFxuICogQG1lbWJlck9mIF9fYXBpXG4gKiBlLmcuXG4gKiBBc3N1bWUgYXBwbGljYXRpb24gaXMgZGVwbG95ZWQgb24gJ2h0dHA6Ly9mb29iYXIuY29tL2Jhc2UtaHJlZicgYXMgXCJkZXBsb3lVcmxcIiBpbiBhbmd1bGFyLmpzb24uXG4gKiBDdXJyZW50IGZlYXR1cmUgcGFja2FnZSBpcyBgQGJrL2ZlYXR1cmUtYWAsIGl0cyBgbmdSb3V0ZVBhdGhgIGlzIGJ5IGRlZmF1bHQgJ2ZlYXR1cmUtYScsXG4gKiBmZWF0dXJlIHBhY2thZ2UgYEBiay9mZWF0dXJlLWJgJ3MgYG5nUm91dGVQYXRoYCBpcyBieSBkZWZhdWx0ICdmZWF0dXJlLWInXG4gKiAgYGBgdHNcbiAqIF9fYXBpLm5nUm91dGVyUGF0aCgnYWN0aW9uJykgIC8vIFwiL2Jhc2UtaHJlZi9mZWF0dXJlLWEvYWN0aW9uXCJcbiAqIF9fYXBpLm5nUm91dGVyUGF0aCgnQGJrL2ZlYXR1cmUtYicsICdhY3Rpb24nKSAgIC8vIFwiL2Jhc2UtaHJlZi9mZWF0dXJlLWIvYWN0aW9uXCJcbiAqIGBgYFxuICogQHJldHVybiB0aGUgY29uZmlndXJlZCBBbmd1bGFyIHJvdXRlciBwYXRoIGZvciBzcGVjaWZpYyAoY3VycmVudCkgZmVhdHVyZSBwYWNrYWdlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBuZ1JvdXRlclBhdGgocGFja2FnZU5hbWU6IHN0cmluZywgc3ViUGF0aD86IHN0cmluZykge1xuXHRjb25zdCB1cmwgPSB0aGlzLmFzc2V0c1VybChwYWNrYWdlTmFtZSwgc3ViUGF0aCk7XG5cdHJldHVybiB0cmltU3RhcnQoVXJsLnBhcnNlKHVybCkucGF0aG5hbWUsICcvJyk7XG59XG4iXX0=
