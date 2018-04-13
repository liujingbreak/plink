/* tslint:disable:no-console */

import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from '../environments/environment';
import hmrBootstrap from './hmr';

if (environment.production) {
	enableProdMode();
}

const bootstrap = () => platformBrowserDynamic().bootstrapModule(AppModule);
// platformBrowserDynamic().bootstrapModule(AppModule)
// .catch(err => console.log(err));

// let hot = (module as any).hot;
// if (hot) {
// 	hot.accept();
// }

if (environment.hmr && (module as any).hot) {
	hmrBootstrap(module, bootstrap);
} else {
	console.log('HMR is not enabled for webpack-dev-server!');
	console.log('Are you using the --hmr flag for "node app watch" (or "drcp compile")?');
	bootstrap().catch(err => console.log(err));
}
