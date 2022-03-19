import {OperatorFunction, Subject, Observable} from 'rxjs';
import {distinctUntilChanged, map, filter, tap, share} from 'rxjs/operators';

export function reselect<T, R, R1, R2, R3, R4, R5>(selectors: [
  (current: T) => R1, (current: T) => R2, (current: T) => R3, (current: T) => R4, (current: T) => R5, ...((current: T) => any)[]
], combine: (...results: [R1, R2, R3, R4, R5, ...any[]]) => R): OperatorFunction<T, R> {
  return src => {
    return src.pipe(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      map(s => selectors.map(selector => selector(s)) as [R1, R2, R3, R4, R5, ...any[]]),
      distinctUntilChanged((a, b) => a.every((result, i) => result === b[i])),
      map(results => combine(...results))
    );
  };
}

/**
 * redux-observable like async reactive actions, side effect utilities
 * https://redux-observable.js.org/
 */

export type ActionTypes<AC> = {
  [K in keyof AC]: {
    type: K;
    payload: AC[K] extends (p: infer P) => any ? P : AC[K] extends (...p: infer PArray) => any ? PArray : unknown;
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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const actionUpstream = new Subject<ActionTypes<AC>[keyof ActionTypes<AC>]>();
  for (const type of Object.keys(actionCreator)) {
    dispatcher[type] = (...params: any[]) => {
      const action = {
        type,
        payload: params.length === 1 ? params[0] : params
      } as ActionTypes<AC>[keyof ActionTypes<AC>];
      actionUpstream.next(action);
    };
  }

  const action$ = debug
    ? actionUpstream.pipe(
              tap(action => {
                  // eslint-disable-next-line no-console
                  console.log('%c rx:action ', 'color: white; background: #8c61ff;', action.type);
              }),
              share()
          )
    : actionUpstream;

  return {
    dispatcher,
    action$,
    ofType: createOfTypeOperator(actionCreator)
  };
}

/** create rx a operator to filter action by action.type */
function createOfTypeOperator<AC>(_actionCreator: AC) {
  return <T extends keyof AC>(type: T) =>
    (upstream: Observable<any>) => {
      return upstream.pipe(filter(action => action.type === type)) as Observable<ActionTypes<AC>[T]>;
    };
}
