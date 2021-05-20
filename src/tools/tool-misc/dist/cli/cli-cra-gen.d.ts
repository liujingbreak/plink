export declare function genPackage(path: string, compName: string, featureName: string, outputPath?: string, dryrun?: boolean): Promise<void>;
export declare function genComponents(dir: string, compNames: string[], opts: {
    connectedToSlice?: string;
    dryrun: boolean;
}): Promise<void>;
export declare function genSlice(dir: string, targetNames: string[], opt: {
    dryRun?: boolean;
    tiny: boolean;
    internal: boolean;
}): Promise<void>;
