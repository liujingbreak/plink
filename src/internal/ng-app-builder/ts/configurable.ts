import { ConfigHandler } from 'dr-comp-package/wfh/dist/config-handler';
import * as webpack from 'webpack';
import { DevServerBuilderOptions } from '@angular-devkit/build-angular';
import {AngularBuilderOptions} from './ng/common';
export interface DrcpSetting {
  /**
   * Other than main.ts and polyfill.ts, you need to specify those lazy route module which are
   * not directly referenced in Typescript file, but in Angular's lazy route configrations, so that
   * Typescript compiler can have clue to involve them in compilation.
   * 
   * Glob pattern should be relative to repository directory and if it belongs to a DRCP
   * package and is symlink, then use symlink path like `node_modules/<package-name>/.../*.modules.ts`
   */
  tsconfigInclude: string[];
  /**
	 * Useful for third-party JS libarary.
	 * 
	 * Angular has a Webpack loader @angular-devkit/build-optimizer/webpack-loader
	 * to process all `/\.js$/` files. If you have to import/require any 3rd-party js file in your source
	 * code (instead of configure it in angular.json file as global library), this file will also be
	 * processed by Angular loader, which is unnecessary and might leads to 
	 * unexpect JS parsing error. In this case you may add this file path to this property.
	 * 
	 * 
	 * e.g.
	 * 'node_modules/mermaid'
	 */
  // buildOptimizerExclude: string[];
}


export interface AngularConfigHandler extends ConfigHandler {
  /**
	 * You may override angular.json in this function
	 * @param options Angular angular.json properties under path <project>.architect.<command>.options
	 * @param builderConfig Angular angular.json properties under path <project>
	 */
  angularJson(options: AngularBuilderOptions,
    builderConfig?: DevServerBuilderOptions)
  : Promise<void> | void;
}

export interface WepackConfigHandler {
  /** @returns webpack configuration or Promise */
  webpackConfig(originalConfig: webpack.Configuration):
    Promise<webpack.Configuration> | webpack.Configuration | void;
}
