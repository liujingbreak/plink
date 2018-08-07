import { BuildEvent, BuilderConfiguration } from '@angular-devkit/architect';
import { DevServerBuilderOptions } from '@angular-devkit/build-angular';
import { NormalizedBrowserBuilderSchema } from '@angular-devkit/build-angular/src/browser';
import { BuildWebpackServerSchema } from '@angular-devkit/build-angular/src/server/schema';
import ReadHookHost from '../utils/read-hook-vfshost';
import * as Rx from 'rxjs';
export declare type buildWebpackConfigFunc = (browserOptions: AngularBuilderOptions) => any;
export interface AngularCliParam {
    builderConfig?: BuilderConfiguration<DevServerBuilderOptions>;
    browserOptions: AngularBuilderOptions;
    ssr: boolean;
    webpackConfig: any;
    projectRoot: string;
    vfsHost: ReadHookHost;
    argv: any;
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
export declare function startDrcpServer(projectRoot: string, builderConfig: BuilderConfiguration<DevServerBuilderOptions>, browserOptions: AngularBuilderOptions, buildWebpackConfig: buildWebpackConfigFunc, vfsHost: ReadHookHost): Rx.Observable<BuildEvent>;
/**
 * Invoke this function from browser builder
 * @param projectRoot
 * @param browserOptions
 * @param buildWebpackConfig
 * @param vfsHost
 */
export declare function compile(projectRoot: string, browserOptions: AngularBuilderOptions, buildWebpackConfig: buildWebpackConfigFunc, vfsHost: ReadHookHost, isSSR?: boolean): Rx.Observable<{}>;
