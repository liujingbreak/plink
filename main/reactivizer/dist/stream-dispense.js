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
/**
 * A very core functionality of @reactivizer is splitting action stream
 * by action types.
 * This class is supposed to offer better performance than
 * brutal operators like ofType() and filter(), it avoids
 * large number of subscription on action$ which triggers
 * multiple times of "ofType" (action type comparison operation) calculation on each action message.
 */
class ActionDispenser {
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