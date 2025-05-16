import {inspect} from 'node:util';
import Path from 'path';
import {Worker, BroadcastChannel, threadId} from 'worker_threads';
import * as rx from 'rxjs';
import {Action, SingleActionFactory, BaseReactorFactory} from '@wfh/reactivizer';
import {changeInitOptions} from '../initial-options';
import {SqliteLogWokerMsg, WorkerDataType} from './sqlite-worker';
import {conciseNocolorConsoleLogger} from '../nodejs-utils';

export type LogItem = [servicePrefix: string, ReturnType<Action['toJson']>];
export type ThreadedLogItem = [threadId: number, ...LogItem];

const chan = new BroadcastChannel('__reactivizerLogWorkerIn');
const chanRecieve = new BroadcastChannel('__reactivizerLogWorkerOut');

interface SqliteLogWorkerBrokerEvents extends SqliteLogWokerMsg {
  setWorker(worker: Worker): SingleActionFactory;
}

const sqlIteLogWorkerFac = new BaseReactorFactory<SqliteLogWorkerBrokerEvents>({
  name: 'logWorkerBroker/' + threadId
}).defineReactor(ctx => {
  const service = ctx.init();
  const {at, r, pt} = service;
  r('setWork,exit,list -> worker.postMessage', pt.setWorker.pipe(
    rx.switchMap(([, worker]) => {
      worker.on('message', msg => {
        const a = msg as ReturnType<Action['toJson']>;
        service.s.actionUpstream.next(Action.fromJsonObj(a));
      });
      return rx.merge(
        // at.exit,
        // at.insertLogs,
        at.list
      ).pipe(
        rx.map(a => {
          worker.postMessage(a.toJson());
        })
      );
    })
  ));
  r('insertLogs,queryReady -> chan.postMessage', rx.merge(
    at.exit,
    at.insertLogs,
    at.queryReady
  ).pipe(
    rx.map(a => {
      chan.postMessage(a.toJson());
    })
  ));
  chanRecieve.onmessage = msg => {
    const data = (msg as MessageEvent<ReturnType<Action['toJson']>>).data;
    const a = Action.fromJsonObj(data);
    service.s.actionUpstream.next(a);
  };
});
// type SqliteLogWorker = SimplexReactorOfFac<typeof sqlIteLogWorkerFac>;

interface SqliteLogActions {
  startWorker(dbFile: string): SingleActionFactory;
  appendLog(...content: ThreadedLogItem): SingleActionFactory;
  stop(): SingleActionFactory;
}
interface SqliteLogEvents extends SqliteLogActions {
  onError(err: Error): SingleActionFactory;
  onExit(): SingleActionFactory;
  isWorkerReady(state: 'ready' | 'query' | 'none'): SingleActionFactory;
  hasPendingLog(num: number): SingleActionFactory;
}
const tableFor = ['isWorkerReady', 'hasPendingLog'] as const;

export const sqliteLogFac = new BaseReactorFactory<SqliteLogEvents, typeof tableFor>({
  name: 'sqliteLog/' + threadId,
  tableFor,
  debugExcludeTypes: ['hasPendingLog']
}).defineReactor(ctx => {
  const service = ctx.init();
  const {r, ft, pt, latest} = service;
  const broker = sqlIteLogWorkerFac.setting({
    enableLog: ctx.setting?.enableLog,
    log: conciseNocolorConsoleLogger,
    logStyle: 'full'
  }).create();

  r('startWorker -> onWorkerBroker,onError,onExit,stop, worker.exit', pt.startWorker.pipe(
    rx.map(([m, dbFile]) => {
      const workerData: WorkerDataType = {
        dbFile, enableWorkerLog: ctx.setting?.enableLog
      };
      const worker = new Worker(Path.join(__dirname, 'sqlite-worker.js'), {
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
    })
  ));
  r('broker.trackableError', broker.pt.trackableError.pipe(
    rx.map(([, err, label]) => {
      console.error(err, label);
    })
  ));
  r('broker.onReady -> isWorkerReady', rx.merge(
    broker.pt.onReady, broker.pt.isReady
  ).pipe(
    rx.map(([m]) => ft.isWorkerReady('ready').dp(m)),
    rx.take(1)
  ));
  function changePendingLog(updater: (n: number) => number) {
    return latest.hasPendingLog.pipe(
      rx.take(1),
      rx.map(([m, num]) => {
        ft.hasPendingLog(updater(num)).dp(m);
      })
    );
  }
  r('appendLog,isWorkerReady -> broker.insertLogs,broker.queryReady, isWorkerReady', pt.appendLog.pipe(
    rx.mergeMap(([m, ...threadLog]) => {
      const [workerStat] = service.table.data.isWorkerReady;
      if (workerStat === 'ready') {
        broker.ft.insertLogs(threadLog).dp(m);
        return rx.EMPTY;
      } else if (workerStat === 'none') {
        return rx.merge(
          // incre hasPendingLog
          changePendingLog(num => num + 1),
          // wait for ready
          pt.isWorkerReady.pipe(
            rx.filter(([, state]) => state === 'ready'),
            rx.take(1),
            rx.mergeMap(() => {
              broker.ft.insertLogs(threadLog).dp(m);
              return changePendingLog(n => n - 1);
            })
          ),
          new rx.Observable<never>(() => {
            ft.isWorkerReady('query').dp(m);
            broker.ft.queryReady().dp(m);
          })
        );
      } else {
        return rx.merge(
          changePendingLog(n => n + 1),
          pt.isWorkerReady.pipe(
            rx.filter(([, state]) => state === 'ready'),
            rx.take(1),
            rx.mergeMap(() => {
              broker.ft.insertLogs(threadLog).dp(m);
              return changePendingLog(n => n - 1);
            })
          )
        );
      }
    })
  ));
  r('stop,isWorkerReady,hasPendingLog -> broker.exit', pt.stop.pipe(
    rx.exhaustMap(([m]) => rx.combineLatest([
      latest.isWorkerReady,
      latest.hasPendingLog
    ]).pipe(
      rx.filter(([[, state], [, pending]]) => state === 'ready' && pending === 0),
      rx.map(() => {
        broker.ft.exit().dp(m);
        setImmediate(() => {
          chan.unref();
        });
      }),
      rx.take(1)
    ))
  ));
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
export function useAsInitOption(dbFile?: string | null, enableLog = false) {
  const service = sqliteLogFac.setting({
    enableLog,
    log: conciseNocolorConsoleLogger,
    logStyle: 'full'
  }).create();
  if (dbFile) {
    service.ft.startWorker(dbFile).dp();
  }
  changeInitOptions({
    logStyle: 'raw',
    log: (...content: LogItem) => {
      try {
        const [, a] = content;
        // const a = action.toJson();
        const printableAction: LogItem[1] = {
          ...a,
          p: a.p.map(item => inspect(item, false, 0, false))
        };
        content[1] = printableAction;
        const item: ThreadedLogItem = [threadId, ...content];
        service.ft.appendLog(...item).dp();
        // chan.postMessage(item);
      } catch (e) {
        console.error(`Error encountered when log ${JSON.stringify(content)}, ${e}`);
        throw e;
      }
    }
  });
  return {
    stop() {
      // worker is unRef() -ed, no need to wait for "onExit" message
      return rx.firstValueFrom(rx.merge(
        service.pt.onExit,
        new rx.Observable<never>(() => {
          service.ft.stop().dp();
        })
      ));
    },
    waitForPending() {
      return rx.firstValueFrom(service.latest.hasPendingLog.pipe(
        rx.filter(([, n]) => n === 0)
      ));
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
