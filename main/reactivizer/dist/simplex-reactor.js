"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimplexReactor = void 0;
const rx = __importStar(require("rxjs"));
const control2_1 = require("./control2");
const action_table_1 = require("./action-table");
const context_operators_1 = require("./context-operators");
const baseTableFor = ['__onError', '__onDisposed'];
let SEQ = new Date().getUTCMilliseconds();
class SimplexReactor {
    constructor(opts) {
        var _a, _b;
        this.opts = opts;
        this.errorSubject = new rx.ReplaySubject(20);
        this.r = (...params) => {
            if (typeof params[0] === 'string')
                this.reactorSubj.next(params);
            else
                this.reactorSubj.next(['', ...params]);
        };
        this.reactorSubj = new rx.ReplaySubject();
        this.id = SEQ++;
        this.s = new control2_1.RxController2(Object.assign(Object.assign({}, opts), { name: ((_a = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _a !== void 0 ? _a : '') + `#${this.id}` }));
        const internalMsg$ = this.s;
        if (opts === null || opts === void 0 ? void 0 : opts.debug) {
            internalMsg$.ft.__onNew().dp();
        }
        const doOperator = (dispatchingAction) => (response$) => rx.merge(response$, internalMsg$.pt.__onError.pipe((0, context_operators_1.actionRelatedToAction)(dispatchingAction), rx.map(([, err]) => {
            throw err;
        })));
        this.s.doOperator$.next(doOperator);
        // Everthing internally observables should goes here
        rx.merge(internalMsg$.pt.__onError.pipe(rx.map(([, err]) => {
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
        }))).pipe(rx.takeUntil(internalMsg$.pt.__onDisposed), rx.catchError((err, src) => {
            var _a;
            if ((_a = this.opts) === null || _a === void 0 ? void 0 : _a.log)
                this.opts.log(err);
            else
                console.error(err);
            internalMsg$.ft.__onError(err).dp();
            return src;
        })).subscribe();
        this.table = new action_table_1.ActionTable(this.s, [...(_b = opts === null || opts === void 0 ? void 0 : opts.tableFor) !== null && _b !== void 0 ? _b : [], ...baseTableFor]);
        const internalTable = this.table;
        this.error$ = internalTable.l.__onError.pipe(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        rx.map(([, err]) => err));
        this.destory$ = internalTable.l.__onDisposed;
        this.dispose = () => {
            internalMsg$.ft.__onDisposed().dp();
        };
        this.r('__config', internalMsg$.pt.__config.pipe(rx.map(([, opts]) => this.config(opts))));
    }
    config(opts) {
        this.opts = opts;
        this.s.config(opts);
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
    catchErrorFor(actionMeta, ...actionMetas) {
        return (upStream) => upStream.pipe(rx.catchError((err) => {
            this.dispatchErrorFor(err, actionMeta, ...actionMetas);
            return rx.EMPTY;
        }));
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
    /** @deprecated no longer needed, always start automatically after being contructed */
    startAll() { }
    /** @deprecated call dispose() instead */
    destory() {
        this.dispose();
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
exports.SimplexReactor = SimplexReactor;
//# sourceMappingURL=simplex-reactor.js.map