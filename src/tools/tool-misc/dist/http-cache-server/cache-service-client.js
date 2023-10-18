"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = void 0;
const tslib_1 = require("tslib");
const node_http_1 = tslib_1.__importDefault(require("node:http"));
const node_stream_1 = require("node:stream");
const rx = tslib_1.__importStar(require("rxjs"));
const op = tslib_1.__importStar(require("rxjs/operators"));
const plink_1 = require("@wfh/plink");
const rx_utils_1 = require("@wfh/redux-toolkit-observable/dist/rx-utils");
const logClient = (0, plink_1.log4File)(__filename);
const logSlice = (0, plink_1.log4File)(__filename, 'rx');
function createClient(opts) {
    const agent = new node_http_1.default.Agent({ keepAlive: true });
    logClient.info('client is created');
    const slice = (0, rx_utils_1.createActionStreamByType)({
        debug: true,
        log: (...args) => logSlice.debug(...args)
    });
    const subscribingKeys$ = new rx.BehaviorSubject(new Set());
    rx.merge(slice.actionOfType('subscribeKey').pipe(op.map(({ payload }) => {
        const keys = subscribingKeys$.getValue();
        if (!keys.has(payload)) {
            keys.add(payload);
            subscribingKeys$.next(keys);
        }
    })), slice.actionOfType('unsubscribeKey').pipe(op.map(({ payload }) => {
        const keys = subscribingKeys$.getValue();
        if (keys.has(payload)) {
            keys.delete(payload);
            subscribingKeys$.next(keys);
        }
    })), slice.actionOfType('_reconnectForSubs').pipe(op.subscribeOn(rx.queueScheduler), op.map(() => {
        subscribingKeys$.next(subscribingKeys$.getValue());
    })), subscribingKeys$.pipe(op.filter(keys => keys.size > 0), op.switchMap(() => subscribeKeys(slice, [...subscribingKeys$.getValue().keys()], (opts === null || opts === void 0 ? void 0 : opts.reconnectWaitMs) != null ? opts.reconnectWaitMs : 1000)), op.map(data => {
        const json = JSON.parse(data.toString());
        slice.dispatcher.onChange(json.key, json.value);
    })
    // TODO: re-create request for subscription after response is ended by server
    ), slice.action$.pipe(op.filter(act => !slice.isActionType(act, 'subscribeKey') &&
        !slice.isActionType(act, '_reconnectForSubs') &&
        !slice.isActionType(act, '_responseEnd') &&
        !slice.isActionType(act, 'onRespond') &&
        !slice.isActionType(act, 'onChange')), op.mergeMap(act => new rx.Observable(sub => {
        const req = node_http_1.default.request((opts === null || opts === void 0 ? void 0 : opts.serverEndpoint) || 'http://localhost:14401/cache', {
            method: 'POST',
            agent
        }, res => {
            logClient.debug('client recieving');
            void readToBuffer(res).then(content => {
                sub.next(content);
                sub.complete();
            });
        });
        if (req.reusedSocket) {
            logClient.debug('Socket is reused for', act.type, act.payload);
        }
        req.on('error', err => {
            if (req.reusedSocket && err.code === 'ECONNRESET') {
                logClient.info('Connection closed by server "ECONNRESET", retry request');
                sub.complete();
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                slice.dispatchFactory(act.type)(act.payload);
            }
            else {
                setTimeout(() => sub.error(err), 2000);
            }
        });
        const requestBody = Object.assign(Object.assign({}, act), { type: slice.nameOfAction(act) });
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        requestBody.client = process.pid;
        req.end(JSON.stringify(requestBody));
    }).pipe(op.map(out => {
        slice.dispatcher.onRespond(slice.nameOfAction(act), act.payload, out);
        // if (slice.isActionType(act, 'shutdownServer'))
        //   slice.dispatcher._shutdownSelf();
    }), op.catchError((err, src) => {
        logClient.error('Error in action: ' + slice.nameOfAction(act), err);
        return src;
    })))), slice.actionOfType('onRespond').pipe(op.map(({ payload }) => {
        logClient.info('Recieved', payload);
    })), slice.actionOfType('onChange').pipe(op.filter(({ payload: [key, value] }) => key === '__SERVER' && value === 'shutting'), op.take(1), op.map(() => slice.dispatcher._shutdownSelf()))).pipe(op.takeUntil(slice.actionOfType('_shutdownSelf')), op.catchError((err, src) => {
        logClient.error('client', err);
        return src;
    })).subscribe();
    slice.dispatcher.subscribeKey('__SERVER');
    return Object.assign(Object.assign({}, slice), { serverReplied(actType, predicate) {
            return slice.actionOfType('onRespond').pipe(op.filter(({ payload: [type, payload, content] }) => type === actType && predicate(payload, content)), op.take(1)).toPromise();
        } });
}
exports.createClient = createClient;
function subscribeKeys(slice, keys, reconnectWaitMs) {
    const longPollAgent = new node_http_1.default.Agent({ keepAlive: true });
    const send$ = new rx.Subject();
    const request$ = new rx.Subject();
    const response$ = new rx.BehaviorSubject('wait');
    const data$ = new rx.Subject();
    function doRequest() {
        response$.next('wait');
        const req = node_http_1.default.request('http://localhost:14401/cache', {
            method: 'POST',
            agent: longPollAgent,
            headers: {
                'Transfer-Encoding': 'chunked'
            }
        }, res => {
            response$.next(res);
            logClient.info('client recieving');
            res.on('end', () => {
                response$.next('end');
            });
            res.on('data', (chunk) => data$.next(chunk));
            res.on('error', err => {
                response$.error(err);
            });
        });
        request$.next(req);
        req.on('error', err => {
            if (req.reusedSocket && err.code === 'ECONNRESET') {
                logClient.info('Connection closed by server "ECONNRESET", create new request');
                slice.dispatcher._reconnectForSubs();
            }
            else {
                request$.error(err);
            }
        });
        req.end(JSON.stringify({
            type: 'subscribe',
            payload: {
                client: '' + process.pid,
                keys
            }
        }));
    }
    return rx.merge(send$.pipe(op.map(() => doRequest()), op.ignoreElements()), response$.pipe(op.filter(s => s === 'end'), op.concatMap(() => rx.timer(reconnectWaitMs)), op.map(() => send$.next()), op.ignoreElements()), rx.combineLatest(request$, response$).pipe(op.takeLast(1), // on unsubscribed
    op.map(([req, res]) => {
        if (res === 'wait') {
            logClient.info('Destroy subscription request');
            req.destroy();
        }
        else if (res !== 'end' && res != null) {
            logClient.info('Abort subscription response');
            res.destroy();
        }
    }), op.ignoreElements()), data$, rx.defer(() => send$.next()).pipe(op.ignoreElements())).pipe(op.catchError((err, src) => {
        logClient.warn('subscription error', err);
        return rx.timer(2000).pipe(op.concatMap(() => src));
    }));
}
async function readToBuffer(input) {
    const buf = [];
    const writable = new node_stream_1.Writable({
        write(chunk, enc, cb) {
            buf.push(chunk);
            cb();
        },
        final(cb) {
            cb();
        }
    });
    await node_stream_1.promises.pipeline(input, writable);
    if (buf.length > 0 && Buffer.isBuffer(buf[0]))
        return Buffer.concat(buf).toString();
    else
        return buf.join('');
}
//# sourceMappingURL=cache-service-client.js.map