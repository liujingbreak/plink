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
exports.createWorkerControlOfFn = exports.createWorkerControl = exports.setIdleDuring = void 0;
const node_util_1 = require("node:util");
const worker_threads_1 = require("worker_threads");
const rx = __importStar(require("rxjs"));
const control_1 = require("../control");
const __1 = require("..");
const reactor_composite_1 = require("../reactor-composite");
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
    var _a, _b, _c, _d, _e;
    let mainPort; // parent thread port
    // eslint-disable-next-line @typescript-eslint/ban-types
    const comp = new reactor_composite_1.ReactorComposite2(Object.assign(Object.assign({}, (opts !== null && opts !== void 0 ? opts : {})), { inputTableFor: [...((_a = opts === null || opts === void 0 ? void 0 : opts.inputTableFor) !== null && _a !== void 0 ? _a : []), ...types_1.workerInputTableFor], outputTableFor: [...((_b = opts === null || opts === void 0 ? void 0 : opts.outputTableFor) !== null && _b !== void 0 ? _b : []), ...types_1.workerOutputTableFor], name: ((_c = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _c !== void 0 ? _c : '') + ('(W/' + (worker_threads_1.isMainThread ? 'main)' : worker_threads_1.threadId + '?)')), debug: opts === null || opts === void 0 ? void 0 : opts.debug, log: worker_threads_1.isMainThread ?
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
        debugExcludeTypes: ['log', 'warn', 'wait', 'stopWaiting', ...((_d = opts === null || opts === void 0 ? void 0 : opts.debugExcludeTypes) !== null && _d !== void 0 ? _d : [])], debugIncludeTypes: opts === null || opts === void 0 ? void 0 : opts.debugIncludeTypes }));
    const { r, i, o, outputTable } = comp;
    r('-> workerInited', new rx.Observable(() => {
        const handler = (event) => {
            var _a;
            const msg = event;
            if (msg.type === 'ASSIGN_WORKER_NO') {
                msg.mainPort.postMessage({ type: 'WORKER_READY' });
                mainPort = msg.mainPort;
                const workerNo = msg.workerNo;
                const logPrefix = ((_a = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _a !== void 0 ? _a : '') + '(W/' + workerNo + ')';
                o.ft.workerInited(workerNo, logPrefix, msg.mainPort).dp();
                comp.setName(logPrefix);
            }
        };
        if (worker_threads_1.parentPort) {
            /* eslint-disable no-restricted-globals */
            worker_threads_1.parentPort.on('message', handler);
        }
        else {
            o.ft.workerInited('main', '[main]', null).dp();
        }
        return () => worker_threads_1.parentPort === null || worker_threads_1.parentPort === void 0 ? void 0 : worker_threads_1.parentPort.off('message', handler);
    }));
    r('workerInited -> main worker message port listener', o.pt.workerInited.pipe(rx.filter(([, , , port]) => port != null), rx.switchMap(([, , , port]) => new rx.Observable(() => {
        function handler(event) {
            const act = event;
            (0, __1.deserializeAction2)(act, i);
            // o.ft.log('message action.p=', act.p[0]).dp();
        }
        port.on('message', handler);
        return () => {
            port.close();
            port.off('message', handler);
        };
    }))));
    // eslint-disable-next-line no-console
    (0, worker_common_1.applySharedReactors)(worker_threads_1.isMainThread, comp, (_e = opts === null || opts === void 0 ? void 0 : opts.log) !== null && _e !== void 0 ? _e : console.log);
    r('"fork" -> mainPort.postMessage, forkByBroker', o.pt.fork.pipe(rx.switchMap(a => outputTable.l.workerInited.pipe(rx.map(b => [a, b]), rx.take(1))), rx.mergeMap(([[m, forkActionName, ...forkActionParams], [, , , mainPort]]) => {
        const wrappedAct = o.createAction(forkActionName, forkActionParams);
        const chan = new worker_threads_1.MessageChannel();
        const error$ = rx.fromEventPattern(h => chan.port1.addListener('messageerror', h), h => chan.port1.removeListener('messageerror', h));
        const close$ = rx.fromEventPattern(h => chan.port1.on('close', h), h => chan.port1.off('close', h));
        return rx.merge(rx.fromEventPattern(h => chan.port1.on('message', h), h => {
            chan.port1.off('message', h);
            chan.port1.close();
        }).pipe(rx.map(event => (0, __1.deserializeAction2)(event, i)), rx.take(1), rx.takeUntil(rx.merge(error$, close$))), error$.pipe(rx.tap(err => comp.dispatchErrorFor(err, wrappedAct))), i.action$.pipe((0, __1.actionRelatedToAction)(wrappedAct), rx.tap(retAction => {
            const replyFork = i.createAction((0, __1.nameOfAction)(retAction), retAction.p);
            replyFork.r = m.i; // the original action is related to `wrappedAct`, now it is related to "fork" action
            i.actionUpstream.next(replyFork);
        }), rx.take(1)), new rx.Observable(_sub => {
            if (mainPort) {
                const forkByBroker = o.createAction('forkByBroker', [wrappedAct, chan.port2]);
                mainPort.postMessage((0, control_1.serializeAction)(forkByBroker), [chan.port2]);
            }
            else {
                o.ft.forkByBroker(wrappedAct, chan.port2).dp(m);
            }
        }));
    })));
    return comp;
}
exports.createWorkerControl = createWorkerControl;
function createWorkerControlOfFn(recursiveFuncs, opts) {
    const ctl = createWorkerControl(opts).reativizeRecursiveFuncs(recursiveFuncs);
    return ctl;
}
exports.createWorkerControlOfFn = createWorkerControlOfFn;
//# sourceMappingURL=node-worker.js.map