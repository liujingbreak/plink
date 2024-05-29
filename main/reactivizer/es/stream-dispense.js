import * as rx from 'rxjs';
/**
 * A very core functionality of @reactivizer is splitting action stream
 * by action types.
 * This class is supposed to offer better performance than
 * brutal operators like ofType() and filter(), it avoids
 * large number of subscription on action$ which triggers
 * multiple times of "ofType" (action type comparison operation) calculation on each action message.
 */
export class ActionDispenser {
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
//# sourceMappingURL=stream-dispense.js.map