import * as rx from 'rxjs';
import { DuplexController } from './duplex';
export class ReactorComposite {
    constructor(opts) {
        this.opts = opts;
        this.control = new DuplexController(opts);
        this.l = this.latestPayloads = this.control.i.createLatestPayloadsFor('mergeStream');
    }
    startAll() {
        return rx.merge(this.l.mergeStream.pipe(rx.mergeMap(([_id, downStream, noError, label]) => {
            if (noError == null || !noError) {
                downStream = this.handleError(downStream, label);
            }
            return downStream;
        }))).pipe(rx.takeUntil(this.control.i.pt.stopAll), rx.catchError((err, src) => {
            var _a;
            if ((_a = this.opts) === null || _a === void 0 ? void 0 : _a.log)
                this.opts.log(err);
            else
                console.error(err);
            return src;
        })).subscribe();
    }
    getControl() {
        return this.control;
    }
    handleError(upStream, label) {
        return upStream.pipe(rx.catchError((err, src) => {
            this.control.o.dispatcher.onError(err, label);
            return src;
        }));
    }
}
//# sourceMappingURL=epic.js.map