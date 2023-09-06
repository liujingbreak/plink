import * as rx from 'rxjs';
export function timeoutLog(millseconds, log) {
    return function (up) {
        let hasValue = false;
        return rx.merge(up.pipe(rx.map(v => {
            hasValue = true;
            return v;
        })), rx.timer(millseconds).pipe(rx.map(() => {
            if (!hasValue) {
                log();
            }
        }), rx.take(1), rx.ignoreElements()));
    };
}
//# sourceMappingURL=utils.js.map