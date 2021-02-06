/// <reference types="node" />
import { EventEmitter } from 'events';
import Inject from 'require-injector';
import * as assetsUrl from '../../dist/assets-url';
import { PackageInfo } from './package-info-gathering';
import PackageInstance from '../packageNodeInstance';
import { Logger } from 'log4js';
declare class NodeApi implements assetsUrl.PackageApi, assetsUrl.ExtendedApi {
    packageName: string;
    packageInstance: PackageInstance;
    packageShortName: string;
    eventBus: EventEmitter;
    config: import("..").DrcpConfig;
    argv: any;
    packageInfo: PackageInfo;
    default: NodeApi;
    logger: Logger;
    browserInjector: Inject;
    findPackageByFile: (file: string) => PackageInstance | undefined;
    getNodeApiForPackage: (pkInstance: PackageInstance) => NodeApi;
    assetsUrl: typeof assetsUrl.assetsUrl;
    serverUrl: typeof assetsUrl.serverUrl;
    /** @deprecated */
    entryPageUrl: typeof assetsUrl.entryPageUrl;
    get contextPath(): any;
    constructor(packageName: string, packageInstance: PackageInstance);
    isBrowser(): boolean;
    isNode(): boolean;
    addBrowserSideConfig(path: string, value: any): void;
    /**
       * @param {string} url
       * @param {string} sourceFile
       * @return {string} | {packageName: string, path: string, isTilde: boolean, isPage: boolean}, returns string if it is a relative path, or object if
       * it is in format of /^(?:assets:\/\/|~|page(?:-([^:]+))?:\/\/)((?:@[^\/]+\/)?[^\/]+)?\/(.*)$/
       */
    normalizeAssetsUrl(url: string, sourceFile: string): string | {
        packageName: string;
        path: string;
        isTilde: boolean;
        isPage: boolean;
        locale: string;
    };
    /**
       * join contextPath
       * @param {string} path
       * @return {[type]} [description]
       */
    joinContextPath(path: string): string;
    _contextPath(packageName?: string): any;
    parsePackageName(packageName: string): {
        name: string;
        scope: string;
    };
    isDefaultLocale(): boolean;
    getBuildLocale(): any;
}
export default NodeApi;
