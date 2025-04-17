import * as rx from 'rxjs';
import { actionRelatedToAction } from './context-operators';
import { onAllSubscribed } from './utils';
// eslint-disable-next-line @typescript-eslint/no-empty-function
const EMPTY_FN = () => { };
export class SingleActionInterceptor {
    constructor(s, meta) {
        this.s = s;
        this.meta = meta;
        if (s.interceptSrcAction) {
            this.forkStream = s;
            this.emitAction = this.forkStream.interceptSrcAction(meta);
        }
        else {
            this.emitAction = EMPTY_FN;
        }
    }
    changePayload(...overridePayload) {
        this.payload = overridePayload;
        return this;
    }
    dp() {
        var _a;
        this.emitAction(...(_a = this.payload) !== null && _a !== void 0 ? _a : []);
    }
    /** observe messages related to interecpted action and
    * dipatch intercepted action back to base stream
    **/
    od(...moreMessages) {
        return onAllSubscribed(moreMessages.map(r => this.s.doOperator$.pipe(rx.switchMap(operator => r.pipe(operator(this.meta), actionRelatedToAction(this.meta))))), () => {
            var _a;
            this.emitAction(...(_a = this.payload) !== null && _a !== void 0 ? _a : []);
        });
    }
}
//# sourceMappingURL=single-action-interceptor.js.map