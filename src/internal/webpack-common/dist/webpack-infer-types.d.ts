import { Configuration } from 'webpack';
export declare type OptimizationOptions = NonNullable<Configuration['optimization']>;
export declare type OptimizationSplitChunksOptions = Exclude<OptimizationOptions['splitChunks'], false | undefined>;
export declare type OptimizationSplitChunksOptionsCacheGroupValue = NonNullable<OptimizationSplitChunksOptions['cacheGroups']> extends {
    [index: string]: infer T;
} ? Exclude<T, string | false | Function | RegExp> : unknown;
