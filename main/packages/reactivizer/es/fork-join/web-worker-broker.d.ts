import { ReactorComposite, ReactorCompositeOpt } from '../epic';
import { ActionFunctions } from '../control';
import { Broker, BrokerInput, BrokerEvent, ForkWorkerInput, ForkWorkerOutput } from './types';
import { applyScheduler } from './worker-scheduler';
/** WA - Worker output Message
*/
export declare function createBroker<I extends ActionFunctions = Record<string, never>, O extends ActionFunctions = Record<string, never>, WA extends ActionFunctions = Record<string, never>>(mainWorker: ReactorComposite<ForkWorkerInput & I, ForkWorkerOutput & O>, opts?: ReactorCompositeOpt<BrokerInput & O & BrokerEvent & ForkWorkerOutput>): Broker<WA>;
type ScheduleOptions = typeof applyScheduler extends (c: any, o: infer O) => any ? O : unknown;
export declare function setupForMainWorker<I extends ActionFunctions = Record<string, never>, O extends ActionFunctions = Record<string, never>>(workerContoller: ReactorComposite<ForkWorkerInput & I, ForkWorkerOutput & O, any, any>, opts: ScheduleOptions & ReactorCompositeOpt<BrokerInput & O & BrokerEvent & ForkWorkerInput & ForkWorkerOutput>): Broker<Record<string, never>>;
export {};
