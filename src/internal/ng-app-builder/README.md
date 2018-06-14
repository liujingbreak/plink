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

## How to use as Angular command line builder
Modify file `angular.json`

Change `projects.<name>.architect<command>.builder` to e.g. `@dr-core/ng-app-builder:dev-server`


## Purpose
- Encapuslate build logic into a centralized node package, so that can be shared between difference projects, and can be upgraded by npm tool. 

- Also avoid being changed from project to project which eventually will lead to too fragmented to share resuable components. So all projects can always share same best-practise build script.

- Expand webpack config file to support 3rd-party webpack features that angular cli does not provide.

- Enable Angular 5 project to be built with legacy AngularJS project (which is compiled by different webpack loaders and plugins)
