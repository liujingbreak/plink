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
export declare function ngRouterPath(packageName: string, subPath?: string): string;
