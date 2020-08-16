import { BumpOptions } from './types';
export default function (options: BumpOptions & {
    dirs: string[];
}): Promise<void>;
