/// <reference types="node" />
import * as stream from 'node:stream';
export declare function createCurrentProcessOutputReader(): readonly [stream.Readable, () => void];
