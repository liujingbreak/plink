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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9pc29tL2FwaS1zaGFyZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxzREFBc0I7QUFDdEIseUVBQXlDO0FBRXpDOzs7Ozs7Ozs7OztHQVdHO0FBQ0gsU0FBZ0IsWUFBWSxDQUFDLFdBQW1CLEVBQUUsT0FBZ0I7SUFDakUsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDakQsT0FBTyxtQkFBUyxDQUFDLGFBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQ2hELENBQUM7QUFIRCxvQ0FHQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvaXNvbS9hcGktc2hhcmUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgVXJsIGZyb20gJ3VybCc7XG5pbXBvcnQgdHJpbVN0YXJ0IGZyb20gJ2xvZGFzaC90cmltU3RhcnQnO1xuXG4vKipAZnVuY3Rpb24gbmdSb3V0ZXJQYXRoXG4gKiBAbWVtYmVyT2YgX19hcGlcbiAqIGUuZy5cbiAqIEFzc3VtZSBhcHBsaWNhdGlvbiBpcyBkZXBsb3llZCBvbiAnaHR0cDovL2Zvb2Jhci5jb20vYmFzZS1ocmVmJyBhcyBcImRlcGxveVVybFwiIGluIGFuZ3VsYXIuanNvbi5cbiAqIEN1cnJlbnQgZmVhdHVyZSBwYWNrYWdlIGlzIGBAYmsvZmVhdHVyZS1hYCwgaXRzIGBuZ1JvdXRlUGF0aGAgaXMgYnkgZGVmYXVsdCAnZmVhdHVyZS1hJyxcbiAqIGZlYXR1cmUgcGFja2FnZSBgQGJrL2ZlYXR1cmUtYmAncyBgbmdSb3V0ZVBhdGhgIGlzIGJ5IGRlZmF1bHQgJ2ZlYXR1cmUtYidcbiAqICBgYGB0c1xuICogX19hcGkubmdSb3V0ZXJQYXRoKCdhY3Rpb24nKSAgLy8gXCIvYmFzZS1ocmVmL2ZlYXR1cmUtYS9hY3Rpb25cIlxuICogX19hcGkubmdSb3V0ZXJQYXRoKCdAYmsvZmVhdHVyZS1iJywgJ2FjdGlvbicpICAgLy8gXCIvYmFzZS1ocmVmL2ZlYXR1cmUtYi9hY3Rpb25cIlxuICogYGBgXG4gKiBAcmV0dXJuIHRoZSBjb25maWd1cmVkIEFuZ3VsYXIgcm91dGVyIHBhdGggZm9yIHNwZWNpZmljIChjdXJyZW50KSBmZWF0dXJlIHBhY2thZ2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5nUm91dGVyUGF0aChwYWNrYWdlTmFtZTogc3RyaW5nLCBzdWJQYXRoPzogc3RyaW5nKSB7XG5cdGNvbnN0IHVybCA9IHRoaXMuYXNzZXRzVXJsKHBhY2thZ2VOYW1lLCBzdWJQYXRoKTtcblx0cmV0dXJuIHRyaW1TdGFydChVcmwucGFyc2UodXJsKS5wYXRobmFtZSwgJy8nKTtcbn1cbiJdfQ==
