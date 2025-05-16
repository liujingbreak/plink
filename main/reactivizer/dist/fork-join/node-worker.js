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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.setIdleDuring = void 0;
exports.createWorkerControl = createWorkerControl;
exports.createWorkerControlOfFn = createWorkerControlOfFn;
const node_util_1 = require("node:util");
const worker_threads_1 = require("worker_threads");
const rx = __importStar(require("rxjs"));
const control_1 = require("../control");
const __1 = require("..");
const simplex_reactor_1 = require("../simplex-reactor");
const types_1 = require("./types");
const worker_common_1 = require("./worker-common");
var common_1 = require("./common");
Object.defineProperty(exports, "setIdleDuring", { enumerable: true, get: function () { return common_1.setIdleDuring; } });
const inspectOptions = { depth: 0, showHidden: false, compact: true, maxStringLength: 20 };
/**
 * @param opts.log if value is `undefined` and current createWorkerControl() is for creating instance in a forked thread, by default log messages will
 * be transfered to main worker thread, but message will be trimmed by `util.inspect(..., {depth: 1, showHidden: false})`.
 */
function createWorkerControl(opts) {
    var _a, _b, _c;
    let mainPort; // Broker's message port
    const comp = new simplex_reactor_1.SimplexReactor(Object.assign(Object.assign({}, (opts !== null && opts !== void 0 ? opts : {})), { tableFor: (opts === null || opts === void 0 ? void 0 : opts.tableFor) ? [...types_1.workerActionTableFor, ...opts.tableFor] : types_1.workerActionTableFor, name: ((_a = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _a !== void 0 ? _a : '') + ('(W/' + (worker_threads_1.isMainThread ? 'main)' : worker_threads_1.threadId + '?)')), enableLog: opts === null || opts === void 0 ? void 0 : opts.enableLog, log: worker_threads_1.isMainThread ?
            opts === null || opts === void 0 ? void 0 : opts.log :
            (...args) => mainPort === null || mainPort === void 0 ? void 0 : mainPort.postMessage({
                type: 'log',
                p: args.map(arg => {
                    const type = typeof arg;
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                    return type === 'string' ? arg : (0, node_util_1.inspect)(arg, inspectOptions);
                })
            }), 
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        debugExcludeTypes: ['log', 'warn', 'wait', 'stopWaiting', ...((_b = opts === null || opts === void 0 ? void 0 : opts.debugExcludeTypes) !== null && _b !== void 0 ? _b : [])], debugIncludeTypes: opts === null || opts === void 0 ? void 0 : opts.debugIncludeTypes }));
    const { r, s, table } = comp;
    // eslint-disable-next-line no-console
    (0, worker_common_1.applySharedReactors)(worker_threads_1.isMainThread, comp, (_c = opts === null || opts === void 0 ? void 0 : opts.log) !== null && _c !== void 0 ? _c : console.log);
    r('inited -> main worker message port listener', s.pt.inited.pipe(rx.filter(([, , , port]) => port != null), rx.switchMap(([, , , port]) => new rx.Observable(() => {
        function handler(event) {
            const act = event;
            (0, __1.deserializeAction2)(act, s);
        }
        port.on('message', handler);
        return () => {
            port.close();
            port.off('message', handler);
        };
    }))));
    r('-> inited', new rx.Observable(() => {
        const handler = (event) => {
            var _a;
            const msg = event;
            if (msg.type === 'ASSIGN_WORKER_NO') {
                mainPort = msg.mainPort;
                mainPort.postMessage({ type: 'WORKER_READY' });
                const workerNo = msg.workerNo;
                const logPrefix = ((_a = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _a !== void 0 ? _a : '') + '(W/' + workerNo + ')';
                s.ft.inited(workerNo, logPrefix, mainPort).dp();
                comp.s.setName(logPrefix);
            }
        };
        if (worker_threads_1.parentPort) {
            worker_threads_1.parentPort.on('message', handler);
        }
        else {
            s.ft.inited('main', '[main]', null).dp();
        }
        return () => worker_threads_1.parentPort === null || worker_threads_1.parentPort === void 0 ? void 0 : worker_threads_1.parentPort.off('message', handler);
    }));
    r('"fork" -> mainPort.postMessage, forkByBroker', s.pt.fork.pipe(rx.switchMap(a => table.l.inited.pipe(rx.map(b => [a, b]), rx.take(1))), rx.mergeMap(([[m, forkActionName, ...forkActionParams], [, , , mainPort]]) => {
        const wrappedAct = s.createAction(forkActionName, forkActionParams);
        const chan = new worker_threads_1.MessageChannel();
        const error$ = rx.fromEventPattern(h => chan.port1.addListener('messageerror', h), h => chan.port1.removeListener('messageerror', h));
        const close$ = rx.fromEventPattern(h => chan.port1.on('close', h), h => chan.port1.off('close', h));
        return rx.merge(rx.fromEventPattern(h => chan.port1.on('message', h), h => {
            chan.port1.off('message', h);
            chan.port1.close();
        }).pipe(rx.map(event => {
            s.ft.onForkReturn(event).dp();
        }), rx.take(1), rx.takeUntil(rx.merge(error$, close$))), error$.pipe(rx.tap(err => { comp.dispatchErrorFor(err, wrappedAct); })), s.pt.onForkReturn.pipe(rx.map(([, retAction]) => retAction), (0, __1.actionRelatedToAction)(wrappedAct), rx.tap(retAction => {
            const replyFork = s.createAction(retAction.t, retAction.p);
            replyFork.r = m.i; // the original action is related to `wrappedAct`, now it is related to "fork" action
            s.actionUpstream.next(replyFork);
        }), rx.take(1)), new rx.Observable(() => {
            if (mainPort) {
                const forkByBroker = s.createAction('forkByBroker', [wrappedAct, chan.port2]);
                mainPort.postMessage((0, control_1.serializeAction)(forkByBroker), [chan.port2]);
            }
            else {
                s.ft.forkByBroker(wrappedAct, chan.port2).dp(m);
            }
        }));
    })));
    return comp;
}
function createWorkerControlOfFn(recursiveFuncs, opts) {
    const ctl = createWorkerControl(opts).reactivize(recursiveFuncs);
    return ctl;
}
//# sourceMappingURL=node-worker.js.map