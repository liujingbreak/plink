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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sqliteLogFac = void 0;
exports.useAsInitOption = useAsInitOption;
const node_util_1 = require("node:util");
const path_1 = __importDefault(require("path"));
const worker_threads_1 = require("worker_threads");
const rx = __importStar(require("rxjs"));
const reactivizer_1 = require("@wfh/reactivizer");
const initial_options_1 = require("../initial-options");
const nodejs_utils_1 = require("../nodejs-utils");
const chan = new worker_threads_1.BroadcastChannel('__reactivizerLogWorkerIn');
const chanRecieve = new worker_threads_1.BroadcastChannel('__reactivizerLogWorkerOut');
const sqlIteLogWorkerFac = new reactivizer_1.BaseReactorFactory({
    name: 'logWorkerBroker/' + worker_threads_1.threadId
}).defineReactor(ctx => {
    const service = ctx.init();
    const { at, r, pt } = service;
    r('setWork,exit,list -> worker.postMessage', pt.setWorker.pipe(rx.switchMap(([, worker]) => {
        worker.on('message', msg => {
            const a = msg;
            service.s.actionUpstream.next(reactivizer_1.Action.fromJsonObj(a));
        });
        return rx.merge(
        // at.exit,
        // at.insertLogs,
        at.list).pipe(rx.map(a => {
            worker.postMessage(a.toJson());
        }));
    })));
    r('insertLogs,queryReady -> chan.postMessage', rx.merge(at.exit, at.insertLogs, at.queryReady).pipe(rx.map(a => {
        chan.postMessage(a.toJson());
    })));
    chanRecieve.onmessage = msg => {
        const data = msg.data;
        const a = reactivizer_1.Action.fromJsonObj(data);
        service.s.actionUpstream.next(a);
    };
});
const tableFor = ['isWorkerReady', 'hasPendingLog'];
exports.sqliteLogFac = new reactivizer_1.BaseReactorFactory({
    name: 'sqliteLog/' + worker_threads_1.threadId,
    tableFor,
    debugExcludeTypes: ['hasPendingLog']
}).defineReactor(ctx => {
    var _a;
    const service = ctx.init();
    const { r, ft, pt, latest } = service;
    const broker = sqlIteLogWorkerFac.setting({
        enableLog: (_a = ctx.setting) === null || _a === void 0 ? void 0 : _a.enableLog,
        log: nodejs_utils_1.conciseNocolorConsoleLogger,
        logStyle: 'full'
    }).create();
    r('startWorker -> onWorkerBroker,onError,onExit,stop, worker.exit', pt.startWorker.pipe(rx.map(([m, dbFile]) => {
        var _a;
        const workerData = {
            dbFile, enableWorkerLog: (_a = ctx.setting) === null || _a === void 0 ? void 0 : _a.enableLog
        };
        const worker = new worker_threads_1.Worker(path_1.default.join(__dirname, 'sqlite-worker.js'), {
            workerData
        });
        broker.ft.setWorker(worker).dp(m);
        worker.unref();
        process.on('beforeExit -> stop,worker.exit', () => {
            ft.stop().dp();
            broker.ft.exit().dp();
        });
        worker.on('error -> onError,stop', err => {
            console.error('Sqlite log worker', err);
            ft.onError(err).dp();
            ft.stop().dp();
        });
        worker.on('exit', () => {
            ft.onExit().dp();
            chanRecieve.unref();
        });
        worker.on('messageerror', err => {
            ft.onError(err).dp();
            console.error('Sqlite log worker message', err);
        });
    })));
    r('broker.trackableError', broker.pt.trackableError.pipe(rx.map(([, err, label]) => {
        console.error(err, label);
    })));
    r('broker.onReady -> isWorkerReady', rx.merge(broker.pt.onReady, broker.pt.isReady).pipe(rx.map(([m]) => ft.isWorkerReady('ready').dp(m)), rx.take(1)));
    function changePendingLog(updater) {
        return latest.hasPendingLog.pipe(rx.take(1), rx.map(([m, num]) => {
            ft.hasPendingLog(updater(num)).dp(m);
        }));
    }
    r('appendLog,isWorkerReady -> broker.insertLogs,broker.queryReady, isWorkerReady', pt.appendLog.pipe(rx.mergeMap(([m, ...threadLog]) => {
        const [workerStat] = service.table.data.isWorkerReady;
        if (workerStat === 'ready') {
            broker.ft.insertLogs(threadLog).dp(m);
            return rx.EMPTY;
        }
        else if (workerStat === 'none') {
            return rx.merge(
            // incre hasPendingLog
            changePendingLog(num => num + 1), 
            // wait for ready
            pt.isWorkerReady.pipe(rx.filter(([, state]) => state === 'ready'), rx.take(1), rx.mergeMap(() => {
                broker.ft.insertLogs(threadLog).dp(m);
                return changePendingLog(n => n - 1);
            })), new rx.Observable(() => {
                ft.isWorkerReady('query').dp(m);
                broker.ft.queryReady().dp(m);
            }));
        }
        else {
            return rx.merge(changePendingLog(n => n + 1), pt.isWorkerReady.pipe(rx.filter(([, state]) => state === 'ready'), rx.take(1), rx.mergeMap(() => {
                broker.ft.insertLogs(threadLog).dp(m);
                return changePendingLog(n => n - 1);
            })));
        }
    })));
    r('stop,isWorkerReady,hasPendingLog -> broker.exit', pt.stop.pipe(rx.exhaustMap(([m]) => rx.combineLatest([
        latest.isWorkerReady,
        latest.hasPendingLog
    ]).pipe(rx.filter(([[, state], [, pending]]) => state === 'ready' && pending === 0), rx.map(() => {
        broker.ft.exit().dp(m);
        setImmediate(() => {
            chan.unref();
        });
    }), rx.take(1)))));
    ft.isWorkerReady('none').dp();
    ft.hasPendingLog(0).dp();
});
/**
 * @param dbFile you shall only provide this parameter when it run main thread, once
 * this paramter is provided then it will spawn a specific worker thread to work on Sqlite.
 *
 * @return a function to shutdown worker thread and close database, if
 * current thread is not the original main thread which starts Sqlite worker thread (by
 * providing parameter "dbFile"), then you should run the returned "stop" function.
 */
function useAsInitOption(dbFile, enableLog = false) {
    const service = exports.sqliteLogFac.setting({
        enableLog,
        log: nodejs_utils_1.conciseNocolorConsoleLogger,
        logStyle: 'full'
    }).create();
    if (dbFile) {
        service.ft.startWorker(dbFile).dp();
    }
    (0, initial_options_1.changeInitOptions)({
        logStyle: 'raw',
        log: (...content) => {
            try {
                const [, a] = content;
                // const a = action.toJson();
                const printableAction = Object.assign(Object.assign({}, a), { p: a.p.map(item => (0, node_util_1.inspect)(item, false, 0, false)) });
                content[1] = printableAction;
                const item = [worker_threads_1.threadId, ...content];
                service.ft.appendLog(...item).dp();
                // chan.postMessage(item);
            }
            catch (e) {
                console.error(`Error encountered when log ${JSON.stringify(content)}, ${e}`);
                throw e;
            }
        }
    });
    return {
        stop() {
            // worker is unRef() -ed, no need to wait for "onExit" message
            return rx.firstValueFrom(rx.merge(service.pt.onExit, new rx.Observable(() => {
                service.ft.stop().dp();
            })));
        },
        waitForPending() {
            return rx.firstValueFrom(service.latest.hasPendingLog.pipe(rx.filter(([, n]) => n === 0)));
        }
    };
}
// export function handleRawLog(...content: LogItem) {
//   try {
//     const [, a] = content;
//     // const a = action.toJson();
//     const printableAction: LogItem[1] = {
//       ...a,
//       p: a.p.map(item => inspect(item, false, 0, false))
//     };
//     content[1] = printableAction;
//     const item: ThreadedLogItem = [threadId, ...content];
//     logApiService.ft.appendLog(...item).dp();
//     // chan.postMessage(item);
//   } catch (e) {
//     console.error(`Error encountered when log ${JSON.stringify(content)}, ${e}`);
//     throw e;
//   }
// }
//# sourceMappingURL=sqlite-api.js.map