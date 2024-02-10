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
/* eslint-disable no-restricted-globals */
const rx = __importStar(require("rxjs"));
const control_1 = require("../control");
const __1 = require("..");
const types_1 = require("./types");
const worker_common_1 = require("./worker-common");
var common_1 = require("./common");
Object.defineProperty(exports, "setIdleDuring", { enumerable: true, get: function () { return common_1.setIdleDuring; } });
// import {createBroker} from './node-worker-broker';
function createWorkerControl(isInWorker, opts) {
    var _a, _b, _c, _d;
    let mainPort; // parent thread port
    const comp = new __1.ReactorComposite2(Object.assign(Object.assign({}, (opts !== null && opts !== void 0 ? opts : {})), { inputTableFor: [...((_a = opts === null || opts === void 0 ? void 0 : opts.inputTableFor) !== null && _a !== void 0 ? _a : []), ...types_1.workerInputTableFor], outputTableFor: [...((_b = opts === null || opts === void 0 ? void 0 : opts.outputTableFor) !== null && _b !== void 0 ? _b : []), ...types_1.workerOutputTableFor], name: 'unknown worker No', debug: opts === null || opts === void 0 ? void 0 : opts.debug, log: !isInWorker ? opts === null || opts === void 0 ? void 0 : opts.log : (...args) => mainPort === null || mainPort === void 0 ? void 0 : mainPort.postMessage({ type: 'log', p: args }), 
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        debugExcludeTypes: ['log', 'warn', ...((_c = opts === null || opts === void 0 ? void 0 : opts.debugExcludeTypes) !== null && _c !== void 0 ? _c : [])] }));
    const { r, i, o, outputTable } = comp;
    r('-> workerInited', new rx.Observable(() => {
        const handler = (event) => {
            var _a;
            const msg = event.data;
            if (msg.type === 'ASSIGN_WORKER_NO') {
                msg.mainPort.postMessage({ type: 'WORKER_READY' });
                mainPort = msg.mainPort;
                const workerNo = msg.workerNo;
                const logPrefix = ((_a = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _a !== void 0 ? _a : '') + '(W/' + workerNo + ')';
                o.ft.workerInited(workerNo, logPrefix, msg.mainPort).dp();
                comp.setName(logPrefix);
            }
        };
        if (isInWorker) {
            /* eslint-disable no-restricted-globals */
            addEventListener('message', handler);
        }
        else {
            o.ft.workerInited('main', '[main]', null).dp();
        }
        return () => self.removeEventListener('message', handler);
    }));
    r('workerInited -> main worker message port listener', o.pt.workerInited.pipe(rx.filter(([, , , port]) => port != null), rx.switchMap(([, , , port]) => new rx.Observable(() => {
        function handler(event) {
            const act = event.data;
            (0, __1.deserializeAction2)(act, i);
        }
        port.addEventListener('message', handler);
        return () => {
            port.close();
            port.removeEventListener('message', handler);
        };
    }))));
    // eslint-disable-next-line no-console
    (0, worker_common_1.applySharedReactors)(!isInWorker, comp, (_d = opts === null || opts === void 0 ? void 0 : opts.log) !== null && _d !== void 0 ? _d : console.log);
    r('"fork" -> forkByBroker', o.pt.fork.pipe(rx.switchMap(a => outputTable.l.workerInited.pipe(rx.map(b => [a, b]), rx.take(1))), rx.mergeMap(([[m, forkActionName, ...forkActionParams], [, , , mainPort]]) => {
        const wrappedAct = o.createAction(forkActionName, forkActionParams);
        const chan = new MessageChannel();
        const error$ = new rx.Observable(sub => {
            chan.port1.onmessageerror = err => sub.next(err);
            return () => chan.port1.onmessageerror = null;
        });
        return rx.merge(new rx.Observable(sub => {
            chan.port1.onmessage = msg => sub.next(msg.data);
            return () => chan.port1.onmessage = null;
        }).pipe(rx.map(event => (0, __1.deserializeAction2)(event, i)), rx.take(1), rx.takeUntil(rx.merge(error$, error$))), error$.pipe(rx.tap(err => o.ft._onErrorFor(err).dp(wrappedAct))), i.action$.pipe((0, __1.actionRelatedToAction)(wrappedAct), rx.tap(retAction => {
            const cloned = Object.assign({}, retAction);
            cloned.r = m.i;
            i.actionUpstream.next(cloned);
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
function createWorkerControlOfFn(recursiveFuncs, isInWorker, opts) {
    const ctl = createWorkerControl(isInWorker, opts).reativizeRecursiveFuncs(recursiveFuncs);
    return ctl;
}
exports.createWorkerControlOfFn = createWorkerControlOfFn;
//# sourceMappingURL=web-worker.js.map