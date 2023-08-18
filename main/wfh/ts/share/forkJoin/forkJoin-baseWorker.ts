import type {Worker as NodeWorker, MessagePort as NodeMessagePort} from 'node:worker_threads';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {createActionStreamByType, ActionStreamControl} from '@wfh/redux-toolkit-observable/es/rx-utils';
import {RecursiveFuncs, PluginActions, RecursiveTaskActions, ForkWorkerPoolActions, WorkerEvent} from './types';
import {createForkWorkerPool} from './forkJoin-pool';

export function createControlForMain<
  // eslint-disable-next-line space-before-function-paren
  A extends Record<string, (...payload: any[]) => void> = Record<string, never>
>(
  [plugin, casbt]: readonly [ActionStreamControl<PluginActions>, typeof createActionStreamByType],
  workerFactory: () => Worker | NodeWorker,
  opts: {
    concurrent: number;
  } & NonNullable<Parameters<typeof createActionStreamByType>[0]>,
  epic: RecursiveForkEpic<A>
) {
  return createWorkerControl([plugin, casbt], createForkWorkerPool(workerFactory, plugin, casbt, opts), opts, epic);
}

// eslint-disable-next-line space-before-function-paren
export function createControlForWorker< A extends Record<string, (...payload: any[]) => void> = Record<string, never>>(
  plugin: readonly [ActionStreamControl<PluginActions>, typeof createActionStreamByType],
  opts: NonNullable<Parameters<typeof createActionStreamByType>[0]>,
  epic: RecursiveForkEpic<A>
) {
  return createWorkerControl(plugin, null, opts, epic);
}

/**
 * @param epic a function which return `observable of actions` to be `postMessage` to worker's caller
 */
function createWorkerControl<A extends RecursiveFuncs>(
  [plugin, casbt]: readonly [ActionStreamControl<PluginActions>, typeof createActionStreamByType],
  pool: ActionStreamControl<ForkWorkerPoolActions> | null, {debug}: {debug?: string | boolean},
  functions: A
) {
  // key is fork task ID
  const returnResultPortMap = new Map<string, [callerWorkerNo: number, returnPort: MessagePort | NodeMessagePort]>();
  const sub = rx.defer(() => {
    if (pool) {
      return rx.of([0, null] as const);
    } else {
      plugin.dispatcher.pluginWorkerOnInit();
      return plugin.payloadByType.pluginWorkerDoneInit.pipe(op.take(1));
    }
  }).pipe(
    op.switchMap(([workerNo, parentPort]) => {
      if (pool == null) {
        // eslint-disable-next-line no-console
        console.log('worker-' + workerNo, 'is created');
      }
      const controller = casbt<RecursiveTaskActions<A>>({debug: debug ?? process.env.NODE_ENV === 'development' ? 'caller-worker-' + workerNo : false});
      const {_actionFromObject, _actionToObject, payloadByType: pt, createAction} = controller;
      const rPt = controller.createLatestPayloads('setForkActions');
      const {createAction: createPoolAction} =
        controller as unknown as ActionStreamControl<ForkWorkerPoolActions>;

      const forkedCtl = casbt<A>({debug: debug ?? process.env.NODE_ENV === 'development' ? 'forked-worker-' + workerNo : false});

      return rx
        .merge(
          pt.fork.pipe(
            // op.withLatestFrom(rPt.setForkActions),
            op.mergeMap(async ([key, params, onReturn]) => {
              const port2 = await new Promise<MessagePort | NodeMessagePort>(
                resolve => plugin.dispatcher.pluginCreateReturnPort(workerNo, resolve)
              );
              const forkAction = createPoolAction( 'fork', port2, workerNo, key as string, params);
              if (pool == null && parentPort)
                plugin.dispatcher.pluginPostMsgTo(parentPort, _actionToObject(forkAction), [port2]);
              else if (pool)
                pool.dispatcher.fork(...forkAction.payload);
            })
          )

          rPt.setReturnActions.pipe(
            op.switchMap(action$s => rx.merge(...action$s)),
            op.map(act => {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              const id = Array.isArray(act) ? act[0] : act;
              if (typeof id === 'string') {
                const entry = returnResultPortMap.get(id);
                if (entry) {
                  const [callerWorkerNo, port] = entry;
                  returnResultPortMap.delete(id);
                  plugin.dispatcher.pluginPostMsgTo(port, _actionToObject(createAction('onJoinReturn', act)));
                  if (parentPort) {
                    plugin.dispatcher.pluginPostMsgTo(parentPort, _actionToObject(createPoolAction('tellPoolReturned', callerWorkerNo)));
                  }
                }
              }
            })
          ),

          (pt as unknown as ActionStreamControl<WorkerEvent>['payloadByType']).onForkedFor.pipe(
            op.map(([callerPort, callerWorkerNo, obj]) => {
              returnResultPortMap.set(obj.p[0], [callerWorkerNo, callerPort]);
              _actionFromObject(obj);
            })
          )
        )
        .pipe(
          op.catchError((err, src) => {
            if (parentPort) {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              plugin.dispatcher.pluginPostMsgTo(parentPort, {error: err});
            } else {
              console.error(err);
            }
            return src;
          }),
          op.finalize(() => plugin.dispatcher.pluginWorkerOnDestory())
        );
    })
  ).subscribe();
  return () => sub.unsubscribe();
}
