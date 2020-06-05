/// <reference types="webpack-dev-server" />
import * as webpack from 'webpack';
import { BuilderContext } from './ng/builder-context';
import { AngularCliParam } from './ng/common';
export default function changeWebpackConfig(context: BuilderContext, param: AngularCliParam, webpackConfig: webpack.Configuration, drcpConfigSetting: {
    devMode: boolean;
}): Promise<webpack.Configuration>;
export declare function transformIndexHtml(context: BuilderContext, content: string): Promise<string>;
