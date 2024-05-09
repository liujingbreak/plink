/// <reference types="node" />
import * as stream from 'node:stream';
export declare function createCurrentProcessOutputReader(debug?: boolean): readonly [stream.Readable, () => void];
