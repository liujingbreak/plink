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
exports.actionMetaToStr = exports.nameOfAction = exports.ControllerCore = exports.has = void 0;
const rx = __importStar(require("rxjs"));
let SEQ = 1;
let ACTION_SEQ = Number((Math.random() + '').slice(2, 10)) + 1;
exports.has = Object.prototype.hasOwnProperty;
class ControllerCore {
    constructor(opts) {
        var _a;
        this.opts = opts;
        this.actionUpstream = new rx.Subject();
        this.interceptor$ = new rx.BehaviorSubject(a => a);
        this.typePrefix = '#' + SEQ++ + ' ';
        this.dispatcher = {};
        this.dispatcherFor = {};
        this.logPrefix = (opts === null || opts === void 0 ? void 0 : opts.name) ? `[${this.typePrefix}${opts.name}] ` : this.typePrefix;
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
    dispatchFactory(type) {
        if (exports.has.call(this.dispatcher, type)) {
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
    dispatchForFactory(type) {
        if (exports.has.call(this.dispatcherFor, type)) {
            return this.dispatcherFor[type];
        }
        const dispatch = (metas, ...params) => {
            const action = this.createAction(type, params);
            action.r = Array.isArray(metas) ? metas.map(m => m.i) : metas.i;
            this.actionUpstream.next(action);
            return action.i;
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
}
exports.ControllerCore = ControllerCore;
/**
 * Get the "action name" from payload's "type" field,
 * `payload.type`` is actually consist of string like `${Prefix}/${actionName}`,
 * this function returns the `actionName` part
 * @return undefined if current action doesn't have a valid "type" field
 */
// eslint-disable-next-line space-before-function-paren
function nameOfAction(action) {
    const match = /(?:#\d+\s+)?(\S+)$/.exec(action.t);
    return (match ? match[1] : action.t);
}
exports.nameOfAction = nameOfAction;
function actionMetaToStr(action) {
    const { r, i } = action;
    return `(i: ${i}${r != null ? `, r: ${Array.isArray(r) ? [...r.values()].toString() : r}` : ''})`;
}
exports.actionMetaToStr = actionMetaToStr;
//# sourceMappingURL=stream-core.js.map