import { BehaviorSubject, Observable } from 'rxjs';
import { Draft } from '@reduxjs/toolkit';
import { GlobalOptions as CliOptions } from './cmd/types';
import { PlinkSettings } from './config/config-slice';
export { PlinkSettings };
export interface DrcpConfig {
    /**
     * Used to run command line option "-c" specified TS/JS files one by one
     */
    configHandlerMgr: BehaviorSubject<ConfigHandlerMgr | undefined>;
    /** lodash like get function, return specific setting property value
     * @return
     */
    get<K extends keyof PlinkSettings>(path: K, defaultValue?: PlinkSettings[K]): PlinkSettings[K];
    get(path: string | string[], defaultValue?: any): any;
    set<K extends keyof PlinkSettings>(path: K, value: PlinkSettings[K] | any): void;
    set(path: string | string[], value: any): void;
    change(reducer: (setting: Draft<PlinkSettings>) => void): void;
    /**
     * Resolve a path based on `rootPath`
     * @name resolve
     * @memberof config
     * @param {string} dir name or property path, like "name", "name.childProp[1]"
     * @return {string} absolute path
     */
    resolve(dir: 'rootPath' | 'destDir' | 'staticDir' | 'serverDir', ...path: string[]): string;
    resolve(...path: string[]): string;
    /** @return all settings in a big JSON object */
    (): PlinkSettings;
    reload(): PlinkSettings;
    initSync(argv: CliOptions): PlinkSettings;
    getStore(): Observable<PlinkSettings>;
    /**
     * ConfigHandlerMgr changes everytime Plink settings are initialized or reloaded.
     * ConfigHandlerMgr is used to run command line option "-c" specified TS/JS files one by one.
     *
     */
    configHandlerMgrChanged(cb: (handler: ConfigHandlerMgr) => void): void;
}
export interface ConfigHandler {
    /**
     * @param configSetting Override properties from dist/config.yaml, which is also you get from `api.config()`
     * @param cliOpt (deprecated) Override command line argumemnt for DRCP
     */
    onConfig(configSetting: PlinkSettings, cliOpt: CliOptions): void;
}
export declare class ConfigHandlerMgr {
    private static _tsNodeRegistered;
    private static initConfigHandlers;
    protected configHandlers: Array<{
        file: string;
        handler: ConfigHandler;
    }>;
    /**
     *
     * @param files Array of string which is in form of "<file>[#<export name>]"
     */
    constructor(fileAndExports0: Iterable<string> | Iterable<[file: string, exportName: string]>);
    /**
       *
       * @param func parameters: (filePath, last returned result, handler function),
       * returns the changed result, keep the last result, if resturns undefined
       * @returns last result
       */
    runEach<H>(func: (file: string, lastResult: any, handler: H) => Promise<any> | any, desc?: string): Promise<any>;
    runEachSync<H>(func: (file: string, lastResult: any, handler: H) => Promise<any> | any, desc?: string): any;
}
