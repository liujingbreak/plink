import NodePackage from './dist/packageNodeInstance';
import { EventEmitter } from 'events';
import {PackageInfo} from './dist/package-mgr/package-info-gathering';
import {DrcpConfig} from './dist/config-handler';
import {InjectorFactory} from './dist/require-injectors';
import {Logger} from 'log4js';
export interface DrcpApi {
	packageName: string;
	/** Only available in Node.js server side environment */
	logger: Logger;
	packageShortName: string;
	packageInstance: NodePackage;
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
	/** Deprecated */
	buildUtils: any;
	/** Deprecated */
	compileNodePath: any[];
	eventBus: EventEmitter;
	packageInfo: PackageInfo;
	config: DrcpConfig;
	/** Deprecated */
	argv: any;
	/** Availabe only if package-runner#initWebInjector() is executed */
	browserInjector: InjectorFactory;
	/** Deprecated */
	findPackageByFile(path: string): NodePackage | undefined;
	getNodeApiForPackage<T extends DrcpApi>(pk: {longName: string}): T;
	extend(target: any): void;
	isBrowser(): boolean;
	isNode(): boolean;
	parsePackageName(packageName: string): {scope: string, name: string};
	/** Deprecated */
	getBuildLocale(): string;
	/** Deprecated */
	isDefaultLocale(): boolean;
	/** Deprecated */
	assetsUrl(packageName: string, path?: string): string;
	/** Deprecated */
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
	/** Deprecated */
	getProjectDirs(): string[];

	addBrowserSideConfig(name: string, value: any): void;
}

