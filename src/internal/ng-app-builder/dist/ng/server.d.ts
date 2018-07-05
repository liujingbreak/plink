import './node-inject';
import { ServerBuilder as GoogleServerBuilder } from '@angular-devkit/build-angular';
import { BuildWebpackServerSchema } from '@angular-devkit/build-angular/src/server/schema';
import { BuildEvent, BuilderConfiguration } from '@angular-devkit/architect';
import { Observable } from 'rxjs';
export declare class ServerBuilder extends GoogleServerBuilder {
    run(builderConfig: BuilderConfiguration<BuildWebpackServerSchema>): Observable<BuildEvent>;
    private _deleteOutputDir0(root, outputPath, host);
}
export default ServerBuilder;
