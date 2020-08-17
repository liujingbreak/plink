/// <reference types="node" />
import EventEmitter from 'events';
import Inject from 'require-injector';
import * as assetsUrl from '../../dist/assets-url';
import { PackageInfo, packageInstance as PackageInstance } from '../build-util/ts';
declare class NodeApi implements assetsUrl.PackageApi {
    packageName: string;
    packageInstance: PackageInstance;
    packageShortName: string;
    contextPath: string;
    buildUtils: any;
    packageUtils: any;
    compileNodePath: any[];
    eventBus: EventEmitter;
    config: import("..").DrcpConfig;
    argv: any;
    packageInfo: PackageInfo;
    default: NodeApi;
    browserInjector: Inject;
    findPackageByFile: (file: string) => PackageInstance | undefined;
    getNodeApiForPackage: (pkInstance: any, NodeApi: any) => any;
    constructor(packageName: string, packageInstance: PackageInstance);
    isBrowser(): boolean;
    isNode(): boolean;
    addBrowserSideConfig(path: string, value: any): void;
    getProjectDirs(): undefined;
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
    parsePackageName(packageName: string): any;
    isDefaultLocale(): boolean;
    getBuildLocale(): any;
}
export = NodeApi;