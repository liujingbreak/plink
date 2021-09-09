/* eslint-disable no-console */
import { ofPayloadAction, StateFactory } from './redux-toolkit-observable';
import { enableES5, enableMapSet } from 'immer';
import { tap } from 'rxjs/operators';

enableES5();
enableMapSet();

export const stateFactory = module.hot && module.hot.data && module.hot.data.stateFactory ? module.hot.data.stateFactory as StateFactory:
  new StateFactory({});

let sub: ReturnType<typeof stateFactory.log$['subscribe']>;
if (process.env.NODE_ENV === 'development' || (process.env.REACT_APP_env && process.env.REACT_APP_env !== 'prod')) {
  sub = stateFactory.log$.pipe(
    tap(params => {
      if (params[0] === 'state')
        console.log('%c redux:state ', 'font-weight: bold; color: black; background: #44c2fd;', ...params.slice(1));
      else if (params[0] === 'action')
      console.log('%c redux:action ', 'font-weight: bold; color: white; background: #8c61ff;', ...params.slice(1));
      else
        console.log(...params);
    })
  ).subscribe();
}

export { ofPayloadAction };

if (module.hot) {
  module.hot.dispose(data => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    data.stateFactory = stateFactory;
    sub.unsubscribe();
  });
}
