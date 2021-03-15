declare module '__api' {
  import {ExtensionContext} from '@wfh/plink/wfh/globals';
	const api: ExtensionContext;
	export {ExtensionContext, ExtensionContext as DrcpApi};
  export default api;
}

declare module '__plink' {
	export * from '__api';
  export {default} from '__api';
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

