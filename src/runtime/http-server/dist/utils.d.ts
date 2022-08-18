/// <reference types="node" />
import { IncomingMessage } from 'http';
import { Writable } from 'stream';
export declare function readCompressedResponse(clientResponse: IncomingMessage, output: Writable): Promise<void>;
export declare function compressedIncomingMsgToBuffer(msg: IncomingMessage): Promise<Buffer>;
/** Make sure you remove "content-length" header so that Node.js will add "tranfer-encoding: chunked" */
export declare function compressResponse(data: Buffer | string, response: Writable, contentEncoding?: string): Promise<void>;
/** You set content-length header, this will disable "tranfer-encoding: chunked" mode */
export declare function compressResWithContentLength(data: Buffer | string, response: Writable, contentEncoding?: string): Promise<{
    contentLength: number;
    write(): Promise<void>;
}>;
