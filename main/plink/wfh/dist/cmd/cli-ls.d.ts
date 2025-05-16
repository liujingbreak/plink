import { GlobalOptions } from './types';
import * as pkMgr from '../package-mgr';
export default function list(opt: GlobalOptions & {
    json: boolean;
    hoist: boolean;
}): Promise<void>;
export declare function checkDir(opt: GlobalOptions): void;
export declare function listPackagesByProjects(state: pkMgr.PackagesState): string;
