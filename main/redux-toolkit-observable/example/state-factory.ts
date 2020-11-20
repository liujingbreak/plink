// tslint:disable:no-console
import {StateFactory, ofPayloadAction} from '@wfh/redux-toolkit-observable/redux-toolkit-observable';
import {tap, map, distinctUntilChanged, filter} from 'rxjs/operators';
import {environment as env} from '@bk/env/environment';
import {Injector} from '@angular/core';
import get from 'lodash/get';
import {enableES5, enableMapSet} from 'immer';
import {SnowplowService} from '@bk/module-snowplow/snowplow.service';

enableES5();
enableMapSet();

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

const errorSub = stateFactory.getErrorStore().pipe(
  map(s => s.actionError), distinctUntilChanged(), filter<Error>(ae => ae != null),
  tap(actionError => {
    const ij = getModuleInjector();
    if (ij == null)
      return;
    const snowplow = ij.get(SnowplowService);
    snowplow.trackError(actionError);
  })
).subscribe();

export {ofPayloadAction};

export function setModuleInject(_injector: Injector) {
  injector = _injector;
}

export function getModuleInjector() {
  return injector;
}

if (module.hot) {
  module.hot.dispose(data => {
    data.stateFactory = stateFactory;
    data.injector = injector;
    errorSub.unsubscribe();
    sub.unsubscribe();
  });
}
