import { inspect } from 'node:util';
import Path from 'path';
import { Worker, BroadcastChannel, threadId } from 'worker_threads';
import * as rx from 'rxjs';
import { Action, BaseReactorFactory } from '@wfh/reactivizer';
import { changeInitOptions } from '../initial-options';
const chan = new BroadcastChannel('__reactivizerLog');
const chanRecieve = new BroadcastChannel('__reactivizerLog');
const tableFor = ['isWorkerReady'];
export const sqliteLogFac = new BaseReactorFactory({
    name: 'sqliteLog',
    tableFor
}).defineReactor((ctx, dbFile) => {
    const service = ctx.init();
    const { r, ft, pt } = service;
    const actionCache = [];
    chanRecieve.onmessage = msg => {
        actionCache.push(msg.data);
    };
    r('isWorkerReady -> worker.insertLogs', pt.isWorkerReady.pipe(rx.map(([m, ready]) => {
        if (ready) {
            chanRecieve.close();
            workerBroker.ft.insertLogs(...actionCache).dp(m);
        }
    })));
    const workerData = {
        dbFile, enableWorkerLog: true
    };
    const worker = new Worker(Path.join(__dirname, 'sqlite-worker.js'), {
        workerData
    });
    const workerBroker = sqlIteLogWorkerFac.create(worker);
    worker.unref();
    process.on('beforeExit -> stop,worker.exit', () => {
        ft.stop().dp();
        workerBroker.ft.exit().dp();
    });
    r('trackableError ->', workerBroker.pt.trackableError.pipe(rx.map(([, err, label]) => {
        console.error(err, label);
    })));
    r('worker.onReady -> isWorkerReady', workerBroker.pt.onReady.pipe(rx.map(([m]) => ft.isWorkerReady(true).dp(m))));
    // worker.on('message', msg => {
    //   // ft.onWorkerMessage(msg).dp();
    //   if (msg === 'ready')
    //     ft.isWorkerReady(true).dp();
    //   else if (Array.isArray((msg as {log: any[]}).log)) {
    //     // eslint-disable-next-line no-console
    //     console.log('-- worker log:', ...(msg as {log: any[]}).log);
    //   } else if ((msg as {error: any}).error) {
    //     ft.onLogError((msg as {error: any}).error).dp();
    //   }
    // });
    worker.on('error -> onError,stop', err => {
        console.error('Sqlite log worker', err);
        ft.onError(err).dp();
        ft.stop().dp();
    });
    worker.on('exit', () => {
        ft.onExit().dp();
    });
    worker.on('messageerror', err => {
        ft.onError(err).dp();
        console.error('Sqlite log worker message', err);
    });
    r('stop -> worker.exit', pt.stop.pipe(rx.map(() => {
        workerBroker.ft.exit().dp();
        chan.unref();
    })));
    ft.isWorkerReady(false).dp();
});
const sqlIteLogWorkerFac = new BaseReactorFactory({
    name: 'logWorkerBroker'
}).defineReactor((ctx, worker) => {
    const service = ctx.init();
    const { at, r } = service;
    r('exit -> "worker.postMessage"', rx.merge(at.exit).pipe(rx.map(a => {
        worker.postMessage(a.toJson());
    })));
    worker.on('message', msg => {
        const a = msg;
        service.s.actionUpstream.next(Action.fromJsonObj(a));
    });
});
/**
 * To explicitly quit sqlite database writing, dispatch "stop" action of returned service
 * ```
 * const {ft} = startSqlite(...);
 * ft.stop().dp();
 * ```
 */
export function startSqlite(dbFile, enableSelfLog = false) {
    const service = sqliteLogFac.setting({
        enableLog: enableSelfLog,
        log: enableSelfLog ? console.log : undefined,
        logStyle: 'full'
    }).create(dbFile);
    return service;
}
/** @return a function to shutdown worker thread and close database */
export function useAsInitOption(dbFile, enableSelfLog = false) {
    const service = startSqlite(dbFile, enableSelfLog);
    changeInitOptions({
        logStyle: 'raw',
        log: handleRawLog
    });
    return () => {
        // worker is unRef() -ed, no need to wait for "onExit" message
        service.ft.stop().dp();
        // return rx.firstValueFrom(rx.merge(
        //   service.pt.onExit,
        //   new rx.Observable(() => {
        //     service.ft.stop().dp();
        //   })
        // ).pipe(
        //   rx.take(1)
        // ));
    };
}
export function handleRawLog(...content) {
    try {
        const [, a] = content;
        // const a = action.toJson();
        const printableAction = Object.assign(Object.assign({}, a), { p: a.p.map(item => inspect(item, false, 0, false)) });
        content[1] = printableAction;
        const item = [threadId, ...content];
        chan.postMessage(item);
    }
    catch (e) {
        console.error(`Error encountered when log ${JSON.stringify(content)}, ${e}`);
        throw e;
    }
}
//# sourceMappingURL=sqlite-api.js.map