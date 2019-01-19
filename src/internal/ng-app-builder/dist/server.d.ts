import { TsHandler } from './utils/ts-before-aot';
export * from './configurable';
export * from './ng-prerender';
export * from './ng/common';
export { AngularConfigHandler } from './ng/change-cli-options';
export declare function compile(): Promise<void>;
export declare let tsHandler: TsHandler;
export declare function init(): Promise<void>;
export declare function activate(): void;
