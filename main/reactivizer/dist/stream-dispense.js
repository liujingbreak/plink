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
exports.ActionDispenser = void 0;
const rx = __importStar(require("rxjs"));
const control_1 = require("./control");
/**
 * A very core functionality of @reactivizer is splitting action stream
 * by action types.
 * This class is supposed to offer better performance than
 * brutal operators like ofType() and filter(), it avoids
 * large number of subscription on action$ which triggers
 * multiple times of "ofType" (action type comparison operation) calculation on each action message.
 */
class ActionDispenser {
    static ofRxController(control) {
        return new ActionDispenser(control.action$, control.typePrefix);
    }
    constructor(source$, typePrefix) {
        this.typePrefix = typePrefix;
        this.actionByType = new Map();
        this.countSubscriber = new rx.BehaviorSubject(0);
        const disconnectSignal = new rx.Subject();
        const connectSignal = new rx.Subject();
        connectSignal.pipe(rx.exhaustMap(() => source$.pipe(rx.map(action => {
            const control = this.actionByType.get(action.t);
            if (control) {
                const [dispenser] = control;
                dispenser.next(action);
            }
            else if (this.ofOtherTypesDispenser) {
                this.ofOtherTypesDispenser.next(action);
            }
        }), rx.takeUntil(disconnectSignal)))).subscribe();
        this.countSubscriber.pipe(rx.scan((prev, v) => {
            if (prev === 0 && v === 1)
                connectSignal.next();
            else if (prev === 1 && v === 0)
                disconnectSignal.next();
            return v;
        })).subscribe();
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        this.at = new Proxy({}, {
            get(_target, type, _rec) {
                return self.ofType(type);
            },
            has(_target, key) {
                return self.actionByType.has(key);
            },
            ownKeys() {
                return [...self.actionByType.keys()];
            }
        });
        const payloadsByType = new Map();
        this.pt = new Proxy({}, {
            get(_target, key, _rec) {
                let p$ = payloadsByType.get(key);
                if (p$ == null) {
                    const a$ = self.ofType(key);
                    p$ = a$.pipe((0, control_1.mapActionToPayload)(), rx.share());
                    payloadsByType.set(key, p$);
                }
                return p$;
            },
            has(_target, key) {
                return typeof key === 'string';
            },
            ownKeys() {
                return [];
            }
        });
    }
    ofType(type) {
        const key = this.typePrefix + type;
        const control = this.actionByType.get(key);
        if (control) {
            const [, stream] = control;
            return stream;
        }
        const dispenser$ = new rx.Subject();
        const stream = rx.merge(dispenser$, new rx.Observable(() => {
            this.countSubscriber.next(this.countSubscriber.getValue() + 1);
        })).pipe(rx.finalize(() => {
            this.countSubscriber.next(this.countSubscriber.getValue() - 1);
        }));
        this.actionByType.set(key, [dispenser$, stream]);
        return stream;
    }
    ofOtherTypes() {
        if (this.ofOtherTypesStream)
            return this.ofOtherTypesStream;
        const dispenser$ = this.ofOtherTypesDispenser = new rx.Subject();
        this.ofOtherTypesStream = rx.merge(dispenser$, new rx.Observable(() => {
            this.countSubscriber.next(this.countSubscriber.getValue() + 1);
        })).pipe(rx.finalize(() => {
            this.countSubscriber.next(this.countSubscriber.getValue() - 1);
        }));
        return this.ofOtherTypesStream;
    }
}
exports.ActionDispenser = ActionDispenser;
//# sourceMappingURL=stream-dispense.js.map