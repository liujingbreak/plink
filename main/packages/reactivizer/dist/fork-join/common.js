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
exports.setIdleDuring = void 0;
const rx = __importStar(require("rxjs"));
/**
 * @param returnedActionName the name of action that is observed as "returned" message from forked worker, default is `${actionName}Resolved`
 */
// export function fork<I extends ActionFunctions, K extends string & keyof I, R extends string & keyof I = `${K}Resolved`>(
//   comp: ReactorComposite<I, any, any, any>,
//   actionName: K & string,
//   params: InferPayload<I[K]>,
//   returnedActionName?: R,
//   relatedToAction?: ActionMeta
// ): Promise<[...InferPayload<I[R]>]> {
//   const forkedAction = comp.o.createAction(actionName, ...params);
//   if (relatedToAction)
//     forkedAction.r = relatedToAction.i;
//   const forkDone = rx.firstValueFrom(
//     rx.merge(
//       (returnedActionName ? comp.i.at[returnedActionName] : comp.i.at[actionName + 'Resolved']).pipe(
//         actionRelatedToAction(forkedAction),
//         rx.map(a => a.p)
//       ),
//       (comp as ReactorComposite<I, Record<string, never>, any, any>).o.pt._onErrorFor.pipe(
//         actionRelatedToAction(forkedAction),
//         // eslint-disable-next-line no-throw-literal
//         rx.map(([, err]) => {throw (err as Error); })
//       )
//     ));
//   if (relatedToAction)
//     (comp.o as unknown as RxController<ForkWorkerOutput>).dpf.fork(relatedToAction, forkedAction);
//   else
//     (comp.o as unknown as RxController<ForkWorkerOutput>).dp.fork(forkedAction);
//   return forkDone;
// }
/**
 * Informs broker that current step is waiting on forked function returns or any other outside asynchronous operation,
 * so that broker can rank current thread worker as "less busy" and schedule more forked
 * task probably
 * @return {Observable} which should `complete`, so that it notifies scheduler to demote current thread
 * worker as current thread will be back to continue previous task.
 */
function setIdleDuring(workerCtl, waitingTask$) {
    const worker = workerCtl;
    worker.o.ft.wait().dp();
    return rx.from(waitingTask$).pipe(rx.tap({
        finalize() {
            worker.o.ft.stopWaiting().dp();
        }
    }));
}
exports.setIdleDuring = setIdleDuring;
/**
 * Informs broker that current step is waiting on forked function returns or any other outside asynchronous operation,
 * so that broker can rank current thread worker as "less busy" and schedule more forked
 * task probably
 * @return {Promise} when it is resolved, scheduler will be notified to demote current thread
 * worker as current thread will be back to continue previous task.
 */
(function (setIdleDuring) {
    function asPromise(workerCtl, waitingTask$) {
        return rx.firstValueFrom(setIdleDuring(workerCtl, waitingTask$));
    }
    setIdleDuring.asPromise = asPromise;
})(setIdleDuring || (exports.setIdleDuring = setIdleDuring = {}));
//# sourceMappingURL=common.js.map