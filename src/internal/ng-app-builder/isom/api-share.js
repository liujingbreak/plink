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
            if (currUrl.indexOf(baseHrefPath) === 0) {
                return trimStart_1.default(currUrl.slice(baseHrefPath.length), '/');
            }
        }
        return trimStart_1.default(currUrl, '/');
    };
}
exports.createNgRouterPath = createNgRouterPath;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9pc29tL2FwaS1zaGFyZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxzREFBc0I7QUFDdEIseUVBQXlDO0FBSXpDLFNBQWdCLGtCQUFrQixDQUFDLFlBQXFCO0lBQ3REOzs7Ozs7Ozs7OztPQVdHO0lBQ0gsT0FBTyxTQUFTLFlBQVksQ0FBQyxXQUFtQixFQUFFLE9BQWdCO1FBQ2hFLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2pELE1BQU0sT0FBTyxHQUFHLGFBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxJQUFJLEVBQUUsQ0FBQztRQUM5QyxJQUFJLFlBQVksRUFBRTtZQUNoQixJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUN2QyxPQUFPLG1CQUFTLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7YUFDM0Q7U0FDRjtRQUNELE9BQU8sbUJBQVMsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDakMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQXZCRCxnREF1QkMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2lzb20vYXBpLXNoYXJlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFVybCBmcm9tICd1cmwnO1xuaW1wb3J0IHRyaW1TdGFydCBmcm9tICdsb2Rhc2gvdHJpbVN0YXJ0JztcblxuXG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVOZ1JvdXRlclBhdGgoYmFzZUhyZWZQYXRoPzogc3RyaW5nKSB7XG4gIC8qKkBmdW5jdGlvbiBuZ1JvdXRlclBhdGhcbiAgICogQG1lbWJlck9mIF9fYXBpXG4gICAqIGUuZy5cbiAgICogQXNzdW1lIGFwcGxpY2F0aW9uIGlzIGRlcGxveWVkIG9uICdodHRwOi8vZm9vYmFyLmNvbS9iYXNlLWhyZWYnIGFzIFwiZGVwbG95VXJsXCIgaW4gYW5ndWxhci5qc29uLlxuICAgKiBDdXJyZW50IGZlYXR1cmUgcGFja2FnZSBpcyBgQGJrL2ZlYXR1cmUtYWAsIGl0cyBgbmdSb3V0ZVBhdGhgIGlzIGJ5IGRlZmF1bHQgJ2ZlYXR1cmUtYScsXG4gICAqIGZlYXR1cmUgcGFja2FnZSBgQGJrL2ZlYXR1cmUtYmAncyBgbmdSb3V0ZVBhdGhgIGlzIGJ5IGRlZmF1bHQgJ2ZlYXR1cmUtYidcbiAgICogIGBgYHRzXG4gICAqIF9fYXBpLm5nUm91dGVyUGF0aCgnYWN0aW9uJykgIC8vIFwiL2Jhc2UtaHJlZi9mZWF0dXJlLWEvYWN0aW9uXCJcbiAgICogX19hcGkubmdSb3V0ZXJQYXRoKCdAYmsvZmVhdHVyZS1iJywgJ2FjdGlvbicpICAgLy8gXCIvYmFzZS1ocmVmL2ZlYXR1cmUtYi9hY3Rpb25cIlxuICAgKiBgYGBcbiAgICogQHJldHVybiB0aGUgY29uZmlndXJlZCBBbmd1bGFyIHJvdXRlciBwYXRoIGZvciBzcGVjaWZpYyAoY3VycmVudCkgZmVhdHVyZSBwYWNrYWdlXG4gICAqL1xuICByZXR1cm4gZnVuY3Rpb24gbmdSb3V0ZXJQYXRoKHBhY2thZ2VOYW1lOiBzdHJpbmcsIHN1YlBhdGg/OiBzdHJpbmcpIHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmFzc2V0c1VybChwYWNrYWdlTmFtZSwgc3ViUGF0aCk7XG4gICAgY29uc3QgY3VyclVybCA9IFVybC5wYXJzZSh1cmwpLnBhdGhuYW1lIHx8ICcnO1xuICAgIGlmIChiYXNlSHJlZlBhdGgpIHtcbiAgICAgIGlmIChjdXJyVXJsLmluZGV4T2YoYmFzZUhyZWZQYXRoKSA9PT0gMCkge1xuICAgICAgICByZXR1cm4gdHJpbVN0YXJ0KGN1cnJVcmwuc2xpY2UoYmFzZUhyZWZQYXRoLmxlbmd0aCksICcvJyk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cmltU3RhcnQoY3VyclVybCwgJy8nKTtcbiAgfTtcbn1cbiJdfQ==
