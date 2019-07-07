/// <reference types="webpack-dev-server" />
import webpack, { compilation } from 'webpack';
import { AngularCliParam } from './common';
export interface BuilderContextOptions {
    inlineChunks: string[];
}
export declare class BuilderContext {
    inlineAssets: Map<string, string | null>;
    options: BuilderContextOptions;
    _setCompilation: (value: compilation.Compilation) => void;
    constructor(opt?: BuilderContextOptions);
    configWebpack(param: AngularCliParam, webpackConfig: webpack.Configuration, drcpConfigSetting: {
        devMode: boolean;
    }): void;
    transformIndexHtml(content: string): Promise<string>;
}
