import { GlobalOptions } from './types';
export default function list(opt: GlobalOptions & {
    json: boolean;
    hoist: boolean;
}): Promise<void>;
export declare function checkDir(opt: GlobalOptions): void;
