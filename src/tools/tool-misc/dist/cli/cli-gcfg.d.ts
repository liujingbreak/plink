import '@wfh/plink/wfh/dist/editor-helper';
export declare function generateConfig(file: string, opt: {
    dryRun: boolean;
    type: 'ts' | 'yaml' | 'json';
}): Promise<void>;
