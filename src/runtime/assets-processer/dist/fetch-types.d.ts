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
export declare type Checksum = {
    sha256: string;
    file: string;
    created: string;
    createdTime: number;
}[];
