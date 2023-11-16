/// <reference types="node" />
import { Worker as NodeWorker } from 'worker_threads';
import { ReactorComposite, ReactorCompositeOpt } from '../epic';
import { ActionFunctions } from '../control';
import { Broker, BrokerInput, BrokerEvent, ForkWorkerInput, ForkWorkerOutput } from './types';
/** WA - Worker output Message
*/
export declare function createBroker<I extends ActionFunctions = Record<string, never>, O extends ActionFunctions = Record<string, never>, WA extends ActionFunctions = Record<string, never>>(workerController: ReactorComposite<ForkWorkerInput & I, ForkWorkerOutput & O, any, any>, opts?: ReactorCompositeOpt<BrokerInput & O & BrokerEvent & ForkWorkerOutput>): Broker<WA>;
export declare function setupForMainWorker<I extends ActionFunctions = Record<string, never>, O extends ActionFunctions = Record<string, never>>(workerContoller: ReactorComposite<ForkWorkerInput & I, ForkWorkerOutput & O>, opts: {
    maxNumOfWorker: number;
    workerFactory(): Worker | NodeWorker;
} & ReactorCompositeOpt<BrokerInput & O & BrokerEvent & ForkWorkerInput & ForkWorkerOutput>): Broker<Record<string, never>>;
