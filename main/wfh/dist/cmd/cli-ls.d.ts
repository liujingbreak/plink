import { GlobalOptions } from './types';
export default function list(opt: GlobalOptions & {
    json: boolean;
}): Promise<void>;
export declare function checkDir(opt: GlobalOptions): Promise<void>;
