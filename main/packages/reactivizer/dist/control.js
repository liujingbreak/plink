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
exports.nameOfAction = exports.RxController = exports.ControllerCore = void 0;
const rx = __importStar(require("rxjs"));
let SEQ = 1;
let ACTION_SEQ = 1;
const has = Object.prototype.hasOwnProperty;
class ControllerCore {
    constructor(opts) {
        this.opts = opts;
        this.actionUpstream = new rx.Subject();
        this.dispatcher = {};
        this.interceptor$ = new rx.BehaviorSubject(a => a);
        this.typePrefix = SEQ++ + '/';
        this.debugName = typeof (opts === null || opts === void 0 ? void 0 : opts.debug) === 'string' ? `[${this.typePrefix}${opts.debug}] ` : this.typePrefix;
        const debuggableAction$ = (opts === null || opts === void 0 ? void 0 : opts.debug)
            ? this.actionUpstream.pipe((opts === null || opts === void 0 ? void 0 : opts.log) ?
                rx.tap(action => opts.log(this.debugName + 'rx:action', nameOfAction(action))) :
                (typeof window !== 'undefined') || (typeof Worker !== 'undefined') ?
                    rx.tap(action => {
                        // eslint-disable-next-line no-console
                        console.log(`%c ${this.debugName}rx:action `, 'color: white; background: #8c61ff;', nameOfAction(action), action.p === undefined ? '' : action.p);
                    })
                    :
                        // eslint-disable-next-line no-console
                        rx.tap(action => console.log(this.debugName + 'rx:action', nameOfAction(action), action.p === undefined ? '' : action.p)), rx.share())
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
            p: params
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
    ofType(...types) {
        return (up) => {
            const matchTypes = types.map(type => this.typePrefix + type);
            return up.pipe(rx.filter((a) => matchTypes.some(matchType => a.t === matchType)));
        };
    }
}
exports.ControllerCore = ControllerCore;
class RxController {
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
                const a$ = actionByTypeProxy[key];
                return a$.pipe(rx.map(a => [a.i, ...a.p]), rx.share());
            }
        });
        this.actionByType = this.at = actionByTypeProxy;
        this.payloadByType = this.pt = payloadByTypeProxy;
        this.replaceActionInterceptor = core.replaceActionInterceptor;
    }
    /**
     * Conceptually, it is a "store store" like Apache Kafka's "table"
     * From perspecitve of implementation, a map ReplaySubject which provides similiar function as rx.withLatestFrom() does
     */
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
                        console.log(this.core.debugName + 'rx:action', type, payload === undefined ? '' : payload);
                    }
                    return payload;
                });
    }
}
exports.RxController = RxController;
/**
 * Get the "action name" from payload's "type" field,
 * `payload.type`` is actually consist of string like `${Prefix}/${actionName}`,
 * this function returns the `actionName` part
 * @return undefined if current action doesn't have a valid "type" field
 */
// eslint-disable-next-line space-before-function-paren
function nameOfAction(action) {
    return action.t.split('/')[1];
}
exports.nameOfAction = nameOfAction;
//# sourceMappingURL=control.js.map