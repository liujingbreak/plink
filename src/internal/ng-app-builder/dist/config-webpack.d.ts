/// <reference types="webpack-dev-server" />
import * as webpack from 'webpack';
import { AngularCliParam } from './ng/common';
export interface WepackConfigHandler {
    /** @returns webpack configuration or Promise */
    webpackConfig(originalConfig: any): Promise<{
        [name: string]: any;
    } | void> | {
        [name: string]: any;
    } | void;
}
export default function changeWebpackConfig(param: AngularCliParam, webpackConfig: webpack.Configuration, drcpConfigSetting: {
    devMode: boolean;
}): Promise<webpack.Configuration>;
