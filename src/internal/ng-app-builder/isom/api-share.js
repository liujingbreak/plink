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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLXNoYXJlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBpLXNoYXJlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLDhDQUFzQjtBQUN0QixpRUFBeUM7QUFJekMsU0FBZ0Isa0JBQWtCLENBQUMsWUFBcUI7SUFDdEQ7Ozs7Ozs7Ozs7O09BV0c7SUFDSCxPQUFPLFNBQVMsWUFBWSxDQUE4QixXQUFtQixFQUFFLE9BQWdCO1FBQzdGLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2pELE1BQU0sT0FBTyxHQUFHLGFBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxJQUFJLEVBQUUsQ0FBQztRQUM5QyxJQUFJLFlBQVksRUFBRTtZQUNoQixZQUFZLEdBQUcsYUFBRyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxRQUFRLElBQUksRUFBRSxDQUFDO1lBQ3RELElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQ3ZDLE9BQU8sbUJBQVMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQzthQUMzRDtTQUNGO1FBQ0QsT0FBTyxtQkFBUyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNqQyxDQUFDLENBQUM7QUFDSixDQUFDO0FBeEJELGdEQXdCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBVcmwgZnJvbSAndXJsJztcbmltcG9ydCB0cmltU3RhcnQgZnJvbSAnbG9kYXNoL3RyaW1TdGFydCc7XG5pbXBvcnQge0V4dGVuZGVkQXBpfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L2Fzc2V0cy11cmwnO1xuaW1wb3J0IE5vZGVBcGkgZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9wYWNrYWdlLW1nci9ub2RlLXBhY2thZ2UtYXBpJztcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZU5nUm91dGVyUGF0aChiYXNlSHJlZlBhdGg/OiBzdHJpbmcpIHtcbiAgLyoqQGZ1bmN0aW9uIG5nUm91dGVyUGF0aFxuICAgKiBAbWVtYmVyT2YgX19hcGlcbiAgICogZS5nLlxuICAgKiBBc3N1bWUgYXBwbGljYXRpb24gaXMgZGVwbG95ZWQgb24gJ2h0dHA6Ly9mb29iYXIuY29tL2Jhc2UtaHJlZicgYXMgXCJkZXBsb3lVcmxcIiBpbiBhbmd1bGFyLmpzb24uXG4gICAqIEN1cnJlbnQgZmVhdHVyZSBwYWNrYWdlIGlzIGBAYmsvZmVhdHVyZS1hYCwgaXRzIGBuZ1JvdXRlUGF0aGAgaXMgYnkgZGVmYXVsdCAnZmVhdHVyZS1hJyxcbiAgICogZmVhdHVyZSBwYWNrYWdlIGBAYmsvZmVhdHVyZS1iYCdzIGBuZ1JvdXRlUGF0aGAgaXMgYnkgZGVmYXVsdCAnZmVhdHVyZS1iJ1xuICAgKiAgYGBgdHNcbiAgICogX19hcGkubmdSb3V0ZXJQYXRoKCdhY3Rpb24nKSAgLy8gXCIvYmFzZS1ocmVmL2ZlYXR1cmUtYS9hY3Rpb25cIlxuICAgKiBfX2FwaS5uZ1JvdXRlclBhdGgoJ0Biay9mZWF0dXJlLWInLCAnYWN0aW9uJykgICAvLyBcIi9iYXNlLWhyZWYvZmVhdHVyZS1iL2FjdGlvblwiXG4gICAqIGBgYFxuICAgKiBAcmV0dXJuIHRoZSBjb25maWd1cmVkIEFuZ3VsYXIgcm91dGVyIHBhdGggZm9yIHNwZWNpZmljIChjdXJyZW50KSBmZWF0dXJlIHBhY2thZ2VcbiAgICovXG4gIHJldHVybiBmdW5jdGlvbiBuZ1JvdXRlclBhdGgodGhpczogRXh0ZW5kZWRBcGkgJiBOb2RlQXBpLCBwYWNrYWdlTmFtZTogc3RyaW5nLCBzdWJQYXRoPzogc3RyaW5nKSB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5hc3NldHNVcmwocGFja2FnZU5hbWUsIHN1YlBhdGgpO1xuICAgIGNvbnN0IGN1cnJVcmwgPSBVcmwucGFyc2UodXJsKS5wYXRobmFtZSB8fCAnJztcbiAgICBpZiAoYmFzZUhyZWZQYXRoKSB7XG4gICAgICBiYXNlSHJlZlBhdGggPSBVcmwucGFyc2UoYmFzZUhyZWZQYXRoKS5wYXRobmFtZSB8fCAnJztcbiAgICAgIGlmIChjdXJyVXJsLmluZGV4T2YoYmFzZUhyZWZQYXRoKSA9PT0gMCkge1xuICAgICAgICByZXR1cm4gdHJpbVN0YXJ0KGN1cnJVcmwuc2xpY2UoYmFzZUhyZWZQYXRoLmxlbmd0aCksICcvJyk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cmltU3RhcnQoY3VyclVybCwgJy8nKTtcbiAgfTtcbn1cbiJdfQ==