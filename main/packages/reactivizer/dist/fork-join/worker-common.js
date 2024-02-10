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
exports.applySharedReactors = void 0;
const rx = __importStar(require("rxjs"));
const __1 = require("..");
function applySharedReactors(isMainWorker, comp, log) {
    const { r, i, o, outputTable, inputTable } = comp;
    const lo = comp.outputTable.l;
    if (!isMainWorker) {
        r('exit', comp.inputTable.l.exit.pipe(rx.switchMap(() => lo.workerInited), rx.take(1), rx.map(() => {
            comp.dispose();
        })));
        r('postMessage wait, stopWaiting, returned message to broker', lo.workerInited.pipe(rx.filter(([, , , port]) => port != null), rx.take(1), rx.switchMap(([, , , port]) => rx.merge(o.at.wait, o.at.stopWaiting, o.at.returned).pipe(rx.map(action => {
            port.postMessage((0, __1.serializeAction)(action));
        })))));
        r('postMessage log to broker (parent thread)', lo.workerInited.pipe(rx.filter(([, , , port]) => port != null), rx.take(1), rx.switchMap(([, , logPrefix, port]) => lo.log.pipe(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        rx.map(([, ...p]) => port === null || port === void 0 ? void 0 : port.postMessage({ type: 'log', p: [logPrefix, ...p] }))))));
    }
    else {
        // main thread
        r('log, warn > console.log', lo.workerInited.pipe(rx.take(1), rx.switchMap(([, , logPrefix]) => rx.merge(lo.log, lo.warn).pipe(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        rx.tap(([, ...p]) => log(logPrefix, ...p))))));
    }
    r('onFork -> wait for fork action returns, postMessage to forking parent thread', i.pt.onFork.pipe(rx.mergeMap(([, origAct, port]) => {
        return rx.merge(o.action$.pipe((0, __1.actionRelatedToAction)(origAct), rx.take(1), rx.map(action => {
            const { p } = action;
            if (hasReturnTransferable(p)) {
                const [{ transferList }] = p;
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                p[0].transferList = null;
                port.postMessage((0, __1.serializeAction)(action), transferList);
            }
            else {
                port.postMessage((0, __1.serializeAction)(action));
            }
            o.ft.returned().dp();
        })), new rx.Observable(() => {
            (0, __1.deserializeAction2)(origAct, i);
        }));
    })));
    r('Pass error to broker', comp.error$.pipe(rx.switchMap(a => outputTable.l.workerInited.pipe(rx.map(b => [a, b]), rx.take(1))), rx.map(([[label, err], [, , , mainPort]]) => {
        if (mainPort) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            mainPort.postMessage({ error: { label, detail: err } });
        } // else if (broker) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        // broker.o.dp.onWorkerError(-1, {label, detail: err}, 'customized error');
        // }
    })));
    r('setLiftUpActions -> postMessage to main thread', inputTable.l.setLiftUpActions.pipe(rx.mergeMap(([, action$]) => action$), rx.withLatestFrom(outputTable.l.workerInited), rx.tap(([action, [, , , port]]) => {
        if (port) {
            o.ft.log(`pass action ${(0, __1.nameOfAction)(action)} to main thread`).dp();
            port.postMessage((0, __1.serializeAction)(action));
        }
    })));
}
exports.applySharedReactors = applySharedReactors;
function hasReturnTransferable(payload) {
    var _a;
    return Array.isArray((_a = payload[0]) === null || _a === void 0 ? void 0 : _a.transferList);
}
//# sourceMappingURL=worker-common.js.map