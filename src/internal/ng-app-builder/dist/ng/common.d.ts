import { BuildEvent, BuilderConfiguration } from '@angular-devkit/architect';
import { DevServerBuilderOptions } from '@angular-devkit/build-angular';
import { NormalizedBrowserBuilderSchema } from '@angular-devkit/build-angular/src/browser';
import { BuildWebpackServerSchema } from '@angular-devkit/build-angular/src/server/schema';
import * as Rx from 'rxjs';
import api from '__api';
export declare type DrcpConfig = typeof api.config;
export interface AngularConfigHandler {
    angularJson(options: AngularBuilderOptions, drcpCfgObj: DrcpConfig): Promise<void> | void;
}
export declare type buildWebpackConfigFunc = (browserOptions: AngularBuilderOptions) => any;
export interface AngularCliParam {
    builderConfig?: BuilderConfiguration<DevServerBuilderOptions>;
    browserOptions: AngularBuilderOptions;
    ssr: boolean;
    webpackConfig: any;
    projectRoot: string;
    argv: any;
    configHandlers: Array<{
        file: string;
        handler: AngularConfigHandler;
    }>;
}
export declare type AngularBuilderOptions = NormalizedBrowserBuilderSchema & BuildWebpackServerSchema & DrcpBuilderOptions;
export interface DrcpBuilderOptions {
    drcpArgs: any;
    drcpConfig: string;
}
/**
 * Invoke this function from dev server builder
 * @param projectRoot
 * @param builderConfig
 * @param browserOptions
 * @param buildWebpackConfig
 * @param vfsHost
 */
export declare function startDrcpServer(projectRoot: string, builderConfig: BuilderConfiguration<DevServerBuilderOptions>, browserOptions: AngularBuilderOptions, buildWebpackConfig: buildWebpackConfigFunc): Rx.Observable<BuildEvent>;
/**
 * Invoke this function from browser builder
 * @param projectRoot
 * @param browserOptions
 * @param buildWebpackConfig
 * @param vfsHost
 */
export declare function compile(projectRoot: string, browserOptions: AngularBuilderOptions, buildWebpackConfig: buildWebpackConfigFunc, isSSR?: boolean): Rx.Observable<{}>;
