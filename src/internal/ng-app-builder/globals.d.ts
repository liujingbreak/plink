/* tslint:disable class-name*/
// import {DrcpApi} from '__api';
import NodePackage from 'dr-comp-package/wfh/dist/packageNodeInstance';
import PackageBrowserInstance from '@dr-core/build-util/dist/package-instance';
import { EventEmitter } from 'events';
import {ExpressAppApi} from '@dr-core/express-app';
import {Webpack2BuilderApi} from '@dr-core/webpack2-builder/main';

export interface DrcpConfig {
	get(path: string|string[], defaultValue?: any): any;
	set(path: string|string[], value: any): void;
	resolve(...path: string[]): string;
	(): {[property: string]: any};
}

interface PackageInfo {
	allModules: PackageBrowserInstance[];
	moduleMap: {[name: string]: PackageBrowserInstance};
}
interface _DrcpNgApi {
	webpackConfig: any;
	ngEntryComponent: PackageBrowserInstance;
	deployUrl: string;

	/**
	 * @memberOf __api
	 * Assume application is deployed on 'http://foobar.com/base-href' as "deployUrl" in angular.json,
	 * the value is `base-href`
	 */
	ngBaseRouterPath: string;
	/**@function ngRouterPath
	 * @memberOf __api
	 * e.g.
	 * Assume application is deployed on 'http://foobar.com/base-href' as "deployUrl" in angular.json.
	 * Current feature package is `@bk/feature-a`, its `ngRouterPath` is by default 'feature-a',
	 * feature package `@bk/feature-b`'s `ngRouterPath` is by default 'feature-b'
	 ```ts
	 __api.ngRouterPath('')  // "base-href/feature-a"
	 __api.ngRouterPath('action')   // "base-href/feature-a/action"
	 __api.ngRouterPath('@bk/feature-b', 'action')   // "base-href/feature-b/action"
	 __api.ngRouterPath('@bk/main-app', '')    // "base-href"
	 ```
	 * @return the configured Angular router path for specific (current) feature package
	 */
	ngRouterPath(this: DrcpApi, packageNameOrSubPath: string, subPath?: string): string;
}
interface _DrcpApi {
	packageName: string;
	packageShortName: string;
	packageInstance: NodePackage & PackageBrowserInstance;
	entryPage: string;
	contextPath: string;
	buildUtils: any;
	packageUtils: any;
	compileNodePath: any[];
	eventBus: EventEmitter;
	packageInfo: PackageInfo;
	config: DrcpConfig;
	argv: any;
	browserInjector: any;
	ngEntryComponent: PackageBrowserInstance;
	findPackageByFile(path: string): PackageBrowserInstance;
	getNodeApiForPackage<T extends _DrcpApi>(pk: {longName: string}): T;
	extend(target: any): void;
	isBrowser(): boolean;
	isNode(): boolean;
	parsePackageName(packageName: string): {scope: string, name: string};
	getBuildLocale(): string;
	isDefaultLocale(): boolean;
	assetsUrl(packageName: string, path?: string): string;
	entryPageUrl(packageName: string, path?: string, locale?: string): string;
	getProjectDirs(): string[];
	addBrowserSideConfig(name: string, value: any): void;
	[key: string]: any;
}
export type DrcpApi = _DrcpApi & ExpressAppApi & Webpack2BuilderApi & _DrcpNgApi;

declare global {
	export var __api: DrcpApi;
}
