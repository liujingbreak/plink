import * as rx from 'rxjs';
let SEQ = 1;
let ACTION_SEQ = Number((Math.random() + '').slice(2, 10)) + 1;
export const has = Object.prototype.hasOwnProperty;
export class ControllerCore {
    constructor(opts) {
        var _a;
        this.opts = opts;
        this.actionUpstream = new rx.Subject();
        this.interceptor$ = new rx.BehaviorSubject(a => a);
        this.typePrefix = '#' + SEQ++ + ' ';
        this.logPrefix = this.typePrefix;
        this.dispatcher = {};
        this.dispatcherFor = {};
        this.actionSubDispatcher = new rx.Subject();
        this.actionUnsubDispatcher = new rx.Subject();
        this.setName(opts === null || opts === void 0 ? void 0 : opts.name);
        this.debugExcludeSet = new Set((_a = opts === null || opts === void 0 ? void 0 : opts.debugExcludeTypes) !== null && _a !== void 0 ? _a : []);
        const debuggableAction$ = (opts === null || opts === void 0 ? void 0 : opts.debug)
            ? this.actionUpstream.pipe((opts === null || opts === void 0 ? void 0 : opts.log) ?
                rx.tap(action => {
                    const type = nameOfAction(action);
                    if (!this.debugExcludeSet.has(type)) {
                        opts.log(this.logPrefix + 'rx:action', type, actionMetaToStr(action), ...(opts.logStyle === 'noParam' ? [] : action.p));
                    }
                }) :
                (typeof window !== 'undefined') || (typeof Worker !== 'undefined') ?
                    rx.tap(action => {
                        const type = nameOfAction(action);
                        if (!this.debugExcludeSet.has(type)) {
                            // eslint-disable-next-line no-console
                            console.log(`%c ${this.logPrefix}rx:action`, 'color: white; background: #8c61ff;', type, actionMetaToStr(action), ...(opts.logStyle === 'noParam' ? [] : action.p));
                        }
                    }) :
                    rx.tap(action => {
                        const type = nameOfAction(action);
                        if (!this.debugExcludeSet.has(type)) {
                            // eslint-disable-next-line no-console
                            console.log(this.logPrefix + 'rx:action', type, actionMetaToStr(action), ...(opts.logStyle === 'noParam' ? [] : action.p));
                        }
                    }))
            : this.actionUpstream;
        this.connectableAction$ = rx.connectable(this.interceptor$.pipe(rx.switchMap(interceptor => interceptor ?
            debuggableAction$.pipe(interceptor) :
            debuggableAction$)));
        this.action$ = rx.merge(
        // merge() helps to leverage a auxiliary Observable to notify when "connectableAction$" is actually being
        // subscribed, since it will be subscribed along together with "connectableAction$"
        this.connectableAction$, new rx.Observable(sub => {
            // Notify that action$ is subscribed
            this.actionSubDispatcher.next();
            sub.complete();
        })).pipe(rx.finalize(() => {
            this.actionUnsubDispatcher.next();
        }), rx.share());
        if ((opts === null || opts === void 0 ? void 0 : opts.autoConnect) == null || (opts === null || opts === void 0 ? void 0 : opts.autoConnect)) {
            this.connectableAction$.connect();
        }
        this.actionSubscribed$ = this.actionSubDispatcher.asObservable();
        this.actionUnsubscribed$ = this.actionUnsubDispatcher.asObservable();
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
        this.logPrefix = name ? `[${this.typePrefix}${name}] ` : this.typePrefix;
    }
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
    dispatchForFactory(type) {
        if (has.call(this.dispatcherFor, type)) {
            return this.dispatcherFor[type];
        }
        const dispatch = (metas, ...params) => {
            const action = this.createAction(type, params);
            action.r = Array.isArray(metas) ? metas.map(m => m.i) : metas.i;
            this.actionUpstream.next(action);
            return action;
        };
        this.dispatcherFor[type] = dispatch;
        return dispatch;
    }
    updateInterceptor(factory) {
        const newInterceptor = factory(this.interceptor$.getValue());
        this.interceptor$.next(newInterceptor);
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
    connect() {
        this.connectableAction$.connect();
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
//# sourceMappingURL=stream-core.js.map