"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable:no-console */
// TODO: Move this file to a DRCP tool or being generated automatically
const drcp_include_1 = require("@dr-core/ng-app-builder/src/drcp-include");
const core_1 = require("@angular/core");
const platform_browser_dynamic_1 = require("@angular/platform-browser-dynamic");
const app_module_1 = require("./app/app.module");
const environment_1 = require("@bk/env/environment");
if (environment_1.environment.production) {
    core_1.enableProdMode();
}
// platformBrowserDynamic().bootstrapModule(AppModule)
//   .catch(err => console.log(err));
const bootstrap = () => platform_browser_dynamic_1.platformBrowserDynamic().bootstrapModule(app_module_1.AppModule);
drcp_include_1.default(module, () => bootstrap());

//# sourceMappingURL=main-test.js.map
