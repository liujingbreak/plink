import ts from 'typescript';
import { ReactorComposite2, SingleActionFactory } from '@wfh/reactivizer';
export interface PackageTsDirs {
    /** srcDir works like "rootDir" in tsconfig compilerOptions */
    srcDir: string;
    destDir: string;
    isomDir?: string;
    /** For plink command tsc, "isomDir" will be ignored if "include" is set in package.json */
    include?: string[] | string;
    files?: string[] | string;
    pkgDir: string;
}
export type TsconfigType = {
    extends?: string;
    include?: string[];
    exclude?: string[];
    compilerOptions: {
        paths: Record<string, string[]>;
        [prop: string]: any;
    };
};
interface TscServiceInput {
    setbaseTsConfig(json: TsconfigType, baseDirOfTsconfigFile: string): SingleActionFactory;
    /** stop this watcher by `tscService.o.ft.stopWatch().(contextActionMeta)`, contextActionMeta can be
     * the action meta of startWatch or any action that startWatch is related to */
    startWatch(opts: ts.WatchFileKind, rootFiles: string[]): SingleActionFactory;
    /** must provide actionMeta when being dispatched */
    stopWatch(): SingleActionFactory;
    addSourceFile(files: string[]): SingleActionFactory;
}
interface TscServiceOutput {
    onCompilerOptionsParsed(parsedCmdLine: ts.ParsedCommandLine): SingleActionFactory;
    onDiagnostic(formated: string, d: ts.Diagnostic): SingleActionFactory;
    onCompilerCompleted(formated: string, d: ts.Diagnostic): SingleActionFactory;
    onWriteFile(file: string, content: string): SingleActionFactory;
}
export declare const tscService: ReactorComposite2<TscServiceInput, TscServiceOutput, readonly ["setbaseTsConfig"], []>;
export {};
