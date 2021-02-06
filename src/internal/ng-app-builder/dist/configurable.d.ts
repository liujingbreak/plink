/// <reference types="webpack-dev-server" />
import { ConfigHandler } from '@wfh/plink/wfh/dist/config-handler';
import * as webpack from 'webpack';
import { DevServerBuilderOptions } from '@angular-devkit/build-angular';
import { AngularBuilderOptions } from './ng/common';
export interface AngularConfigHandler extends ConfigHandler {
    /**
       * You may override angular.json in this function
       * @param options Angular angular.json properties under path <project>.architect.<command>.options
       * @param builderConfig Angular angular.json properties under path <project>
       */
    angularJson(options: AngularBuilderOptions, builderConfig?: DevServerBuilderOptions): Promise<void> | void;
}
export interface WepackConfigHandler {
    /** @returns webpack configuration or Promise */
    webpackConfig(originalConfig: webpack.Configuration): Promise<webpack.Configuration> | webpack.Configuration | void;
}
