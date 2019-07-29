# Angular App builder

> Problematic **Angular + symlink**
Angular command line has problems when source code comes from symlink directory.
- `--no-preserve-symlinks` or set `preserveSymlinks: false` in angular.json will leads to some symlink source code
directory being ignored by Webpack watch mode. (Probably due to [Webpack's watchpack](https://github.com/webpack/watchpack/issues/61) bug)

## Develope Angular 7 command line builder
To be supported by `ng <command>` command:
1. `builders` property in package.json
2. schema.json
3. default export of Builder class
4. options change
    | Option name | Default value
    | - | -
    | hmr | true
    | port | 14333
    | aot | true

## Purpose
- Encapuslate build logic into a centralized node package, so that can be shared between difference projects, and can be upgraded by npm tool. 

- Also avoid being changed from project to project which eventually will lead to too fragmented to share resuable components. So all projects can always share same best-practise build script.

- Expand webpack config file to support 3rd-party webpack features that angular cli does not provide.
  - Support using lodash template in index.html
  - Dynamic change Angular cli configuration by Typescript
  - Allow more Webpack customized configuration
  - Inline `runtime` chunk into index.html

- ~~Enable Angular 6 project to be built with legacy AngularJS project (which is compiled by different webpack loaders and plugins)~~

## How to use as Angular command line builder
### 1. Make your application project as a DRCP workspace
- Add **dr-comp-package** to project dependency list in file package.json
- Run `drcp init` to install dependencies, this will call `npm install` internally.
- Modify **angular.json** file, change application project part:
    ```json
    "architect": {
        "build": {
          "builder": "@dr-core/ng-app-builder:browser",
          ...
        },
        "serve": {
          "builder": "@dr-core/ng-app-builder:dev-server",
          ...
        }
    }
    ```
- Modify **tsconfig.app.json**, **e2e/src/tsconfig.e2e.json** for `extends` property
```json
{
  "extends": "../../../dist/webpack-temp/angular-app-tsconfig.json",
  "compilerOptions": {
    "outDir": "../out-tsc/app",
    "module": "es2015",
    "target": "es5"
  }
}
```
- Modify **tsconfig.server.json** for `extends` property
```json
{
  "extends": "../../../dist/webpack-temp/angular-app-tsconfig.json",
  "compilerOptions": {
    "outDir": "../out-tsc/app",
    "module": "commonjs",
    "target": "ES5"
  },
  // Add "angularCompilerOptions" with the AppServerModule you wrote
  // set as the "entryModule".
  "angularCompilerOptions": {
    "entryModule": "app/app.server.module#AppServerModule"
  }
}
```

Remove properties: `path`, `include` and `exclude`.
`extends` property should be a proper location of file `<project root>/dist/webpack-temp/angular-app-tsconfig.json`

#### create a package.json file
if application arouce file structure is like `projects/<your-app>/src/main.ts`, create a package.json file at `projects/<your-app>/package.json`:
```json
{
  "name": ...,
  "version": ...,
  "dr": {
    "ngAppModule": true,
    "angularCompiler": true
  }
}

```

### 2. Configurable Angular AppModule
Insert(import) business modules into app.module.ts at build time, so that we can build project with difference set of modules.

Assume you work on 2 projects which shares a lot of the common logic as Angular modules, each has different set of business modules.

We can reuse the project folder and same files like "polyfill.ts", "main.ts", "app/app.module.ts" ...

Create first config yaml file, assume it is named `project-prod.config.yaml`.
```yaml
@dr-core/ng-app-builder:
  redirectToRoute: /main
  ngPackage:
    - @dr/foobar1
    - @dr/foobar2

```

Create 2nd config file, `project-demo.config.yaml`
```yaml
@dr-core/ng-app-builder:
  redirectToRoute: /demo
  ngPackage:
    - @dr/demo
  deployUrl: '/' # This property overrides "deployUrl" from angular.json
  outputPath: 'dist/static/....' # Overrides "outputPath" from angular.json
```

We support customized ng command argument `--drcp-config` for `ng serve/build`
```shell
ng build --drcp-config project-prod.yaml
```

Change **app.module.ts**

```ts
const appRoutes: Routes = [
  {
    path: '**',
    redirectTo: __api.config.get('redirectToRoute')
  }
];

@NgModule({
  declarations: [AppComponent],
  imports: [
    // ...,
    RouterModule.forRoot(appRoutes, { enableTracing: false })
  ],
  providers: [{ provide: ErrorHandler, useValue: new SnowplowErrorHandler() }],
  bootstrap: [AppComponent]
})
export class AppModule {}

```

### 3. Do not hard-code Angular Router path

Defined module route path in the **package.json** file of your module package

```json
{
  "name": "@hellow/foo-bar",
  "dr": {
    "ngRouterPath": "foobar",
    "angularCompiler": true
  }
}
```

Use `__api.ngRouterPath(...)` to define route path

```ts
const agreementRoutes: Routes = [
  {
    path: __api.ngRouterPath(':id'),
    component: AgreementComponent
  }
];
@NgModule({
  imports: [CommonModule, RouterModule.forChild(agreementRoutes)],
  declarations: [AgreementComponent]
})
export class FooBarModule {}
```

`__api.ngRouterPath(...)` will be compiled to `my-app/foobar/:id` if `deployUrl` is `/my-app`

#### Navigate to other feature module's route address

Use:

```html
<a routerLink="~@hellow/foo-bar" routerLinkActive="active">Index</a>
<a routerLink="~@hellow/foo-bar/112" routerLinkActive="active">Page 112</a>
```

When angular.json's `deployUrl` is '/', it will be compiled to

```html
<a routerLink="/foobar" routerLinkActive="active">Foobar</a>
<a routerLink="/foobar/112" routerLinkActive="active">Page 112</a>
```

When angular.json's `deployUrl` is '/my-app', it will be compiled to

```html
<a routerLink="/my-app/foobar" routerLinkActive="active">Foobar</a>
<a routerLink="/my-app/foobar/112" routerLinkActive="active">Page 112</a>
```

### 4. Hack TS source code during compilation
In DRCP component package's package.json file:
```json
"dr": {
  "ngTsHandler": "dist/change-ng-ts#run"
}
```
Meaning you can add a file 'dist/change-ng-ts.js' in your package folder and export a function named `run()` which actually handles hacking each TS source file passed from Angular cli.\
e.g.
```ts
import {TsHandler, ReplacementInf} from '@dr-core/ng-app-builder';
import * as ts from 'typescript';

export let run: TsHandler = yourTsHacker;

function yourTsHacker(src: ts.SourceFile): ReplacementInf[] {
  // Where you return hacked source code
}

```

### Hack Angular command line
A sample configuration TS file.
`ng serve/build --drcp-config <conf-1.ts>,<conf-2.ts>...` 引入这个文件
```
import {AngularConfigHandler, AngularBuilderOptions, WepackConfigHandler, DrcpSetting as AppBuilderSetting} from '@dr-core/ng-app-builder';
import {ConfigHandler, InjectorConfigHandler, InjectorFactory} from 'dr-comp-package/wfh/dist';
import * as fs from 'fs';
import * as _ from 'lodash';
// import {Options as webpackOpt} from 'webpack';

const handler: AngularConfigHandler & ConfigHandler & InjectorConfigHandler & WepackConfigHandler = {

    onConfig(setting: {[prop: string]: any}, drcpCliArgv) {
        const ngBuilderConf: AppBuilderSetting = setting['@dr-core/ng-app-builder'];
        ngBuilderConf.ngPackage.push('@bk/console-home');
        ngBuilderConf.ngModule.push('@bk/fancy/fancy.module#FancyModule');
        ngBuilderConf.excludePackage = [
            /@bk\/module-(real-name|apply|helper)$/,
            '@bk/credit-console-conf',
            '@bk/cash-loan-all'
        ];
        if (fs.existsSync('node_modules/@bk/credit-risk')) {
            ngBuilderConf.excludePath.push(
                'node_modules/@bk/credit-risk/**/*',
                fs.realpathSync('node_modules/@bk/credit-risk') + '/**/*');
        }
        ngBuilderConf.buildOptimizerExclude.push('node_modules/mermaid');
        _.set(setting, '@bk/cash-loan-all.noCheckAuth', true);
        setting.redirectToRoute = '/console/console-home';
        _.set(setting, '@bk/module-core.footerLogoVisible', false);
    },

    angularJson(options: AngularBuilderOptions) {
        options.deployUrl = '/console/';
        options.outputPath = 'dist/static/console';
    },

    webpackConfig(original: any) {
    },

    setupNodeInjector(factory: InjectorFactory): void {
    },

    setupWebInjector(factory: InjectorFactory): void {
    }
};

export {handler as default};
```


### Known Issues
#### Problematic **Angular + symlink**
Angular command line has problems when source code comes from symlink directory.
- `--preserve-symlinks` or set `preserveSymlinks: true` in angular.json will leads to some symlink source code
directory being ignored by Webpack watch mode. (Probably due to [Webpack's watchpack](https://github.com/webpack/watchpack/issues/61) bug)
