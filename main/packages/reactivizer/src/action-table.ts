import * as rx from 'rxjs';
import {InferPayload, InferMapParam, Action,
  has, actionMetaToStr} from './stream-core';
import {RxController, mapActionToPayload} from './control';
import {RxController2} from './control2';
import {ActionTableDataType, PayloadByType} from './inferred-types';

const EMPTY_ARRY = [] as [];

export class ActionTable<I, KS extends ReadonlyArray<keyof I>> {
  actionNames: KS;

  latestPayloads = {} as PayloadByType<{[K in KS[number]]: I[K]}>;
  /** Abbrevation of "latestPayloads", pointing to exactly same instance of latestPayloads */
  l: PayloadByType<{[K in KS[number]]: I[K]}>;

  get dataChange$(): rx.Observable<ActionTableDataType<I, KS>> {
    if (this.#latestPayloadsByName$)
      return this.#latestPayloadsByName$;

    this.#latestPayloadsByName$ = this.actionNamesAdded$.pipe(
      rx.switchMap(() => rx.merge(...this.actionNames.map(actionName => this.l[actionName]))),
      rx.map(() => {
        this.data = {} as ActionTableDataType<I, KS>;
        for (const k of this.actionNames) {
          const v = this.actionSnapshot.get(k);
          const old = this.data[k];

          if (old === EMPTY_ARRY || old == null)
            this.data[k] = v ? v.slice(1) as InferPayload<I[keyof I]> : EMPTY_ARRY;
          else {
            if (v) {
              old.splice(0);
              for (let i = 1, l = v.length; i < l; i++)
                (old as any[]).push(v[i]);
            } else
              this.data[k] = EMPTY_ARRY;
          }
        }
        return this.data;
      }),
      rx.share()
    );
    return this.#latestPayloadsByName$;
  }

  private data: ActionTableDataType<I, KS> = {} as ActionTableDataType<I, KS>;

  actionSnapshot = new Map<keyof I, InferMapParam<I[keyof I]>>();

  // private
  #latestPayloadsByName$: rx.Observable<ActionTableDataType<I, KS>> | undefined;
  // #latestPayloadsSnapshot$: rx.Observable<Map<keyof I, InferMapParam<I, keyof I>>> | undefined;
  private actionNamesAdded$ = new rx.ReplaySubject<ReadonlyArray<keyof I>>(1);

  constructor(private streamCtl: RxController<I> | RxController2<any>, actionNames: KS) {
    this.actionNames = [] as unknown as KS;
    this.l = this.latestPayloads;
    this.addActions(...actionNames);
    this.actionNamesAdded$.pipe(
      rx.map(actionNames => {
        this.onAddActions(actionNames);
      })
    ).subscribe();
    this.dataChange$.subscribe(); // to make sure this.data will be fulfilled even when there is no any external observer
  }

  getData(): ActionTableDataType<I, KS> {
    return this.data;
  }

  /** Add actions to be recoreded in table map,
   * by creating `ReplaySubject(1)` for each action payload stream respectively
   */
  addActions<M extends Array<keyof I>>(...actionNames: M) {
    this.actionNames = this.actionNames.concat(actionNames) as unknown as KS;
    this.actionNamesAdded$.next(actionNames);
    return this as unknown as ActionTable<I, Array<KS[number] | M[number]>>;
  }

  private onAddActions<M extends ReadonlyArray<keyof I>>(actionNames: M) {
    for (const type of actionNames) {
      if (this.data[type] == null)
        this.data[type] = EMPTY_ARRY;
      if (has.call(this.latestPayloads, type))
        continue;

      const a$ = new rx.ReplaySubject<InferMapParam<I[M[number]]>>(1);
      (this.streamCtl as RxController<I>).at[type].pipe(
        rx.map(a => {
          const arr = this.actionSnapshot.get(type);
          if (arr == null) {
            const mapParam = [{i: a.i, r: a.r}, ...a.p] as InferMapParam<I[M[number]]>;
            this.actionSnapshot.set(type, mapParam);
            return mapParam;
          } else {
            arr[0] = {i: a.i, r: a.r};
            arr.splice(1, arr.length - 1, ...a.p); // reuse old array
            return arr;
          }
        })
      ).subscribe(a$);

      this.latestPayloads[type] = this.streamCtl.opts?.debugTableAction ?
        a$.pipe(
          this.debugLogLatestActionOperator(type)
        ) :
        a$.asObservable();
    }
  }

  getLatestActionOf<K extends KS[number]>(actionName: K): InferMapParam<I[K]> | undefined {
    return this.actionSnapshot.get(actionName) as InferMapParam<I[K]> | undefined;
  }

  protected debugLogLatestActionOperator<K extends keyof I, P extends InferMapParam<I[K]>>(type: K) {
    const core = (this.streamCtl as RxController<I>).core ?? (this.streamCtl as RxController2<any>);
    return this.streamCtl.opts?.log ?
      rx.map<P, P>((action, idx) => {
        if (idx === 0 && !core.debugExcludeSet.has(type)) {
          this.streamCtl.opts!.log!(core.logPrefix + 'rx:latest', type, actionMetaToStr(action[0]));
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

/** Consider it as Apache Kafka's KTable */
export class ActionDataTable<I, T extends keyof I, K> {
  snapshot: Map<K, Action<I[T]>> = new Map();
  l = this.latestPayload;

  constructor(private source$: rx.Observable<Action<I[T]>>, private keySelector: (action: Action<I[T]>) => K) {}

  latestAction(key: K): rx.Observable<Action<I[T]>> {
    const future$ = this.source$.pipe(
      rx.filter(a => this.keySelector(a) === key)
    );
    if (this.snapshot.has(key)) {
      // replay last action
      return rx.concat(rx.of(this.snapshot.get(key)!), future$);
    } else {
      return future$;
    }
  }

  latestPayload(key: K) {
    return this.latestAction(key).pipe(
      mapActionToPayload()
    );
  }
}
