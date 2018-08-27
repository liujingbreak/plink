/* tslint:disable:class-name */

declare module '__api' {
  import {DrcpApi} from '@dr-core/ng-app-builder/globals';
  export * from '@dr-core/ng-app-builder/globals';
  export {ServerRunnerEvent} from 'dr-comp-package/wfh/dist/package-runner';
	var api: DrcpApi;
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
declare type RawSourceMap = any;
// declare function require(name: string): any;
declare interface require {
	ensure(names: string[]): any;
}
declare function drTranslate(key: string): string;
// Workaround @angular-devkit issue
// /Users/liujing/bk/my-app/node_modules/@angular-devkit/build-angular/src/browser/schema.d.ts(52,21): error TS2304: Cannot find name 'FileReplacements'.
// /Users/liujing/bk/my-app/node_modules/@angular-devkit/build-angular/src/server/schema.d.ts(75,21): error TS2304: Cannot find name 'FileReplacements'.
// declare interface FileReplacements {
// 	src: string;
// 	replaceWith: string;
// }

interface DeprecatedFileReplacment {
  /**
   * The file that should be replaced.
   */
  src: string;

  /**
   * The file that should replace.
   */
  replaceWith: string;
}

interface CurrentFileReplacement {
  /**
   * The file that should be replaced.
   */
  replace: string;

  /**
   * The file that should replace.
   */
  with: string;
}

declare type FileReplacements = DeprecatedFileReplacment | CurrentFileReplacement;
