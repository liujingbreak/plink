/// <reference types="node" />
import { Observable } from 'rxjs';
import { Checksum } from '../fetch-types';
export interface Options {
    url: string;
    appName: string;
    version: number;
    numOfNode: number;
    numOfConc: number;
}
export interface ServerMetaInfo {
    checksum: Checksum;
    id: string;
}
export declare function sendAppZip(opt?: Options, file?: string): Promise<unknown>;
export declare function sendRequest(opt: Options, buffer?: Buffer): Promise<string>;
export declare function toLines(src: Observable<Buffer>): Observable<string>;
