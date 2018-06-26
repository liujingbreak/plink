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
	deployUrlPath: string; // the "path" part for webpack output.publicPath (angular.json's deployUrl)
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
