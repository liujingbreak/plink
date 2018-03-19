/* tslint:disable:no-console */

import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from '../environments/environment';
import '__api';
if (environment.production) {
	enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule)
.catch(err => console.log(err));

let hot = (module as any).hot;
if (hot) {
	hot.accept();
}
