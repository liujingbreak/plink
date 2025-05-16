import fs from 'fs';
import {BroadcastChannel, parentPort, workerData} from 'worker_threads';
import {DatabaseSync, StatementSync} from 'node:sqlite';
import * as rx from 'rxjs';
import {Action, SingleActionFactory, BaseReactorFactory, SimplexReactorOfFac} from '@wfh/reactivizer';
import {ThreadedLogItem} from './sqlite-api';
import {createSimpleIndentLogger} from '../nodejs-utils';

export interface WorkerDataType {
  dbFile?: string;
  enableWorkerLog?: boolean;
}

export interface SqliteLogWorkerActions {
  /** response is isReady */
  queryReady(): SingleActionFactory;
  exit(): SingleActionFactory;
  insertLogs(...items: ThreadedLogItem[]): SingleActionFactory;
  list(offset: number, limit: number): SingleActionFactory;
}
export interface SqliteLogWokerMsg extends SqliteLogWorkerActions {
  /** As response to queryReady */
  isReady(): SingleActionFactory;
  onReady(): SingleActionFactory;
  didList(): SingleActionFactory;
  trackableError(err: unknown, label?: string | null): SingleActionFactory;
}

const workerFac = new BaseReactorFactory<SqliteLogWokerMsg>({
  name: 'sqliteLogWorker'
}).defineReactor(ctx => {
  const service = ctx.init();
  const {at, ft, r, pt, s} = service;
  r('exit', pt.exit.pipe(
    rx.map(() => {
      db.close();
      chan.close();
      outChan.close();
      parentPort?.close();
    })
  ));
  r('queryReady -> isReady', pt.queryReady.pipe(
    rx.map(([m]) => {ft.isReady().dp(m);})
  ));
  r('insertLogs', pt.insertLogs.pipe(
    rx.map(([, ...items]) => {
      for (const row of items) {
        // service.log('-- insert', JSON.stringify(row));
        insertAction(...row);
      }
    })
  ));
  r('error$ -> trackableError', service.error$.pipe(
    rx.map(([err, label]) => {
      ft.trackableError(err, label).dp();
    })
  ));
  r('...-> "parentPort.postMessage"', rx.merge(
    at.trackableError,
    at.onReady
  ).pipe(
    rx.map(a => {
      parentPort?.postMessage(a.toJson());
    })
  ));
  r('isReady -> BroadcastChannel.postMessage', rx.merge(
    at.onReady,
    at.isReady
  ).pipe(
    rx.map(a => {
      outChan.postMessage(a.toJson());
    })
  ));
  let insertStm: StatementSync;
  let insertRefStm: StatementSync;
  const chan = new BroadcastChannel('__reactivizerLogWorkerIn');
  const outChan = new BroadcastChannel('__reactivizerLogWorkerOut');
  const db = new DatabaseSync((workerData as WorkerDataType).dbFile ?? 'test-reactivizer-log.db');
  // chan.unref();
  outChan.unref();
  chan.onmessage = msg => {
    const a = Action.fromJsonObj((msg as MessageEvent<ReturnType<Action['toJson']>>).data);
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
    insertStm = db.prepare(
      'INSERT INTO actions ( threadId, i, serviceName, serviceId, type, payload ) VALUES' +
      ' ( ?, ?, ?, ?, ?, json(?))'
    );
    insertRefStm = db.prepare('INSERT INTO actionRef ( ' +
      'threadId, i, r ) VALUES (?, ?, ?)');
  } catch (e) {
    ft.exit().dp();
    throw e;
  }

  if (parentPort) {
    parentPort.on('message', msg => {
      const a = msg as ReturnType<Action['toJson']>;
      const action = Action.fromJsonObj(a);
      service.log('-- from parent port', action.t);
      s.actionUpstream.next(action);
    });
  }
  function insertAction(threadId: number, prefix: string, a: ReturnType<Action['toJson']>) {
    const refs = Array.isArray(a.r) ? a.r : a.r != null ? [a.r] : [];
    // parentPort?.postMessage({
    //   log: [a.i, JSON.stringify(refs), prefix, a.t, a.p]
    // });
    try {
      const atPos = prefix.indexOf('@');
      insertStm.run(
        threadId,
        a.i,
        // JSON.stringify(refs),
        prefix.slice(0, atPos),
        prefix.slice(atPos + 1),
        a.t,
        JSON.stringify(a.p)
      );

      for (const r of refs) {
        insertRefStm.run(threadId, a.i, r);
      }
    } catch (ex) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      parentPort?.postMessage({error: ex});
      ft.trackableError(ex).dp();
    }
  }
});

const {enableWorkerLog} = workerData as WorkerDataType;
const fout = fs.createWriteStream('sqlite-worker.log');
const service = workerFac.setting({
  enableLog: enableWorkerLog,
  log: enableWorkerLog ? createSimpleIndentLogger(
    false, false, fout
  ) : undefined
}).create();
service.pt.exit.subscribe(() => {
  fout.close();
});
service.ft.onReady().dp();

export type SqliteLogWorker = SimplexReactorOfFac<typeof workerFac>;
