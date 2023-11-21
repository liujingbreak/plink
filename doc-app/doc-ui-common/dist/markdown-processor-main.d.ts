import { Broker } from '@wfh/reactivizer/dist/fork-join/node-worker-broker';
import { markdownProcessor } from './markdown-processor';
export declare function setupBroker(excludeCurrentThead?: boolean): Broker<import("./markdown-processor").MarkdownProcessor>;
export { markdownProcessor };
