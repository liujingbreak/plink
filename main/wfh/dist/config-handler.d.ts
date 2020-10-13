import { GlobalOptions as CliOptions } from './cmd/types';
export interface BaseDrcpSetting {
    port: number | string;
    publicPath: string;
    /** @deprecated use package-mgr/index#getProjectList() instead */
    projectList: undefined;
    localIP: string;
    devMode: boolean;
    destDir: string;
    staticDir: string;
    recipeFolder?: string;
    rootPath: string;
    logStat: boolean;
    packageScopes: string[];
    installedRecipes: string[];
    wfhSrcPath: string;
}
export interface DrcpSettings extends BaseDrcpSetting {
    [prop: string]: any;
}
export interface DrcpConfig {
    done: Promise<DrcpSettings>;
    configHandlerMgr(): ConfigHandlerMgr;
    get<K extends keyof BaseDrcpSetting>(path: K, defaultValue?: BaseDrcpSetting[K]): BaseDrcpSetting[K];
    get(path: string | string[], defaultValue?: any): any;
    set<K extends keyof BaseDrcpSetting>(path: K, value: BaseDrcpSetting[K] | any): void;
    set(path: string | string[], value: any): void;
    /**
     * Resolve a path based on `rootPath`
     * @name resolve
     * @memberof config
     * @param  {string} property name or property path, like "name", "name.childProp[1]"
     * @return {string}     absolute path
     */
    resolve(dir: 'rootPath' | 'destDir' | 'staticDir' | 'serverDir', ...path: string[]): string;
    resolve(...path: string[]): string;
    (): DrcpSettings;
    load(): Promise<DrcpSettings>;
    reload(): Promise<DrcpSettings>;
    loadSync(): DrcpSettings;
    init(argv: CliOptions): Promise<DrcpSettings>;
    initSync(argv: CliOptions): DrcpSettings;
    wfhSrcPath(): string | false;
    setDefault(propPath: string, value: any): DrcpSettings;
}
export interface ConfigHandler {
    /**
       *
       * @param configSetting Override properties from dist/config.yaml, which is also you get from `api.config()`
       * @param drcpCliArgv Override command line argumemnt for DRCP
       */
    onConfig(configSetting: {
        [prop: string]: any;
    }, drcpCliArgv?: {
        [prop: string]: any;
    }): Promise<void> | void;
}
export declare class ConfigHandlerMgr {
    private static _tsNodeRegistered;
    private static initConfigHandlers;
    protected configHandlers: Array<{
        file: string;
        handler: ConfigHandler;
    }>;
    constructor(files: string[]);
    /**
       *
       * @param func parameters: (filePath, last returned result, handler function),
       * returns the changed result, keep the last result, if resturns undefined
       * @returns last result
       */
    runEach<H>(func: (file: string, lastResult: any, handler: H) => Promise<any> | any): Promise<any>;
    runEachSync<H>(func: (file: string, lastResult: any, handler: H) => Promise<any> | any): any;
}
export interface CompilerOptionSetOpt {
    /** Will add typeRoots property for specific workspace */
    workspaceDir?: string;
    enableTypeRoots: boolean;
    /** Default false, Do not include linked package symlinks directory in path*/
    noSymlinks?: boolean;
    extraNodePath?: string[];
    extraTypeRoot?: string[];
}
export interface CompilerOptions {
    baseUrl: string;
    typeRoots: string[];
    paths: {
        [path: string]: string[];
    };
    [key: string]: any;
}
/**
 * Set "baseUrl", "paths" and "typeRoots" property based on Root path, process.cwd()
 * and process.env.NODE_PATHS
 * @param cwd project directory where tsconfig file is (virtual), "typeRoots" is relative to this parameter
 * @param baseUrl compiler option "baseUrl", "paths" will be relative to this paremter
 * @param assigneeOptions
 */
export declare function setTsCompilerOptForNodePath(cwd: string, baseUrl: string | undefined, assigneeOptions: CompilerOptions, opts?: CompilerOptionSetOpt): CompilerOptions;
