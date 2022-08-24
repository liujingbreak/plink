/**
 * redux-observable like async reactive actions, side effect utilities
 * https://redux-observable.js.org/
 */

import {Observable, Subject} from 'rxjs';
import {filter, tap, share} from 'rxjs/operators';

type Plen<T> = (T extends (...a: infer A) => any ? A : [])['length'];

export type ActionTypes<AC> = {
  [K in keyof AC]: {
    type: K;
    payload: InferParam<AC[K]>;
  };
};


type InferParam<F> = Plen<F> extends 1 | 0 ?
  (F extends (a: infer A) => any ? A : unknown)
  :
  Plen<F> extends 2 ? F extends (...p: infer P) => any ? P : unknown
    :
    Plen<F> extends 1 | 2 ?
      F extends (a: infer A, b: infer B) => any ?
        A | [A, B]
        :
        F extends (...p: infer P) => any ? P : unknown
      :
      F extends (...p: infer P) => any ? P : unknown;

let SEQ = 0;
/**
 * create Stream of action stream and action dispatcher,
 * similar to redux-observable Epic concept,
 * What you can get from this function are:
 *   1. An action observable (stream),
 *      so that you can subscribe to it and react with fantastic Reactive operators
 *      to handle complex async logic
 *
 *   2. An action dispatcher,
 *      so that you can emit new action along with paramters (payload) back to action observale stream.
 *
 *   3. An RxJs "filter()" operator to filter action by its type, it provides better Typescript
 *   type definition for downstream action compare bare "filter()"
 */
// eslint-disable-next-line space-before-function-paren
export function createActionStream<AC extends Record<string, ((...payload: any[]) => void)>>(actionCreator: AC, debug?: boolean) {
  const dispatcher = {} as AC;
  const actionUpstream = new Subject<ActionTypes<AC>[keyof AC]>();
  const typePrefix = SEQ++ + '/';
  for (const type of Object.keys(actionCreator)) {
    const dispatch = (...params: any[]) => {
      const action = {
        type: typePrefix + type,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        payload: params.length === 1 ? params[0] : params.length === 0 ? undefined : params
      } as ActionTypes<AC>[keyof AC];
      actionUpstream.next(action);
    };
    dispatcher[type as keyof AC] = dispatch as AC[keyof AC];
  }

  const action$ = debug
    ? actionUpstream.pipe(
      tap(typeof window !== 'undefined'
        ? action => {
          // eslint-disable-next-line no-console
          console.log('%c rx:action ', 'color: white; background: #8c61ff;', action.type);
        }
        // eslint-disable-next-line no-console
        : action => console.log('rx:action', action.type)),
      share()
    )
    : actionUpstream;

  return {
    dispatcher,
    action$,
    ofType: createOfTypeOperator<AC>(typePrefix),
    isActionType: createIsActionTypeFn<AC>(typePrefix)
  };
}

type SimpleActionDispatchFactory<AC> = <K extends keyof AC>(type: K) => AC[K];

/**
 * Unlike `createActionStream()`, this function only needs an "Action creator" type as generic type parameter,
 * instead of an actual empty "Action creator" object to be parameter
 *
 * create Stream of action stream and action dispatcher,
 * similar to redux-observable Epic concept,
 * What you can get from this function are:
 *   1. An action observable (stream),
 *      so that you can subscribe to it and react with fantastic Reactive operators
 *      to handle complex async logic
 *                                                                                                      
 *   2. An action dispatcher,
 *      so that you can emit new action along with paramters (payload) back to action observale stream.
 *                                                                                                      
 *   3. An RxJs "filter()" operator to filter action by its type, it provides better Typescript
 *   type definition for downstream action compare bare "filter()"
 */
// eslint-disable-next-line space-before-function-paren
export function createActionStreamByType<AC extends Record<string, ((...payload: any[]) => void)>>(opt: {
  debug?: string | boolean;
  log?: (msg: string, ...objs: any[]) => unknown;
} = {}) {
  const actionUpstream = new Subject<ActionTypes<AC>[keyof AC]>();
  const dispatcher = {} as AC;
  const typePrefix = SEQ++ + '/';

  function dispatchFactory(type: keyof AC) {
    if (Object.prototype.hasOwnProperty.call(dispatcher, type)) {
      return dispatcher[type];
    }
    const dispatch = (...params: any[]) => {
      const action = {
        type: typePrefix + type,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        payload: params.length === 1 ? params[0] : params.length === 0 ? undefined : params
      } as ActionTypes<AC>[keyof AC];
      actionUpstream.next(action);
    };
    dispatcher[type] = dispatch as AC[keyof AC];
    return dispatch;
  }
  const dispatcherProxy = new Proxy<AC>({} as AC, {
    get(target, key, rec) {
      return dispatchFactory(key as keyof AC);
    }
  });

  const debugName = typeof opt.debug === 'string' ? `[${opt.debug}]` : '';
  const action$ = opt.debug
    ? actionUpstream.pipe(
      opt.log ?
        tap(action => opt.log!(debugName + 'rx:action', action.type)) :
        typeof window !== 'undefined' ?
          tap(action => {
          // eslint-disable-next-line no-console
            console.log(`%c ${debugName}rx:action `, 'color: white; background: #8c61ff;', action.type);
          })
          :
          // eslint-disable-next-line no-console
          tap(action => console.log(debugName + 'rx:action', action.type)),
      share()
    )
    : actionUpstream;

  return {
    dispatcher: dispatcherProxy,
    dispatchFactory: dispatchFactory as SimpleActionDispatchFactory<AC>,
    action$,
    ofType: createOfTypeOperator<AC>(typePrefix),
    isActionType: createIsActionTypeFn<AC>(typePrefix)
  };
}

export interface OfTypeFn<AC> {
  <T extends keyof AC>(type: T): (upstream: Observable<any>) => Observable<ActionTypes<AC>[T]>;
  <T extends keyof AC, T2 extends keyof AC>(type: T, type2: T2): (
    upstream: Observable<any>
  ) => Observable<ActionTypes<AC>[T] | ActionTypes<AC>[T2]>;
  <T extends keyof AC, T2 extends keyof AC, T3 extends keyof AC>(type: T, type2: T2, type3: T3): (
    upstream: Observable<any>
  ) => Observable<ActionTypes<AC>[T] | ActionTypes<AC>[T2] | ActionTypes<AC>[T3]>;
  <T extends keyof AC>(...types: T[]): (upstream: Observable<any>) => Observable<ActionTypes<AC>[T]>;
}

function createIsActionTypeFn<AC>(prefix: string) {
  return function isActionType<K extends keyof AC>(action: {type: unknown}, type: K): action is ActionTypes<AC>[K] {
    return action.type === prefix + type;
  };
}

/** create rx a operator to filter action by action.type */
function createOfTypeOperator<AC>(typePrefix = ''): OfTypeFn<AC> {
  return <T extends keyof AC>(...types: T[]) =>
    (upstream: Observable<any>) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      return upstream.pipe(
        filter((action) : action is ActionTypes<AC>[T] => types.some((type) => action.type === typePrefix + type)),
        share()
      ) ;
    };
}
