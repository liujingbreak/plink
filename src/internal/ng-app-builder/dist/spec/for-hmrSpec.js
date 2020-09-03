"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const for_hmr_1 = require("../ng/for-hmr");
describe('for-hmr', () => {
    it('createMainFileForHmr() should work', () => {
        const mainHmr = for_hmr_1._createMainHmrFile(`
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
        // tslint:disable-next-line: no-console
        console.log(mainHmr);
    });
});

//# sourceMappingURL=for-hmrSpec.js.map
