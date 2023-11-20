import { Broker } from '@wfh/reactivizer/dist/fork-join/node-worker-broker';
import { markdownProcessor } from './markdown-processor';
declare const broker: Broker<typeof markdownProcessor>;
export { markdownProcessor, broker };
