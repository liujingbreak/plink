import { BuilderContext } from '@angular-devkit/architect';
import { DevServerBuilderOptions } from '@angular-devkit/build-angular';
import { Schema as BrowserBuilderSchema } from '@angular-devkit/build-angular/src/browser/schema';
import { Schema as ServerBuilderOptions } from '@angular-devkit/build-angular/src/server/schema';
import { DrcpConfig } from 'dr-comp-package/wfh/dist/config-handler';
import { AngularBuilderOptions } from './common';
/**
 * For build (ng build)
 * @param config
 * @param browserOptions
 */
export declare function changeAngularCliOptionsForBuild(config: DrcpConfig, browserOptions: BrowserBuilderSchema | ServerBuilderOptions, context: BuilderContext): Promise<AngularBuilderOptions>;
/**
 * For dev server (ng serve)
 * @param config
 * @param context
 * @param builderConfig
 */
export declare function changeAngularCliOptions(config: DrcpConfig, context: BuilderContext, builderConfig: DevServerBuilderOptions): Promise<AngularBuilderOptions>;
