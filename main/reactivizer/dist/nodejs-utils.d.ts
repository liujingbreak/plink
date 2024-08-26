import { Writable } from 'node:stream';
import { ReactorCompositeOpt } from './reactor-base';
export declare const conciseConsoleLogger: ReactorCompositeOpt<any, any, any, any>['log'];
export declare const conciseNocolorConsoleLogger: ReactorCompositeOpt<any, any, any, any>['log'];
export declare function formatToConcise(...messageItems: any[]): string;
export declare function formatToConciseNoColor(...messageItems: any[]): string;
export declare function createSimpleIndentLogger(colorful: boolean, timestamp: boolean, out: Writable): (prefix: string, ...msgs: any[]) => void;
