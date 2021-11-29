export declare const isWin32: boolean;
export declare function workDirChangedByCli(): {
    workdir: string | null;
    argv: string[];
};
export declare function forkFile(moduleName: string): Promise<void>;
