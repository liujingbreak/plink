import ts from 'typescript';
export declare function changeTsConfigFile(entryFile: string): {
    tsconfigJson: any;
    compilerOptions: ts.CompilerOptions;
};
