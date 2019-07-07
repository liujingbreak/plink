/// <reference types="webpack-dev-server" />
import * as webpack from 'webpack';
import { BuilderContext } from './ng/builder-context';
import { AngularCliParam } from './ng/common';
export interface WepackConfigHandler {
    /** @returns webpack configuration or Promise */
    webpackConfig(originalConfig: webpack.Configuration): Promise<webpack.Configuration> | webpack.Configuration | void;
}
export default function changeWebpackConfig(context: BuilderContext, param: AngularCliParam, webpackConfig: webpack.Configuration, drcpConfigSetting: {
    devMode: boolean;
}): Promise<webpack.Configuration>;
export declare function transformIndexHtml(context: BuilderContext, content: string): Promise<string>;
