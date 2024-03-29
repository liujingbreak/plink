/// <reference types="node" />
import { EventEmitter } from 'events';
import { Logger } from 'log4js';
import Inject from '../../../packages/require-injector';
import PackageInstance from '../packageNodeInstance';
import * as assetsUrl from '../share/assets-url';
import { PackageInfo } from './package-info-gathering';
declare class NodeApi implements assetsUrl.PackageApi, assetsUrl.ExtendedApi {
    packageName: string;
    packageInstance: PackageInstance;
    eventBus: EventEmitter | undefined;
    packageShortName: string;
    config: import("..").DrcpConfig;
    argv: any;
    packageInfo: PackageInfo | undefined;
    default: NodeApi | undefined;
    logger: Logger;
    browserInjector: Inject | undefined;
    findPackageByFile: (file: string) => PackageInstance | undefined;
    getNodeApiForPackage: ((pkInstance: PackageInstance) => NodeApi) | undefined;
    assetsUrl: typeof assetsUrl.assetsUrl;
    serverUrl: typeof assetsUrl.serverUrl;
    /** @deprecated */
    entryPageUrl: typeof assetsUrl.entryPageUrl;
    get contextPath(): string;
    constructor(packageName: string, packageInstance: PackageInstance);
    /**
     * return A log witch catgory name "<package name>.<nameAfterPackageName>"
     * @param nameAfterPackageName
     */
    getLogger(nameAfterPackageName: string): Logger;
    isBrowser(): boolean;
    isNode(): boolean;
    addBrowserSideConfig(path: string, value: any): void;
    /**
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
       */
    joinContextPath(path: string): string;
    _contextPath(packageName?: string): string;
    parsePackageName(packageName: string): {
        name: string;
        scope: string;
    };
    /** @deprecated */
    isDefaultLocale(): boolean;
    /** @deprecated */
    getBuildLocale(): any;
}
export default NodeApi;
