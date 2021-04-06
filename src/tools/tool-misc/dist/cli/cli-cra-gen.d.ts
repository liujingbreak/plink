export declare function genPackage(path: string, compName: string, featureName: string, outputPath?: string, dryrun?: boolean): Promise<void>;
export declare function genComponents(dir: string, compNames: string[], connectedToSlice: string | undefined, dryrun?: boolean): Promise<void>;
export declare function genSlice(dir: string, targetNames: string[], opt: {
    dryRun?: boolean;
    comp: boolean;
}): Promise<void>;
