import { GlobalOptions } from './types';
export default function list(opt: GlobalOptions & {
    json: boolean;
}): Promise<void>;
