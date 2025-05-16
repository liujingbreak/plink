import { inspect } from 'node:util';
import * as rx from 'rxjs';
export const conciseConsoleLogger = (...msgs) => {
    // eslint-disable-next-line no-console
    console.log(formatToConcise(...msgs));
};
export const conciseNocolorConsoleLogger = (...msgs) => {
    // eslint-disable-next-line no-console
    console.log(formatToConciseNoColor(...msgs));
};
export function formatToConcise(...messageItems) {
    return messageItems.map(msg => typeof msg === 'string' ? msg : inspect(msg, false, 0, true)).join(' ');
}
export function formatToConciseNoColor(...messageItems) {
    return messageItems.map(msg => typeof msg === 'string' ? msg : inspect(msg, false, 0, false)).join(' ');
}
export function createSimpleIndentLogger(colorful, timestamp, out) {
    let lastPrefix;
    let lastMsgName;
    const out$ = new rx.Subject();
    const stop$ = new rx.BehaviorSubject(false);
    const buf = [];
    rx.merge(stop$.pipe(rx.switchMap(stop => {
        if (!stop)
            return rx.concat(new rx.Observable(sub => {
                while (buf.length > 0) {
                    const d = buf.shift();
                    const wait = out.write(d);
                    if (!wait) {
                        stop$.next(true);
                        return;
                    }
                }
                sub.complete();
            }), out$.pipe(rx.map(d => {
                const wait = out.write(d);
                if (!wait)
                    stop$.next(true);
            })));
        else
            return out$.pipe(rx.map(d => buf.push(d)));
    })), new rx.Observable(() => {
        const h = () => { stop$.next(false); };
        out.on('drain', h);
        return () => out.off('drain', h);
    })).subscribe();
    function printTime() {
        const date = new Date();
        out$.next('[');
        out$.next(date.getHours() + ':');
        out$.next(date.getMinutes() + ':');
        out$.next(date.getSeconds() + '.');
        out$.next(date.getMilliseconds() + '] ');
    }
    return function (prefix, ...msgs) {
        if (lastPrefix === prefix) {
            const hashPos = prefix.lastIndexOf('@');
            out$.next('  ');
            if (lastMsgName === msgs[0]) {
                out$.next('  ');
            }
            else {
                lastMsgName = msgs[0];
            }
            if (timestamp) {
                printTime();
            }
            if (hashPos >= 0) {
                out$.next(prefix.slice(hashPos));
                out$.next(' ');
            }
        }
        else {
            if (timestamp) {
                printTime();
            }
            out$.next(prefix);
            out$.next(' ');
            lastPrefix = prefix;
        }
        const rawMsg = colorful ? formatToConcise(...msgs) : formatToConciseNoColor(...msgs);
        out$.next(rawMsg.replaceAll(/\r?\n/g, '\n' + ' '.repeat(6)));
        out$.next('\n');
    };
}
//# sourceMappingURL=nodejs-utils.js.map