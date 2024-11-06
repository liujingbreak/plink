import * as rx from 'rxjs';
import { defaultConfig } from './global-config';
let SEQ = 0;
let ACTION_SEQ = Number((Math.random() + '').slice(2, 10)) + 1;
export const has = Object.prototype.hasOwnProperty;
export class ControllerCore {
    constructor(opts = {}) {
        this.actionUpstream = new rx.Subject();
        /** Insert action "interceptor" operator function
         */
        this.logPrefix = '';
        this.debugExcludeSet = new Set();
        this.configChange = new rx.ReplaySubject(1); // using ReplaySubject here, because this controll might be created with "autoConnect" of false, a deferred "connect" results in later describing on this observable
        this.opts = {}; // Using CoreOption<I> here will results in non-assignable issue of entire controller type, always use <any> instead
        this.interceptorList$ = new rx.BehaviorSubject([]);
        this.dispatcher = {};
        this.dispatcherFor = {};
        this.setName(opts === null || opts === void 0 ? void 0 : opts.name);
        // 1. this.configChange, this.interceptor$, this.actionUpstream => this.connectableAction$
        const upstream = this.actionUpstream;
        this.interceptorList$.next([
            a$ => this.opts.debug ?
                a$.pipe(this.opts.log ?
                    rx.tap(action => {
                        const type = action.t;
                        if ((this.debugIncludeSet == null || this.debugIncludeSet.has(type)) && !this.debugExcludeSet.has(type)) {
                            this.opts.log(this.logPrefix, type, actionMetaToStr(action), ...(this.opts.logStyle === 'noParam' ? [] : action.p));
                        }
                    }) :
                    (typeof window !== 'undefined') || (typeof Worker !== 'undefined') ?
                        rx.tap(action => {
                            const type = action.t;
                            if ((this.debugIncludeSet == null || this.debugIncludeSet.has(type)) && !this.debugExcludeSet.has(type)) {
                                // eslint-disable-next-line no-console
                                console.log(`%c ${this.logPrefix}`, 'color: #e0f0e0; background: #8c61ff;', type, actionMetaToStr(action), ...(this.opts.logStyle === 'noParam' ? [] : action.p));
                            }
                        }) :
                        rx.tap(action => {
                            const type = action.t;
                            if ((this.debugIncludeSet == null || this.debugIncludeSet.has(type)) && !this.debugExcludeSet.has(type)) {
                                // eslint-disable-next-line no-console
                                console.log('[' + this.logPrefix, '] ', type, actionMetaToStr(action), ...(this.opts.logStyle === 'noParam' ? [] : action.p));
                            }
                        }))
                : a$
        ]);
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
        }), rx.filter(needSwitch => needSwitch), rx.switchMap(() => {
            return this.interceptorList$.pipe(rx.switchMap(interceptors => {
                return upstream.pipe(...interceptors);
            }));
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
        this.config(Object.assign(Object.assign({}, defaultConfig), opts));
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
    /** change a debug convenient "name" as previous specified in CoreOptions of constructor */
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
    prependInterceptor(...interceptor) {
        const list = this.interceptorList$.getValue();
        list.unshift(...interceptor);
        this.interceptorList$.next(list);
    }
    appendInterceptor(...interceptor) {
        const list = this.interceptorList$.getValue();
        list.push(...interceptor);
        this.interceptorList$.next(list);
    }
    /** This method is not meant to be used directly */
    dispatchFactory(type) {
        if (has.call(this.dispatcher, type)) {
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
        if (has.call(this.dispatcherFor, type)) {
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
    /** A filter operator function which only allow action with specific types */
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
    /** see CoreOption['autoConnect']
     */
    connect() {
        this.connectableAction$.connect();
    }
}
/**
 * @deprecated use "action.t" instead
 * Get the "action name" from payload's "type" field,
 * `payload.type`` is actually consist of string like `${Prefix}/${actionName}`,
 * this function returns the `actionName` part
 * @return undefined if current action doesn't have a valid "type" field
 */
// eslint-disable-next-line space-before-function-paren
export function nameOfAction(action) {
    // const match = /(?:#\d+\s+)?(\S+)$/.exec(action.t);
    // return (match ? match[1] : action.t) as keyof I;
    return action.t;
}
export function actionMetaToStr(action) {
    const { r, i } = action;
    return `(i: ${i}${r != null ? `, r: ${Array.isArray(r) ? [...r.values()].toString() : r}` : ''})`;
}
export function assignActionReferParam(action, metas) {
    action.r = Array.isArray(metas) ?
        metas.flatMap(m => Array.isArray(m) ? m : m != null ? [m] : []).map(m => typeof m === 'number' ? m : m.i) :
        typeof metas === 'number' ? metas : metas.i;
    return action;
}
//# sourceMappingURL=stream-core.js.map