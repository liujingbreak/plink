import { ReactorCompositeOpt } from '../epic';
import { ActionFunctions } from '../control';
import { Broker, BrokerInput, BrokerEvent, ForkWorkerInput, ForkWorkerOutput, WorkerControl, ThreadExpirationEvents } from './types';
import { applyScheduler } from './worker-scheduler';
export * from './types';
/** Broker manages worker threads, create message channels between child worker threads and main thread, transmits actions
*/
export declare function createBroker<I extends ActionFunctions = Record<never, never>, O extends ActionFunctions = Record<never, never>, LI extends ReadonlyArray<keyof I> = readonly [], LO extends ReadonlyArray<keyof O> = readonly []>(workerController: WorkerControl<I, O, LI, LO>, opts?: ReactorCompositeOpt<BrokerInput & ForkWorkerInput, BrokerEvent<WorkerControl<I, O, LI, LO>> & ForkWorkerOutput & ThreadExpirationEvents>): Broker<WorkerControl<I, O, LI, LO>>;
type ScheduleOptions = typeof applyScheduler extends (c: any, o: infer O) => any ? O : unknown;
export declare function setupForMainWorker<I extends ActionFunctions = Record<never, never>, O extends ActionFunctions = Record<never, never>, LI extends ReadonlyArray<keyof I> = readonly [], LO extends ReadonlyArray<keyof O> = readonly []>(workerContoller: WorkerControl<I, O, LI, LO>, opts: ScheduleOptions & ReactorCompositeOpt<BrokerInput & ForkWorkerInput, BrokerEvent<WorkerControl<I, O, LI, LO>> & ForkWorkerOutput & ThreadExpirationEvents>): Broker<WorkerControl<I, O, LI, LO>>;
