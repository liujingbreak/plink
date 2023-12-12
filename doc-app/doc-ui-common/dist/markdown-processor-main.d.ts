import { markdownProcessor } from './markdown-processor';
export declare function setupBroker(excludeCurrentThead?: boolean, maxNumOfWorker?: number): import("@wfh/reactivizer/dist/fork-join/node-worker-broker").Broker<import("@wfh/reactivizer/dist/fork-join/node-worker-broker").WorkerControl<import("../isom/markdown-process-common").MdInputActions, import("../isom/markdown-process-common").MdOutputEvents, readonly [], readonly []>>;
export { markdownProcessor };
