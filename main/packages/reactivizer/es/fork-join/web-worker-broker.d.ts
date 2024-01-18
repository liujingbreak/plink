import { ReactorCompositeOpt } from '../epic';
import { Broker, BrokerInput, BrokerEvent, ForkWorkerInput, ForkWorkerOutput, WorkerControl, ThreadExpirationEvents } from './types';
import { applyScheduler } from './worker-scheduler';
export * from './types';
/** Broker manages worker threads, create message channels between child worker threads and main thread, transmits actions
*/
export declare function createBroker<I = Record<never, never>, O = Record<never, never>>(workerController: WorkerControl<I, O, any, any>, opts?: ReactorCompositeOpt<BrokerInput & ForkWorkerInput, BrokerEvent<I, O> & ForkWorkerOutput & ThreadExpirationEvents>): Broker<I, O>;
type ScheduleOptions = typeof applyScheduler extends (c: any, o: infer O) => any ? O : unknown;
export declare function setupForMainWorker<I = Record<never, never>, O = Record<never, never>>(workerContoller: WorkerControl<I, O, any, any>, opts: ScheduleOptions & ReactorCompositeOpt<BrokerInput & ForkWorkerInput, BrokerEvent<I, O> & ForkWorkerOutput & ThreadExpirationEvents>): Broker<I, O>;
