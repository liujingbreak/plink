import { TsHandler } from '@dr-core/ng-app-builder/dist/utils/ts-before-aot';
export * from './configurable';
export * from './ng-prerender';
export * from './ng/common';
export declare function compile(): Promise<void>;
export declare let tsHandler: TsHandler;
export declare function init(): void;
export declare function activate(): void;
