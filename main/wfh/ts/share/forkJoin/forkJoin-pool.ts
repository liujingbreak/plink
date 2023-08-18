import {Worker as NodeWorker, MessagePort as NodeMessagePort} from 'node:worker_threads';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import type {createActionStreamByType, ActionStreamControl} from '@wfh/redux-toolkit-observable/es/rx-utils';
import {RedBlackTree} from '../algorithms/rb-tree';
import {ForkWorkerPoolActions, WorkerEvent, PluginActions, RecursiveTaskActions} from './types';

export type ForkWorkerActions = {
  createWorker(workNo: number): void;
  workerCrearted(workerNo: number, worker: Worker | NodeWorker): void;
  onWorkerError(worker: number, msg: any): void;
  workerLoadChange(worker: number, incrementOrDecline: boolean): void;
};

type StreamControlOptions = NonNullable<Parameters<typeof createActionStreamByType>[0]>;

/**
 * Fork worker pool is different from original worker poll about below features
 * - Pool can create and assign tasks to worker without waiting for worker finishing previous task
 * - Worker can itself fork new task to pool
 *   - Another or same worker can send response of task finishing message back to specific worker through pool
 * - TODO: try minimize duplicate transferred message data
 */
export function createForkWorkerPool(
  factory: () => Worker | NodeWorker,
  plugin: ActionStreamControl<PluginActions>,
  casbt: typeof createActionStreamByType,
  opts: {
    concurrent: number;
  } & StreamControlOptions) {

  const control = casbt<ForkWorkerActions & ForkWorkerPoolActions & WorkerEvent & Pick<RecursiveTaskActions, 'tellPoolReturned' | 'waitForJoin'>>(opts);
  const {payloadByType, dispatcher, _actionToObject, createAction} = control;
  const workerByNo = new Map<number, Worker | NodeWorker>();
  const workerPortMap = new Map<number, MessagePort | NodeMessagePort>();
  const idleWorkers = new Set<number>();
  const workerLoad = new Map<number, number>();
  /** key is work load or worker, value is workerNo */
  const workLoadTree = new RedBlackTree<number, number[]>();
  let workerSeq = 1; // 0 is for master worker

  // const poolId = (SEQ++).toString(16);

  rx.merge(
    payloadByType.fork.pipe(
      op.mergeMap(([returnPort, fromWorker, forkAction]) => {
        if (idleWorkers.size > 0) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const workerNo = idleWorkers.values().next().value as number;
          return rx.of([returnPort, workerNo, fromWorker, forkAction] as const);
        } else if (workerByNo.size < opts.concurrent) {
          dispatcher.createWorker(workerSeq++);
          return rx.merge(
            payloadByType.workerCrearted.pipe(
              op.take(1),
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return
              op.map(([workerNo]) => [returnPort, workerNo, fromWorker, forkAction] as const)
            ),
            new rx.Observable<never>(sub => {
              dispatcher.createWorker(workerSeq++);
              sub.complete();
            })
          );
        } else {
          const min = workLoadTree.minimum();
          return rx.of([returnPort, min!.value[0], fromWorker, forkAction] as const);
        }
      }),
      op.map(([returnPort, toWorker, fromWorker, forkAction]) => {
        const rawOnForkedForAction = createAction('onForkedFor', returnPort, fromWorker, forkAction);
        plugin.dispatcher.pluginPostMsgTo(workerPortMap.get(toWorker)!, _actionToObject(rawOnForkedForAction), [returnPort]);
        dispatcher.workerLoadChange(toWorker, true);
      })
    ),

    payloadByType.createWorker.pipe(
      op.map(workerNo => [workerNo, factory()] as const),
      op.mergeMap(([workerNo, worker]) => {
        workerByNo.set(workerNo, worker);
        const workerSpecificCtl = casbt<RecursiveTaskActions>();
        const {payloadByType: payloadFromWorker} = workerSpecificCtl;
        plugin.dispatcher.pluginDoInitWorker(workerNo, worker, workerSpecificCtl.dispatchStream);
        return rx.merge(
          plugin.payloadByType.pluginDoneInitWorker.pipe(
            op.filter(([workerNo0]) => workerNo === workerNo0),
            op.take(1),
            op.map(([workerNo, port1]) => {
              workerLoad.set(workerNo, 0);
              workerPortMap.set(workerNo, port1);
              dispatcher.workerCrearted(workerNo, worker);
            })
          ),
          rx.merge(
            payloadFromWorker.waitForJoin,
            payloadFromWorker.tellPoolReturned.pipe(
              op.map(callerWorker => {
                dispatcher.workerLoadChange(callerWorker, true);
              })
            )
          ).pipe(
            op.map(() => {
              dispatcher.workerLoadChange(workerNo, false);
            })
          )
        );
      })
    ),

    payloadByType.workerLoadChange.pipe(
      op.map(([worker, incrementOrDecline]) => {
        const origin = workerLoad.get(worker);
        if (origin == null) {
          workerLoad.set(worker, incrementOrDecline ? 1 : -1);
          const node = workLoadTree.insert(1);
          if (node.value != null) {
            node.value.push(worker);
          } else {
            node.value = [worker];
          }
        } else {
          const newValue = incrementOrDecline ? origin + 1 : origin - 1;
          workerLoad.set(worker, newValue);
          const node = workLoadTree.search(origin);
          if (node != null) {
            workLoadTree.deleteNode(node);
          } else {
            const newNode = workLoadTree.insert(newValue);
            if (newNode.value)
              newNode.value.push(worker);
            else
              newNode.value = [worker];
          }
        }
      })
    )
  ).pipe(
    op.catchError((err, src) => {
      console.error(err);
      return src;
    })
  ).subscribe();

  return control as unknown as ActionStreamControl<ForkWorkerPoolActions>;
}
