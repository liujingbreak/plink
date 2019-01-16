import './node-inject';
import { BuildEvent, BuilderConfiguration } from '@angular-devkit/architect';
import { Observable } from 'rxjs';
import { BuildWebpackServerSchema } from '@angular-devkit/build-angular/src/server/schema';
import { ServerBuilder as GoogleServerBuilder } from '@angular-devkit/build-angular';
export default class ServerBuilder extends GoogleServerBuilder {
    run(builderConfig: BuilderConfiguration<BuildWebpackServerSchema>): Observable<BuildEvent>;
}
//# sourceMappingURL=server.d.ts.map