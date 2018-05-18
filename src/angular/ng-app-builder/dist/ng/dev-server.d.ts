import { DevServerBuilder, DevServerBuilderOptions as DevServerBuilderOptions0 } from '@angular-devkit/build-angular';
import { BuildEvent, BuilderConfiguration } from '@angular-devkit/architect';
import { NormalizedBrowserBuilderSchema } from '@angular-devkit/build-angular/src/browser';
import * as Rx from 'rxjs';
export declare type buildWebpackConfigFunc = (browserOptions: NormalizedBrowserBuilderSchema) => any;
export interface DevServerBuilderOptions extends DevServerBuilderOptions0 {
    drcpArgs: any;
}
export interface AngularCliParam {
    builderConfig: BuilderConfiguration<DevServerBuilderOptions>;
    buildWebpackConfig: buildWebpackConfigFunc;
    browserOptions: NormalizedBrowserBuilderSchema;
    argv: any;
}
export default class DrcpDevServer extends DevServerBuilder {
    run(builderConfig: BuilderConfiguration<DevServerBuilderOptions>): Rx.Observable<BuildEvent>;
    startDrcpServer(builderConfig: BuilderConfiguration<DevServerBuilderOptions>, browserOptions: NormalizedBrowserBuilderSchema, buildWebpackConfig: buildWebpackConfigFunc): Rx.Observable<BuildEvent>;
    private _getBrowserOptions1(options);
}
