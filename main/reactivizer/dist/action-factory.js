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
exports.SingleActionFactoryImpl = void 0;
const rx = __importStar(require("rxjs"));
const stream_core_1 = require("./stream-core");
const context_operators_1 = require("./context-operators");
const utils_1 = require("./utils");
class SingleActionFactoryImpl {
    constructor(type, payload, control, opts = { slowDispatchObservableTime: 20000 }) {
        this.type = type;
        this.payload = payload;
        this.control = control;
        this.opts = opts;
        this.dispatched = false;
        this.action = control.createAction(type, payload);
    }
    /** Make this action become related to another action message
     */
    re(...actionMeta) {
        this.relateToAction = actionMeta;
        return this;
    }
    dp(...actionMetaRelated) {
        if (this.dispatched) {
            throw new Error('Message has already been dispatched');
        }
        const metas = actionMetaRelated.filter(m => m != null);
        const s = this.control.actionUpstream;
        (0, stream_core_1.assignActionReferParam)(this.action, this.relateToAction && this.relateToAction.length > 0 ?
            this.relateToAction.concat(metas) :
            metas);
        s.next(this.action);
        this.dispatched = true;
        return this.action;
    }
    do(response$, referAction) {
        const action = this.control.createAction(this.type, this.payload);
        if (referAction) {
            (0, stream_core_1.assignActionReferParam)(action, referAction);
        }
        else if (this.relateToAction && this.relateToAction.length > 0) {
            (0, stream_core_1.assignActionReferParam)(action, this.relateToAction);
        }
        const r$ = new rx.ReplaySubject(1);
        this.ddo(response$, referAction).subscribe(r$);
        return r$.asObservable();
    }
    ddo(response$, referAction) {
        const action = this.action;
        if (referAction) {
            (0, stream_core_1.assignActionReferParam)(action, referAction);
        }
        else if (this.relateToAction && this.relateToAction.length > 0) {
            (0, stream_core_1.assignActionReferParam)(action, this.relateToAction);
        }
        return new rx.Observable(sub => {
            sub.next(action);
            sub.complete();
        }).pipe(rx.mergeMap(action => {
            var _a;
            return rx.merge(this.control.doOperator$.pipe(rx.take(1), rx.switchMap(operator => response$.pipe(operator(action), (0, context_operators_1.actionRelatedToAction)(action)
            // mapActionToPayload() as (a: rx.Observable<Action<any>>) => rx.Observable<[ActionMeta, ...P]>,
            // rx.take(1)
            )), (0, utils_1.timeoutLog)((_a = this.opts.slowDispatchObservableTime) !== null && _a !== void 0 ? _a : 20000, 
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            this.opts.slowLog ? () => { this.opts.slowLog(action); } : () => { })), new rx.Observable(() => {
                this.control.actionUpstream.next(action);
                return () => {
                    // const cancel = this.control.createAction('__cancel' as keyof I, [action.t] as any);
                    // assignActionReferParam(cancel, action);
                    // this.control.actionUpstream.next(cancel);
                    this.control.cancelAction(action);
                };
            }));
        }));
    }
    od(response, ...moreResponses) {
        if (moreResponses.length === 0) {
            // eslint-disable-next-line @typescript-eslint/no-deprecated, @typescript-eslint/no-unsafe-return
            return this.ddo(response);
        }
        else {
            const responses = [response, ...moreResponses];
            if (this.relateToAction && this.relateToAction.length > 0) {
                (0, stream_core_1.assignActionReferParam)(this.action, this.relateToAction);
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return (0, utils_1.onAllSubscribed)(responses.map(r => {
                var _a;
                return this.control.doOperator$.pipe(rx.take(1), rx.switchMap(operator => r.pipe(operator(this.action), (0, context_operators_1.actionRelatedToAction)(this.action))), (0, utils_1.timeoutLog)((_a = this.opts.slowDispatchObservableTime) !== null && _a !== void 0 ? _a : 20000, this.opts.slowLog ? () => { this.opts.slowLog(this.action); } : () => {
                    // eslint-disable-next-line no-console
                    console.log('Slow observable action detected');
                }));
            }), () => {
                this.control.actionUpstream.next(this.action);
            }, () => {
                console.log('-- cancelAction');
                this.control.cancelAction(this.action);
            });
        }
    }
    odMono(response, ...moreResponses) {
        const res = this.od(response, ...moreResponses);
        if (Array.isArray(res)) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return res.map(i => i.pipe(rx.take(1)));
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return res.pipe(rx.take(1));
    }
}
exports.SingleActionFactoryImpl = SingleActionFactoryImpl;
//# sourceMappingURL=action-factory.js.map