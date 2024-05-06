import { BumpOptions } from './types';
import '../editor-helper';
export default function (options: BumpOptions & {
    packages: string[];
}): Promise<void>;
