import { CompilerOptions } from 'typescript';
interface Args {
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
export declare function tsc(argv: Args, onCompiled?: (emitted: EmitList) => void): Promise<[string, number][]>;
export {};
