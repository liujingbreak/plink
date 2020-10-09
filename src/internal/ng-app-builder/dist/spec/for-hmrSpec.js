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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpdWppbmcvYmsvZHItY29tcC1wYWNrYWdlL3NyYy9pbnRlcm5hbC9uZy1hcHAtYnVpbGRlci90cy9zcGVjL2Zvci1obXJTcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsMkNBQWlEO0FBRWpELFFBQVEsQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFO0lBQ3ZCLEVBQUUsQ0FBQyxvQ0FBb0MsRUFBRSxHQUFHLEVBQUU7UUFDNUMsTUFBTSxPQUFPLEdBQUcsNEJBQWtCLENBQUM7Ozs7Ozs7Ozs7Ozs7S0FhbEMsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUNuQix1Q0FBdUM7UUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN2QixDQUFDLENBQUMsQ0FBQztBQUVMLENBQUMsQ0FBQyxDQUFDIiwiZmlsZSI6ImRpc3Qvc3BlYy9mb3ItaG1yU3BlYy5qcyIsInNvdXJjZXNDb250ZW50IjpbbnVsbF19
