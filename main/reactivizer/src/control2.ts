/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import * as rx from 'rxjs';
import {Action, InferPayload, ActionMeta,
  ArrayOrTuple, ControllerCore, CoreOptions,
  nameOfAction, InferMapParam} from './stream-core';
import {PayloadByType, ActionByType} from './inferred-types';
import {ActionDataTable} from './action-table';
import {ActionDispenser} from './stream-dispense';
import {SingleActionFactory, SingleActionFactoryImpl} from './action-factory';
export {SingleActionFactory};

export type ActionFactory = {
  [k: string]: (...args: any[]) => SingleActionFactory;
};

export class RxController2<I> extends ControllerCore<I> {
  /** Abbrevation of payloadByType */
  pt: PayloadByType<I>;
  /** Action observable streamby type */
  at: ActionByType<I>;
  /** Action factory by type */
  get ft(): I {
    if (this.ftProxy)
      return this.ftProxy;
    const factories = this.factories;
    const opts = this.opts;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const control = this;
    this.ftProxy = new Proxy({}, {
      get(_target, key, _rec) {
        if (factories.has(key)) {
          return factories.get(key);
        }
        const fn = (...args: InferPayload<I[keyof I]>): SingleActionFactory => {
          return new SingleActionFactoryImpl(key as keyof I, args, control, {
            slowLog(a) {
              const msg = `Detected a slow responding message of dispatched action of "${control.logPrefix} ${key as string} #${a.i}"`;
              if (opts?.log) {
                opts!.log(msg);
              } else {
                // eslint-disable-next-line no-console
                console.log(msg);
              }
            }
          });
        };
        factories.set(key, fn);
        return fn;
      },

      has(_target, key) {
        return Object.prototype.hasOwnProperty.call(control.at, key);
      },
      ownKeys() {
        return Object.keys(control.at);
      }
    }) as I;
    return this.ftProxy;
  }
  private ftProxy: I | undefined;
  private factories = new Map<string | symbol, (...args: any[]) => any>();
  /** Rx operator for `do()`, we can change it by emit new value to this observable,
   * you don't need to use this Subject directly, it is meant to be extended by Reactivizer internally
   * */
  doOperator$ = new rx.BehaviorSubject<<A, F>(dispatchingAction: Action<A>) => (response$: rx.Observable<Action<F>>) => rx.Observable<Action<F>>>(
    (_dispatchingAction) => input => input
  );

  constructor(opts?: CoreOptions<I> & {debugTableAction?: boolean}) {
    super(opts);
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const actionDispenseByType = ActionDispenser.ofRxController(this);
    this.at = actionDispenseByType.at;
    this.pt = actionDispenseByType.pt;
  }

  /**
   * In short, subscribers of both controllers can recieve messages dispatched from both controller, just the subscribers of target controller always
   * recieves earlier than any subscribers of this controller.
   * It help to conquer recursive message emitting problem when extending reactor.
   *
   * 1. Target dispatches --message--> target.actionUpstream(intercepted) --> this.actionUpstream (intercepted) --> target.action$, this.action$
   * 2. This dispatches --message--> this.actionUpstream (intercepted) --> target.action$, this.action$
   *
   * Target controller will always recieve a copy of each action from this controller, and awlays recieves earlier than this controller's subscribers,
   * Any action dispatched by target controller will always be piped to this controller's actionUpstream instead of its owns, so that again both
   * target and this controller will recieves them.
   *
   */
  forkController() {
    const targetCtl = new RxController2<I>({debug: false});
    targetCtl.typePrefix = this.typePrefix;
    const targetUpStream = new rx.Subject<Action<I[keyof I]>>();
    targetCtl.interceptor$.next(a$ => {
      return rx.merge(
        a$.pipe(
          rx.map(a => this.actionUpstream.next(a)),
          rx.ignoreElements()
        ),
        targetUpStream
      );
    });
    this.interceptor$.next(a$ => a$.pipe(
      rx.tap(a => {
        targetUpStream.next(a);
      })
    ));
    return targetCtl;
  }
  /** This method internally uses [groupBy](https://rxjs.dev/api/index/function/groupBy#groupby) */
  groupControllerBy<K>(keySelector: (action: Action<I[keyof I]>) => K, groupedCtlOptionsFn?: (key: K) => CoreOptions<I>):
  rx.Observable<[newGroup: GroupedRxController2<I, K>, allGroups: Map<K, GroupedRxController2<I, K>>]> {
    return this.action$.pipe(
      rx.groupBy(keySelector),
      rx.map(grouped => {
        const opts = groupedCtlOptionsFn ?
          groupedCtlOptionsFn(grouped.key) :
          this.opts ?
            Object.entries(this.opts)
              .filter(([p]) => p !== 'name' && p !== 'autoConnect')
              .reduce((obj, [p, v]) => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                obj[p as keyof CoreOptions<I>] = v as any;
                return obj;
              }, {} as CoreOptions<I>) :
            {};

        const groupedRxCtl = new GroupedRxController2<I, K>(
          grouped.key,
          {...opts, autoConnect: false});

        // connect to source actionUpstream only when it is subscribed
        rx.concat(
          groupedRxCtl.actionSubscribed$.pipe(
            rx.tap(() => {
              groupedRxCtl.connect();
            }),
            rx.take(1)
          ),
          // Then dispatch source action to grouped controller
          grouped.pipe(
            rx.tap(action => deserializeAction2(action, groupedRxCtl))
          )
        ).pipe(
          rx.takeUntil(groupedRxCtl.actionUnsubscribed$)
        ).subscribe();

        return groupedRxCtl;
      }),
      rx.scan<
      GroupedRxController2<I, K>,
      [newGroup: GroupedRxController2<I, K>, allGroups: Map<K, GroupedRxController2<I, K>>],
      readonly [null, Map<K, GroupedRxController2<I, K>>]
      >((acc, el) => {
        const ret = acc as unknown as [GroupedRxController2<I, K>, Map<K, GroupedRxController2<I, K>>];
        ret[0] = el;
        ret[1].set(el.key, el);
        return ret;
      }, [null, new Map<K, GroupedRxController2<I, K>>()] as const)
    );
  }
  /**
   * create a new RxController, pipe actions whose tyoes are specofied in parameter `actionTypes` from this controller to the new controller
   */
  subForTypes<KS extends Array<keyof I> | ReadonlyArray<keyof I & string>>(actionTypes: KS, opts?: CoreOptions<Pick<I, KS[number]>>): RxController2<Pick<I, KS[number]>> {
    const sub = new RxController2<Pick<I, KS[number]>>(opts);
    sub.typePrefix = this.typePrefix;
    const typeSet = new Set(actionTypes);
    this.action$.pipe(
      rx.filter(a => typeSet.has(nameOfAction(a))),
      rx.tap(value => {
        sub.actionUpstream.next(value);
      })
    ).subscribe();
    return sub;
  }

  /**
   * Create an very simple and naive version Apache Kafka KTable like "observable Map<K, Action>",
   * a table which retains latest action by "key"
   **/
  createDataTable<T extends keyof I, K>(actionType: T, keySelector: (action: InferMapParam<I[T]>) => K) {
    return new ActionDataTable(this.at[actionType], keySelector);
  }

  /**
   * create a new RxController whose action$ is filtered for action types that is included in `actionTypes`
   */
  subForExcludeTypes<KS extends Array<keyof I> | ReadonlyArray<keyof I>>(excludeActionTypes: KS, opts?: CoreOptions<Omit<I, KS[number]>>): RxController2<Omit<I, KS[number]>> {
    const sub = new RxController2<Omit<I, KS[number]>>(opts);
    const typeSet = new Set(excludeActionTypes);
    this.action$.pipe(
      rx.filter(a => !typeSet.has(nameOfAction(a))),
      rx.tap(value => {
        sub.actionUpstream.next(value);
      })
    ).subscribe();
    return sub;
  }

  /**
   * Create a variant of calling .ft(...).dp(...)`
   **/
  createDispatcherFor<K extends keyof I>(type: K, ...actionMetaRelated: ArrayOrTuple<ActionMeta | undefined>): (...params: InferPayload<I[K]>) => void {
    return (...params) => (this.ft[type] as (...p: any[]) => SingleActionFactory)(...params).dp(...actionMetaRelated);
  }

  /**
   * Create a variant of interface of functions `<I>.ft(...).dp(...)`
   **/
  createDispatchers(...actionMetaRelated: ArrayOrTuple<ActionMeta | undefined>): {[K in keyof I]: (...params: InferPayload<I[K]>) => void} {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    const dispatchers = new Map<string | symbol, (...p: InferPayload<I[keyof I]>) => void>();
    return new Proxy({} as {[K in keyof I]: (...params: InferPayload<I[K]>) => void}, {
      get(_target, key, _rec) {
        const existing = dispatchers.get(key);
        if (existing)
          return existing;
        const d = self.createDispatcherFor(key as keyof I, ...actionMetaRelated);
        dispatchers.set(key, d);
        return self.createDispatcherFor(key as keyof I, ...actionMetaRelated);
      },
      has(_target, key) {
        return Object.prototype.hasOwnProperty.call(self.ft, key);
      },
      ownKeys() {
        return Object.keys(self.ft as object);
      }
    });
  }
}

export class GroupedRxController2<I, K> extends RxController2<I> {
  constructor(public key: K, opts?: CoreOptions<I>) {
    super(opts);
  }
}
/**
 * Create a new Action with same "p", "i" and "r" properties and dispatched to RxController,
 * but changed "t" property which comfort to target "toRxController"
 * @return that dispatched new action object
 */
export function deserializeAction2<I>(actionObj: any, toController: RxController2<I>) {
  return toController.copyActionFrom(actionObj);
}
