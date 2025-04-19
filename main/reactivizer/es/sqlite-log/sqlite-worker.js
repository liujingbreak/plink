import fs from 'fs';
import { BroadcastChannel, parentPort, workerData } from 'worker_threads';
import { DatabaseSync } from 'node:sqlite';
import * as rx from 'rxjs';
import { Action, BaseReactorFactory } from '@wfh/reactivizer';
import { createSimpleIndentLogger } from '../nodejs-utils';
const workerFac = new BaseReactorFactory({
    name: 'sqliteLogWorker'
}).defineReactor(ctx => {
    var _a;
    const service = ctx.init();
    const { at, ft, r, pt, s } = service;
    r('exit', pt.exit.pipe(rx.map(() => {
        db.close();
        chan.close();
        parentPort === null || parentPort === void 0 ? void 0 : parentPort.unref();
    })));
    r('insertLogs', pt.insertLogs.pipe(rx.map(([, ...items]) => {
        for (const row of items)
            insertAction(...row);
    })));
    r('onReady', service.at.onReady.pipe(rx.map(a => parentPort === null || parentPort === void 0 ? void 0 : parentPort.postMessage(a.toJson()))));
    r('error$ -> trackableError', service.error$.pipe(rx.map(([err, label]) => {
        ft.trackableError(err, label).dp();
    })));
    r('...-> "parentPort.postMessage"', rx.merge(at.trackableError, at.onReady).pipe(rx.map(a => {
        parentPort === null || parentPort === void 0 ? void 0 : parentPort.postMessage(a.toJson());
    })));
    let insertStm;
    let insertRefStm;
    const chan = new BroadcastChannel('__reactivizerLog');
    const db = new DatabaseSync((_a = workerData.dbFile) !== null && _a !== void 0 ? _a : 'test-reactivizer-log.db');
    chan.unref();
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
        chan.onmessage = msg => {
            const a = msg.data;
            ft.insertLogs(a).dp();
            // insertAction(...a);
        };
    }
    catch (e) {
        ft.exit().dp();
        throw e;
    }
    if (parentPort) {
        parentPort.on('message', msg => {
            const a = msg;
            const action = Action.fromJsonObj(a);
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
            parentPort === null || parentPort === void 0 ? void 0 : parentPort.postMessage({ error: ex });
            ft.trackableError(ex).dp();
        }
    }
});
const { enableWorkerLog } = workerData;
const service = workerFac.setting({
    enableLog: enableWorkerLog,
    log: enableWorkerLog ? createSimpleIndentLogger(false, false, fs.createWriteStream('sqlite-worker.log')) : undefined
}).create();
service.ft.onReady().dp();
//# sourceMappingURL=sqlite-worker.js.map