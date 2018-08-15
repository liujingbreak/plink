# Angular App builder

## Develope Angular 6 command line builder
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

- Enable Angular 5 project to be built with legacy AngularJS project (which is compiled by different webpack loaders and plugins)

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
- Modify **tsconfig.app.json**, **e2e/src/tsconfig.e2e.json**
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
Remove properties: `path`, `include` and `exclude`.
`extends` property should be a proper location of file `<project root>/dist/webpack-temp/angular-app-tsconfig.json`

### 2. Configurable Angular AppModule
Insert(import) business modules into app.module.ts at build time, so that we can build project with difference set of modules.

Assume you work on 2 projects which shares a lot of the common logic as Angular modules, each has different set of business modules.

We can reuse the project folder and same files like "polyfill.ts", "main.ts", "app/app.module.ts" ...

Create first config yaml file, assume it is named `project-prod.config.yaml`.
```yaml
@dr-core/ng-app-builder:
  ngPackage:
    - @dr/foobar1
    - @dr/foobar2
```

Create 2nd config file, `project-demo.config.yaml`
```yaml
@dr-core/ng-app-builder:
  ngPackage:
    - @dr/demo
  deployUrl: '/' # This property overrides "deployUrl" from angular.json
```

We support customized ng command argument `--drcp-config` for `ng serve/build`
```shell
ng build --drcp-config project-prod.yaml
```

