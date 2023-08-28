import * as rx from 'rxjs';
import { DuplexController } from './duplex';
export class ReactorComposite extends DuplexController {
    // protected control: DuplexController<ReactorCompositeActions, ReactorCompositeOutput>;
    constructor(opts) {
        super(opts);
        this.opts = opts;
        this.latestCompActPayloads = this.i.createLatestPayloadsFor('mergeStream');
    }
    startAll() {
        const l = this.latestCompActPayloads;
        return rx.merge(l.mergeStream.pipe(rx.mergeMap(([_id, downStream, noError, label]) => {
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
                const dispatch = this.o.core.dispatcherFactory((key + 'Done'));
                this.i.dp.mergeStream(this.i.pt[key].pipe(rx.mergeMap(([, ...params]) => {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    const res = func.apply(fObject, params);
                    if (rx.isObservable(res)) {
                        return res;
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    }
                    else if ((res === null || res === void 0 ? void 0 : res.then) && (res === null || res === void 0 ? void 0 : res.catch)) {
                        return rx.from(res);
                    }
                    else {
                        dispatch(res);
                    }
                    return rx.EMPTY;
                }), rx.map(res => {
                    dispatch(res);
                })));
            }
        }
        return this;
    }
    addReaction(...params) {
        this.r(...params);
    }
    /** Abbrevation of addReaction */
    r(...params) {
        this.i.dp.mergeStream(...params);
    }
    handleError(upStream, label) {
        return upStream.pipe(rx.catchError((err, src) => {
            this.o.dp.onError(err, label);
            return src;
        }));
    }
}
//# sourceMappingURL=epic.js.map