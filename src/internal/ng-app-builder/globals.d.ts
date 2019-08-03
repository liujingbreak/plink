/* tslint:disable class-name*/
// import {DrcpApi} from '__api';
import NodePackage from 'dr-comp-package/wfh/dist/packageNodeInstance';
import PackageBrowserInstance from 'dr-comp-package/wfh/dist/build-util/ts/package-instance';
import { EventEmitter } from 'events';
import {Webpack2BuilderApi} from '@dr-core/webpack2-builder/main';
import {PackageInfo} from 'dr-comp-package/wfh/dist/build-util/ts';
import {DrcpConfig} from 'dr-comp-package/wfh/dist/config-handler';
import {RequireInjector} from 'require-injector';

interface _DrcpNgApi {
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
interface _DrcpApi {
	packageName: string;
	packageShortName: string;
	packageInstance: NodePackage & PackageBrowserInstance;
	entryPage: string;
	/** 
	 * Node route path for current package, used in browser side.
	 * The path is exactly where `api.router()` hosts.
	 * Default value is the package short name, but it can be changed in
	 * config.yaml property `packageContextPathMapping`
	 */
	contextPath: string;
	buildUtils: any;
	packageUtils: any;
	compileNodePath: any[];
	eventBus: EventEmitter;
	packageInfo: PackageInfo;
	config: DrcpConfig;
	argv: any;
	browserInjector: RequireInjector;
	findPackageByFile(path: string): PackageBrowserInstance | undefined;
	getNodeApiForPackage<T extends _DrcpApi>(pk: {longName: string}): T;
	extend(target: any): void;
	isBrowser(): boolean;
	isNode(): boolean;
	parsePackageName(packageName: string): {scope: string, name: string};
	getBuildLocale(): string;
	isDefaultLocale(): boolean;
	assetsUrl(packageName: string, path?: string): string;
	entryPageUrl(packageName: string, path?: string, locale?: string): string;
	/**
	 * Only available in Node Server side, meaning you have to use `__api.serverUrl(...)`
	 * in client side JS/TS code.
	 */
	serverUrl(this: DrcpApi, packageNameOrPath: string, path?: string): string;
	getProjectDirs(): string[];
	addBrowserSideConfig(name: string, value: any): void;
	[key: string]: any;
}
export type DrcpApi = _DrcpApi & Webpack2BuilderApi & _DrcpNgApi;

import ExpressAppApi from '@dr-core/express-app/dist/api-types';
declare global {
	export var __api: DrcpApi & ExpressAppApi;
}
