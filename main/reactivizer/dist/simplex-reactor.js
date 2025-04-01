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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimplexReactor = void 0;
/* eslint-disable @typescript-eslint/no-unnecessary-type-parameters */
const rx = __importStar(require("rxjs"));
const control2_1 = require("./control2");
const action_dispenser_1 = require("./action-dispenser");
const action_table_1 = require("./action-table");
const forked_control_1 = require("./forked-control");
const forked_post_control_1 = require("./forked-post-control");
const context_operators_1 = require("./context-operators");
const utils_1 = require("./utils");
const baseActionTypeSet = new Set(['__onError', '__onDisposed', '__cancel', '__config']);
const internalTableFor = ['__onError', '__onDisposed'];
let SEQ = new Date().getUTCMilliseconds();
class SimplexReactor {
    constructor(opts) {
        var _a, _b;
        /** Define an reactor (RxJS observable subscription) */
        this.r = (...params) => {
            if (typeof params[0] === 'string')
                this.reactorSubj.next(params);
            else
                this.reactorSubj.next(['', ...params]);
        };
        this.id = SEQ++;
        this.reactorSubj = new rx.ReplaySubject();
        this.errorSubject = new rx.ReplaySubject(20);
        this.preActionHook$ = new rx.Subject();
        this.removePreActionHook$ = new rx.Subject();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        this.opts = opts;
        this.s = new control2_1.RxController2(Object.assign(Object.assign({}, opts), { name: ((_a = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _a !== void 0 ? _a : '') + `@${this.id}` }));
        this.postBase = this.p = this.s;
        this.table = new action_table_1.ActionTable(this.s, [...(_b = opts === null || opts === void 0 ? void 0 : opts.tableFor) !== null && _b !== void 0 ? _b : [], ...internalTableFor]);
        this.pt = this.s.pt;
        this.at = this.s.at;
        this.ft = this.s.ft;
        this.latest = this.table.l;
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        this.preHooks = new Proxy({}, {
            get(_target, key) {
                return (labelOrDefine, define) => {
                    let label = '';
                    if (typeof labelOrDefine === 'string') {
                        label = labelOrDefine;
                    }
                    else {
                        define = labelOrDefine;
                    }
                    return self.addPreHook(label, key, define);
                };
            },
            has(_target, key) {
                return typeof key === 'string';
            },
            ownKeys() {
                return [];
            }
        });
        this.interceptors = new Proxy({}, {
            get(_target, key) {
                return new rx.Observable(s => {
                    console.log('-- intercept', key);
                    const removeInter$ = new rx.ReplaySubject(1);
                    const remove = self.prependInterceptor(ad => rx.merge(ad.at[key].pipe(rx.mergeMap(a => {
                        const next$ = new rx.Subject();
                        next$.subscribe(p => {
                            console.log('-- subscribed next$ emits', p);
                        });
                        return rx.merge(next$.pipe(rx.take(1), rx.tap(p => {
                            console.log('-- next$:', p);
                        }), rx.map(p => (Object.assign(Object.assign({}, a), { p })))), new rx.Observable(s0 => {
                            s.next([
                                (payload, ...nextInterceptors) => {
                                    console.log('-- next called', ...payload);
                                    if (nextInterceptors.length == 0) {
                                        next$.next(payload);
                                        return [];
                                    }
                                    return (0, utils_1.onAllSubscribed)(nextInterceptors, () => {
                                        console.log('-- all subscribed');
                                        next$.next(payload);
                                    });
                                },
                                { i: a.i }, ...a.p
                            ]);
                            s0.complete();
                        }), 
                        // remove event must be checked after next$ event, otherwise "remove" might happens earlier
                        removeInter$.pipe(rx.map(() => {
                            console.log('-- remove');
                            remove();
                        }), rx.ignoreElements())).pipe(rx.catchError(err => {
                            console.log('-- error', err);
                            return rx.EMPTY;
                        }), rx.finalize(() => {
                            debugger;
                            console.log('-- final');
                        }));
                    })), ad.ofOtherTypes()));
                    return () => {
                        removeInter$.next();
                    };
                });
            },
            has(_target, key) {
                return typeof key === 'string';
            },
            ownKeys() {
                return [];
            }
        });
        const internalMsgCtl = this.s;
        const doOperator = (dispatchingAction) => (response$) => rx.merge(response$, internalMsgCtl.pt.__onError.pipe((0, context_operators_1.actionRelatedToAction)(dispatchingAction), rx.map(([, err]) => {
            throw err;
        })));
        this.s.doOperator$.next(doOperator);
        const hooksByType = new Map();
        this.s.prependInterceptor(a$ => {
            return rx.concat(rx.of(null), // the observable content is not important
            rx.merge(this.preActionHook$, this.removePreActionHook$)).pipe(rx.switchMap(() => a$.pipe(rx.mergeMap(a => {
                const hooks = hooksByType.get(a.t);
                if (hooks) {
                    let payload = a.p;
                    return rx.concat(rx.from(hooks).pipe(rx.concatMap(([hook, label]) => hook(a, ...payload).pipe(rx.map(retPayload => {
                        payload = retPayload;
                    }), this.handleErrorOp(label !== null && label !== void 0 ? label : 'Unlabled prehook', 'stop'))), rx.ignoreElements()), rx.defer(() => rx.of(Object.assign(Object.assign({}, a), { p: payload }))));
                }
                else {
                    return rx.of(a);
                }
            }))));
        });
        // Everthing internally observables should goes here
        rx.merge(internalMsgCtl.pt.__onError.pipe(rx.map(([, err]) => {
            var _a;
            if ((_a = this.opts) === null || _a === void 0 ? void 0 : _a.log)
                this.opts.log(err);
            else
                console.error(err);
        })), this.reactorSubj.pipe(rx.mergeMap(([label, downStream, noError]) => {
            if (noError == null || !noError) {
                return downStream.pipe(this.handleErrorOp(label));
            }
            return downStream;
        })), this.preActionHook$.pipe(rx.map(([type, hook, label]) => {
            let hooks = hooksByType.get(type);
            if (hooks == null) {
                hooks = [];
                hooksByType.set(type, hooks);
            }
            hooks.push([hook, label]);
        })), this.removePreActionHook$.pipe(rx.map(([type, hook]) => {
            let hooks = hooksByType.get(type);
            if (hooks) {
                hooks = hooks.filter(([h]) => h !== hook);
                if (hooks.length === 0) {
                    hooksByType.delete(type);
                }
            }
        }))).pipe(rx.takeUntil(internalMsgCtl.pt.__onDisposed), rx.catchError((err, src) => {
            var _a;
            if ((_a = this.opts) === null || _a === void 0 ? void 0 : _a.log)
                this.opts.log(err);
            else
                console.error(err);
            return src;
        })).subscribe();
        const internalTable = this.table;
        this.error$ = rx.merge(this.errorSubject.pipe(rx.map(([label, err]) => [err, label])), internalTable.l.__onError.pipe(rx.map(([, err]) => [err, null]))).pipe(rx.share());
        this.destory$ = internalMsgCtl.pt.__onDisposed;
        this.dispose = () => {
            internalMsgCtl.ft.__onDisposed().dp();
        };
        this.r('__config', internalMsgCtl.pt.__config.pipe(rx.map(([, opts]) => this.config(opts))));
    }
    createRxControllers(opts) {
        var _a;
        return new control2_1.RxController2(Object.assign(Object.assign({}, opts), { name: ((_a = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _a !== void 0 ? _a : '') + `@${this.id}` }));
    }
    getLogName() {
        return this.s.logPrefix;
    }
    /**
     * This method can be used to change "options" after SimplexReactor instanciation, e.g. `.change({debug: true})` to enable action tracing log for debug.
     * This method can also be useful to "cast" type of one SimplexReactor type to another extended type, in this case generic type parameter `<I2, LI2>` must
     * be explicitly provided to ensure returned type being correctly inferred, a property `tableFor` of parameter `opts` must be provided to correspond with `LI2`
     */
    config(opts) {
        const updatedThis = this;
        if (this.opts) {
            Object.assign(this.opts, opts);
        }
        else {
            updatedThis.opts = opts;
        }
        if (opts.tableFor) {
            updatedThis.table.addActions(...opts.tableFor);
        }
        updatedThis.s.config(Object.entries(opts).reduce((obj, [p, v]) => {
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
        return updatedThis;
    }
    /** @deprecated use toExtend instead
     * Turn current reactors to extend mode,
     * fork a stream RxController2 to ForkedRxController, so that we can create new reactors by subscribing to
     * new forked stream controller, and be able to manipulate previously created reactors by "appendInterceptorToSrc()"
     **/
    forExtend() {
        const baseS = this.s;
        const s = this.s = new forked_control_1.ForkedRxController(baseS);
        const baseTable = this.table;
        this.table = new action_table_1.ActionTable(s, [...this.table.actionNames]);
        for (const [type, [m, ...p]] of baseTable.actionSnapshot) {
            const latestAct = s.createAction(type, p);
            latestAct.i = m.i;
            latestAct.r = m.r;
            s.forkedUpStream.next(latestAct);
        }
        this.pt = s.pt;
        this.ft = s.ft;
        this.at = s.at;
        this.latest = this.table.l;
        let cachePostBase;
        function ensurePostBase() {
            if (cachePostBase)
                return cachePostBase;
            cachePostBase = new forked_post_control_1.ForkedPostRxController(baseS);
            return cachePostBase;
        }
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (this.postBase == null) {
            Object.defineProperty(this, 'postBase', {
                get: ensurePostBase,
                configurable: true
            });
            Object.defineProperty(this, 'p', {
                get: ensurePostBase,
                configurable: true
            });
        }
        return this;
    }
    toExtend() {
        const baseS = this.s;
        this.s = new forked_control_1.ForkedRxController(baseS);
        this.postBase = this.p = new forked_post_control_1.ForkedPostRxController(baseS);
        this.table = new action_table_1.ActionTable(this.s, this.table);
        this.pt = this.s.pt;
        this.at = this.s.at;
        this.ft = this.s.ft;
        this.latest = this.table.l;
        const internalMsgCtl = this.s;
        const doOperator = (dispatchingAction) => (response$) => rx.merge(response$, internalMsgCtl.pt.__onError.pipe((0, context_operators_1.actionRelatedToAction)(dispatchingAction), rx.map(([, err]) => {
            throw err;
        })));
        this.s.doOperator$.next(doOperator);
        return this;
    }
    addPreHook(label, type, hook) {
        if (baseActionTypeSet.has(type))
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            return () => { };
        this.preActionHook$.next([type, hook, label]);
        return () => {
            this.removePreActionHook$.next([type, hook]);
        };
    }
    /**
     * prepend action stream interceptor by action type, the interceptors will intercept messages
     * before they reach all inherited and current SimplexReactor
     */
    prependInterceptor(inter) {
        return this.s.prependInterceptor(a$ => {
            const ac = action_dispenser_1.ActionDispenser.ofAction$(a$);
            return inter(ac);
        });
    }
    /**
     * An rx operator tracks down "lobel" information in error log via a 'catchError' inside it, to help to locate errors.
     * This operator will continue to throw any errors from upstream observable, if you want to play any side-effect to
     * errors, you should add your own "catchError" after.
     *
     * `addReaction(label, ...)` uses this op internally.
     */
    labelError(label) {
        return (upStream) => upStream.pipe(rx.catchError(err => {
            this.logError(label, err);
            return rx.throwError(() => err instanceof Error ? err : new Error(err));
        }));
    }
    catchErrorFor(actionMeta, ...actionMetas) {
        return (upStream) => upStream.pipe(rx.catchError(err => {
            this.dispatchErrorFor(err, actionMeta, ...actionMetas);
            return rx.EMPTY;
        }));
    }
    /** Rx operator function, filter action or payload stream by:
    * action ID (Action['i']), this method also react to __onError messages, the returned observable emits Error message when the initial action producer
    * invokes "catchErrorFor()" or "dispatchErrorFor()"
    */
    actionRelatedToAction(actionOrMeta) {
        const s = this.s;
        return function (up) {
            return s.doOperator$.pipe(rx.switchMap(operator => up.pipe(operator(actionOrMeta), (0, context_operators_1.actionRelatedToAction)(actionOrMeta))));
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
        var _a;
        if ((_a = this.opts) === null || _a === void 0 ? void 0 : _a.debug) {
            if (this.opts.log)
                this.opts.log((this.s.logPrefix), ...msg);
            else {
                // eslint-disable-next-line no-console
                console.log((this.s.logPrefix), ...msg);
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
    toString() {
        return this.getLogName();
    }
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
        const message = 'Error@' + (this.s.logPrefix + '::') + label;
        this.errorSubject.next([message, (_a = err.message) !== null && _a !== void 0 ? _a : err]);
        if ((_b = this.opts) === null || _b === void 0 ? void 0 : _b.log)
            this.opts.log(message, err);
        else
            console.error(message, err);
    }
    handleErrorOp(label = '', hehavior = 'continue') {
        return (upStream) => upStream.pipe(rx.catchError((err, src) => {
            this.logError(label, err);
            if (hehavior === 'throw')
                return rx.throwError(() => err instanceof Error ? err : new Error(err));
            return hehavior === 'continue' ? src : rx.EMPTY;
        }));
    }
}
exports.SimplexReactor = SimplexReactor;
//# sourceMappingURL=simplex-reactor.js.map