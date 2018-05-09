/* tslint:disable:class-name */

declare var __api: any;

declare module '__api' {
	import NodePackage from 'dr-comp-package/wfh/dist/packageNodeInstance';
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

// Workaround @angular-devkit issue
// /Users/liujing/bk/my-app/node_modules/@angular-devkit/build-angular/src/browser/schema.d.ts(52,21): error TS2304: Cannot find name 'FileReplacements'.
// /Users/liujing/bk/my-app/node_modules/@angular-devkit/build-angular/src/server/schema.d.ts(75,21): error TS2304: Cannot find name 'FileReplacements'.
// declare interface FileReplacements {
// 	src: string;
// 	replaceWith: string;
// }

interface DeprecatedFileReplacment {
  /**
   * The file that should be replaced.
   */
  src: string;

  /**
   * The file that should replace.
   */
  replaceWith: string;
}

interface CurrentFileReplacement {
  /**
   * The file that should be replaced.
   */
  replace: string;

  /**
   * The file that should replace.
   */
  with: string;
}

declare type FileReplacements = DeprecatedFileReplacment | CurrentFileReplacement;
