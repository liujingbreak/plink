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
exports.setIdleDuring = exports.fork = void 0;
const rx = __importStar(require("rxjs"));
const control_1 = require("../control");
/**
 * @param returnedActionName the name of action that is observed as "returned" message from forked worker, default is `${actionName}Resolved`
 */
function fork(comp, actionName, params, returnedActionName, relatedToAction) {
    const forkedAction = comp.o.createAction(actionName, ...params);
    if (relatedToAction)
        forkedAction.r = relatedToAction.i;
    const forkDone = rx.firstValueFrom(rx.merge((returnedActionName ? comp.i.at[returnedActionName] : comp.i.at[actionName + 'Resolved']).pipe((0, control_1.actionRelatedToAction)(forkedAction), rx.map(a => a.p)), comp.o.pt._onErrorFor.pipe((0, control_1.actionRelatedToAction)(forkedAction), 
    // eslint-disable-next-line no-throw-literal
    rx.map(([, err]) => { throw err; }))));
    if (relatedToAction)
        comp.o.dpf.fork(relatedToAction, forkedAction);
    else
        comp.o.dp.fork(forkedAction);
    return forkDone;
}
exports.fork = fork;
/**
 * Informs broker that current step is waiting on forked function returns or any other outside asynchronous operation,
 * so that broker can rank current thread worker as "less busy" and schedule more forked
 * task probably
 * @return {Observable} which should `complete`, so that it notifies scheduler to demote current thread
 * worker as current thread will be back to continue previous task.
 */
function setIdleDuring(workerCtl, waitingTask$) {
    const worker = workerCtl;
    worker.o.dp.wait();
    return rx.from(waitingTask$).pipe(rx.finalize(() => worker.o.dp.stopWaiting()));
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
    function asPromise(...args) {
        return rx.lastValueFrom(setIdleDuring(...args));
    }
    setIdleDuring.asPromise = asPromise;
})(setIdleDuring || (exports.setIdleDuring = setIdleDuring = {}));
//# sourceMappingURL=common.js.map