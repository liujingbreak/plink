import { BuildEvent, BuilderConfiguration } from '@angular-devkit/architect';
import { NormalizedBrowserBuilderSchema } from '@angular-devkit/build-angular/src/browser/schema';
import { NormalizedServerBuilderServerSchema } from '@angular-devkit/build-angular/src/server/schema';
import { NormalizedKarmaBuilderSchema } from '@angular-devkit/build-angular/src/karma/schema';
import { DevServerBuilderOptions } from '@angular-devkit/build-angular';
import * as Rx from 'rxjs';
import api from '__api';
export declare type DrcpConfig = typeof api.config;
export declare type buildWebpackConfigFunc = (browserOptions: AngularBuilderOptions) => any;
export interface AngularCliParam {
    builderConfig?: BuilderConfiguration<DevServerBuilderOptions>;
    browserOptions: AngularBuilderOptions;
    ssr: boolean;
    webpackConfig: any;
    projectRoot: string;
    argv: any;
}
export declare type NormalizedAngularBuildSchema = NormalizedBrowserBuilderSchema | NormalizedServerBuilderServerSchema | NormalizedKarmaBuilderSchema;
export declare type AngularBuilderOptions = NormalizedBrowserBuilderSchema & NormalizedServerBuilderServerSchema & NormalizedKarmaBuilderSchema & DrcpBuilderOptions;
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
export declare function compile(projectRoot: string, builderConfig: NormalizedAngularBuildSchema, buildWebpackConfig: buildWebpackConfigFunc, isSSR?: boolean): Rx.Observable<{}>;
