/* tslint:disable:class-name */
// type DrcpApi = any;
// import PackageBrowserInstance from '@dr-core/build-util/dist/package-instance';
// import { EventEmitter } from 'events';
// declare interface DrcpApi {
// 	findPackageByFile(path: string): PackageBrowserInstance;
// 	buildUtils: any;
// 	packageUtils: any;
// 	compileNodePath: any[];
// 	eventBus: EventEmitter;
// 	packageInfo: PackageInfo;
// 	config: any;
// 	argv: any;
// 	isBrowser(): boolean;
// 	isNode(): boolean;
// 	parsePackageName(packageName: string): {scope: string, name: string};
// 	getBuildLocale(): string;
// 	isDefaultLocale(): boolean;
// 	assetsUrl(packageName: string, path?: string): string;
// 	entryPageUrl(packageName: string, path?: string, locale?: string): string;
// }
// declare interface PackageInfo {
// 	allModules: PackageBrowserInstance[];
// 	moduleMap: {[name: string]: PackageBrowserInstance};
// }
declare var __api: any;

declare module '__api' {
	import PackageBrowserInstance from '@dr-core/build-util/dist/package-instance';
	import { EventEmitter } from 'events';
	import {ExpressAppApi} from '@dr-core/express-app';
	export interface DrcpConfig {
		get(path: string|string[], defaultValue?: any): any;
		set(path: string|string[], value: any): void;
		resolve(...path: string[]): string;
		(): {[property: string]: any}
	}
	interface _DrcpApi{
		findPackageByFile(path: string): PackageBrowserInstance;
		packageName: string;
		packageShortName: string;
		packageInstance: string;
		contextPath: string;
		buildUtils: any;
		packageUtils: any;
		compileNodePath: any[];
		eventBus: EventEmitter;
		packageInfo: PackageInfo;
		config: DrcpConfig;
		argv: any;
		browserInjector: any;
		extend(target: any): void;
		isBrowser(): boolean;
		isNode(): boolean;
		parsePackageName(packageName: string): {scope: string, name: string};
		getBuildLocale(): string;
		isDefaultLocale(): boolean;
		assetsUrl(packageName: string, path?: string): string;
		entryPageUrl(packageName: string, path?: string, locale?: string): string;

		addBrowserSideConfig(name: string, value: any): void;
		[key: string]: any;
	}
	export type DrcpApi = _DrcpApi & ExpressAppApi;

	interface PackageInfo {
		allModules: PackageBrowserInstance[];
		moduleMap: {[name: string]: PackageBrowserInstance};
	}
	var api: DrcpApi;
	export default api;
}
declare module '__injector';
declare module '__injectorFactory';

// declare function require(name: string): any;
declare interface require {
	ensure(names: string[]): any;
}
declare function drTranslate(key: string): string;
