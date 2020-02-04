export interface DrcpConfig {
    done: Promise<void>;
    configHandlerMgr(): ConfigHandlerMgr;
    get(path: string | string[], defaultValue?: any): any;
    set(path: string | string[], value: any): void;
    resolve(dir: 'destDir' | 'staticDir', ...path: string[]): string;
    resolve(...path: string[]): string;
    (): {
        [property: string]: any;
    };
    load(): Promise<{
        [property: string]: any;
    }>;
    reload(): Promise<{
        [property: string]: any;
    }>;
    init(): Promise<{
        [property: string]: any;
    }>;
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
}
