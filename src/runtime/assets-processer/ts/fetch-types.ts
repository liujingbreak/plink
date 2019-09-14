import Path from 'path';
export interface WithMailServerConfig {
  fetchMailServer: {
    imap: string;
    smtp: string;
    user: string;
    loginSecret: string;
    env: string;
  };
  // fetchUrl: string;
  fetchRetry: number;
  // fetchLogErrPerTimes: number;
  // fetchIntervalSec: number;
  downloadMode: 'memory' | 'fork' | null;
}
interface OldChecksum {
  version: number;
  path: string;
  changeFetchUrl?: string;
}

type OldChecksumOptional = {[k in keyof OldChecksum]?: OldChecksum[k]};
export interface Checksum extends OldChecksumOptional {
  versions?: {[key: string]: {version: number, path: string}};
}

export const currChecksumFile = Path.resolve('checksum.json');
