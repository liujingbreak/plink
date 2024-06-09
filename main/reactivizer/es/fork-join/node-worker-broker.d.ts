import { SimplexReactorOptions } from '../reactor-base';
import { Broker, BrokerInput, BrokerEvent, ForkWorkerInput, ForkWorkerOutput, ThreadExpirationEvents, WorkerControl } from './types';
import { applyScheduler } from './worker-scheduler';
export * from './types';
/** Broker manages worker threads, create message channels between child worker threads and main thread, transmits actions
*/
export declare function createBroker<I = Record<never, never>>(workerController: WorkerControl<I, any>, opts?: SimplexReactorOptions<BrokerInput & ForkWorkerInput & BrokerEvent<I> & ForkWorkerOutput & ThreadExpirationEvents>): Broker<I>;
type ScheduleOptions = typeof applyScheduler extends (c: any, o: infer O) => any ? O : unknown;
export declare function setupForMainWorker<I = Record<never, never>>(workerController: WorkerControl<I, any>, brokerCreationOptions: ScheduleOptions & SimplexReactorOptions<BrokerInput & ForkWorkerInput & BrokerEvent<I> & ForkWorkerOutput & ThreadExpirationEvents>): Broker<I>;
