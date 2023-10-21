import { Configuration } from 'webpack';
export type OptimizationOptions = NonNullable<Configuration['optimization']>;
export type OptimizationSplitChunksOptions = Exclude<OptimizationOptions['splitChunks'], false | undefined>;
export type OptimizationSplitChunksOptionsCacheGroupValue = NonNullable<OptimizationSplitChunksOptions['cacheGroups']> extends {
    [index: string]: infer T;
} ? Exclude<T, string | false | Function | RegExp> : unknown;
