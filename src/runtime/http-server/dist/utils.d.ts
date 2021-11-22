/// <reference types="node" />
import { IncomingMessage } from 'http';
import { Writable } from 'stream';
export declare function readCompressedResponse(clientResponse: IncomingMessage, output: Writable): Promise<void>;
