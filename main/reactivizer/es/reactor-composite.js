import * as rx from 'rxjs';
import { actionRelatedToAction } from './context-operators';
import { DuplexController } from './duplex2';
import { ActionTable } from './action-table';
const baseTableFor = ['__onError', '__onDisposed'];
/**
 * Recommend to use SimplexReactor instead of this class, this class will be deprecated in future version
 */
export class ReactorComposite2 extends DuplexController {
    get inputTable() {
        return this.it;
    }
    /** alias of inputTable */
    get it() {
        if (this.iTable)
            return this.iTable;
        this.iTable = new ActionTable(this.i, []);
        return this.iTable;
    }
    /** alias of outputTable */
    get ot() {
        return this.oTable;
    }
    get outputTable() {
        return this.ot;
    }
    constructor(opts) {
        var _a;
        super(opts);
        this.opts = opts;
        this.errorSubject = new rx.ReplaySubject(20);
        /** Abbrevation of addReaction */
        this.r = (...params) => {
            if (typeof params[0] === 'string')
                this.reactorSubj.next(params);
            else
                this.reactorSubj.next(['', ...params]);
        };
        const input$ = this.i;
        const output$ = this.o;
        if (opts === null || opts === void 0 ? void 0 : opts.debug) {
            output$.ft.__onNew().dp();
        }
        this.reactorSubj = new rx.ReplaySubject();
        const doOperator = (dispatchingAction) => (response$) => rx.merge(response$, this.o.pt.__onError.pipe(actionRelatedToAction(dispatchingAction), rx.map(([, err]) => {
            throw err;
        })));
        input$.doOperator$.next(doOperator);
        output$.doOperator$.next(doOperator);
        if ((opts === null || opts === void 0 ? void 0 : opts.inputTableFor) && (opts === null || opts === void 0 ? void 0 : opts.inputTableFor.length) > 0) {
            this.iTable = new ActionTable(input$, opts.inputTableFor);
        }
        this.oTable = new ActionTable(this.o, [...((_a = opts === null || opts === void 0 ? void 0 : opts.outputTableFor) !== null && _a !== void 0 ? _a : []), ...baseTableFor]);
        rx.merge(output$.pt.__onError.pipe(rx.map(([, err]) => {
            var _a;
            if ((_a = this.opts) === null || _a === void 0 ? void 0 : _a.log)
                this.opts.log(err);
            else
                console.error(err);
        })), this.reactorSubj.pipe(rx.mergeMap(([label, downStream, noError]) => {
            if (noError == null || !noError) {
                downStream = this.handleError(downStream, label);
            }
            return downStream;
        }))).pipe(rx.takeUntil(output$.pt.__onDisposed), rx.catchError((err, src) => {
            var _a;
            if ((_a = this.opts) === null || _a === void 0 ? void 0 : _a.log)
                this.opts.log(err);
            else
                console.error(err);
            return src;
        })).subscribe();
        // this.logSubj = new rx.ReplaySubject(50);
        this.dispose = () => {
            output$.ft.__onDisposed().dp();
        };
        this.error$ = rx.merge(this.errorSubject.pipe(rx.map(([label, err]) => [err, label])), output$.pt.__onError.pipe(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        rx.map(([, err]) => [err, null])));
        this.destory$ = this.outputTable.l.__onDisposed;
        this.r('__config', input$.pt.__config.pipe(rx.map(([, opts]) => this.config(opts))));
    }
    /** @deprecated no longer needed, always start automatically after being contructed */
    startAll() { }
    /** @deprecated call dispose() instead */
    destory() {
        this.dispose();
    }
    /**
     * For properties "inputTableFor", "outputTableFor", the elements inside them are considered as being added new action
     * keys to existing action table's structure
     */
    config(opts) {
        if (opts.inputTableFor) {
            this.inputTable.addActions(...opts.inputTableFor);
        }
        if (opts.outputTableFor) {
            this.outputTable.addActions(...opts.outputTableFor);
        }
        super.config(Object.entries(opts).reduce((obj, [p, v]) => {
            if (p !== 'inputTableFor' && p !== 'outputTableFor') {
                obj[p] = v;
            }
            return obj;
        }, {}));
        return this;
    }
    // eslint-disable-next-line space-before-function-paren
    reactivize(fObject) {
        const funcs = Object.entries(fObject);
        for (const [key, func] of funcs) {
            if (typeof func === 'function') {
                this.reactivizeFunction(key, func, fObject);
            }
        }
        return this;
    }
    reativizeRecursiveFuncs(fObject) {
        this.reactivize(fObject);
        return this;
    }
    /**
     * It is just a declaration of mergeMap() operator, which merge an observable to the main stream
     * which will be or has already been observed by `startAll()`.
     * This is where we can add `side effect`s
    * */
    addReaction(...params) {
        this.r(...params);
    }
    /**
     * An rx operator tracks down "lobel" information in error log via a 'catchError' inside it, to help to locate errors.
     * This operator will continue to throw any errors from upstream observable, if you want to play any side-effect to
     * errors, you should add your own "catchError" after.
     *
     * `addReaction(label, ...)` uses this op internally.
     */
    labelError(label) {
        return (upStream) => upStream.pipe(rx.catchError((err) => {
            this.logError(label, err);
            return rx.throwError(() => err instanceof Error ? err : new Error(err));
        }));
    }
    catchErrorFor(...actionMetas) {
        return (upStream) => upStream.pipe(rx.catchError((err) => {
            this.o.ft.__onError(err).dp(...actionMetas);
            return rx.EMPTY;
        }));
    }
    /** Respond an error to actions specified by "actionMeta",
     * be aware that this message is not an Observable's "error" message,
     * it will not terminate observable stream.
     * This method emits an event "__onError" under the hood.
     */
    dispatchErrorFor(err, actionMeta, ...moreActionMetas) {
        this.o.ft.__onError(err).dp(actionMeta, ...moreActionMetas);
    }
    /** Rx operator function, filter action or payload stream by:
     *  action ID (Action['i']), this method also react to __onError messages, the returned observable emits Error message when the initial action producer
     *  invokes "catchErrorFor()" or "dispatchErrorFor()"
     **/
    actionRelatedToAction(actionOrMeta) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const s = this.o;
        return function (up) {
            return s.doOperator$.pipe(rx.switchMap(operator => up.pipe(operator(actionOrMeta), actionRelatedToAction(actionOrMeta))));
        };
    }
    reactivizeFunction(key, func, funcThisRef) {
        const resolveFuncKey = key + 'Resolved';
        const finishFuncKey = key + 'Completed';
        const dispatchResolved = this.o.dispatchForFactory(resolveFuncKey);
        const dispatchCompleted = this.o.dispatchForFactory(finishFuncKey);
        this.r(this.i.pt[key].pipe(rx.mergeMap(([meta, ...params]) => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const res = func.apply(funcThisRef, params);
                if (rx.isObservable(res)) {
                    return res.pipe(rx.map(resValue => dispatchResolved(meta, resValue)), this.catchErrorFor(meta), rx.finalize(() => dispatchCompleted(meta)));
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                }
                else if ((res === null || res === void 0 ? void 0 : res.then) != null && (res === null || res === void 0 ? void 0 : res.catch) != null) {
                    return rx.defer(() => res).pipe(rx.map(res => dispatchResolved(meta, res)), this.catchErrorFor(meta), rx.finalize(() => dispatchCompleted(meta)));
                }
                else {
                    dispatchResolved(meta, res);
                    dispatchCompleted(meta);
                    return rx.EMPTY;
                }
            }
            catch (err) {
                this.dispatchErrorFor(err, meta);
                return rx.EMPTY;
            }
        })));
        return resolveFuncKey;
    }
    logError(label, err) {
        var _a, _b;
        const message = 'Error@' + (((_a = this.opts) === null || _a === void 0 ? void 0 : _a.name) ? this.opts.name + '::' : '') + label;
        this.errorSubject.next([message, err]);
        if ((_b = this.opts) === null || _b === void 0 ? void 0 : _b.log)
            this.opts.log(message, err);
        else
            console.error(message, err);
    }
    handleError(upStream, label = '', hehavior = 'continue') {
        return upStream.pipe(rx.catchError((err, src) => {
            this.logError(label, err);
            if (hehavior === 'throw')
                return rx.throwError(() => err instanceof Error ? err : new Error(err));
            return hehavior === 'continue' ? src : rx.EMPTY;
        }));
    }
}
//# sourceMappingURL=reactor-composite.js.map