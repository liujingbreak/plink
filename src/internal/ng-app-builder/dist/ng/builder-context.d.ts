/// <reference types="webpack-dev-server" />
import webpack, { compilation } from 'webpack';
import { AngularCliParam } from './common';
export interface BuilderContextOptions {
    inlineChunks: string[];
}
export declare class BuilderContext {
    ngBuildOption: AngularCliParam;
    inlineAssets: Map<string, string | null>;
    options: BuilderContextOptions;
    webpackRunCount: number;
    _setCompilation: (value: compilation.Compilation) => void;
    constructor(ngBuildOption: AngularCliParam, opt?: BuilderContextOptions);
    configWebpack(webpackConfig: webpack.Configuration, drcpConfigSetting: {
        devMode: boolean;
    }): void;
    transformIndexHtml(content: string): Promise<string>;
}
