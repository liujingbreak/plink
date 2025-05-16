import * as rx from 'rxjs';
import { InferPayload, InferMapParam, Action } from './stream-core';
import { RxController } from './control';
import { RxController2 } from './control2';
import { ActionTableDataType, PayloadByType } from './inferred-types';
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
export declare class ActionTable<I, IK extends keyof I> {
    #private;
    private streamCtl;
    actionNames: Set<string>;
    latestPayloads: PayloadByType<{ [K in IK]: I[K]; }>;
    /** Abbrevation of "latestPayloads", pointing to exactly same instance of latestPayloads */
    l: PayloadByType<{
        [K in IK]: I[K];
    }>;
    get dataChange$(): rx.Observable<ActionTableDataType<I, IK>>;
    get data(): ActionTableDataType<I, IK>;
    actionSnapshot: Map<string, InferMapParam<unknown>>;
    constructor(streamCtl: RxController<I> | RxController2<I>, actionNames: readonly IK[]);
    constructor(streamCtl: RxController<I> | RxController2<I>, baseTable: ActionTable<I, IK>);
    /** @deprecated use .data instead */
    getData(): ActionTableDataType<I, IK>;
    /** Add actions to be recoreded in table map, action name which is duplicate to existings
     * will be ignored,
     * by creating `ReplaySubject(1)` for each action payload stream respectively
     */
    addActions<M extends keyof I>(...actionNames: M[]): ActionTable<I, IK | M>;
    getLatestActionOf<K extends IK[][number]>(actionName: K): InferMapParam<I[K]> | undefined;
    protected debugLogLatestActionOperator<K extends keyof I, P extends InferMapParam<I[K]>>(type: K): rx.OperatorFunction<P, P>;
}
/** Consider it as Apache Kafka's KTable */
export declare class ActionDataTable<I, T extends keyof I, K> {
    private source$;
    private keySelector;
    snapshot: Map<K, [import("./stream-core").ActionMeta, ...InferPayload<I[T]>]>;
    /** Alias of latestPayload */
    ofKey: (key: K) => rx.Observable<[import("./stream-core").ActionMeta, ...InferPayload<I[T]>]>;
    private future$;
    constructor(source$: rx.Observable<Action<I[T]>>, keySelector: (payload: InferMapParam<I[T]>) => K);
    getPayloadStreamOfKey(key: K): rx.Observable<[import("./stream-core").ActionMeta, ...InferPayload<I[T]>]>;
}
