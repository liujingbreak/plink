import * as rx from 'rxjs';
import { RxController2 } from './control2';
import { ActionTable } from './action-table';
import { ForkedRxController } from './forked-control';
import { actionRelatedToAction } from './context-operators';
const baseTableFor = ['__onError', '__onDisposed'];
let SEQ = new Date().getUTCMilliseconds();
export class SimplexReactor {
    constructor(opts) {
        var _a, _b;
        this.r = (...params) => {
            if (typeof params[0] === 'string')
                this.reactorSubj.next(params);
            else
                this.reactorSubj.next(['', ...params]);
        };
        // /** cast current SimplexReactor type to its logical super type for Typescript type assignable check */
        // asBaseType = this as unknown as BaseType;
        /** alias of "asBaseType",
         * cast current SimplexReactor type to its logical super type for Typescript type assignable check
         **/
        // b = this as unknown as BaseType;
        this.id = SEQ++;
        this.reactorSubj = new rx.ReplaySubject();
        this.errorSubject = new rx.ReplaySubject(20);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        this.opts = opts;
        this.s = new RxController2(Object.assign(Object.assign({}, opts), { name: ((_a = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _a !== void 0 ? _a : '') + `@${this.id}` }));
        const internalMsgCtl = this.s;
        const doOperator = (dispatchingAction) => (response$) => rx.merge(response$, internalMsgCtl.pt.__onError.pipe(actionRelatedToAction(dispatchingAction), rx.map(([, err]) => {
            throw err;
        })));
        this.s.doOperator$.next(doOperator);
        // Everthing internally observables should goes here
        rx.merge(internalMsgCtl.pt.__onError.pipe(rx.map(([, err]) => {
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
        }))).pipe(rx.takeUntil(internalMsgCtl.pt.__onDisposed), rx.catchError((err, src) => {
            var _a;
            if ((_a = this.opts) === null || _a === void 0 ? void 0 : _a.log)
                this.opts.log(err);
            else
                console.error(err);
            return src;
        })).subscribe();
        this.table = new ActionTable(this.s, [...(_b = opts === null || opts === void 0 ? void 0 : opts.tableFor) !== null && _b !== void 0 ? _b : [], ...baseTableFor]);
        const internalTable = this.table;
        this.error$ = rx.merge(this.errorSubject.pipe(rx.map(([label, err]) => [err, label])), internalTable.l.__onError.pipe(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        rx.map(([, err]) => [err, null]))).pipe(rx.share());
        this.destory$ = internalMsgCtl.pt.__onDisposed;
        this.dispose = () => {
            internalMsgCtl.ft.__onDisposed().dp();
        };
        this.r('__config', internalMsgCtl.pt.__config.pipe(rx.map(([, opts]) => this.config(opts))));
    }
    /**
     * This method can be used to change "options" after SimplexReactor instanciation, e.g. `.change({debug: true})` to enable action tracing log for debug.
     * This method can also be useful to "cast" type of one SimplexReactor type to another extended type, in this case generic type parameter `<I2, LI2>` must
     * be explicitly provided to ensure returned type being correctly inferred, a property `tableFor` of parameter `opts` must be provided to correspond with `LI2`
     */
    config(opts) {
        if (this.opts) {
            Object.assign(this.opts, opts);
        }
        else {
            this.opts = opts;
        }
        if (opts.tableFor) {
            this.table.addActions(...opts.tableFor);
        }
        this.s.config(Object.entries(opts).reduce((obj, [p, v]) => {
            if (p !== 'tableFor') {
                if (p === 'name')
                    obj.name = opts.name + '@' + this.id;
                else {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    obj[p] = v;
                }
            }
            return obj;
        }, {}));
        return this;
    }
    /** Turn current reactors to extend mode,
     * fork a stream RxController2 to ForkedRxController, so that we can create new reactors by subscribing to
     * new forked stream controller, and be able to manipulate previously created reactors by "appendInterceptorToSrc()"
     **/
    forExtend() {
        this.s = new ForkedRxController(this.s);
        return this;
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
    catchErrorFor(actionMeta, ...actionMetas) {
        return (upStream) => upStream.pipe(rx.catchError((err) => {
            this.dispatchErrorFor(err, actionMeta, ...actionMetas);
            return rx.EMPTY;
        }));
    }
    /** Rx operator function, filter action or payload stream by:
    * action ID (Action['i']), this method also react to __onError messages, the returned observable emits Error message when the initial action producer
    * invokes "catchErrorFor()" or "dispatchErrorFor()"
    */
    actionRelatedToAction(actionOrMeta) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const s = this.s;
        return function (up) {
            return s.doOperator$.pipe(rx.switchMap(operator => up.pipe(operator(actionOrMeta), actionRelatedToAction(actionOrMeta))));
        };
    }
    /** Respond an error to actions specified by "actionMeta",
     * be aware that this message is not an Observable's "error" message,
     * it will not terminate observable stream.
     * This method emits an event "__onError" under the hood.
     */
    dispatchErrorFor(err, actionMeta, ...moreActionMetas) {
        this.s.ft.__onError(err).dp(actionMeta, ...moreActionMetas);
    }
    reactivize(fObject) {
        const funcs = Object.entries(fObject);
        for (const [key, func] of funcs) {
            if (typeof func === 'function') {
                this.reactivizeFunction(key, func, fObject);
            }
        }
        return this;
    }
    log(...msg) {
        var _a, _b, _c, _d;
        if ((_a = this.opts) === null || _a === void 0 ? void 0 : _a.debug) {
            if ((_b = this.opts) === null || _b === void 0 ? void 0 : _b.log)
                this.opts.log(((_c = this.s.logPrefix) !== null && _c !== void 0 ? _c : ''), ...msg);
            else {
                // eslint-disable-next-line no-console
                console.log(((_d = this.s.logPrefix) !== null && _d !== void 0 ? _d : ''), ...msg);
            }
        }
    }
    reactivizeFunction(key, func, funcThisRef) {
        const resolveFuncKey = key + 'Resolved';
        const finishFuncKey = key + 'Completed';
        const dispatchResolved = this.s.dispatchForFactory(resolveFuncKey);
        const dispatchCompleted = this.s.dispatchForFactory(finishFuncKey);
        this.r(this.s.pt[key].pipe(rx.mergeMap(([meta, ...params]) => {
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
    // init() {
    //   this.s.ft.__onInit().dp();
    //   return this;
    // }
    /** @deprecated no longer needed, always start automatically after being contructed */
    startAll() {
        return this;
    }
    /** @deprecated call dispose() instead */
    destory() {
        this.dispose();
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
/** You should never create instance by constructor of this class,
 **/
export class DerivedSimplexReactor extends SimplexReactor {
    constructor(ancestor) {
        super();
        this.s = new ForkedRxController(ancestor.s);
        this.table = new ActionTable(this.s, [...ancestor.table.actionNames]);
    }
}
//# sourceMappingURL=simplex-reactor.js.map