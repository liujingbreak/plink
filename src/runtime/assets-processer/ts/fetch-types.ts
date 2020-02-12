// import Path from 'path';
export interface WithMailServerConfig {
  fetchMailServer: {
    imap: string;
    smtp: string;
    user: string;
    loginSecret: string;
    env: string;
  } | null | undefined;
  // fetchUrl: string;
  fetchRetry: number;
  // fetchLogErrPerTimes: number;
  fetchIntervalSec: number;
  downloadMode: 'memory' | 'fork' | null;
}

export type Checksum = {
  sha256: string;
  file: string;
  created: string;
  createdTime: number;
}[];

// export const currChecksumFile = Path.resolve('checksum.json');
