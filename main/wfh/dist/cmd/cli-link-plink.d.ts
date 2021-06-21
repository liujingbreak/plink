import { NpmCliOption } from './types';
/**
 *
 * @return a function to write the original package.json file back
 */
export declare function reinstallWithLinkedPlink(opt: NpmCliOption): Promise<void>;
