import { BuilderContext } from '@angular-devkit/architect';
import { DevServerBuilderOptions } from '@angular-devkit/build-angular';
import { Schema as BrowserBuilderSchema } from '@angular-devkit/build-angular/src/browser/schema';
import { ConfigHandler, DrcpConfig } from 'dr-comp-package/wfh/dist/config-handler';
import { AngularBuilderOptions } from './common';
export interface AngularConfigHandler extends ConfigHandler {
    /**
       * You may override angular.json in this function
       * @param options Angular angular.json properties under path <project>.architect.<command>.options
       * @param builderConfig Angular angular.json properties under path <project>
       */
    angularJson(options: AngularBuilderOptions, builderConfig?: DevServerBuilderOptions): Promise<void> | void;
}
/**
 * For build (ng build)
 * @param config
 * @param browserOptions
 */
export declare function changeAngularCliOptionsForBuild(config: DrcpConfig, browserOptions: BrowserBuilderSchema): Promise<AngularBuilderOptions>;
/**
 * For dev server (ng serve)
 * @param config
 * @param context
 * @param builderConfig
 */
export declare function changeAngularCliOptions(config: DrcpConfig, context: BuilderContext, builderConfig?: DevServerBuilderOptions): Promise<AngularBuilderOptions>;
