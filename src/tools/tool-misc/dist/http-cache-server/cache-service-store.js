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
function startStore() {
    const slice = (0, rx_utils_1.createActionStreamByType)();
    const server = node_http_1.default.createServer({ keepAlive: true });
    server.keepAliveTimeout = 60000;
    server.listen(14401);
    server.once('listening', () => slice.dispatcher.listening());
    server.on('error', err => slice.dispatcher.error(err));
    server.on('request', (req, res) => slice.dispatcher.request(req, res));
    // key is clientId + ':' + data key, value is changed data value
    const subscribedMsgQByObsKey = new Map();
    const subscribeResponse$ = new rx.BehaviorSubject(null);
    const store = new rx.BehaviorSubject(new Map());
    rx.merge(slice.actionOfType('request').pipe(op.mergeMap(async ({ payload: [req, res] }) => {
        log.info('[server] ' + req.method, req.url);
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
            onMessage(jsonStr, res);
            subscribeResponse$.next(res);
        }
    })), slice.actionOfType('error').pipe(op.map(err => log.warn('[server] runtime error', err)))).pipe(op.takeUntil(slice.actionOfType('shutdown').pipe(op.take(1), op.map(() => {
        log.info('[server] shuting down');
        server.close();
    }))), op.catchError((err, src) => {
        log.error('[server]', err);
        return src;
    })).subscribe();
    function onMessage(jsonStr, res) {
        log.info('[server] got', jsonStr);
        const action = JSON.parse(jsonStr);
        if (action.type === 'subscribe') {
            const { client, keys } = action.payload;
            for (const key of keys) {
                const observeKey = client + ':' + key;
                if (!subscribedMsgQByObsKey.has(observeKey)) {
                    const changedValues = [];
                    subscribedMsgQByObsKey.set(observeKey, changedValues);
                    const obs = rx.merge(store.pipe(
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                    op.filter(s => s.get(key)), op.distinctUntilChanged(), op.map(value => {
                        // TODO: push changes to client
                        changedValues.push(value);
                    })), slice.actionOfType('keepSubsAlive').pipe(op.filter(({ payload: [client0, key0] }) => client0 === client && key0 === key), op.debounceTime(2 * 60000), // wait for 2 minutes to auto close subscription,
                    op.take(1), op.map(() => slice.dispatcher.onClientUnsubscribe(client, key))));
                    obs.subscribe();
                }
                else {
                    slice.dispatcher.keepSubsAlive(client, key);
                }
            }
        }
        else {
            if (action.type === 'setForNonexist') {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const { payload: [key, value] } = action;
                if (store.getValue().has(key)) {
                    res.end(JSON.stringify(store.getValue().get(key)));
                    return;
                }
                else {
                    store.getValue().set(key, value);
                    store.next(store.getValue());
                }
            }
            else if (action.type === 'increase') {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const { payload: [key, value] } = action;
                const state = store.getValue();
                if (state.has(key)) {
                    state.set(key, state.get(key) + value);
                }
                else {
                    state.set(key, value);
                }
                store.next(state);
                res.end(JSON.stringify(state.get(key)));
                return;
            }
            else if (action.type === 'unsubscribe') {
                slice.dispatcher.onClientUnsubscribe('' + action.client, action.payload);
            }
            res.end('ok');
        }
    }
    return {
        shutdown() {
            slice.dispatcher.shutdown();
        },
        started: slice.actionOfType('listening').pipe(op.take(1)).toPromise()
    };
}
exports.startStore = startStore;
function createClient() {
    const agent = new node_http_1.default.Agent({ keepAlive: true });
    const longPollAgent = new node_http_1.default.Agent({ keepAlive: true });
    const slice = (0, rx_utils_1.createActionStreamByType)({ debug: true });
    const subscribingKeys$ = new rx.BehaviorSubject(new Set());
    rx.merge(slice.actionOfType('subscribeChange').pipe(op.map(act => {
        subscribingKeys$.getValue().add(act.payload);
        subscribingKeys$.next(subscribingKeys$.getValue());
    })), rx.merge(subscribingKeys$, slice.actionOfType('_reconnectForSubs').pipe(op.subscribeOn(rx.queueScheduler))).pipe(op.switchMap(() => new rx.Observable(sub => {
        const req = node_http_1.default.request('http://localhost:14401/cache', {
            method: 'POST',
            agent: longPollAgent,
            headers: {
                'Transfer-Encoding': 'chunked'
            }
        }, res => {
            log.info('client recieving');
            res.on('end', () => {
                // slice.dispatcher._done(, act.payload as string);
                sub.complete();
            });
            res.on('data', (chunk) => sub.next(chunk));
            res.on('error', err => {
                req.end();
                sub.error(err);
            });
        });
        req.on('error', err => {
            if (req.reusedSocket && err.code === 'ECONNRESET') {
                log.info('Connection closed by server "ECONNRESET", create new request');
                slice.dispatcher._reconnectForSubs();
            }
            else {
                sub.error(err);
            }
        });
        req.write(JSON.stringify({
            type: 'subscribe',
            payload: {
                client: '' + process.pid,
                keys: [...subscribingKeys$.getValue().keys()]
            }
        }));
        return () => {
            req.end();
        };
    }))), slice.action$.pipe(op.filter(act => !slice.isActionType(act, 'subscribeChange') &&
        !slice.isActionType(act, '_reconnectForSubs') &&
        !slice.isActionType(act, '_responseEnd')), op.mergeMap(act => new rx.Observable(sub => {
        log.info('client', act.type);
        const req = node_http_1.default.request('http://localhost:14401/cache', {
            method: 'POST',
            agent
        }, res => {
            log.info('client recieving');
            void readToBuffer(res).then(content => {
                sub.next(content);
                sub.complete();
                slice.dispatcher._responseEnd(req, content);
            });
        });
        if (req.reusedSocket) {
            log.info('Socket is reused for', act.type, act.payload);
        }
        req.on('error', err => {
            if (req.reusedSocket && err.code === 'ECONNRESET') {
                log.info('Connection closed by server "ECONNRESET", retry request');
                sub.complete();
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                slice.dispatchFactory(act.type)(act.payload);
            }
            else {
                sub.error(err);
            }
        });
        // req.on('close', () => {
        //   slice.dispatcher._requestClose(req);
        // });
        const requestBody = Object.assign(Object.assign({}, act), { type: slice.nameOfAction(act) });
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        requestBody.payload.client = process.pid;
        req.end(JSON.stringify(requestBody));
    }).pipe(op.take(1), op.map(out => slice.dispatcher.onRespond(slice.nameOfAction(act), act.payload, out)))))).pipe(op.catchError((err, src) => {
        log.error('[client] error', err);
        return src;
    })).subscribe();
    return slice;
}
exports.createClient = createClient;
async function readToBuffer(input) {
    const buf = [];
    let encoding;
    const writable = new node_stream_1.Writable({
        write(chunk, enc, cb) {
            encoding = enc;
            // log.info('[client] recieve', chunk.toString());
            buf.push(chunk);
            cb();
        },
        final(cb) {
            cb();
        }
    });
    await node_stream_1.promises.pipeline(input, writable);
    if (encoding)
        return buf.join('');
    else
        return Buffer.concat(buf);
}
//# sourceMappingURL=cache-service-store.js.map