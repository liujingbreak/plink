import { ReactorComposite } from './epic';
import { ActionFunctions, RxController } from './control';
import { BrokerInput, BrokerEvent, ForkWorkerInput } from './types';
/** WA - Worker output Message
*/
export declare function createBroker<WA extends ActionFunctions = Record<string, never>>(mainWorkerInput: RxController<ForkWorkerInput>, opts?: ConstructorParameters<typeof ReactorComposite>[0]): Broker<WA>;
export type Broker<WA extends ActionFunctions = any> = ReactorComposite<BrokerInput, BrokerEvent & WA>;
