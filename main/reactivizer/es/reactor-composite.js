import * as rx from 'rxjs';
import { actionRelatedToAction } from './control';
import { DuplexController } from './duplex2';
import { ActionTable } from './action-table';
export class ReactorComposite2 extends DuplexController {
    get inputTable() {
        if (this.iTable)
            return this.iTable;
        this.iTable = new ActionTable(this.i, []);
        return this.iTable;
    }
    get outputTable() {
        if (this.oTable)
            return this.oTable;
        this.oTable = new ActionTable(this.o, ['__onErrorFor']);
        return this.oTable;
    }
    constructor(opts) {
        super(opts);
        this.opts = opts;
        this.errorSubject = new rx.ReplaySubject(20);
        /** All catched error goes here */
        this.error$ = this.errorSubject.asObservable();
        this.destory$ = new rx.ReplaySubject(1);
        /** Abbrevation of addReaction */
        this.r = (...params) => {
            if (typeof params[0] === 'string')
                this.reactorSubj.next(params);
            else
                this.reactorSubj.next(['', ...params]);
        };
        if (opts === null || opts === void 0 ? void 0 : opts.debug) {
            this.o.ft.__onNew().dp();
        }
        this.reactorSubj = new rx.ReplaySubject();
        const doOperator = (dispatchingAction) => (wait$) => rx.merge(wait$, this.o.pt.__onErrorFor.pipe(actionRelatedToAction(dispatchingAction), rx.map(([, err]) => {
            throw err;
        })));
        this.i.doOperator$.next(doOperator);
        this.o.doOperator$.next(doOperator);
        if ((opts === null || opts === void 0 ? void 0 : opts.inputTableFor) && (opts === null || opts === void 0 ? void 0 : opts.inputTableFor.length) > 0) {
            this.iTable = new ActionTable(this.i, opts.inputTableFor);
        }
        if ((opts === null || opts === void 0 ? void 0 : opts.outputTableFor) && (opts === null || opts === void 0 ? void 0 : opts.outputTableFor.length) > 0) {
            this.oTable = new ActionTable(this.o, [...opts.outputTableFor, '__onErrorFor']);
        }
        rx.merge(this.o.pt.__onErrorFor.pipe(rx.catchError((err, src) => {
            var _a;
            if ((_a = this.opts) === null || _a === void 0 ? void 0 : _a.log)
                this.opts.log(err);
            else
                console.error(err);
            return src;
        })), this.reactorSubj.pipe(rx.mergeMap(([label, downStream, noError]) => {
            if (noError == null || !noError) {
                downStream = this.handleError(downStream, label);
            }
            return downStream;
        }))).pipe(rx.takeUntil(this.destory$), rx.catchError((err, src) => {
            var _a;
            if ((_a = this.opts) === null || _a === void 0 ? void 0 : _a.log)
                this.opts.log(err);
            else
                console.error(err);
            return src;
        }));
        // this.logSubj = new rx.ReplaySubject(50);
        this.reactorSubj.pipe(rx.mergeMap(([label, downStream, noError]) => {
            if (noError == null || !noError) {
                downStream = this.handleError(downStream, label);
            }
            return downStream;
        }), rx.takeUntil(this.destory$), rx.catchError((err, src) => {
            var _a;
            if ((_a = this.opts) === null || _a === void 0 ? void 0 : _a.log)
                this.opts.log(err);
            else
                console.error(err);
            return src;
        })).subscribe();
        this.dispose = () => {
            this.o.actionUpstream.next(this.o.createAction('ReactorsDisposed'));
            this.destory$.next();
        };
        this.r('__config', this.i.pt.__config.pipe(rx.map(([, opts]) => this.config(opts))));
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
     * `addReaction(lable, ...)` uses this op internally.
     */
    labelError(label) {
        return (upStream) => upStream.pipe(rx.catchError((err) => {
            this.logError(label, err);
            return rx.throwError(() => err instanceof Error ? err : new Error(err));
        }));
    }
    catchErrorFor(...actionMetas) {
        return (upStream) => upStream.pipe(rx.catchError((err) => {
            this.o.ft.__onErrorFor(err).dp(...actionMetas);
            return rx.EMPTY;
        }));
    }
    /** Respond an error to actions specified by "actionMeta",
     * be aware that this message is not an Observable's "error" message,
     * it will not terminate observable stream.
     * This method emits an event "__onErrorFor" under the hood.
     */
    dispatchErrorFor(err, actionMeta, ...moreActionMetas) {
        this.o.ft.__onErrorFor(err).dp(actionMeta, ...moreActionMetas);
    }
    reactivizeFunction(key, func, funcThisRef) {
        const resolveFuncKey = key + 'Resolved';
        const finishFuncKey = key + 'Completed';
        const dispatchResolved = this.o.dispatchForFactory(resolveFuncKey);
        const dispatchCompleted = this.o.dispatchForFactory(finishFuncKey);
        this.r(this.i.pt[key].pipe(rx.mergeMap(([meta, ...params]) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const res = func.apply(funcThisRef, params);
            if (rx.isObservable(res)) {
                return res.pipe(rx.map(res => dispatchResolved(meta, res)), this.catchErrorFor(meta), rx.finalize(() => dispatchCompleted(meta)));
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            }
            else if ((res === null || res === void 0 ? void 0 : res.then) != null && (res === null || res === void 0 ? void 0 : res.catch) != null) {
                return rx.defer(() => res).pipe(rx.map(res => dispatchResolved(meta, res)), this.catchErrorFor(meta), rx.finalize(() => dispatchCompleted(meta)));
            }
            else {
                try {
                    dispatchResolved(meta, res);
                    dispatchCompleted(meta);
                }
                catch (e) {
                    this.dispatchErrorFor(e, meta);
                }
                return rx.EMPTY;
            }
        })));
        return resolveFuncKey;
    }
    logError(label, err) {
        var _a, _b;
        const message = '@' + (((_a = this.opts) === null || _a === void 0 ? void 0 : _a.name) ? this.opts.name + '::' : '') + label;
        this.errorSubject.next([err, message]);
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
class ExtendHelper {
    define(fn) {
        this.defineFn = fn;
        return this;
    }
    options(override) {
        this.optsOverride = override;
        return this;
    }
    to(base) {
        var _a, _b, _c, _d;
        if (this.optsOverride) {
            const opts = Object.assign({}, this.optsOverride);
            if (this.optsOverride.debugIncludeTypes) {
                opts.debugIncludeTypes = this.optsOverride.debugIncludeTypes.concat((_b = (_a = base.i.opts) === null || _a === void 0 ? void 0 : _a.debugIncludeTypes) !== null && _b !== void 0 ? _b : []);
            }
            if (this.optsOverride.debugExcludeTypes) {
                opts.debugExcludeTypes = this.optsOverride.debugExcludeTypes.concat((_d = (_c = base.i.opts) === null || _c === void 0 ? void 0 : _c.debugExcludeTypes) !== null && _d !== void 0 ? _d : []);
            }
            base.config(opts);
        }
        if (this.defineFn)
            this.defineFn(base);
        return base;
    }
}
export function patch(optionsOrDef, definition) {
    const helper = new ExtendHelper();
    if (definition) {
        helper.options(optionsOrDef);
        helper.define(definition);
    }
    else if (optionsOrDef) {
        helper.define(optionsOrDef);
    }
    return helper;
}
//# sourceMappingURL=reactor-composite.js.map