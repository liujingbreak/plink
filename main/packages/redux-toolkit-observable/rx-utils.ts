/**
 * redux-observable like async reactive actions, side effect utilities
 * https://redux-observable.js.org/
 */

import {Observable, Subject, OperatorFunction, BehaviorSubject, ReplaySubject} from 'rxjs';
import {switchMap, filter, map, tap, share} from 'rxjs/operators';

type Plen<T> = (T extends (...a: infer A) => any ? A : [])['length'];

export type ActionTypes<AC> = {
  [K in keyof AC]: {
    type: string;
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
 * @Deprecated
 * Use createActionStreamByType<R>() instead.
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
export function createActionStream<AC extends Record<string, ((...payload: any[]) => void)>>(actionCreator: AC, debug?: boolean):
{
  dispatcher: AC;
  action$: Observable<ActionTypes<AC>[keyof AC]>;
  ofType: OfTypeFn<AC>;
  isActionType: <K extends keyof AC>(action: {type: unknown}, type: K) => action is ActionTypes<AC>[K];
  nameOfAction: <K extends keyof AC>(action: ActionTypes<AC>[K]) => K;
} {
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
    isActionType: createIsActionTypeFn<AC>(typePrefix),
    nameOfAction: <K extends keyof AC>(action: ActionTypes<AC>[K]) => action.type.split('/')[1] as K
  };
}

type SimpleActionDispatchFactory<AC> = <K extends keyof AC>(type: K) => AC[K];

export type PayloadStreams<AC extends Record<string, (...a: any[]) => void>> = {
  [K in keyof AC]: Observable<InferParam<AC[K]>>
};

interface CreateReplayableFn<AC extends Record<string, (...a: any[]) => void>> {
  <R1 extends keyof AC, R2 extends keyof AC>(actionType1: R1, at2: R2): PayloadStreams<Pick<AC, R1 | R2>>;
  <R1 extends keyof AC, R2 extends keyof AC, R3 extends keyof AC>(actionType1: R1, at2: R2, at3: R3): PayloadStreams<Pick<AC, R1 | R2 | R3>>;
  <R1 extends keyof AC, R2 extends keyof AC, R3 extends keyof AC, R4 extends keyof AC>(actionType1: R1, at2: R2, at3: R3, at4: R4): PayloadStreams<Pick<AC, R1 | R2 | R3 | R4>>;
  <R1 extends keyof AC, R2 extends keyof AC, R3 extends keyof AC, R4 extends keyof AC, R5 extends keyof AC>(actionType1: R1, at2: R2, at3: R3, at4: R4, at5: R5): PayloadStreams<Pick<AC, R1 | R2 | R3 | R4 | R5>>;
  <R extends keyof AC>(...actionTypes: R[]): PayloadStreams<Pick<AC, R>>;
}

export type ActionStreamControl<AC extends Record<string, (...a: any[]) => void>> = {
  /** create `ReplaySubject(1)` for each `payloadByType` */
  createLatestPayloads: CreateReplayableFn<AC>;
  dispatcher: AC;
  dispatchStream: Subject<ActionTypes<AC>[keyof AC]>;
  payloadByType: PayloadStreams<AC>;
  actionByType: {[T in keyof AC]: Observable<ActionTypes<AC>[T]>};
  /** @Deprecated use dispatcher.<actionName> instead */
  dispatchFactory: SimpleActionDispatchFactory<AC>;
  /** @Deprecated use `actionByType.<actionName>` instead */
  actionOfType<T extends keyof AC>(type: T): Observable<ActionTypes<AC>[T]>;
  changeActionInterceptor<T extends keyof AC>(
    interceptorFactory: (
      originalInterceptor: OperatorFunction<ActionTypes<AC>[T], ActionTypes<AC>[T]> | null
    ) => OperatorFunction<ActionTypes<AC>[T], ActionTypes<AC>[T]>
  ): void;
  action$: Observable<ActionTypes<AC>[keyof AC]>;
  createAction<K extends keyof AC>(type: K, ...params: Parameters<AC[K]>): ActionTypes<AC>[K];
  ofType: OfTypeFn<AC>;
  isActionType<K extends keyof AC>(action: {type: unknown}, type: K): action is ActionTypes<AC>[K];
  nameOfAction(action: ActionTypes<AC>[keyof AC]): keyof AC | undefined;
  objectToAction(obj: {t: string; p: any}): ActionTypes<AC>[keyof AC];
  _actionFromObject(obj: {t: string; p: any}): void;
  _actionToObject(action: ActionTypes<AC>[keyof AC]): {t: string; p: any};
};

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
} = {}): ActionStreamControl<AC> {
  const actionUpstream = new Subject<ActionTypes<AC>[keyof AC]>();
  const dispatcher = {} as AC;
  const typePrefix = SEQ++ + '/';

  function dispatchFactory(type: keyof AC) {
    if (Object.prototype.hasOwnProperty.call(dispatcher, type)) {
      return dispatcher[type];
    }
    const dispatch = (...params: Parameters<AC[keyof AC]>) => {
      const action = createAction(type, ...params);
      actionUpstream.next(action);
    };
    dispatcher[type] = dispatch as AC[keyof AC];
    return dispatch;
  }

  function createAction<K extends keyof AC>(type: K, ...params: Parameters<AC[K]>) {
    return {
      type: typePrefix + (type as string),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      payload: params.length === 1 ? params[0] : params.length === 0 ? undefined : params
    } as ActionTypes<AC>[K];
  }

  const dispatcherProxy = new Proxy<AC>({} as AC, {
    get(_target, key, _rec) {
      return dispatchFactory(key as keyof AC);
    }
  });

  const actionsByType = {} as {[K in keyof AC]: Observable<ActionTypes<AC>[K]>};
  const payloadsByType = {} as {[K in keyof AC]: Observable<InferParam<AC[K]>>};

  const ofType = createOfTypeOperator<AC>(typePrefix);

  function actionOfType<T extends keyof AC>(type: T): Observable<ActionTypes<AC>[T]> {
    let a$ = actionsByType[type];
    if (a$ == null) {
      a$ = actionsByType[type] = action$.pipe(
        ofType(type)
      );
    }
    return a$;
  }

  const actionByTypeProxy = new Proxy<{[T in keyof AC]: Observable<ActionTypes<AC>[T]>}>(
    {} as {[T in keyof AC]: Observable<ActionTypes<AC>[T]>},
    {
      get(_target, key, _rec) {
        return actionOfType(key as keyof AC);
      }
    });

  const payloadByTypeProxy = new Proxy<{[T in keyof AC]: Observable<InferParam<AC[T]>>}>(
    {} as {[T in keyof AC]: Observable<InferParam<AC[T]>>},
    {
      get(_target, key, _rec) {
        let p$ = payloadsByType[key as keyof AC];
        if (p$ == null) {
          const matchType = typePrefix + (key as string);
          p$ = payloadsByType[key as keyof AC] = action$.pipe(
            filter(({type}) => type === matchType),
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            map(action => action.payload),
            share()
          );
        }
        return p$;
      }
    });

  const debugName = typeof opt.debug === 'string' ? `[${typePrefix}${opt.debug}] ` : typePrefix;
  const interceptor$ = new BehaviorSubject<OperatorFunction<ActionTypes<AC>[keyof AC], ActionTypes<AC>[keyof AC]> | null>(null);

  function changeActionInterceptor(
    factory: (
      origin: OperatorFunction<ActionTypes<AC>[keyof AC], ActionTypes<AC>[keyof AC]> | null
    ) => OperatorFunction<ActionTypes<AC>[keyof AC], ActionTypes<AC>[keyof AC]>
  ) {
    const newInterceptor = factory(interceptor$.getValue());
    interceptor$.next(newInterceptor);
  }

  const debuggableAction$ = opt.debug
    ? actionUpstream.pipe(
      opt.log ?
        tap(action => opt.log!(debugName + 'rx:action', nameOfAction(action))) :
        (typeof window !== 'undefined') || (typeof Worker !== 'undefined') ?
          tap(action => {
            // eslint-disable-next-line no-console
            console.log(`%c ${debugName}rx:action `, 'color: white; background: #8c61ff;',
              nameOfAction(action),
              action.payload === undefined ? '' : action.payload
            );
          })
          :
          // eslint-disable-next-line no-console
          tap(action => console.log(debugName + 'rx:action', nameOfAction(action),
            action.payload === undefined ? '' : action.payload )),
      share()
    )
    : actionUpstream;

  const action$ = interceptor$.pipe(
    switchMap(interceptor => interceptor ?
      debuggableAction$.pipe(interceptor, share()) :
      debuggableAction$)
  );

  function debugLogLatestActionOperator<P>(type: string) {
    return opt.log ?
      map<P, P>((payload, idx) => {
        if (idx === 0) {
          opt.log!(debugName + 'rx:latest', type);
        }
        return payload;
      }) :
      (typeof window !== 'undefined') || (typeof Worker !== 'undefined') ?
        map<P, P>((payload, idx) => {
          if (idx === 0) {
            // eslint-disable-next-line no-console
            console.log(`%c ${debugName}rx:latest `, 'color: #f0fe0fe0; background: #8c61dd;', type,
              payload === undefined ? '' : payload
            );
          }
          return payload;
        }) :
        map<P, P>((payload, idx) => {
          if (idx === 0) {
            // eslint-disable-next-line no-console
            console.log(debugName + 'rx:action', type, payload === undefined ? '' : payload);
          }
          return payload;
        });
  }

  return {
    dispatcher: dispatcherProxy,
    createLatestPayloads<R extends keyof AC>(...types: R[]) {
      const replayedPayloads = {} as {[K in R]: Observable<InferParam<AC[K]>>};
      for (const key of types) {
        const r$ = new ReplaySubject<InferParam<AC[R]>>(1);
        replayedPayloads[key] = opt.debug ?
          r$.asObservable().pipe(
            debugLogLatestActionOperator(key as string)
          ) :
          r$.asObservable();
        payloadByTypeProxy[key].subscribe(r$);
      }
      return replayedPayloads;
    },
    dispatchFactory: dispatchFactory as SimpleActionDispatchFactory<AC>,
    dispatchStream: actionUpstream,
    action$,
    payloadByType: payloadByTypeProxy,
    actionByType: actionByTypeProxy,
    actionOfType,
    changeActionInterceptor,
    ofType,
    isActionType: createIsActionTypeFn<AC>(typePrefix),
    nameOfAction: (action: ActionTypes<AC>[keyof AC]) => nameOfAction<AC>(action),
    createAction,
    _actionFromObject(obj: {t: string; p: any}) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      actionUpstream.next({type: typePrefix + obj.t, payload: obj.p} as ActionTypes<AC>[keyof AC]);
    },
    objectToAction(obj: {t: string; p: any}) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      return {type: typePrefix + obj.t, payload: obj.p} as ActionTypes<AC>[keyof AC];
    },
    _actionToObject(action: ActionTypes<AC>[keyof AC]) {
      return {t: nameOfAction(action) as string, p: action.payload};
    }
  };
}

/**
 * Get the "action name" from payload's "type" field,
 * `payload.type`` is actually consist of string like `${Prefix}/${actionName}`,
 * this function returns the `actionName` part
 * @return undefined if current action doesn't have a valid "type" field
 */
// eslint-disable-next-line space-before-function-paren
export function nameOfAction<AC extends Record<string, ((...payload: any[]) => void)>>(
  action: ActionTypes<AC>[keyof AC]
): keyof AC | undefined {
  return action.type.split('/')[1];
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
    return action.type === prefix + (type as string);
  };
}

/** create rx a operator to filter action by action.type */
function createOfTypeOperator<AC>(typePrefix = ''): OfTypeFn<AC> {
  return <T extends keyof AC>(...types: T[]) =>
    (upstream: Observable<any>) => {
      const matchTypes = types.map(type => typePrefix + (type as string));
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      return upstream.pipe(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        filter((action) : action is ActionTypes<AC>[T] => matchTypes.some(type => action.type === type)),
        share()
      ) ;
    };
}

// type TestActions<X extends string> = {
//   action1(p: string): void;
//   action2(a: string, b: number): void;
//   action3(): void;
//   action4<A extends string>(y: number, x: X, z: A): void;
// };

// type TestActionsB = {
//   action5(a: Observable<ActionTypes<TestActions<string>>[keyof TestActions<string>]>): void;
// };
// const ctl = createActionStreamByType<TestActions<'abc' | 'xyz'> & TestActionsB>();
// ctl.payloadByType.action5.pipe();
