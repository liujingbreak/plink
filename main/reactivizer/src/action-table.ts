import * as rx from 'rxjs';
import {InferPayload, InferMapParam, Action,
  has, actionMetaToStr} from './stream-core';
import {RxController, mapActionToPayload} from './control';
import {RxController2} from './control2';
import {ActionTableDataType, PayloadByType} from './inferred-types';

const EMPTY_ARRY = [] as [];

/**
 * ActionTable stores "latest" action messages, acting like a "BehaviorSubject", you can get the latest messages
 * by accessing:
 *
 * 1) `.actionSnapshot` which is a `Map`, the keys of it is message types, the values are the mapped payload array which
 *  includes ActionMeta as first element.
 * 2) `.data` which returns a hash object, the property names of it are message types, the values are the payload array
 *
 * You can also observe changes of the messages by accessing:
 * 1) `.l` or `.latestPayloads` which is a hash object, the property name of it are message types, the values
 *      are Observable of mapped payload array (which contains ActionMeta)
 * 2) `.dataChange$` which is Observable of returned hash object of `.getData()`
 *
 * Above Observable are all acting like a `ReplaySubject(1)`, which always immediately emits the last stored message when
 * being subscribed.
 */
export class ActionTable<I, IK extends keyof I> {
  actionNames: Set<string>;
  latestPayloads = {} as PayloadByType<{[K in IK]: I[K]}>;
  /** Abbrevation of "latestPayloads", pointing to exactly same instance of latestPayloads */
  l: PayloadByType<{[K in IK]: I[K]}>;

  get dataChange$(): rx.Observable<ActionTableDataType<I, IK>> {
    if (this.#dataChange$)
      return this.#dataChange$;

    this.#dataChange$ = this.#actionNamesAdded$.pipe(
      rx.switchMap(() => rx.from(this.actionNames)),
      rx.mergeMap(actionName => this.latestPayloads[actionName as IK]),
      rx.map(() => {
        this.#data = {} as ActionTableDataType<I, IK>;
        for (const k of this.actionNames as Set<IK[][number]>) {
          const v = this.actionSnapshot.get(k as string);
          const old = this.#data[k];

          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (old === EMPTY_ARRY || old == null)
            this.#data[k] = v ? v.slice(1) as InferPayload<I[keyof I]> : EMPTY_ARRY;
          else {
            if (v) {
              this.#data[k] = v.slice(1) as InferPayload<I[keyof I]>;
              // old.splice(0);
              // for (let i = 1, l = v.length; i < l; i++)
              //   (old as any[]).push(v[i]);
            } else
              this.#data[k] = EMPTY_ARRY;
          }
        }
        return this.#data;
      }),
      rx.share()
    );
    return this.#dataChange$;
  }

  get data(): ActionTableDataType<I, IK> {
    return this.#data;
  }

  actionSnapshot: Map<string, InferMapParam<unknown>>;
  #dataChange$: rx.Observable<ActionTableDataType<I, IK>> | undefined;
  #actionNamesAdded$: rx.ReplaySubject<any[]>;
  /** the source of dataChange$ */
  #data: ActionTableDataType<I, IK>;

  constructor(streamCtl: RxController<I> | RxController2<I>, actionNames: readonly IK[]);
  constructor(streamCtl: RxController<I> | RxController2<I>, baseTable: ActionTable<I, IK>);
  constructor(private streamCtl: RxController<I> | RxController2<I>, actionsOrTable: readonly IK[] | ActionTable<I, IK>) {
    const baseTable = Array.isArray(actionsOrTable) ? null : actionsOrTable as ActionTable<I, IK>;
    if (baseTable == null) {
      this.actionNames = new Set();
      this.#actionNamesAdded$ = new rx.ReplaySubject<any[]>(1);
      this.addActions(...actionsOrTable as IK[]);
      this.actionSnapshot = new Map<string, InferMapParam<unknown>>();
      this.#data = {} as ActionTableDataType<I, IK>;
    } else {
      this.actionNames = baseTable.actionNames;
      this.#actionNamesAdded$ = baseTable.#actionNamesAdded$;
      this.actionSnapshot = baseTable.actionSnapshot;
      this.#data = baseTable.#data;
    }
    this.l = this.latestPayloads;

    // Assign this.#data, this.latestPayloads, this.actionSnapshot
    this.#actionNamesAdded$.pipe(
      rx.mergeMap(actionNames => {
        return actionNames as (keyof I)[];
      }),
      rx.mergeMap(actionName => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (this.#data[actionName as IK] == null)
          this.#data[actionName as IK] = EMPTY_ARRY;
        if (has.call(this.latestPayloads, actionName))
          return rx.EMPTY;

        const a$ = new rx.ReplaySubject<InferMapParam<I[keyof I]>>(1);
        this.latestPayloads[actionName as IK] = this.streamCtl.opts.debugTableAction ?
            a$.pipe(this.debugLogLatestActionOperator(actionName)) :
            a$.asObservable();

        let source = (this.streamCtl as RxController2<I>).at[actionName];
        if (baseTable) {
          const baseLatest = baseTable.actionSnapshot.get(actionName as string);
          if (baseLatest) {
            source = rx.concat(
              rx.of({t: actionName, i: baseLatest[0].i, p: baseLatest.slice(1)} as Action<I[keyof I]>),
              source
            );
          }
        }
        return source.pipe(
          rx.map(a => {
            // Always use a brand new array to maintain immutability, which serves things like rx.distinctUntilChanged()
            const mapParam = [{i: a.i, r: a.r}, ...a.p] as InferMapParam<I[keyof I]>;
            this.actionSnapshot.set(actionName as string, mapParam);
            return mapParam;
          }),
          rx.tap(a$)
        );
      })
    ).subscribe();
    this.dataChange$.subscribe(); // to make sure this.#data will be fulfilled even when there is no any external observer
  }

  /** @deprecated use .data instead */
  getData(): ActionTableDataType<I, IK> {
    return this.#data;
  }

  /** Add actions to be recoreded in table map, action name which is duplicate to existings
   * will be ignored,
   * by creating `ReplaySubject(1)` for each action payload stream respectively
   */
  addActions<M extends keyof I>(...actionNames: M[]) {
    const uniqueNewActions = actionNames.filter(a => !this.actionNames.has(a as string));
    for (const a of uniqueNewActions) {
      this.actionNames.add(a as string);
    }
    this.#actionNamesAdded$.next(uniqueNewActions);
    return this as ActionTable<I, IK | M>;
  }

  getLatestActionOf<K extends IK[][number]>(actionName: K): InferMapParam<I[K]> | undefined {
    return this.actionSnapshot.get(actionName as string) as InferMapParam<I[K]> | undefined;
  }

  protected debugLogLatestActionOperator<K extends keyof I, P extends InferMapParam<I[K]>>(type: K) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const core = (this.streamCtl as RxController<I>).core ?? (this.streamCtl as RxController2<any>);
    return this.streamCtl.opts.log ?
        rx.map<P, P>((action, idx) => {
          if (idx === 0 && !core.debugExcludeSet.has(type)) {
            this.streamCtl.opts.log!(core.logPrefix + 'rx:latest', type, actionMetaToStr(action[0]));
          }
          return action;
        }) :
        (typeof window !== 'undefined') || (typeof Worker !== 'undefined') ?
            rx.map<P, P>((p, idx) => {
              if (idx === 0 && !core.debugExcludeSet.has(type)) {
                // eslint-disable-next-line no-console
                console.log(`%c ${core.logPrefix} latest `, 'color: #f0fe0fe0; background: #8c61dd;', type,
                  actionMetaToStr(p[0]));
              }
              return p;
            }) :
            rx.map<P, P>((p, idx) => {
              if (idx > 0 && !core.debugExcludeSet.has(type)) {
                // eslint-disable-next-line no-console
                console.log(core.logPrefix + ' latest:', type, actionMetaToStr(p[0]));
              }
              return p;
            });
  }
}

/** Consider it as Apache Kafka's KTable */
export class ActionDataTable<I, T extends keyof I, K> {
  snapshot = new Map<K, InferMapParam<I[T]>>();
  /** Alias of latestPayload */
  // eslint-disable-next-line @typescript-eslint/unbound-method
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
