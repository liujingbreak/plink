/// <reference types="node" />
import { IncomingMessage } from 'http';
import { Writable } from 'stream';
export declare function readCompressedResponse(clientResponse: IncomingMessage, output: Writable): Promise<void>;
export declare function compressedIncomingMsgToBuffer(msg: IncomingMessage): Promise<Buffer>;
export declare function compressResponse(data: Buffer | string, response: Writable, contentEncoding?: string): Promise<void>;
