// /* tslint:disable:no-console */
// import { enableProdMode } from '@angular/core';
// import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
// import { AppModule } from './app/app.module';
// import { environment } from './environments/environment';
// import hmrBootstrap from './hmr';
// import './drcp-include';
// if (environment.production) {
// 	enableProdMode();
// }

// // platformBrowserDynamic().bootstrapModule(AppModule)
// //   .catch(err => console.log(err));
// const bootstrap = () => platformBrowserDynamic().bootstrapModule(AppModule);

// if (environment.hmr && (module as any).hot) {
// 	hmrBootstrap(module, bootstrap);
// } else {
// 	console.log('HMR is not enabled for webpack-dev-server!');
// 	console.log('Check out environment.ts ?');
// 	bootstrap().catch(err => console.log(err));
// }
