
import {Injector, PLATFORM_ID} from '@angular/core';
import { isPlatformServer as isServer } from '@angular/common';

let appInjectorRef: Injector;
/*
 * Return a global availabe Angular injector, so that you don't have to wait for contructor function injection.
 * You can only manipulate this injector after AppComponent is created.
 * 
 * And someone needs to store injector by:
```ts
export class AppComponent {
	// title = api.packageName;
	constructor(private injector: Injector) {
		if (appInjector() == null) {
		appInjector(this.injector);
		}
	}
}
```
 */
export function appInjector(injector?: Injector): Injector {
  if (injector) {
    appInjectorRef = injector;
  }

  return appInjectorRef;
}

export function isPlatformServer() {
  return isServer(appInjectorRef.get(PLATFORM_ID));
}
