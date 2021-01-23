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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9yLWhtclNwZWMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJmb3ItaG1yU3BlYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLDJDQUFpRDtBQUVqRCxRQUFRLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRTtJQUN2QixFQUFFLENBQUMsb0NBQW9DLEVBQUUsR0FBRyxFQUFFO1FBQzVDLE1BQU0sT0FBTyxHQUFHLDRCQUFrQixDQUFDOzs7Ozs7Ozs7Ozs7O0tBYWxDLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDbkIsdUNBQXVDO1FBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDdkIsQ0FBQyxDQUFDLENBQUM7QUFFTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7X2NyZWF0ZU1haW5IbXJGaWxlfSBmcm9tICcuLi9uZy9mb3ItaG1yJztcblxuZGVzY3JpYmUoJ2Zvci1obXInLCAoKSA9PiB7XG4gIGl0KCdjcmVhdGVNYWluRmlsZUZvckhtcigpIHNob3VsZCB3b3JrJywgKCkgPT4ge1xuICAgIGNvbnN0IG1haW5IbXIgPSBfY3JlYXRlTWFpbkhtckZpbGUoYFxuICAgIC8qIHRzbGludDpkaXNhYmxlOm5vLWNvbnNvbGUgKi9cbiAgICBpbXBvcnQgeyBlbmFibGVQcm9kTW9kZSB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuICAgIGltcG9ydCB7IHBsYXRmb3JtQnJvd3NlckR5bmFtaWMgfSBmcm9tICdAYW5ndWxhci9wbGF0Zm9ybS1icm93c2VyLWR5bmFtaWMnO1xuICAgIGltcG9ydCB7IEFwcE1vZHVsZSB9IGZyb20gJy4vYXBwL2FwcC5tb2R1bGUnO1xuICAgIGltcG9ydCB7IGVudmlyb25tZW50IH0gZnJvbSAnQGJrL2Vudi9lbnZpcm9ubWVudCc7XG4gICAgaWYgKGVudmlyb25tZW50LnByb2R1Y3Rpb24pIHtcbiAgICAgIGVuYWJsZVByb2RNb2RlKCk7XG4gICAgfVxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCAoKSA9PiB7XG4gICAgICBwbGF0Zm9ybUJyb3dzZXJEeW5hbWljKCkuYm9vdHN0cmFwTW9kdWxlKEFwcE1vZHVsZSlcbiAgICAgIC5jYXRjaChlcnIgPT4gY29uc29sZS5sb2coZXJyKSk7XG4gICAgfSk7XG4gICAgYCwgJ3Rlc3QgbWFpbi50cycpO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKG1haW5IbXIpO1xuICB9KTtcblxufSk7XG4iXX0=