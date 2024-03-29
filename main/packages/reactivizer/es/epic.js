// import inspector from 'node:inspector';
import * as rx from 'rxjs';
import { ActionTable, mapActionToPayload, actionRelatedToAction } from './control';
import { DuplexController } from './duplex';
export class ReactorComposite extends DuplexController {
    get inputTable() {
        if (this.iTable)
            return this.iTable;
        this.iTable = new ActionTable(this.i, []);
        return this.iTable;
    }
    get outputTable() {
        if (this.oTable)
            return this.oTable;
        this.oTable = new ActionTable(this.o, ['_onErrorFor']);
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
        this.reactorSubj = new rx.ReplaySubject();
        this.createDispatchAndObserveProxy(this.i);
        this.createDispatchAndObserveProxy(this.o);
        if ((opts === null || opts === void 0 ? void 0 : opts.inputTableFor) && (opts === null || opts === void 0 ? void 0 : opts.inputTableFor.length) > 0) {
            this.iTable = new ActionTable(this.i, opts.inputTableFor);
        }
        if ((opts === null || opts === void 0 ? void 0 : opts.outputTableFor) && (opts === null || opts === void 0 ? void 0 : opts.outputTableFor.length) > 0) {
            this.oTable = new ActionTable(this.o, [...opts.outputTableFor, '_onErrorFor']);
        }
        this.o.pt._onErrorFor.pipe(rx.takeUntil(this.destory$), rx.catchError((err, src) => {
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
            this.o.core.actionUpstream.next(this.o.core.createAction('Reactors finalized'));
            this.destory$.next();
        };
    }
    /** @deprecated no longer needed, always start automatically after being contructed */
    startAll() { }
    /** @deprecated call dispose() instead */
    destory() {
        this.dispose();
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
        return (upStream) => upStream.pipe(rx.catchError((err, src) => {
            this.o.dpf._onErrorFor(actionMetas, err);
            // this.errorSubject.next(['', err instanceof Error ? err : new Error(err), actionMetas]);
            return rx.EMPTY;
        }));
    }
    dispatchErrorFor(err, actionMetas) {
        this.o.dpf._onErrorFor(actionMetas, err);
    }
    createDispatchAndObserveProxy(streamCtl) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const composite = this;
        streamCtl.dispatchForAndObserveRes = streamCtl.dfo = new Proxy({}, {
            get(_target, key, _rec) {
                return (observedAction$, referActions, ...params) => {
                    const action = streamCtl.core.createAction(key, params);
                    if (referActions)
                        action.r = Array.isArray(referActions) ? referActions.map(m => m.i) : referActions.i;
                    const r$ = new rx.ReplaySubject(1);
                    rx.merge(observedAction$.pipe(actionRelatedToAction(action), mapActionToPayload()), composite.o.pt._onErrorFor.pipe(actionRelatedToAction(action), rx.map(([, err, ...metas]) => {
                        throw err;
                    })), new rx.Observable(sub => {
                        streamCtl.core.actionUpstream.next(action);
                        sub.complete();
                    })).subscribe(r$);
                    return r$.asObservable();
                };
            },
            has(_target, key) {
                return true;
            },
            ownKeys() {
                return [];
            }
        });
    }
    reactivizeFunction(key, func, funcThisRef) {
        const resolveFuncKey = key + 'Resolved';
        const finishFuncKey = key + 'Completed';
        const dispatchResolved = this.o.core.dispatchForFactory(resolveFuncKey);
        const dispatchCompleted = this.o.core.dispatchForFactory(finishFuncKey);
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
//# sourceMappingURL=epic.js.map