import ts from 'typescript';
export declare function changeTsConfigFile(entryFile: string): {
    tsconfigJson: {
        compilerOptions: {
            rootDir?: string | undefined;
            baseUrl?: string | undefined;
            paths: {
                [k: string]: string[];
            };
            preserveSymlinks?: boolean | undefined;
        };
        include?: string[] | undefined;
    } & import("node_modules/fork-ts-checker-webpack-plugin/lib/typescript-reporter/TypeScriptConfigurationOverwrite").TypeScriptConfigurationOverwrite;
    compilerOptions: ts.CompilerOptions;
};
