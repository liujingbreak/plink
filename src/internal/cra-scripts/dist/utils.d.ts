import { CommandOption } from './build-options';
export declare function drawPuppy(slogon: string, message?: string): void;
export declare function printConfig(c: any, level?: number): string;
export declare function getCmdOptions(): CommandOption;
export declare function saveCmdArgToEnv(): void;
export declare function findDrcpProjectDir(): string | undefined;
