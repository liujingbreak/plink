interface Args {
    package: string[];
    project: string[];
    watch: boolean;
    sourceMap: string;
}
/**
 * @param {object} argv
 * argv.watch: boolean
 * argv.package: string[]
 * @param {function} onCompiled () => void
 * @return void
 */
export declare function tsc(argv: Args, onCompiled: () => void): Promise<void>;
export {};
