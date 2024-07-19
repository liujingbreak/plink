import * as rx from 'rxjs';
import {InferPayload, InferMapParam, Action,
  has, actionMetaToStr} from './stream-core';
import {RxController, mapActionToPayload} from './control';
import {RxController2} from './control2';
import {ActionTableDataType, PayloadByType} from './inferred-types';

const EMPTY_ARRY = [] as [];

export class ActionTable<I, IK extends keyof I> {
  private actionNames: Set<string>;
  latestPayloads = {} as PayloadByType<{[K in IK]: I[K]}>;
  /** Abbrevation of "latestPayloads", pointing to exactly same instance of latestPayloads */
  l: PayloadByType<{[K in IK]: I[K]}>;

  get dataChange$(): rx.Observable<ActionTableDataType<I, IK>> {
    if (this.#latestPayloadsByName$)
      return this.#latestPayloadsByName$;

    this.#latestPayloadsByName$ = this.actionNamesAdded$.pipe(
      rx.switchMap(() => rx.from(this.actionNames)),
      rx.mergeMap(actionName => this.l[actionName as IK]),
      rx.map(() => {
        this.data = {} as ActionTableDataType<I, IK>;
        for (const k of this.actionNames as Set<IK[][number]>) {
          const v = this.actionSnapshot.get(k as string);
          const old = this.data[k];

          if (old === EMPTY_ARRY || old == null)
            this.data[k] = v ? v.slice(1) as InferPayload<I[keyof I]> : EMPTY_ARRY;
          else {
            if (v) {
              this.data[k] = v.slice(1) as InferPayload<I[keyof I]>;
              // old.splice(0);
              // for (let i = 1, l = v.length; i < l; i++)
              //   (old as any[]).push(v[i]);
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

  private data: ActionTableDataType<I, IK> = {} as ActionTableDataType<I, IK>;

  actionSnapshot = new Map<string, InferMapParam<I[keyof I]>>();

  // private
  #latestPayloadsByName$: rx.Observable<ActionTableDataType<I, IK>> | undefined;
  // #latestPayloadsSnapshot$: rx.Observable<Map<keyof I, InferMapParam<I, keyof I>>> | undefined;
  private actionNamesAdded$ = new rx.ReplaySubject<any[]>(1);

  constructor(private streamCtl: RxController<I> | RxController2<I>, actionNames: IK[]) {
    this.actionNames = new Set();
    this.l = this.latestPayloads;
    this.addActions(...actionNames);
    this.actionNamesAdded$.pipe(
      rx.map(actionNames => {
        this.onAddActions(actionNames);
      })
    ).subscribe();
    this.dataChange$.subscribe(); // to make sure this.data will be fulfilled even when there is no any external observer
  }

  getData(): ActionTableDataType<I, IK> {
    return this.data;
  }

  /** Add actions to be recoreded in table map,
   * by creating `ReplaySubject(1)` for each action payload stream respectively
   */
  addActions<M extends keyof I>(...actionNames: M[]) {
    const uniqueNewActions = actionNames.filter(a => !this.actionNames.has(a as string));
    for (const a of uniqueNewActions) {
      this.actionNames.add(a as string);
    }
    this.actionNamesAdded$.next(uniqueNewActions);
    return this as ActionTable<I, IK | M>;
  }

  private onAddActions<M extends ReadonlyArray<keyof I>>(actionNames: M) {
    for (const type of actionNames) {
      if (this.data[type as IK] == null)
        this.data[type as IK] = EMPTY_ARRY;
      if (has.call(this.latestPayloads, type))
        continue;

      const a$ = new rx.ReplaySubject<InferMapParam<I[M[number]]>>(1);
      (this.streamCtl as RxController2<I>).at[type].pipe(
        rx.map(a => {
          // Always use a brand new array to maintain immutability, which serves things like rx.distinctUntilChanged()
          const mapParam = [{i: a.i, r: a.r}, ...a.p] as InferMapParam<I[M[number]]>;
          this.actionSnapshot.set(type as string, mapParam);
          return mapParam;
        })
      ).subscribe(a$);

      this.latestPayloads[type as IK] = (this.streamCtl.opts as any).debugTableAction ?
        a$.pipe(
          this.debugLogLatestActionOperator(type)
        ) :
        a$.asObservable();
    }
  }

  getLatestActionOf<K extends IK[][number]>(actionName: K): InferMapParam<I[K]> | undefined {
    return this.actionSnapshot.get(actionName as string) as InferMapParam<I[K]> | undefined;
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
  snapshot: Map<K, InferMapParam<I[T]>> = new Map();
  /** Alias of latestPayload */
  ofKey = this.getPayloadStreamOfKey;
  private future$: rx.Observable<InferMapParam<I[T]>>;

  constructor(private source$: rx.Observable<Action<I[T]>>, private keySelector: (payload: InferMapParam<I[T]>) => K) {
    this.future$ = this.source$.pipe(
      mapActionToPayload(),
      rx.share()
    );
    this.future$.subscribe(payload => {
      const key = keySelector(payload);
      this.snapshot.set(key, payload);
    });
  }

  getPayloadStreamOfKey(key: K) {
    if (this.snapshot.has(key)) {
      // replay last action
      return rx.concat(
        rx.of(this.snapshot.get(key)!),
        this.future$.pipe(
          rx.filter(p => this.keySelector(p) === key)
        )
      );
    } else {
      return this.future$.pipe(
        rx.filter(p => this.keySelector(p) === key)
      );
    }
  }
}
