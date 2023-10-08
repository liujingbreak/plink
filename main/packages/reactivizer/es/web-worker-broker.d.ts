import { DuplexOptions } from './duplex';
import { ReactorComposite } from './epic';
import { ActionFunctions } from './control';
import { Broker, BrokerInput, BrokerEvent, ForkWorkerInput, ForkWorkerOutput } from './types';
/** WA - Worker output Message
*/
export declare function createBroker<I extends ActionFunctions = Record<string, never>, O extends ActionFunctions = Record<string, never>, WA extends ActionFunctions = Record<string, never>>(mainWorker: ReactorComposite<ForkWorkerInput & I, ForkWorkerOutput & O>, opts?: DuplexOptions<BrokerInput & O & BrokerEvent & ForkWorkerOutput>): Broker<WA>;
