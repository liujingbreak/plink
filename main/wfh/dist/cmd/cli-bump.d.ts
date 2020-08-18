import { BumpOptions } from './types';
export default function (options: BumpOptions & {
    packages: string[];
}): Promise<void>;
