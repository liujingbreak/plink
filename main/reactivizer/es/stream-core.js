import * as rx from 'rxjs';
import { defaultConfig } from './global-config';
let SEQ = 1;
let ACTION_SEQ = Number((Math.random() + '').slice(2, 10)) + 1;
export const has = Object.prototype.hasOwnProperty;
export class ControllerCore {
    constructor(opts = {}) {
        this.actionUpstream = new rx.Subject();
        /** Add or change action "interceptor" by emiting new value to this BehaviorSubject */
        this.interceptor$ = new rx.BehaviorSubject(a => a);
        this.typePrefix = '#' + SEQ++ + ' ';
        this.logPrefix = '';
        this.debugExcludeSet = new Set();
        this.configChange = new rx.Subject();
        this.opts = {};
        this.dispatcher = {};
        this.dispatcherFor = {};
        this.setName(opts === null || opts === void 0 ? void 0 : opts.name);
        // 1. this.configChange, this.interceptor$, this.actionUpstream => this.connectableAction$
        this.connectableAction$ = rx.connectable(this.configChange.pipe(rx.map((props, i) => {
            var _a, _b, _c;
            let switchActionStream = i === 0; // always create action stream at first time
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
        }), rx.filter(needSwitch => needSwitch), rx.combineLatestWith(this.interceptor$), rx.switchMap(([, interceptor]) => {
            const debuggableAction$ = this.opts.debug ?
                this.actionUpstream.pipe(this.opts.log ?
                    rx.tap(action => {
                        const type = nameOfAction(action);
                        if ((this.debugIncludeSet == null || this.debugIncludeSet.has(type)) && !this.debugExcludeSet.has(type)) {
                            this.opts.log(this.logPrefix, 'rx:', type, actionMetaToStr(action), ...(this.opts.logStyle === 'noParam' ? [] : action.p));
                        }
                    }) :
                    (typeof window !== 'undefined') || (typeof Worker !== 'undefined') ?
                        rx.tap(action => {
                            const type = nameOfAction(action);
                            if ((this.debugIncludeSet == null || this.debugIncludeSet.has(type)) && !this.debugExcludeSet.has(type)) {
                                // eslint-disable-next-line no-console
                                console.log(`%c ${this.logPrefix} rx:`, 'color: #e0f0e0; background: #8c61ff;', type, actionMetaToStr(action), ...(this.opts.logStyle === 'noParam' ? [] : action.p));
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
            return interceptor ?
                debuggableAction$.pipe(interceptor) :
                debuggableAction$;
        })));
        const actionSubDispatcher = new rx.Subject();
        const actionUnsubDispatcher = new rx.Subject();
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
    createAction(type, params) {
        return {
            t: this.typePrefix + type,
            i: ACTION_SEQ++,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            p: params !== null && params !== void 0 ? params : []
        };
    }
    /** change the "name" as previous specified in CoreOptions of constructor */
    setName(name) {
        this.logPrefix = name !== null && name !== void 0 ? name : this.typePrefix.trim();
    }
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
    // eslint-disable-next-line space-before-function-paren
    ofType(...types) {
        return (up) => {
            const matchTypes = types.map(type => this.typePrefix + type);
            return up.pipe(rx.filter((a) => matchTypes.some(matchType => a.t === matchType)));
        };
    }
    // eslint-disable-next-line space-before-function-paren
    notOfType(...types) {
        return (up) => {
            const matchTypes = types.map(type => this.typePrefix + type);
            return up.pipe(rx.filter((a) => matchTypes.every(matchType => a.t !== matchType)));
        };
    }
    isType(action, type) {
        return action.t === this.typePrefix + type;
    }
    connect() {
        rx.concat(rx.of(this.connectableAction$), this.configChange).pipe(rx.filter(() => this.connectableAction$ != null), rx.map(() => this.connectableAction$), rx.take(1)).subscribe(() => this.connectableAction$.connect());
    }
}
/**
 * Get the "action name" from payload's "type" field,
 * `payload.type`` is actually consist of string like `${Prefix}/${actionName}`,
 * this function returns the `actionName` part
 * @return undefined if current action doesn't have a valid "type" field
 */
// eslint-disable-next-line space-before-function-paren
export function nameOfAction(action) {
    const match = /(?:#\d+\s+)?(\S+)$/.exec(action.t);
    return (match ? match[1] : action.t);
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