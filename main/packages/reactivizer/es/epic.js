import * as rx from 'rxjs';
import { DuplexController } from './duplex';
export class ReactorComposite extends DuplexController {
    // protected control: DuplexController<ReactorCompositeActions, ReactorCompositeOutput>;
    constructor(opts) {
        super(opts);
        this.opts = opts;
        /** Abbrevation of addReaction */
        this.r = (...params) => {
            if (typeof params[0] === 'string')
                this.reactorSubj.next(params);
            else
                this.reactorSubj.next(['', ...params]);
        };
        // this.latestCompActPayloads = (this as ReactorComposite<ReactorCompositeActions, ReactorCompositeOutput>).i.createLatestPayloadsFor('mergeStream');
        this.reactorSubj = new rx.ReplaySubject(999);
    }
    startAll() {
        return rx.merge(this.reactorSubj.pipe(rx.mergeMap(([label, downStream, noError]) => {
            if (noError == null || !noError) {
                downStream = this.handleError(downStream, label);
            }
            return downStream;
        }))).pipe(rx.takeUntil(this.i.pt.stopAll), rx.catchError((err, src) => {
            var _a;
            if ((_a = this.opts) === null || _a === void 0 ? void 0 : _a.log)
                this.opts.log(err);
            else
                console.error(err);
            return src;
        })).subscribe();
    }
    // eslint-disable-next-line space-before-function-paren
    reactivize(fObject) {
        const funcs = Object.entries(fObject);
        for (const [key, func] of funcs) {
            if (typeof func === 'function') {
                this.reactivizeFunction(key, func, fObject);
            }
        }
        return this;
    }
    /**
     * It is just a declaration of mergeMap() operator, which merge an observable to the main stream
     * which will be or has already been observed by `startAll()`.
     * This is where we can add `side effect`s
    * */
    addReaction(...params) {
        this.r(...params);
    }
    reactivizeFunction(key, func, funcThisRef) {
        const resolveFuncKey = key + 'Resolved';
        const finishFuncKey = key + 'Completed';
        const dispatchResolved = this.o.core.dispatcherFactory(resolveFuncKey);
        const dispatchCompleted = this.o.core.dispatcherFactory(finishFuncKey);
        this.r(this.i.pt[key].pipe(rx.mergeMap(([id, ...params]) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const res = func.apply(funcThisRef, params);
            if (rx.isObservable(res)) {
                return res.pipe(rx.map(res => dispatchResolved(res, id)), rx.finalize(() => dispatchCompleted(id)));
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            }
            else if ((res === null || res === void 0 ? void 0 : res.then) && (res === null || res === void 0 ? void 0 : res.catch)) {
                return rx.from(res.then(resolved => {
                    dispatchResolved(resolved, id);
                    dispatchCompleted(id);
                }));
            }
            else {
                dispatchResolved(res, id);
                dispatchCompleted(id);
            }
            return rx.EMPTY;
        })));
        return resolveFuncKey;
    }
    handleError(upStream, label) {
        return upStream.pipe(rx.catchError((err, src) => {
            this.o.dp.onError(err, label);
            return src;
        }));
    }
}
//# sourceMappingURL=epic.js.map