import './node-inject';
import { DevServerBuilder, DevServerBuilderOptions } from '@angular-devkit/build-angular';
import { BuildEvent, BuilderConfiguration } from '@angular-devkit/architect';
import { NormalizedBrowserBuilderSchema } from '@angular-devkit/build-angular/src/browser';
import * as Rx from 'rxjs';
export declare type buildWebpackConfigFunc = (browserOptions: NormalizedBrowserBuilderSchema) => any;
export default class DrcpDevServer extends DevServerBuilder {
    run(builderConfig: BuilderConfiguration<DevServerBuilderOptions>): Rx.Observable<BuildEvent>;
    private _getBrowserOptions1(options);
}
