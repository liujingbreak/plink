/// <reference types="node" />
/**
 * https://log4js-node.github.io/log4js-node/writing-appenders.html
 */
import { BroadcastChannel } from 'worker_threads';
import { AppenderModule } from 'log4js';
/**
 * Log4js can handle cluster worker configuration, it will most likely ignore appenders, so it could be empty appender
 */
export declare const doNothingAppender: AppenderModule;
export declare const childProcessAppender: AppenderModule;
export declare const log4jsThreadBroadcast: BroadcastChannel;
export declare const workerThreadAppender: AppenderModule;
/**
 * Emit log event to log4js appenders
 */
export declare function emitChildProcessLogMsg(msg: {
    topic?: string;
    data: string;
}, toParent?: boolean): boolean;
export declare function emitThreadLogMsg(msg: {
    data?: {
        topic?: string;
        data: string;
    };
}): boolean;
