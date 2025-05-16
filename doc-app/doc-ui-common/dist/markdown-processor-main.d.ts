import { markdownProcessor } from './markdown-processor';
export declare function setupBroker(excludeCurrentThead?: boolean, maxNumOfWorker?: number): import("@wfh/reactivizer/dist/fork-join/node-worker-broker").Broker<import("../../markdown-base/isom/markdown-process-common").MdInputActions, import("@wfh/reactivizer/dist/fork-join/node-worker-broker").ForkWorkerOutput<import("../../markdown-base/isom/markdown-process-common").MdInputActions> & import("../../markdown-base/isom/markdown-process-common").MdOutputEvents>;
export { markdownProcessor };
