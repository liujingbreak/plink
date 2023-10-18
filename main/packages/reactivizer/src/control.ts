import * as rx from 'rxjs';
import {Action, ActionFunctions, InferMapParam, InferPayload, ActionMeta,
  ArrayOrTuple, ControllerCore, Dispatch, DispatchFor, PayloadStream, CoreOptions,
  has, nameOfAction, actionMetaToStr
} from './stream-core';

export * from './stream-core';

type DispatchAndObserveRes<I extends ActionFunctions, K extends keyof I> = <O extends ActionFunctions, R extends keyof O>(
  waitForAction$: rx.Observable<Action<O, R>>, ...params: InferPayload<I[K]>
) => rx.Observable<InferMapParam<O, R>>;

type DispatchForAndObserveRes<I extends ActionFunctions, K extends keyof I> = <O extends ActionFunctions, R extends keyof O>(
  waitForAction$: rx.Observable<Action<O, R>>, origActionMeta: ActionMeta | ArrayOrTuple<ActionMeta> | null, ...params: InferPayload<I[K]>
) => rx.Observable<InferMapParam<O, R>>;

export class RxController<I extends ActionFunctions> {
  core: ControllerCore<I>;
  dispatcher: {[K in keyof I]: Dispatch<I[K]>};
  dispatcherFor: {[K in keyof I]: DispatchFor<I[K]>};
  /** abbrevation of property "dispatcher", exactly same instance of dispatcher */
  dp: {[K in keyof I]: Dispatch<I[K]>};
  /** abbrevation of property "dispatcherFor", exactly same instance of dispatcherFor */
  dpf: {[K in keyof I]: DispatchFor<I[K]>};
  dispatchAndObserveRes: {[K in keyof I]: DispatchAndObserveRes<I, K>};
  /** abbrevation of property "dispatchAndObserveRes", exactly same instance of dispatchAndObserveRes */
  do: {[K in keyof I]: DispatchAndObserveRes<I, K>};
  dispatchForAndObserveRes: {[K in keyof I]: DispatchForAndObserveRes<I, K>};
  /** abbrevation of dispatchForAndObserveRes */
  dfo: {[K in keyof I]: DispatchForAndObserveRes<I, K>};
  payloadByType: {[K in keyof I]: PayloadStream<I, K>};
  /** abbrevation of payloadByType */
  pt: {[K in keyof I]: PayloadStream<I, K>};
  actionByType: {[K in keyof I]: rx.Observable<Action<I, K>>};
  /** abbrevation of actionByType */
  at: {[K in keyof I]: rx.Observable<Action<I, K>>};

  updateInterceptor: ControllerCore<I>['updateInterceptor'];

  constructor(public opts?: CoreOptions<(string & keyof I)[]>) {
    const core = this.core = new ControllerCore(opts);

    this.dispatcher = this.dp = new Proxy({} as {[K in keyof I]: Dispatch<I[K]>}, {
      get(_target, key, _rec) {
        return core.dispatchFactory(key as keyof I);
      }
    });
    this.dispatcherFor = this.dpf = new Proxy({} as {[K in keyof I]: DispatchFor<I[K]>}, {
      get(_target, key, _rec) {
        return core.dispatchForFactory(key as keyof I);
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    this.dispatchForAndObserveRes = this.dfo = new Proxy({} as {[K in keyof I]: DispatchForAndObserveRes<I, K>}, {
      get(_target, key, _rec) {

        return <R extends keyof I>(action$: rx.Observable<Action<I, R>>, referActions: ActionMeta | ArrayOrTuple<ActionMeta> | null, ...params: any[]) => {
          const action = self.core.createAction(key as string, params as InferPayload<I[string]>);
          if (referActions)
            action.r = Array.isArray(referActions) ? referActions.map(m => m.i) : (referActions as ActionMeta).i;
          const r$ = new rx.ReplaySubject<InferMapParam<I, R>>(1);
          rx.merge(
            action$.pipe(
              actionRelatedToAction(action.i),
              mapActionToPayload()
            ),
            new rx.Observable<never>(sub => {
              self.core.actionUpstream.next(action);
              sub.complete();
            })
          ).subscribe(r$);
          return r$.asObservable();
        };
      }
    });

    this.dispatchAndObserveRes = this.do = new Proxy({} as {[K in keyof I]: DispatchAndObserveRes<I, K>}, {
      get(_target, key, _rec) {

        return <R extends keyof I>(action$: rx.Observable<Action<I, R>>, ...params: any[]) => {
          return self.dfo[key as keyof I](action$, null, ...(params as any));
        };
      }
    });

    const actionsByType = {} as {[K in keyof I]: rx.Observable<Action<I, K>>};
    const actionByTypeProxy = new Proxy(
      {} as typeof actionsByType,
      {
        get(_target, type, _rec) {
          let a$ = actionsByType[type as keyof I];
          if (a$ == null) {
            const matchType = core.typePrefix + (type as string);
            a$ = actionsByType[type as keyof I] = core.action$.pipe(
              rx.filter(({t}) => t === matchType),
              rx.share()
            );
          }
          return a$;
        }
      });

    const payloadsByType = {} as {[K in keyof I]: rx.Observable<InferMapParam<I, K>>};
    this.actionByType = this.at = actionByTypeProxy;

    this.payloadByType = this.pt = new Proxy(
      {} as typeof payloadsByType,
      {
        get(_target, key, _rec) {
          let p$ = payloadsByType[key as keyof I];
          if (p$ == null) {
            const a$ = actionByTypeProxy[key as keyof I];
            p$ = payloadsByType[key as keyof I] = a$.pipe(
              mapActionToPayload(),
              rx.share()
            );
          }
          return p$;
        }
      });
    this.updateInterceptor = core.updateInterceptor;
  }

  /** create state of actions, you can consider it like a map of BehaviorSubject of actions */
  // withTableFor<MS extends Array<keyof I>>(...actionNames: MS) {
  //   if (this.table == null)
  //     this.table = new ActionTable(this, actionNames) as TB;
  //   else
  //     this.table.addActions(...actionNames);
  //   return this as RxController<I, (KS[number] | MS[number])[], ActionTable<I, (KS[number] | MS[number])[]>>;
  // }

  createAction<J extends ActionFunctions = I, K extends keyof J = keyof J>(type: K, ...params: InferPayload<J[K]>) {
    return this.core.createAction(type, params);
  }
}

export class ActionTable<I extends ActionFunctions, KS extends ReadonlyArray<keyof I>> {
  latestPayloads = {} as {[K in KS[number]]: PayloadStream<I, K>};
  /** Abbrevation of latestPayloads, pointing to exactly same instance of latestPayloads */
  l: {[K in KS[number]]: PayloadStream<I, K>};

  actionSnapshot = new Map<keyof I, InferMapParam<I, keyof I>>();

  constructor(private streamCtl: RxController<I>, actionNames: KS) {
    this.l = this.latestPayloads;
    this.addActions(...actionNames);
  }

  addActions<M extends Array<keyof I>>(...actionNames: M) {
    for (const type of actionNames) {
      if (has.call(this.latestPayloads, type))
        continue;

      const a$ = new rx.ReplaySubject<InferMapParam<I, M[number]>>(1);
      this.streamCtl.actionByType[type].pipe(
        rx.map(a => {
          const mapParam = [{i: a.i, r: a.r}, ...a.p] as InferMapParam<I, M[number]>;
          this.actionSnapshot.set(type, mapParam);
          return mapParam;
        })
      ).subscribe(a$);

      this.latestPayloads[type] = this.streamCtl.opts?.debug ?
        a$.pipe(
          this.debugLogLatestActionOperator(type as string)
        ) :
        a$.asObservable();

    }
    return this as ActionTable<I, Array<KS[number] | M[number]>>;
  }

  getLatestActionOf<K extends KS[number]>(actionName: K) {
    return this.actionSnapshot.get(actionName) as InferMapParam<I, K> | undefined;
  }

  protected debugLogLatestActionOperator<K extends string & keyof I, P extends InferMapParam<I, K>>(type: K) {
    const core = this.streamCtl.core;
    return this.streamCtl.opts?.log ?
      rx.map<P, P>((action, idx) => {
        if (idx === 0 && !core.debugExcludeSet.has(type)) {
          this.streamCtl.opts!.log!(core.logPrefix + 'rx:latest', type, action);
        }
        return action;
      }) :
      (typeof window !== 'undefined') || (typeof Worker !== 'undefined') ?
        rx.map<P, P>((p, idx) => {
          if (idx === 0 && !core.debugExcludeSet.has(type)) {
            // eslint-disable-next-line no-console
            console.log(`%c ${core.logPrefix}rx:latest `, 'color: #f0fe0fe0; background: #8c61dd;', type,
              actionMetaToStr(p[0]));
          }
          return p;
        }) :
        rx.map<P, P>((p, idx) => {
          if (idx > 0 && !core.debugExcludeSet.has(type)) {
            // eslint-disable-next-line no-console
            console.log(core.logPrefix + 'latest:', type, actionMetaToStr(p[0]));
          }
          return p;
        });
  }
}

/** Rx operator function */
export function actionRelatedToAction<T extends Action<any>>(id: ActionMeta['i']) {
  return function(up: rx.Observable<T>) {
    return up.pipe(
      rx.filter(
        m => (m.r != null && m.r === id) || (
          Array.isArray(m.r) && m.r.some(r => r === id)
        )
      )
    );
  };
}
/** Rx operator function */
export function actionRelatedToPayload<T extends [ActionMeta, ...any[]]>(id: ActionMeta['i']) {
  return function(up: rx.Observable<T>): rx.Observable<T> {
    return up.pipe(
      rx.filter(
        ([m]) => (m.r != null && m.r === id) || (
          Array.isArray(m.r) && m.r.some(r => r === id)
        )
      )
    );
  };
}

export function serializeAction<I extends ActionFunctions = any, K extends keyof I = string>(action: Action<I, K>) {
  const a = {...action, t: nameOfAction(action)};
  // if (a.r instanceof Set) {
  //   a.r = [...a.r.values()];
  // }
  return a;
}

/**
 * Create a new Action with same "i" and "r" properties and dispatched to RxController
 * @return that dispatched new action object
 */
export function deserializeAction<I extends ActionFunctions>(actionObj: any, toController: RxController<I>) {
  const newAction = toController.core.createAction(nameOfAction(actionObj) as keyof I, (actionObj as Action<I>).p);
  newAction.i = (actionObj as Action<any>).i;
  if ((actionObj as Action<any>).r)
    newAction.r = (actionObj as Action<any>).r;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  toController.core.actionUpstream.next(newAction);
  return newAction;
}

function mapActionToPayload<I extends ActionFunctions, K extends keyof I>() {
  return (up: rx.Observable<Action<I, K>>) => up.pipe(
    rx.map(a => [{i: a.i, r: a.r}, ...a.p] as InferMapParam<I, keyof I>)
  );
}
