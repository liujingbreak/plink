import { CompilerOptions } from 'typescript';
export interface TscCmdParam {
    package?: string[];
    project?: string[];
    watch?: boolean;
    sourceMap?: string;
    jsx?: boolean;
    ed?: boolean;
    compileOptions?: {
        [key in keyof CompilerOptions]?: any;
    };
}
declare type EmitList = Array<[string, number]>;
/**
 * @param {object} argv
 * argv.watch: boolean
 * argv.package: string[]
 * @param {function} onCompiled () => void
 * @return void
 */
export declare function tsc(argv: TscCmdParam, onCompiled?: (emitted: EmitList) => void): Promise<EmitList>;
export {};
