import {_createMainHmrFile} from '../ng/for-hmr';

describe('for-hmr', () => {
  it('createMainFileForHmr() should work', () => {
    const mainHmr = _createMainHmrFile(`
    /* tslint:disable:no-console */
    import { enableProdMode } from '@angular/core';
    import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
    import { AppModule } from './app/app.module';
    import { environment } from '@bk/env/environment';
    if (environment.production) {
      enableProdMode();
    }
    document.addEventListener('DOMContentLoaded', () => {
      platformBrowserDynamic().bootstrapModule(AppModule)
      .catch(err => console.log(err));
    });
    `, 'test main.ts');
    // eslint-disable-next-line no-console
    console.log(mainHmr);
  });

});
