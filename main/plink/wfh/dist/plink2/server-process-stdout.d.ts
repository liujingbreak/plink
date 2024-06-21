import * as stream from 'node:stream';
export declare function createCurrentProcessOutputReader(base64?: boolean): readonly [stream.Readable, () => void];
