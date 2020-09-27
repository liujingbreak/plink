import NodePackage from './dist/packageNodeInstance';
import PackageBrowserInstance from './dist/build-util/ts/package-instance';
import { EventEmitter } from 'events';
import {PackageInfo} from './dist/build-util/ts';
import {DrcpConfig} from './dist/config-handler';
import {RequireInjector} from './dist/require-injectors';

export interface DrcpApi {
	packageName: string;
	packageShortName: string;
	packageInstance: NodePackage & PackageBrowserInstance;
	entryPage: string;
	/** @Deprecated */
	packageUtils: never;
	/** 
	 * Node route path for current package, used in browser side.
	 * The path is exactly where `api.router()` hosts.
	 * Default value is the package short name, but it can be changed in
	 * config.yaml property `packageContextPathMapping`
	 */
	contextPath: string;
	buildUtils: any;
	compileNodePath: any[];
	eventBus: EventEmitter;
	packageInfo: PackageInfo;
	config: DrcpConfig;
	argv: any;
	browserInjector: RequireInjector;
	findPackageByFile(path: string): PackageBrowserInstance | undefined;
	getNodeApiForPackage<T extends DrcpApi>(pk: {longName: string}): T;
	extend(target: any): void;
	isBrowser(): boolean;
	isNode(): boolean;
	parsePackageName(packageName: string): {scope: string, name: string};
	getBuildLocale(): string;
	isDefaultLocale(): boolean;
	assetsUrl(packageName: string, path?: string): string;
	entryPageUrl(packageName: string, path?: string, locale?: string): string;
	/**
	 * @param {string} url
	 * @param {string} sourceFile
	 * @return {string} | {packageName: string, path: string, isTilde: boolean, isPage: boolean}, returns string if it is a relative path, or object if
	 * it is in format of /^(?:assets:\/\/|~|page(?:-([^:]+))?:\/\/)((?:@[^\/]+\/)?[^\/]+)?\/(.*)$/
	 */
	normalizeAssetsUrl(url: string, sourceFile: string): string | {packageName: string, path: string, isTilde: boolean, isPage: boolean};
	/**
	 * Only available in Node Server side, meaning you have to use `__api.serverUrl(...)`
	 * in client side JS/TS code.
	 */
	serverUrl(this: DrcpApi, packageNameOrPath: string, path?: string): string;
	getProjectDirs(): string[];
	addBrowserSideConfig(name: string, value: any): void;
}

