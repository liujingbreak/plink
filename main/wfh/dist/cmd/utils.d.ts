import { PackagesState } from '../package-mgr';
export declare function writeFile(file: string, content: string): void;
export declare function completePackageName(state: PackagesState, guessingName: string[]): (string | null)[];
