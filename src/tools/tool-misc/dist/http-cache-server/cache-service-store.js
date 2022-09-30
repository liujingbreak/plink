"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = exports.startStore = void 0;
const tslib_1 = require("tslib");
/**
 * To support cluster mode, this module should run inside Master process
 */
const node_http_1 = tslib_1.__importDefault(require("node:http"));
const node_stream_1 = require("node:stream");
const rx = tslib_1.__importStar(require("rxjs"));
const op = tslib_1.__importStar(require("rxjs/operators"));
const plink_1 = require("@wfh/plink");
const rx_utils_1 = require("@wfh/redux-toolkit-observable/dist/rx-utils");
const log = (0, plink_1.log4File)(__filename);
// type MemoStore = {
//   keyMap: Map<string, {expiration: number; data: any}>;
// };
function startStore() {
    const action$ = new rx.Subject();
    const req$ = new rx.Subject();
    const server = node_http_1.default.createServer({ keepAlive: true });
    server.keepAliveTimeout = 60000;
    server.listen(14401);
    server.once('listening', () => action$.next('listening'));
    server.on('error', err => action$.error(err));
    server.on('request', (req, res) => req$.next([req, res]));
    rx.merge(req$.pipe(op.mergeMap(async ([req, res]) => {
        log.info(req.url, req.method);
        if (req.url === '/cache' && req.method === 'POST') {
            let jsonStr = '';
            const writable = new node_stream_1.Writable({
                write(chunk, _encoding, callback) {
                    jsonStr += chunk.toString('utf-8');
                    callback(null);
                },
                final(cb) {
                    cb(null);
                }
            });
            await node_stream_1.promises.pipeline(req, writable);
            log.info('server', jsonStr);
            res.end('ok');
        }
    }))).pipe(op.takeUntil(action$.pipe(op.filter(ac => ac === 'shutdown'), op.take(1), op.map(() => {
        log.info('shuting down');
        server.close();
    }))), op.catchError((err, src) => {
        log.error(err);
        return src;
    })).subscribe();
    return {
        shutdown() {
            action$.next('shutdown');
        },
        started: action$.pipe(op.filter((act) => act === 'listening'), op.take(1)).toPromise()
    };
    // const store = new rx.BehaviorSubject<MemoStore>({
    //   keyMap: new Map()
    // });
}
exports.startStore = startStore;
function createClient() {
    const agent = new node_http_1.default.Agent({ keepAlive: true });
    const slice = (0, rx_utils_1.createActionStreamByType)();
    rx.merge(slice.actionOfType('subscribeChange').pipe(), slice.action$.pipe(op.filter(act => typeof act.payload === 'string'), op.mergeMap(act => new rx.Observable(sub => {
        log.info('client', act.type);
        const req = node_http_1.default.request('http://localhost:14401/cache', {
            method: 'POST',
            agent
        }, res => {
            log.info('client recieving');
            res.on('end', () => {
                slice.dispatcher._done(act.type, act.payload);
                sub.complete();
            });
            res.resume();
        });
        if (req.reusedSocket) {
            log.info('Socket is reused for', act.type, act.payload);
        }
        req.on('error', err => {
            if (req.reusedSocket && err.code === 'ECONNRESET') {
                log.info('Connection closed by server "ECONNRESET", retry request');
                slice.dispatchFactory(act.type)(act.payload);
            }
            else {
                sub.error(err);
            }
        });
        req.end(JSON.stringify(act));
    })))).pipe(op.catchError((err, src) => {
        log.error('client error', err);
        return src;
    })).subscribe();
    return slice;
}
exports.createClient = createClient;
//# sourceMappingURL=cache-service-store.js.map