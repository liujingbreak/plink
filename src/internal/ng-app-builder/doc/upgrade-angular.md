# How to update Angular cli's schemas

### Command line schema
simply copy angular-cli/packages/angular_devkit/build_angular/src/browser/schema.json to `ng-schemas/browser-builder-schema.json`.
Add following properties to `"properties":{}`

```json
    "drcpArgs": {
      "type": "object",
      "description": "Argument object for DRCP server start command",
      "default": {}
    },
    "drcpConfig": {
      "type": "string",
      "description": "--drcp-config <config-1.yaml>,<config-2.yaml>,...",
      "default": ""
    },
```
Do the same for dev-server-schemar.json and server-schemar.json

### Update version and reinstall dependencies
update version from ng-app-builder/package.json


```json
"peerDependencies": {
    "@angular-devkit/core": "7.0.3",
    "@angular-devkit/schematics": "7.0.3",
    "@ngtools/webpack": "7.0.3",
    "webpack": "4.19.1",
    "@angular-devkit/build-angular": "0.10.3",
    "@angular/cli": "7.0.3",
    "@angular/compiler-cli": "7.0.1",
    "@angular/language-service": "7.0.1",
    "@nguniversal/express-engine": "7.0.2",
    "@angularclass/hmr": "^2.1.3",
    "@angular/platform-server": "^7.0.1",
    "@nguniversal/module-map-ngfactory-loader": "^7.0.2",
    "@angular/platform-browser": "^7.0.1",
    "@angular/platform-browser-dynamic": "^7.0.1"
  },
```
> Beware `"webpack": "4.19.1"` Webpack version should be the same as angular-cli webpack dependency version (angular-cli/packages/angular_devkit/build_angular/package.json), not latest one.

Update ts/server.ts `checkAngularVersion()`.

Update Angular and Angular cli dependency (including devDependencies) versions in project workspace's package.json

run `drcp init` to install new dependencies, ignore console warnings.

### Builder class
#### Extend @angular-devkit/build-angular#BrowserBuilder.
()
In src/internal/ng-app-builder/ts/ng/browser-builder.ts

Only override `run(...)`, wrapper `this.buildWebpackConfig()` in `drcpCommon.compile()`'s callback
```ts
import * as drcpCommon from './common';
...ts

concatMap(() => {
  return drcpCommon.compile(builderConfig.root, builderConfig,
    () => this.buildWebpackConfig(root, projectRoot, host,
        options as NormalizedBrowserBuilderSchema));
  }),
concatMap((webpackConfig) => {
...
```

for calling private function `_deleteOutputDir()` of super class.
```ts
  (this as any)._deleteOutputDir(...)
```
#### Extend @angular-devkit/build-angular#DevServerBuilder
(packages/angular_devkit/build_angular/src/dev-server/index.ts)
In src/internal/ng-app-builder/ts/ng/dev-server.ts

```ts
import './node-inject'; // Must be first line
import * as drcpCommon from './common';
```
Override `run(...)`, wrapper whole block from `this.buildWebpackConfig(...)` to `return webpackDevServerBuilder.runWebpackDevServer` inside `drcpCommon.startDrcpServer(...)`'s callback
like
```ts
drcpCommon.startDrcpServer(builderConfig.root, builderConfig, browserOptions as drcpCommon.AngularBuilderOptions,
  () => {
    const webpackConfig = this.buildWebpackConfig(root, projectRoot, host, browserOptions);
    ....
    return webpackDevServerBuilder.runWebpackDevServer(
						webpackConfig, undefined, getBrowserLoggingCb(browserOptions.verbose),
					);
  });
```
replace all private methods invocation with code like `(this as any)._getBrowserOptions`

comment out `webpackDevServerConfig` and `new WebpackDevServerBuilder(...)`, since we have our own HTTP server.

comment out 
```ts
if (options.liveReload) {
  this._addLiveReload(options, browserOptions, webpackConfig, clientAddress);
} else if (options.hmr) {
  this.context.logger.warn('Live reload is disabled. HMR option ignored.');
}
```
comment out
```ts
return webpackDevServerBuilder.runWebpackDevServer(
						webpackConfig, undefined, getBrowserLoggingCb(browserOptions.verbose),
					);
```
replace with `return webpackConfig;`

comment out `webpackConfig.devServer = browserOptions.deployUrl`  this will break Webapck's configure file validation

#### Extend @angular-devkit/build-angular#ServerBuilder
Same as how we did to `@angular-devkit/build-angular#BrowserBuilder`


