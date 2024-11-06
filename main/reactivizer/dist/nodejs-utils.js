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
exports.conciseNocolorConsoleLogger = exports.conciseConsoleLogger = void 0;
exports.formatToConcise = formatToConcise;
exports.formatToConciseNoColor = formatToConciseNoColor;
exports.createSimpleIndentLogger = createSimpleIndentLogger;
const node_util_1 = require("node:util");
const rx = __importStar(require("rxjs"));
const conciseConsoleLogger = (...msgs) => {
    // eslint-disable-next-line no-console
    console.log(formatToConcise(...msgs));
};
exports.conciseConsoleLogger = conciseConsoleLogger;
const conciseNocolorConsoleLogger = (...msgs) => {
    // eslint-disable-next-line no-console
    console.log(formatToConciseNoColor(...msgs));
};
exports.conciseNocolorConsoleLogger = conciseNocolorConsoleLogger;
function formatToConcise(...messageItems) {
    return messageItems.map(msg => typeof msg === 'string' ? msg : (0, node_util_1.inspect)(msg, false, 0, true)).join(' ');
}
function formatToConciseNoColor(...messageItems) {
    return messageItems.map(msg => typeof msg === 'string' ? msg : (0, node_util_1.inspect)(msg, false, 0, false)).join(' ');
}
function createSimpleIndentLogger(colorful, timestamp, out) {
    let lastPrefix;
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
    })), new rx.Observable(_sub => {
        const h = () => stop$.next(false);
        out.on('drain', h);
        return () => out.off('drain', h);
    })
    // out$.pipe(
    //   rx.map(d => console.log(d))
    // )
    ).subscribe();
    return function (prefix, ...msgs) {
        function printTime() {
            const date = new Date();
            out$.next('[');
            out$.next(date.getHours() + ':');
            out$.next(date.getMinutes() + ':');
            out$.next(date.getSeconds() + '.');
            out$.next(date.getMilliseconds() + '] ');
        }
        if (lastPrefix === prefix) {
            const hashPos = prefix.indexOf('@');
            out$.next('  ');
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
        out$.next(rawMsg.replaceAll(/\r?\n/g, '\n    '));
        out$.next('\n');
    };
}
//# sourceMappingURL=nodejs-utils.js.map