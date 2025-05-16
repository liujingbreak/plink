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
const fs_1 = __importDefault(require("fs"));
const worker_threads_1 = require("worker_threads");
const node_sqlite_1 = require("node:sqlite");
const rx = __importStar(require("rxjs"));
const reactivizer_1 = require("@wfh/reactivizer");
const nodejs_utils_1 = require("../nodejs-utils");
const workerFac = new reactivizer_1.BaseReactorFactory({
    name: 'sqliteLogWorker'
}).defineReactor(ctx => {
    var _a;
    const service = ctx.init();
    const { at, ft, r, pt, s } = service;
    r('exit', pt.exit.pipe(rx.map(() => {
        db.close();
        chan.close();
        outChan.close();
        worker_threads_1.parentPort === null || worker_threads_1.parentPort === void 0 ? void 0 : worker_threads_1.parentPort.close();
    })));
    r('queryReady -> isReady', pt.queryReady.pipe(rx.map(([m]) => { ft.isReady().dp(m); })));
    r('insertLogs', pt.insertLogs.pipe(rx.map(([, ...items]) => {
        for (const row of items) {
            // service.log('-- insert', JSON.stringify(row));
            insertAction(...row);
        }
    })));
    r('error$ -> trackableError', service.error$.pipe(rx.map(([err, label]) => {
        ft.trackableError(err, label).dp();
    })));
    r('...-> "parentPort.postMessage"', rx.merge(at.trackableError, at.onReady).pipe(rx.map(a => {
        worker_threads_1.parentPort === null || worker_threads_1.parentPort === void 0 ? void 0 : worker_threads_1.parentPort.postMessage(a.toJson());
    })));
    r('isReady -> BroadcastChannel.postMessage', rx.merge(at.onReady, at.isReady).pipe(rx.map(a => {
        outChan.postMessage(a.toJson());
    })));
    let insertStm;
    let insertRefStm;
    const chan = new worker_threads_1.BroadcastChannel('__reactivizerLogWorkerIn');
    const outChan = new worker_threads_1.BroadcastChannel('__reactivizerLogWorkerOut');
    const db = new node_sqlite_1.DatabaseSync((_a = worker_threads_1.workerData.dbFile) !== null && _a !== void 0 ? _a : 'test-reactivizer-log.db');
    // chan.unref();
    outChan.unref();
    chan.onmessage = msg => {
        const a = reactivizer_1.Action.fromJsonObj(msg.data);
        service.s.actionUpstream.next(a);
    };
    try {
        db.exec('CREATE TABLE IF NOT EXISTS actions ( ' +
            'threadId INT,' +
            'i INT,' +
            // 'r BLOB,' +
            'serviceName TEXT,' +
            'serviceId TEXT,' +
            'type VARCHAR(100),' +
            'payload BLOB,' +
            'time VARCHAR(50) DEFAULT CURRENT_TIMESTAMP,' +
            'PRIMARY KEY ( threadId,i )' +
            ' )');
        db.exec('CREATE TABLE IF NOT EXISTS actionRef ( ' +
            'threadId INT,' +
            'i INT,' +
            'r INT,' +
            'PRIMARY KEY ( threadId, i, r )' +
            ' )');
        insertStm = db.prepare('INSERT INTO actions ( threadId, i, serviceName, serviceId, type, payload ) VALUES' +
            ' ( ?, ?, ?, ?, ?, json(?))');
        insertRefStm = db.prepare('INSERT INTO actionRef ( ' +
            'threadId, i, r ) VALUES (?, ?, ?)');
    }
    catch (e) {
        ft.exit().dp();
        throw e;
    }
    if (worker_threads_1.parentPort) {
        worker_threads_1.parentPort.on('message', msg => {
            const a = msg;
            const action = reactivizer_1.Action.fromJsonObj(a);
            service.log('-- from parent port', action.t);
            s.actionUpstream.next(action);
        });
    }
    function insertAction(threadId, prefix, a) {
        const refs = Array.isArray(a.r) ? a.r : a.r != null ? [a.r] : [];
        // parentPort?.postMessage({
        //   log: [a.i, JSON.stringify(refs), prefix, a.t, a.p]
        // });
        try {
            const atPos = prefix.indexOf('@');
            insertStm.run(threadId, a.i, 
            // JSON.stringify(refs),
            prefix.slice(0, atPos), prefix.slice(atPos + 1), a.t, JSON.stringify(a.p));
            for (const r of refs) {
                insertRefStm.run(threadId, a.i, r);
            }
        }
        catch (ex) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            worker_threads_1.parentPort === null || worker_threads_1.parentPort === void 0 ? void 0 : worker_threads_1.parentPort.postMessage({ error: ex });
            ft.trackableError(ex).dp();
        }
    }
});
const { enableWorkerLog } = worker_threads_1.workerData;
const fout = fs_1.default.createWriteStream('sqlite-worker.log');
const service = workerFac.setting({
    enableLog: enableWorkerLog,
    log: enableWorkerLog ? (0, nodejs_utils_1.createSimpleIndentLogger)(false, false, fout) : undefined
}).create();
service.pt.exit.subscribe(() => {
    fout.close();
});
service.ft.onReady().dp();
//# sourceMappingURL=sqlite-worker.js.map