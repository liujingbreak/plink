import * as rx from 'rxjs';
import { ActionFunctions, ActionMeta, Action } from './control';
import { SingleActionFactory } from './control2';
import { DuplexController } from './duplex2';
import { ActionTable } from './action-table';
import { ReactorCompositeOpt } from './reactor-base';
import { InferFuncReturnEvents, ActionFactoryOfPlainType, ExtractTupleElement } from './inferred-types';
interface BaseEvents {
    /** Internal use, when option `debug` is `true`, this message will be dispatched when
     * ReactorComposite2 is instantiated */
    __onNew(): SingleActionFactory;
    __onError(err: any): SingleActionFactory;
    __onDisposed(): SingleActionFactory;
}
interface BaseActions<I = Record<never, never>, O = Record<never, never>, LI extends readonly (keyof I)[] = readonly [], LO extends readonly (keyof O)[] = readonly []> {
    __config(opts: ReactorCompositeOpt<I, O, LI, LO>): SingleActionFactory;
}
declare const baseTableFor: readonly ["__onError", "__onDisposed"];
type LOE<LI extends readonly any[]> = LI[number] | ExtractTupleElement<typeof baseTableFor>;
/**
 * Recommend to use SimplexReactor instead of this class, this class will be deprecated in future version
 */
export declare class ReactorComposite2<I = Record<never, never>, O = Record<never, never>, LI extends readonly (keyof I)[] | (keyof I)[] = [], LO extends readonly (keyof O)[] | (keyof O)[] = []> extends DuplexController<I & BaseActions<I, O, LI, LO>, O & BaseEvents> {
    private opts?;
    destory$: rx.Observable<unknown>;
    protected errorSubject: rx.Subject<[label: string, originError: any]>;
    dispose: () => void;
    error$: rx.Observable<readonly [error: any, label: string | null]>;
    get inputTable(): ActionTable<I, LI[number]>;
    /** alias of inputTable */
    get it(): ActionTable<I, LI[number]>;
    /** alias of outputTable */
    get ot(): ActionTable<O & BaseEvents, LOE<LO>>;
    get outputTable(): ActionTable<O & BaseEvents, LOE<LO>>;
    private iTable;
    private oTable;
    protected reactorSubj: rx.Subject<[label: string, stream: rx.Observable<any>, disableCatchError?: boolean]>;
    constructor(opts?: ReactorCompositeOpt<I, O, LI, LO> | undefined);
    /** @deprecated no longer needed, always start automatically after being contructed */
    startAll(): void;
    /** @deprecated call dispose() instead */
    destory(): void;
    /**
     * For properties "inputTableFor", "outputTableFor", the elements inside them are considered as being added new action
     * keys to existing action table's structure
     */
    config<I2 = Record<string, never>, O2 = Record<string, never>, LI2 extends ReadonlyArray<keyof I2> | Array<keyof I2> = [], LO2 extends ReadonlyArray<keyof O2> | Array<keyof O2> = []>(opts: ReactorCompositeOpt<I & I2 & BaseActions<unknown>, O & O2 & BaseEvents, LI2, LO2>): ReactorComposite2<I & I2, O & O2, (LI[number] | LI2[number])[], (LO[number] | LO2[number])[]>;
    reactivize<F extends ActionFunctions>(fObject: F): ReactorComposite2<I & ActionFactoryOfPlainType<F>, InferFuncReturnEvents<F> & O, LI, LO>;
    reativizeRecursiveFuncs<F extends ActionFunctions>(fObject: F): ReactorComposite2<InferFuncReturnEvents<F> & I & ActionFactoryOfPlainType<F>, InferFuncReturnEvents<F> & O, LI, LO>;
    /**
     * It is just a declaration of mergeMap() operator, which merge an observable to the main stream
     * which will be or has already been observed by `startAll()`.
     * This is where we can add `side effect`s
    * */
    addReaction(...params: [label: string, stream: rx.Observable<any>, disableCatchError?: boolean]): void;
    /** Abbrevation of addReaction */
    r: (...params: [label: string, stream: rx.Observable<any>, disableCatchError?: boolean] | [stream: rx.Observable<any>, disableCatchError?: boolean]) => void;
    /**
     * An rx operator tracks down "lobel" information in error log via a 'catchError' inside it, to help to locate errors.
     * This operator will continue to throw any errors from upstream observable, if you want to play any side-effect to
     * errors, you should add your own "catchError" after.
     *
     * `addReaction(label, ...)` uses this op internally.
     */
    labelError<T>(label: string): (upStream: rx.Observable<T>) => rx.Observable<T>;
    catchErrorFor<T>(...actionMetas: ActionMeta[]): (upStream: rx.Observable<T>) => rx.Observable<T>;
    /** Respond an error to actions specified by "actionMeta",
     * be aware that this message is not an Observable's "error" message,
     * it will not terminate observable stream.
     * This method emits an event "__onError" under the hood.
     */
    dispatchErrorFor(err: any, actionMeta: ActionMeta, ...moreActionMetas: ActionMeta[]): void;
    /** Rx operator function, filter action or payload stream by:
     *  action ID (Action['i']), this method also react to __onError messages, the returned observable emits Error message when the initial action producer
     *  invokes "catchErrorFor()" or "dispatchErrorFor()"
     **/
    actionRelatedToAction<T extends [ActionMeta, ...any[]] | Action<any>>(actionOrMeta: {
        i: ActionMeta['i'];
    }): (up: rx.Observable<T>) => rx.Observable<T>;
    reactivizeFunction(key: string, func: (...a: any[]) => any, funcThisRef?: any): string;
    protected logError(label: string, err: any): void;
    protected handleError(upStream: rx.Observable<any>, label?: string, hehavior?: 'continue' | 'stop' | 'throw'): rx.Observable<any>;
}
export {};
