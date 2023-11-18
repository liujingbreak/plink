import { ReactorComposite, ReactorCompositeOpt } from '../epic';
import { ActionFunctions } from '../control';
import { Broker, BrokerInput, BrokerEvent, ForkWorkerInput, ForkWorkerOutput, WorkerControl } from './types';
import { applyScheduler } from './worker-scheduler';
/** Broker manages worker threads, create message channels between child worker threads and main thread, transmits actions
*/
export declare function createBroker<I extends ActionFunctions = Record<string, never>, O extends ActionFunctions = Record<string, never>, LI extends ReadonlyArray<keyof I> = readonly [], LO extends ReadonlyArray<keyof O> = readonly []>(workerController: ReactorComposite<ForkWorkerInput & I, ForkWorkerOutput & O, LI, LO>, opts?: ReactorCompositeOpt<BrokerInput & O & BrokerEvent<ReactorComposite<ForkWorkerInput & I, ForkWorkerOutput & O, any, any>> & ForkWorkerOutput>): Broker<WorkerControl<I, O, LI, LO>>;
type ScheduleOptions = typeof applyScheduler extends (c: any, o: infer O) => any ? O : unknown;
export declare function setupForMainWorker<I extends ActionFunctions = Record<string, never>, O extends ActionFunctions = Record<string, never>, LI extends ReadonlyArray<keyof I> = readonly [], LO extends ReadonlyArray<keyof O> = readonly []>(workerContoller: WorkerControl<I, O, LI, LO>, opts: ScheduleOptions & ReactorCompositeOpt<BrokerInput & O & BrokerEvent<ReactorComposite<ForkWorkerInput & I, ForkWorkerOutput & O, any, any>> & ForkWorkerInput & ForkWorkerOutput>): Broker<WorkerControl<I, O, LI, LO>>;
export {};
