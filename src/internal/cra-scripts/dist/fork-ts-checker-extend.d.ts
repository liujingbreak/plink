/**
 * This file is not used actually. This is an attempt to patch Tsconfig file of fock-ts-checker-webpack-plugin 4.1.6.
 * The actual working solution is hack-fork-ts-checker.ts
 */
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
export declare class ForkTsCheckerExtend extends ForkTsCheckerWebpackPlugin {
    constructor(opts: ConstructorParameters<typeof ForkTsCheckerWebpackPlugin>[0]);
}
