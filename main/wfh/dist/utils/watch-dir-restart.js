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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cp = __importStar(require("child_process"));
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const chokidar_1 = __importDefault(require("chokidar"));
function default_1(dirOrFile, forkJsFiles, opts = {}) {
    const watcher = chokidar_1.default.watch(dirOrFile, { ignoreInitial: true });
    const change$ = rx.fromEventPattern(h => watcher.on('change', h), h => watcher.off('change', h))
        .pipe(op.map(event => ({ fileChangeType: 'change', data: event })));
    const add$ = rx.fromEventPattern(h => watcher.on('add', h), h => watcher.off('add', h))
        .pipe(op.map(event => ({ fileChangeType: 'add', data: event })));
    const action$ = new rx.Subject();
    const serverState$ = new rx.BehaviorSubject('stopped');
    rx.merge(action$.pipe(
    // eslint-disable-next-line no-console
    op.tap(type => console.log('[watch-dir-restart]:', type)), op.ignoreElements()), 
    // restart after started
    rx.merge(change$, add$).pipe(op.debounceTime(500), op.mapTo('request restart'), op.exhaustMap(() => {
        const wait = serverState$.pipe(op.filter(type => type === 'started'), op.take(1));
        action$.next('restart');
        return wait;
    })), 
    // restart -> stop -> (after stopped) -> start
    action$.pipe(op.filter(type => type === 'restart'), op.concatMap(() => {
        const done = serverState$.pipe(op.filter(type => type === 'stopped'), op.take(1));
        action$.next('stop');
        return done;
    }), op.tap(() => action$.next('start'))), 
    // start -> started, stop -> stopped
    action$.pipe(op.filter(type => type === 'start'), op.concatMap(() => {
        const factories = (forkJsFiles.length > 0 && typeof forkJsFiles[0] === 'string') ?
            forkJsFiles.map(forkJsFile => () => cp.fork(forkJsFile))
            :
                forkJsFiles;
        serverState$.next('started');
        return rx.merge(rx.from(factories).pipe(op.mergeMap(fac => new rx.Observable(sub => {
            const child = fac();
            const subStop = action$.pipe(op.filter(type => type === 'stop'), op.take(1), op.takeUntil(serverState$.pipe(op.filter(s => s === 'stopped'))), op.tap(() => {
                child.kill('SIGINT');
                serverState$.next('stopping');
            })).subscribe();
            child.on('exit', (code, signal) => {
                // Send antion to kill other child process
                if (serverState$.getValue() !== 'stopping') {
                    const msg = `Unexpected exit signal ${code + ''} - ${(signal === null || signal === void 0 ? void 0 : signal.toString()) || ''}`;
                    // eslint-disable-next-line no-console
                    console.log(msg);
                    sub.error(new Error(msg));
                }
                sub.complete();
            });
            child.on('error', (err) => {
                // eslint-disable-next-line no-console
                console.log('Child process encounters error:', err);
                sub.error(err);
            });
            sub.next(child);
            return () => subStop.unsubscribe();
        }).pipe(op.retry(opts.retryOnError != null ? opts.retryOnError : 10))), op.finalize(() => {
            serverState$.next('stopped');
        })));
    })), rx.defer(() => {
        // initial
        action$.next('start');
        return rx.EMPTY;
    })).subscribe();
    return { action$, serverState$ };
}
exports.default = default_1;
//# sourceMappingURL=watch-dir-restart.js.map