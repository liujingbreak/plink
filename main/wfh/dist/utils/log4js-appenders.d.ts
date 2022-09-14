/**
 * https://log4js-node.github.io/log4js-node/writing-appenders.html
 */
import { AppenderModule } from 'log4js';
/**
 * Log4js can handle cluster worker configuration, it will most likely ignore appenders, so it could be empty appender
 */
export declare const doNothingAppender: AppenderModule;
export declare const childProcessAppender: AppenderModule;
export declare function childProcessMsgHandler(msg: {
    topic?: string;
    data: string;
}): void;
