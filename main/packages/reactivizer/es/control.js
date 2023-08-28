import * as rx from 'rxjs';
let SEQ = 1;
let ACTION_SEQ = Number((Math.random() + '').slice(2, 10)) + 1;
const has = Object.prototype.hasOwnProperty;
export class ControllerCore {
    constructor(opts) {
        var _a;
        this.opts = opts;
        this.actionUpstream = new rx.Subject();
        this.interceptor$ = new rx.BehaviorSubject(a => a);
        this.typePrefix = SEQ++ + '/';
        this.dispatcher = {};
        this.debugName = typeof (opts === null || opts === void 0 ? void 0 : opts.debug) === 'string' ? `[${this.typePrefix}${opts.debug}] ` : this.typePrefix;
        this.debugExcludeSet = new Set((_a = opts === null || opts === void 0 ? void 0 : opts.debugExcludeTypes) !== null && _a !== void 0 ? _a : []);
        const debuggableAction$ = (opts === null || opts === void 0 ? void 0 : opts.debug)
            ? this.actionUpstream.pipe((opts === null || opts === void 0 ? void 0 : opts.log) ?
                rx.tap(action => opts.log(this.debugName + 'rx:action', nameOfAction(action))) :
                (typeof window !== 'undefined') || (typeof Worker !== 'undefined') ?
                    rx.tap(action => {
                        const type = nameOfAction(action);
                        if (!this.debugExcludeSet.has(type)) {
                            // eslint-disable-next-line no-console
                            console.log(`%c ${this.debugName}rx:action `, 'color: white; background: #8c61ff;', type, [action.i, ...action.p]);
                        }
                    })
                    :
                        rx.tap(action => {
                            const type = nameOfAction(action);
                            if (!this.debugExcludeSet.has(type)) {
                                // eslint-disable-next-line no-console
                                console.log(this.debugName + 'rx:action', type, action.p === undefined ? '' : [action.i, ...action.p]);
                            }
                        }), rx.share())
            : this.actionUpstream;
        this.action$ = this.interceptor$.pipe(rx.switchMap(interceptor => interceptor ?
            debuggableAction$.pipe(interceptor, rx.share()) :
            debuggableAction$));
    }
    createAction(type, params) {
        return {
            t: this.typePrefix + type,
            i: ACTION_SEQ++,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            p: params !== null && params !== void 0 ? params : []
        };
    }
    dispatcherFactory(type) {
        if (has.call(this.dispatcher, type)) {
            return this.dispatcher[type];
        }
        const dispatch = (...params) => {
            const action = this.createAction(type, params);
            this.actionUpstream.next(action);
            return action.i;
        };
        this.dispatcher[type] = dispatch;
        return dispatch;
    }
    replaceActionInterceptor(factory) {
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
}
export class RxController {
    constructor(opts) {
        this.opts = opts;
        const core = this.core = new ControllerCore(opts);
        this.dispatcher = this.dp = new Proxy({}, {
            get(_target, key, _rec) {
                return core.dispatcherFactory(key);
            }
        });
        const actionsByType = {};
        const actionByTypeProxy = new Proxy({}, {
            get(_target, type, _rec) {
                let a$ = actionsByType[type];
                if (a$ == null) {
                    const matchType = core.typePrefix + type;
                    a$ = actionsByType[type] = core.action$.pipe(rx.filter(({ t }) => t === matchType), rx.share());
                }
                return a$;
            }
        });
        const payloadsByType = {};
        const payloadByTypeProxy = new Proxy({}, {
            get(_target, key, _rec) {
                let p$ = payloadsByType[key];
                if (p$ == null) {
                    const a$ = actionByTypeProxy[key];
                    p$ = payloadsByType[key] = a$.pipe(rx.map(a => [a.i, ...a.p]), rx.share());
                }
                return p$;
            }
        });
        this.actionByType = this.at = actionByTypeProxy;
        this.payloadByType = this.pt = payloadByTypeProxy;
        this.replaceActionInterceptor = core.replaceActionInterceptor;
        // const dispatchAndObserveCache = {} as {[K in keyof I]: (...params: InferPayload<I[K]>) => DispatchAndObserveFn<I, K>};
        // this.dispatchAndObserve = this.dpno = new Proxy({} as typeof dispatchAndObserveCache, {
        //   get(_target, type) {
        //     let fn = dispatchAndObserveCache[type as keyof I];
        //     if (fn == null) {
        //       fn = dispatchAndObserveCache[type as keyof I] = (...params: InferPayload<I[keyof I]>) => {
        //         let actionId: Action<any>['i'];
        //         const observe = rx.merge(
        //           new rx.Observable<never>(sub => {
        //             actionId = dispatcher[type as keyof I](...params);
        //           })
        //         );
        //         return {id, observe};
        //       };
        //     }
        //     return fn;
        //   }
        // });
    }
    /**
     * Conceptually, it is a "state store" like Apache Kafka's "table"
     * From perspecitve of implementation, a map ReplaySubject which provides similiar function as rx.withLatestFrom() does
     * @return Pick<...>
     The reason using `Pick<{[K in keyof I]: PayloadStream<I, K>}, T[number]>` instead of `{[K in T[number]]: PayloadStream<I, K>` is that the former expression
     makes Typescript to jump to `I` type definition source code when we perform operation like "Go to definition" in editor, the latter can't
     */
    // eslint-disable-next-line space-before-function-paren
    createLatestPayloadsFor(...types) {
        var _a;
        const replayedPayloads = {};
        const payloadByTypeProxy = this.payloadByType;
        for (const key of types) {
            const r$ = new rx.ReplaySubject(1);
            replayedPayloads[key] = ((_a = this.opts) === null || _a === void 0 ? void 0 : _a.debug) ?
                r$.pipe(this.debugLogLatestActionOperator(key)) :
                r$.asObservable();
            payloadByTypeProxy[key].subscribe(r$);
        }
        return replayedPayloads;
    }
    debugLogLatestActionOperator(type) {
        var _a;
        return ((_a = this.opts) === null || _a === void 0 ? void 0 : _a.log) ?
            rx.map((payload, idx) => {
                if (idx === 0) {
                    this.opts.log(this.core.debugName + 'rx:latest', type);
                }
                return payload;
            }) :
            (typeof window !== 'undefined') || (typeof Worker !== 'undefined') ?
                rx.map((payload, idx) => {
                    if (idx === 0) {
                        // eslint-disable-next-line no-console
                        console.log(`%c ${this.core.debugName}rx:latest `, 'color: #f0fe0fe0; background: #8c61dd;', type, payload === undefined ? '' : payload);
                    }
                    return payload;
                }) :
                rx.map((payload, idx) => {
                    if (idx === 0) {
                        // eslint-disable-next-line no-console
                        console.log(this.core.debugName + 'rx:latest', type, payload === undefined ? '' : payload);
                    }
                    return payload;
                });
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
    const elements = action.t.split('/');
    return (elements.length > 1 ? elements[1] : elements[0]);
}
export function serializeAction(action) {
    return Object.assign(Object.assign({}, action), { t: nameOfAction(action) });
}
export function deserializeAction(actionObj, toController) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return toController.dispatcher[actionObj.t](...actionObj.p);
}
//# sourceMappingURL=control.js.map