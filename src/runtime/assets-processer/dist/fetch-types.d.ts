export interface WithMailServerConfig {
    fetchMailServer: {
        imap: string;
        smtp: string;
        user: string;
        loginSecret: string;
        env: string;
    } | null | undefined;
    fetchRetry: number;
    fetchIntervalSec: number;
    downloadMode: 'memory' | 'fork' | null;
}
interface OldChecksum {
    version: number;
    path: string;
    changeFetchUrl?: string;
}
declare type OldChecksumOptional = {
    [k in keyof OldChecksum]?: OldChecksum[k];
};
export interface Checksum extends OldChecksumOptional {
    versions?: {
        [key: string]: {
            version: number;
            path?: string;
        };
    };
}
export {};
