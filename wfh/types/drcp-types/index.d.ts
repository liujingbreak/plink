/* tslint:disable:class-name */

declare module '__api' {
  import ExpressAppApi from '@dr-core/express-app/dist/api-types';
  import {DrcpApi} from '@dr-core/ng-app-builder/globals';
  export * from '@dr-core/ng-app-builder/globals';
  // export {ServerRunnerEvent} from 'dr-comp-package/wfh/dist/package-runner';
  var api: DrcpApi & ExpressAppApi;
  export default api;
}

interface ComponentInjector {
  addPackage(name: string, dir: string): void;
  fromComponent(name: string, dir: string): ComponentInjector;
  fromPackage(name: string, dir: string): ComponentInjector;
  fromAllPackages(): ComponentInjector;
  notFromPackages(): ComponentInjector;
  readInjectFile(): void;
}
declare module '__injectorFactory' {
  export let nodeInjector: ComponentInjector;
  export let webInjector: ComponentInjector;
}

declare module '__injector' {
  let a: ComponentInjector;
  export = a;
}
// declare type RawSourceMap = any;
// declare function require(name: string): any;
declare interface require {
  ensure(names: string[]): any;
}
declare function drTranslate(key: string): string;

declare module '*.html';
declare module '*.scss';
