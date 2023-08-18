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
exports.createControlForWorker = exports.createControlForMain = void 0;
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const forkJoin_pool_1 = require("./forkJoin-pool");
function createControlForMain([plugin, casbt], workerFactory, opts, epic) {
    return createWorkerControl([plugin, casbt], (0, forkJoin_pool_1.createForkWorkerPool)(workerFactory, plugin, casbt, opts), opts, epic);
}
exports.createControlForMain = createControlForMain;
// eslint-disable-next-line space-before-function-paren
function createControlForWorker(plugin, opts, epic) {
    return createWorkerControl(plugin, null, opts, epic);
}
exports.createControlForWorker = createControlForWorker;
/**
 * @param epic a function which return `observable of actions` to be `postMessage` to worker's caller
 */
function createWorkerControl([plugin, casbt], pool, { debug }, epic) {
    // key is fork task ID
    const returnResultPortMap = new Map();
    const sub = rx.defer(() => {
        if (pool) {
            return rx.of([0, null]);
        }
        else {
            plugin.dispatcher.pluginWorkerOnInit();
            return plugin.payloadByType.pluginWorkerDoneInit.pipe(op.take(1));
        }
    }).pipe(op.switchMap(([workerNo, parentPort]) => {
        if (pool == null) {
            // eslint-disable-next-line no-console
            console.log('worker-' + workerNo, 'is created');
        }
        const controller = casbt({ debug: (debug !== null && debug !== void 0 ? debug : process.env.NODE_ENV === 'development') ? 'worker-' + workerNo : false });
        const { _actionFromObject, _actionToObject, payloadByType: pt, createAction } = controller;
        const rPt = controller.createLatestPayloads('setForkActions', 'setReturnActions');
        const { createAction: createPoolAction } = controller;
        return rx
            .merge(epic(controller, workerNo).pipe(op.catchError((err, src) => {
            if (parentPort != null) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                plugin.dispatcher.pluginPostMsgTo(parentPort, { error: err, workerNo });
            }
            else {
                console.error(err);
            }
            return src;
        })), rPt.setForkActions.pipe(op.switchMap(action$s => rx.merge(...action$s)), op.concatMap(act => {
            const wait = plugin.payloadByType.pluginDoneCreateReturnPort.pipe(op.take(1), op.map(port2 => {
                const actionObj = _actionToObject(act);
                const forkAction = createPoolAction('fork', port2, workerNo, actionObj);
                if (pool == null && parentPort)
                    plugin.dispatcher.pluginPostMsgTo(parentPort, _actionToObject(forkAction), [port2]);
                else if (pool)
                    pool.dispatcher.fork(...forkAction.payload);
            }));
            plugin.dispatcher.pluginCreateReturnPort(workerNo);
            return wait;
        })), pool == null ?
            rPt.setReturnActions.pipe(op.switchMap(action$s => rx.merge(...action$s)), op.map(act => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const id = Array.isArray(act.payload)
                    ? act.payload[0]
                    : act.payload;
                if (typeof id === 'string') {
                    const entry = returnResultPortMap.get(id);
                    if (entry) {
                        const [callerWorkerNo, port] = entry;
                        returnResultPortMap.delete(id);
                        plugin.dispatcher.pluginPostMsgTo(port, _actionToObject(createAction('onJoinReturn', act)));
                        if (parentPort) {
                            plugin.dispatcher.pluginPostMsgTo(parentPort, _actionToObject(createAction('tellPoolReturned', callerWorkerNo)));
                        }
                    }
                }
            }))
            : rx.EMPTY, pt.onForkedFor.pipe(op.map(([callerPort, callerWorkerNo, obj]) => {
            returnResultPortMap.set(obj.p[0], [callerWorkerNo, callerPort]);
            _actionFromObject(obj);
        })))
            .pipe(op.catchError((err, src) => {
            if (parentPort) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                plugin.dispatcher.pluginPostMsgTo(parentPort, { error: err });
            }
            else {
                console.error(err);
            }
            return src;
        }), op.finalize(() => plugin.dispatcher.pluginWorkerOnDestory()));
    })).subscribe();
    return () => sub.unsubscribe();
}
//# sourceMappingURL=forkJoin-baseWorker.js.map