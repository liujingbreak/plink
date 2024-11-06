// import {Worker} from 'worker_threads';
// import {} from 'node:sqlite';
import {SingleActionFactory, BaseReactorFactory, Action} from '@wfh/reactivizer';

export interface SqliteLogActions {
  connect(file: string): SingleActionFactory;
  logAction(controller: number, action: Action): SingleActionFactory;
  didConnect(): SingleActionFactory;
}

export const sqliteLogFac = new BaseReactorFactory<SqliteLogActions>({
  name: 'sqlite-log'
}).defineReactor((init) => {
  // const service = init();
  // const {s, r} = service;
});

