// tslint:disable:no-console
import {StateFactory, ofPayloadAction} from './redux-toolkit-observable';
import {tap} from 'rxjs/operators';
import {environment as env} from '@bk/env/environment';
import {Injector} from '@angular/core';
import get from 'lodash/get';

export const stateFactory = module.hot && module.hot.data && module.hot.data.stateFactory ? module.hot.data.stateFactory as StateFactory:
  new StateFactory({});

export let injector: Injector = get(module, 'hot.data.injector');

let sub: ReturnType<typeof stateFactory.log$['subscribe']>;
if (env.devFriendly) {
  sub = stateFactory.log$.pipe(
    tap(params => {
      if (params[0] === 'state')
        console.log('[redux:state]', ...params.slice(1));
      else if (params[0] === 'action')
        console.log('[redux:action]', ...params.slice(1));
      else
        console.log(...params);
    })
  ).subscribe();
}

export {ofPayloadAction};

export function setModuleInject(_injector: Injector) {
  console.log('setModuleInject()');
  injector = _injector;
}

export function getModuleInjector() {
  return injector;
}

if (module.hot) {
  module.hot.dispose(data => {
    data.stateFactory = stateFactory;
    data.injector = injector;
    sub.unsubscribe();
  });
}
