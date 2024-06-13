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
    const { r, s, table } = comp;
    const lo = comp.table.l;
    if (!isMainWorker) {
        r('exit', comp.table.l.exit.pipe(rx.switchMap(() => lo.inited), rx.take(1), rx.map(() => {
            comp.dispose();
        })));
        r('(inited), wait, stopWaiting, returned -> "postMessage message to broker"', lo.inited.pipe(rx.filter(([, , , port]) => port != null), rx.take(1), rx.switchMap(([, , , port]) => rx.merge(s.at.wait, s.at.stopWaiting, s.at.returned).pipe(rx.map(action => {
            port.postMessage((0, __1.serializeAction)(action));
        })))));
        r('(inited) log -> "postMessage to broker (parent thread)"', lo.inited.pipe(rx.filter(([, , , port]) => port != null), rx.take(1), rx.switchMap(([, , logPrefix, port]) => lo.log.pipe(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        rx.map(([, ...p]) => port === null || port === void 0 ? void 0 : port.postMessage({ type: 'log', p: [logPrefix, ...p] }))))));
        r('changeConfig', s.pt.changeConfig.pipe(rx.map(([, config]) => comp.config(config))));
    }
    else {
        // main thread
        r('log, warn > console.log', lo.inited.pipe(rx.take(1), rx.switchMap(([, , logPrefix]) => rx.merge(lo.log, lo.warn).pipe(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        rx.tap(([, ...p]) => log(logPrefix, ...p))))));
    }
    r('onFork -> returned "wait for fork action returns, postMessage to forking parent thread"', s.pt.onFork.pipe(rx.mergeMap(([, origAct, port]) => {
        return rx.merge(s.action$.pipe((0, __1.actionRelatedToAction)(origAct), rx.take(1), rx.map(action => {
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
            s.ft.returned().dp();
        })), new rx.Observable(() => {
            (0, __1.deserializeAction2)(origAct, s);
        }));
    })));
    r('error$ -> "Pass error to broker"', comp.error$.pipe(rx.switchMap(a => table.l.inited.pipe(rx.map(b => [a, b]), rx.take(1))), rx.map(([[label, err], [, , , mainPort]]) => {
        if (mainPort) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            mainPort.postMessage({ error: { label, detail: err } });
        }
    })));
    r('setLiftUpActions -> "postMessage to main thread"', table.l.setLiftUpActions.pipe(rx.mergeMap(([, action$]) => action$), rx.withLatestFrom(table.l.inited), rx.tap(([action, [, , , port]]) => {
        if (port) {
            s.ft.log(`pass action ${(0, __1.nameOfAction)(action)} to main thread`).dp();
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