import './node-inject';
import { BuildEvent, BuilderConfiguration } from '@angular-devkit/architect';
import { Observable } from 'rxjs';
import { DevServerBuilder, DevServerBuilderOptions } from '@angular-devkit/build-angular';
export default class DrcpDevServer extends DevServerBuilder {
    run(builderConfig: BuilderConfiguration<DevServerBuilderOptions>): Observable<BuildEvent>;
}
