/**
 * redux-observable like async reactive actions, side effect utilities
 * https://redux-observable.js.org/
 */

import {Observable, Subject} from 'rxjs';
import {filter, tap, share} from 'rxjs/operators';

export type ActionTypes<AC> = {
  [K in keyof AC]: {
    type: K;
    payload: AC[K] extends () => any
      ? undefined
      : AC[K] extends (p: infer P) => any
        ? P
        : AC[K] extends (...p: infer PArray) => any
          ? PArray
          : unknown;
  };
};

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
export function createActionStream<AC>(actionCreator: AC, debug?: boolean) {
  const dispatcher = {} as AC;
  const actionUpstream = new Subject<ActionTypes<AC>[keyof ActionTypes<AC>]>();
  for (const type of Object.keys(actionCreator)) {
    dispatcher[type] = (...params: any[]) => {
      const action = {
        type,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        payload: params.length === 1 ? params[0] : params
      } as ActionTypes<AC>[keyof ActionTypes<AC>];
      actionUpstream.next(action);
    };
  }

  const action$ = debug
    ? actionUpstream.pipe(
      tap(typeof window !== 'undefined'
        ? action => {
          // eslint-disable-next-line no-console
          console.log('%c rx:action ', 'color: white; background: #8c61ff;', action.type);
        }
        : action => console.log('rx:action', action.type)),
      share()
    )
    : actionUpstream;

  return {
    dispatcher,
    action$,
    ofType: createOfTypeOperator<AC>(),
    isActionType: createIsActionTypeFn<AC>()
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

function createIsActionTypeFn<AC>() {
  return function isActionType<K extends keyof AC>(action: {type: unknown}, type: K): action is ActionTypes<AC>[K] {
    return action.type === type;
  };
}

/** create rx a operator to filter action by action.type */
function createOfTypeOperator<AC>(): OfTypeFn<AC> {
  return <T extends keyof AC>(...types: T[]) =>
    (upstream: Observable<any>) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      return upstream.pipe(filter(action => types.some(type => action.type === type))) as Observable<
      ActionTypes<AC>[T]
      >;
    };
}
