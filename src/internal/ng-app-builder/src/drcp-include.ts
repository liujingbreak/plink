/**
 * This file's content will be dynamically replaced by the content generated by ../ts/ng-ts-replace.ts
 * during compilation time
 */
// import { NgModuleRef } from '@angular/core';
// import {appInjector} from './app-utils';

export default function handleBootStrap(module: any, bootstrap: ()=> Promise<any>) {
  document.addEventListener('DOMContentLoaded', () => {
    // Wait for Server side rendering state element being loaded on HTML.
    /* replace */bootstrap();
    (window as any).__DOMContentLoaded = true;
  });
  if ((window as any).__DOMContentLoaded) {
    // When hot module replacement triggere this file being executed,
    // we don't need to wait for DOMContentLoaded event anymore.
    /* replace */bootstrap();
  }

  // function bootstrapAndSetInjector() {
  // 	return bootstrap().then(moduleRef => {
  // 		appInjector(moduleRef.injector);
  // 		return moduleRef;
  // 	});
  // }
}
