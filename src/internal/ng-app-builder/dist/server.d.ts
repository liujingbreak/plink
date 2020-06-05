import { TsHandler } from './utils/ts-before-aot';
export * from './configurable';
export * from './ng/common';
export declare let tsHandler: TsHandler;
export declare function init(): Promise<void>;
export declare function activate(): void;
