/// <reference types="webpack-dev-server" />
import webpack, { compilation } from 'webpack';
import { AngularCliParam } from './common';
export declare class BuilderContext {
    compilation: Promise<compilation.Compilation>;
    _setCompilation: (value: compilation.Compilation) => void;
    constructor();
    configWebpack(param: AngularCliParam, webpackConfig: webpack.Configuration, drcpConfigSetting: {
        devMode: boolean;
    }): void;
    transformIndexHtml(content: string): Promise<string>;
}
