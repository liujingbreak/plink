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
exports.ControllerCore = exports.has = void 0;
exports.nameOfAction = nameOfAction;
exports.actionMetaToStr = actionMetaToStr;
exports.assignActionReferParam = assignActionReferParam;
const rx = __importStar(require("rxjs"));
const global_config_1 = require("./global-config");
let SEQ = 0;
let ACTION_SEQ = Number((Math.random() + '').slice(2, 10)) + 1;
exports.has = Object.prototype.hasOwnProperty;
class ControllerCore {
    constructor(opts = {}) {
        this.actionUpstream = new rx.Subject();
        /** Insert action "interceptor" operator function
         */
        this.interceptor$ = new rx.Subject();
        this.logPrefix = '';
        this.debugExcludeSet = new Set();
        this.configChange = new rx.ReplaySubject(1); // using ReplaySubject here, because this controll might be created with "autoConnect" of false, a deferred "connect" results in later describing on this observable
        this.opts = {}; // Using CoreOption<I> here will results in non-assignable issue of entire controller type, always use <any> instead
        this.dispatcher = {};
        this.dispatcherFor = {};
        this.setName(opts === null || opts === void 0 ? void 0 : opts.name);
        const interceptorList$ = this.interceptor$.pipe(rx.startWith(a$ => a$), rx.scan((arr, it) => {
            arr.unshift(it);
            return arr;
        }, []));
        // 1. this.configChange, this.interceptor$, this.actionUpstream => this.connectableAction$
        this.connectableAction$ = rx.connectable(this.configChange.pipe(rx.map((props, i) => {
            var _a, _b, _c;
            let switchActionStream = i === 0; // always create action stream at first time
            if (props.has('name')) {
                this.setName(this.opts.name);
            }
            if (props.has('debugIncludeTypes')) {
                if (this.debugIncludeSet == null)
                    this.debugIncludeSet = ((_a = this.opts) === null || _a === void 0 ? void 0 : _a.debugIncludeTypes) ? new Set(this.opts.debugIncludeTypes) : null;
                if (this.debugIncludeSet && ((_b = this.opts) === null || _b === void 0 ? void 0 : _b.debugIncludeTypes)) {
                    this.opts.debugIncludeTypes.forEach(item => this.debugIncludeSet.add(item));
                }
            }
            if (props.has('debugExcludeTypes')) {
                if (this.debugExcludeSet == null)
                    this.debugExcludeSet = new Set([]);
                if ((_c = this.opts) === null || _c === void 0 ? void 0 : _c.debugExcludeTypes) {
                    this.opts.debugExcludeTypes.forEach(item => this.debugExcludeSet.add(item));
                }
            }
            if (props.has('debug') || props.has('log')) {
                switchActionStream = true;
            }
            return switchActionStream;
        }), rx.filter(needSwitch => needSwitch), rx.combineLatestWith(interceptorList$), rx.switchMap(([, interceptors]) => {
            const debuggableAction$ = this.opts.debug ?
                this.actionUpstream.pipe(this.opts.log ?
                    rx.tap(action => {
                        const type = nameOfAction(action);
                        if ((this.debugIncludeSet == null || this.debugIncludeSet.has(type)) && !this.debugExcludeSet.has(type)) {
                            this.opts.log(this.logPrefix, type, actionMetaToStr(action), ...(this.opts.logStyle === 'noParam' ? [] : action.p));
                        }
                    }) :
                    (typeof window !== 'undefined') || (typeof Worker !== 'undefined') ?
                        rx.tap(action => {
                            const type = nameOfAction(action);
                            if ((this.debugIncludeSet == null || this.debugIncludeSet.has(type)) && !this.debugExcludeSet.has(type)) {
                                // eslint-disable-next-line no-console
                                console.log(`%c ${this.logPrefix}`, 'color: #e0f0e0; background: #8c61ff;', type, actionMetaToStr(action), ...(this.opts.logStyle === 'noParam' ? [] : action.p));
                            }
                        }) :
                        rx.tap(action => {
                            const type = nameOfAction(action);
                            if ((this.debugIncludeSet == null || this.debugIncludeSet.has(type)) && !this.debugExcludeSet.has(type)) {
                                // eslint-disable-next-line no-console
                                console.log('[' + this.logPrefix, '] ', type, actionMetaToStr(action), ...(this.opts.logStyle === 'noParam' ? [] : action.p));
                            }
                        }))
                : this.actionUpstream;
            return interceptors ?
                debuggableAction$.pipe(...interceptors) :
                debuggableAction$;
        })));
        const actionSubDispatcher = new rx.ReplaySubject();
        const actionUnsubDispatcher = new rx.ReplaySubject();
        // 2. this.connectableAction$ => this.action$, this.actionSubDispatcher, this.actionUnsubDispatcher
        this.action$ = rx.merge(
        // merge() helps to leverage a auxiliary Observable to notify when "connectableAction$" is actually being
        // subscribed, since it will be subscribed along together with "connectableAction$"
        this.connectableAction$, new rx.Observable(sub => {
            // Notify that action$ is subscribed
            actionSubDispatcher.next();
            sub.complete();
        })).pipe(rx.finalize(() => {
            actionUnsubDispatcher.next();
        }), rx.share());
        if ((opts === null || opts === void 0 ? void 0 : opts.autoConnect) == null || (opts === null || opts === void 0 ? void 0 : opts.autoConnect)) {
            this.connectableAction$.connect();
        }
        this.config(Object.assign(Object.assign({}, global_config_1.defaultConfig), opts));
        this.actionSubscribed$ = actionSubDispatcher.asObservable();
        this.actionUnsubscribed$ = actionUnsubDispatcher.asObservable();
    }
    createAction(name, params) {
        return {
            t: name,
            i: ACTION_SEQ++,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            p: params !== null && params !== void 0 ? params : []
        };
    }
    /** action id is also copied */
    copyActionFrom(source) {
        const copied = this.createAction(source.t, source.p);
        copied.i = source.i;
        copied.r = source.r;
        return copied;
    }
    /** change the "name" as previous specified in CoreOptions of constructor */
    setName(name) {
        this.logPrefix = name !== null && name !== void 0 ? name : ++SEQ + '';
    }
    /** This method is used to change `this.opts` which is initially provided in constructor.
     * Only changed properties are merged to current options */
    config(opts) {
        const changedProperties = new Set();
        for (const [p, v] of Object.entries(opts)) {
            if (v !== this.opts[p]) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                this.opts[p] = v;
                changedProperties.add(p);
            }
        }
        if (changedProperties.size > 0) {
            this.configChange.next(changedProperties);
        }
    }
    /** Insert action "interceptor" operator function */
    prependInterceptor(interceptor) {
        this.interceptor$.next(interceptor);
    }
    /** This method is not meant to be used directly */
    dispatchFactory(type) {
        if (exports.has.call(this.dispatcher, type)) {
            return this.dispatcher[type];
        }
        const dispatch = (...params) => {
            const action = this.createAction(type, params);
            this.actionUpstream.next(action);
            return action;
        };
        this.dispatcher[type] = dispatch;
        return dispatch;
    }
    /** This method is not meant to be used directly */
    dispatchForFactory(type) {
        if (exports.has.call(this.dispatcherFor, type)) {
            return this.dispatcherFor[type];
        }
        const dispatch = (metas, ...params) => {
            const action = this.createAction(type, params);
            assignActionReferParam(action, metas);
            this.actionUpstream.next(action);
            return action;
        };
        this.dispatcherFor[type] = dispatch;
        return dispatch;
    }
    // eslint-disable-next-line space-before-function-paren
    ofType(...types) {
        return (up) => {
            const matchTypes = types.map(type => type);
            return up.pipe(rx.filter((a) => matchTypes.some(matchType => a.t === matchType)));
        };
    }
    // eslint-disable-next-line space-before-function-paren
    notOfType(...types) {
        return (up) => {
            const matchTypes = types.map(type => type);
            return up.pipe(rx.filter((a) => matchTypes.every(matchType => a.t !== matchType)));
        };
    }
    isType(action, type) {
        return action.t === type;
    }
    connect() {
        this.connectableAction$.connect();
        // rx.concat(
        //   rx.of(this.connectableAction$),
        //   this.configChange
        // ).pipe(
        //   rx.filter(() => this.connectableAction$ != null),
        //   rx.map(() => this.connectableAction$),
        //   rx.take(1)
        // ).subscribe(() => this.connectableAction$!.connect());
    }
}
exports.ControllerCore = ControllerCore;
/**
 * @deprecated use "action.t" instead
 * Get the "action name" from payload's "type" field,
 * `payload.type`` is actually consist of string like `${Prefix}/${actionName}`,
 * this function returns the `actionName` part
 * @return undefined if current action doesn't have a valid "type" field
 */
// eslint-disable-next-line space-before-function-paren
function nameOfAction(action) {
    // const match = /(?:#\d+\s+)?(\S+)$/.exec(action.t);
    // return (match ? match[1] : action.t) as keyof I;
    return action.t;
}
function actionMetaToStr(action) {
    const { r, i } = action;
    return `(i: ${i}${r != null ? `, r: ${Array.isArray(r) ? [...r.values()].toString() : r}` : ''})`;
}
function assignActionReferParam(action, metas) {
    action.r = Array.isArray(metas) ?
        metas.flatMap(m => Array.isArray(m) ? m : m != null ? [m] : []).map(m => typeof m === 'number' ? m : m.i) :
        typeof metas === 'number' ? metas : metas.i;
    return action;
}
//# sourceMappingURL=stream-core.js.map