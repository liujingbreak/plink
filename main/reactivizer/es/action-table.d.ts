import * as rx from 'rxjs';
import { InferPayload, InferMapParam, Action } from './stream-core';
import { RxController } from './control';
import { RxController2 } from './control2';
import { ActionTableDataType, PayloadByType } from './inferred-types';
export declare class ActionTable<I, IK extends keyof I> {
    #private;
    private streamCtl;
    private actionNames;
    latestPayloads: PayloadByType<{ [K in IK]: I[K]; }>;
    /** Abbrevation of "latestPayloads", pointing to exactly same instance of latestPayloads */
    l: PayloadByType<{
        [K in IK]: I[K];
    }>;
    get dataChange$(): rx.Observable<ActionTableDataType<I, IK>>;
    private data;
    actionSnapshot: Map<string, [import("./stream-core").ActionMeta, ...InferPayload<I[keyof I]>]>;
    private actionNamesAdded$;
    constructor(streamCtl: RxController<I> | RxController2<I>, actionNames: IK[] | readonly IK[]);
    getData(): ActionTableDataType<I, IK>;
    /** Add actions to be recoreded in table map,
     * by creating `ReplaySubject(1)` for each action payload stream respectively
     */
    addActions<M extends keyof I>(...actionNames: M[]): ActionTable<I, IK | M>;
    private onAddActions;
    getLatestActionOf<K extends IK[][number]>(actionName: K): InferMapParam<I[K]> | undefined;
    protected debugLogLatestActionOperator<K extends keyof I, P extends InferMapParam<I[K]>>(type: K): rx.OperatorFunction<P, P>;
}
/** Consider it as Apache Kafka's KTable */
export declare class ActionDataTable<I, T extends keyof I, K> {
    private source$;
    private keySelector;
    snapshot: Map<K, InferMapParam<I[T]>>;
    /** Alias of latestPayload */
    ofKey: (key: K) => rx.Observable<[import("./stream-core").ActionMeta, ...InferPayload<I[T]>]>;
    private future$;
    constructor(source$: rx.Observable<Action<I[T]>>, keySelector: (payload: InferMapParam<I[T]>) => K);
    getPayloadStreamOfKey(key: K): rx.Observable<[import("./stream-core").ActionMeta, ...InferPayload<I[T]>]>;
}
