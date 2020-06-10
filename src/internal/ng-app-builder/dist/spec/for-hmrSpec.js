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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9zcGVjL2Zvci1obXJTcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsMkNBQWlEO0FBRWpELFFBQVEsQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFO0lBQ3ZCLEVBQUUsQ0FBQyxvQ0FBb0MsRUFBRSxHQUFHLEVBQUU7UUFDNUMsTUFBTSxPQUFPLEdBQUcsNEJBQWtCLENBQUM7Ozs7Ozs7Ozs7Ozs7S0FhbEMsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUNuQix1Q0FBdUM7UUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN2QixDQUFDLENBQUMsQ0FBQztBQUVMLENBQUMsQ0FBQyxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L3NwZWMvZm9yLWhtclNwZWMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge19jcmVhdGVNYWluSG1yRmlsZX0gZnJvbSAnLi4vbmcvZm9yLWhtcic7XG5cbmRlc2NyaWJlKCdmb3ItaG1yJywgKCkgPT4ge1xuICBpdCgnY3JlYXRlTWFpbkZpbGVGb3JIbXIoKSBzaG91bGQgd29yaycsICgpID0+IHtcbiAgICBjb25zdCBtYWluSG1yID0gX2NyZWF0ZU1haW5IbXJGaWxlKGBcbiAgICAvKiB0c2xpbnQ6ZGlzYWJsZTpuby1jb25zb2xlICovXG4gICAgaW1wb3J0IHsgZW5hYmxlUHJvZE1vZGUgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbiAgICBpbXBvcnQgeyBwbGF0Zm9ybUJyb3dzZXJEeW5hbWljIH0gZnJvbSAnQGFuZ3VsYXIvcGxhdGZvcm0tYnJvd3Nlci1keW5hbWljJztcbiAgICBpbXBvcnQgeyBBcHBNb2R1bGUgfSBmcm9tICcuL2FwcC9hcHAubW9kdWxlJztcbiAgICBpbXBvcnQgeyBlbnZpcm9ubWVudCB9IGZyb20gJ0Biay9lbnYvZW52aXJvbm1lbnQnO1xuICAgIGlmIChlbnZpcm9ubWVudC5wcm9kdWN0aW9uKSB7XG4gICAgICBlbmFibGVQcm9kTW9kZSgpO1xuICAgIH1cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgKCkgPT4ge1xuICAgICAgcGxhdGZvcm1Ccm93c2VyRHluYW1pYygpLmJvb3RzdHJhcE1vZHVsZShBcHBNb2R1bGUpXG4gICAgICAuY2F0Y2goZXJyID0+IGNvbnNvbGUubG9nKGVycikpO1xuICAgIH0pO1xuICAgIGAsICd0ZXN0IG1haW4udHMnKTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhtYWluSG1yKTtcbiAgfSk7XG5cbn0pO1xuIl19
