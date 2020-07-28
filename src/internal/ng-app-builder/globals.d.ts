import {DrcpApi} from 'dr-comp-package/types/drcp-types/drcp-api';
export interface _DrcpNgApi extends DrcpApi {
	deployUrl: string;
	ssr: boolean;
	/**
	 * Only available during Angular cli build (before AOT and any Typescript compiliation begins),
	 * when you reference `__api.__file` in source file,
	 * it will be evaluated to current source code's file location (like Node.js __dirname)
	 */
	__dirname: string;
	/**
	 * @memberOf __api
	 * Given application is deployed on 'http://foobar.com/base-href/' as "deployUrl" in angular.json,
	 * the value is `base-href`
	 */
	ngBaseRouterPath: string;
	/**@function ngRouterPath
	 * @memberOf __api
	 * e.g.
	 * Given application is deployed on 'http://foobar.com/base-href/' as "deployUrl" in angular.json.
	 * Current feature package is `@bk/feature-a`, its `ngRouterPath` is by default 'feature-a',
	 * feature package `@bk/feature-b`'s `ngRouterPath` is by default 'feature-b'
	 * ```ts
	 * __api.ngRouterPath('')  // "base-href/feature-a"
	 * __api.ngRouterPath('action')   // "base-href/feature-a/action"
	 * __api.ngRouterPath('@bk/feature-b', 'action')   // "base-href/feature-b/action"
	 * __api.ngRouterPath('@bk/main-app', '')    // "base-href"
	 * ```
	 * @return the configured Angular router path for specific (current) feature package
	 */
	ngRouterPath(this: DrcpApi, packageNameOrSubPath: string, subPath?: string): string;
	/**
	 * Run Node.js like "require" keyword only during prerender/server side rendering(compilation),
	 * @param path 
	 * @return undefined If current compilation is not in prerender/SSR mode
	 */
	ssrRequire(path: string): any;

	/**
	 * Internal used
	 */
	browserApiConfig(): any;
}

