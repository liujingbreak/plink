import { Observable, BehaviorSubject } from 'rxjs';
import { Checksum } from './fetch-types';
import { ImapTokenType } from './mail/imap-msg-parser';
import { LookAhead, Token } from '@wfh/plink/wfh/dist/async-LLn-parser';
export declare function sendMail(subject: string, text: string, file?: string): Promise<void>;
export declare function retrySendMail(subject: string, text: string, file?: string): Promise<void>;
export interface ImapFetchData {
    headers: {
        [key: string]: string[] | undefined;
    };
    texts: string[];
    files: string[];
}
export interface ImapCommandContext {
    /**
     * Index of latest mail
     */
    lastIndex: number;
    fileWritingState: Observable<boolean>;
    waitForReply<R = any>(command?: string, onLine?: (la: LookAhead<Token<ImapTokenType>>, tag: string) => Promise<R>): Promise<R | null>;
    findMail(fromIndx: number, subject: string): Promise<number | undefined>;
    waitForFetch(mailIdx: string | number, headerOnly?: boolean, overrideFileName?: string): Promise<ImapFetchData>;
    waitForFetchText(index: number): Promise<string | undefined>;
    appendMail(subject: string, content: string): Promise<void | null>;
}
/**
 * IMAP specification
 * https://tools.ietf.org/html/rfc1730
 *
 * ID command
 * https://tools.ietf.org/html/rfc2971
 */
export declare function connectImap(callback: (context: ImapCommandContext) => Promise<any>): Promise<void>;
export declare class ImapManager {
    env: string;
    zipDownloadDir?: string | undefined;
    checksumState: BehaviorSubject<Checksum | null>;
    fileWritingState: ImapCommandContext['fileWritingState'];
    watching: boolean;
    private toFetchAppsState;
    private ctx;
    constructor(env: string, zipDownloadDir?: string | undefined);
    fetchChecksum(): Promise<void>;
    fetchUpdateCheckSum(appName: string): Promise<void>;
    /**
     * Done when files are written
     * @param excludeApp exclude app
     */
    fetchOtherZips(excludeApp?: string): Promise<void>;
    appendMail(subject: string, content: string): Promise<void>;
    checkMailForUpdate(): Promise<void>;
    fetchAppDuringWatchAction(...appNames: string[]): void;
    stopWatch(): void;
    private fetchAttachment;
    private _fetchChecksum;
}
export declare function testMail(imap: string, user: string, loginSecret: string): Promise<void>;
