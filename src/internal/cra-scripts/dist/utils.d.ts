import { CommandOption } from './build-options';
import _ from 'lodash';
export declare function drawPuppy(slogon: string, message?: string): void;
export declare function printConfig(c: any, level?: number): string;
export declare const getCmdOptions: typeof _getCmdOptions & _.MemoizedFunction;
declare function _getCmdOptions(): CommandOption;
export declare function saveCmdArgToEnv(): void;
export declare function findDrcpProjectDir(): string | undefined;
export {};
